#!/usr/bin/env python3
"""
Ingest Romaneio PDFs → Postgres
Lê PDFs de romaneio da pasta de logística e grava no banco via ops.ingest_romaneio_event_payload()

Uso:
  # Modo dry-run (mostra o que seria feito)
  python3 ingest_romaneio_pdf.py

  # Modo de ingestão real
  python3 ingest_romaneio_pdf.py --execute

  # Pasta customizada
  python3 ingest_romaneio_pdf.py --folder "/caminho/para/pdfs"

  # Database URL customizada
  python3 ingest_romaneio_pdf.py --execute --db "postgresql://user:pass@host:5432/db"

  # Processar um único PDF
  python3 ingest_romaneio_pdf.py --execute --file "ROMANEIO 565.pdf"

Requer: pip install pdfplumber psycopg2-binary
"""

import argparse
import glob
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone

try:
    import pdfplumber
except ImportError:
    print("ERRO: pdfplumber não instalado. Execute: pip install pdfplumber")
    sys.exit(1)

# ── Config ──────────────────────────────────────────────────────────────
DEFAULT_FOLDER = "/Volumes/logistica/Automação Romaneio Logistica x PCP"
DEFAULT_DB_URL = "http://192.168.25.250:8765/api/pcp/romaneios-kanban/sync"
SOURCE_CODE = "romaneio_pcp_atual"
WORKFLOW_NAME = "PCP | 15B | PDF Romaneio Ingest"


# ── Parser ──────────────────────────────────────────────────────────────
def ct(v):
    """Clean text: collapse whitespace, strip"""
    return re.sub(r"\s+", " ", str(v or "")).strip()


def parse_num(v):
    """Parse Brazilian number format: 1.104,00 → 1104.0"""
    if not v:
        return 0.0
    s = ct(v).replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def parse_value(v):
    """Parse value that may be BR (1.104,00) or plain decimal (108676.48)"""
    if not v:
        return 0.0
    s = ct(v)
    if "," in s:
        return parse_num(s)
    try:
        return float(s)
    except ValueError:
        return 0.0


def parse_romaneio_pdf(pdf_path):
    """Parse a romaneio PDF and extract structured data"""
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)

    fname = os.path.basename(pdf_path)

    # ── Header ──
    ordem_m = re.search(r"ORDEM\s+DE\s+CARGA[:\s]+(\d+)", text, re.I)
    ordem = ordem_m.group(1) if ordem_m else ""

    empresa_m = re.search(r"EMPRESA[:\s]+(\d+)\s*-\s*(.+?)(?:\n|$)", text, re.I)
    cod_empresa = ct(empresa_m.group(1)) if empresa_m else ""
    nome_empresa = ct(empresa_m.group(2)) if empresa_m else ""

    if not ordem:
        fn_m = re.search(r"ROMANEIO\s+(\d+)", fname, re.I)
        if fn_m:
            ordem = fn_m.group(1)

    # ── MONTANTE & Total ──
    mont_m = re.search(r"MONTANTE[:\s]+(\d+)\s+([\d.,]+)", text, re.I)
    montante = int(mont_m.group(1)) if mont_m else 0
    total_geral = parse_value(mont_m.group(2)) if mont_m else 0.0

    # ── PEDIDOS ──
    pedidos = []
    ped_m = re.search(
        r"N°\s*UNICO.*?Valor\s*Total\s*\n(.*?)(?=MONTANTE)", text, re.S | re.I
    )
    if ped_m:
        for line in ped_m.group(1).strip().split("\n"):
            l = ct(line)
            if not l:
                continue
            m = re.match(r"^(\d+)\s+(\d+)\s+(\d+)\s*-\s*(.+?)\s+([\d.,]+)$", l)
            if m:
                pedidos.append(
                    {
                        "numero_unico": m.group(1),
                        "ped_mercos": m.group(2),
                        "codigo_parceiro": m.group(3),
                        "parceiro": ct(m.group(4)),
                        "valor_total": parse_value(m.group(5)),
                    }
                )

    if not montante:
        montante = len(pedidos)
    if not total_geral:
        total_geral = sum(p["valor_total"] for p in pedidos)

    # ── ITENS DO CAMINHÃO ──
    itens = []
    # Match common units
    UNITS = r"(?:PC|UN|PT|KG|CX|MT|M2|LT|FD|SC|RL|CJ|JG|BD|GL|TB|PR|DZ|CT|MH|MO|MM|PAR|PÇ|PE|M)"
    itens_m = re.search(
        r"PRODUTO\s+UND\.\s+QTD\s+NEG\.\s+QTD\s+VOL\.\s*\n(.*?)(?=TOTAL\s*:|\Z)",
        text,
        re.S | re.I,
    )
    if itens_m:
        for line in itens_m.group(1).strip().split("\n"):
            l = ct(line)
            if not l:
                continue
            m = re.match(
                rf"^(\d+)\s*-\s*(.+?)\s+({UNITS})\s+([\d.,]+)(?:\s+([\d.,]+))?\s*$",
                l,
                re.I,
            )
            if m:
                itens.append(
                    {
                        "sku": ct(m.group(1)),
                        "descricao": ct(m.group(2)),
                        "produto": f"{ct(m.group(1))} - {ct(m.group(2))}",
                        "unidade": ct(m.group(3)).upper(),
                        "tipo_produto": "PRODUTO ACABADO",
                        "quantidade": parse_num(m.group(4)),
                        "quantidade_neg": parse_num(m.group(4)),
                        "quantidade_vol": parse_num(m.group(5) or "0"),
                        "quantity_total": parse_num(m.group(4)),
                    }
                )

    return {
        "ordem_carga": ordem,
        "empresa": cod_empresa,
        "nome_empresa": nome_empresa,
        "pedidos": pedidos,
        "montante": montante,
        "total_geral": round(total_geral, 2),
        "itens": itens,
        "file": fname,
        "text_length": len(text),
    }


# ── Event Builder ───────────────────────────────────────────────────────
def build_event(parsed):
    """Build the event payload for ops.ingest_romaneio_event_payload()"""
    now = datetime.now(timezone.utc).isoformat()
    fp = json.dumps(
        {"oc": parsed["ordem_carga"], "ic": len(parsed["itens"]), "f": parsed["file"]}
    )
    h = hashlib.md5(fp.encode()).hexdigest()[:8]
    eid = f"{SOURCE_CODE}:{parsed['ordem_carga']}:{now.replace(':', '').replace('-', '')}:{h}"

    payload = {
        "event_id": eid,
        "event_type": "update",
        "event_at": now,
        "romaneio": {
            "codigo": parsed["ordem_carga"],
            "empresa": parsed["empresa"],
            "status": "1",
            "pedido": ",".join(p["numero_unico"] for p in parsed["pedidos"]),
            "parceiro": parsed["pedidos"][0]["parceiro"] if parsed["pedidos"] else "",
            "cidade": "",
            "valor_total": parsed["total_geral"],
            "itens": parsed["itens"],
        },
    }

    meta = {
        "polling": False,
        "native_n8n": False,
        "source": "pdf_parser",
        "workflow_name": WORKFLOW_NAME,
        "file_name": parsed["file"],
        "items_source": "pdf_itens_caminhao" if parsed["itens"] else "none",
        "items_count": len(parsed["itens"]),
        "pedidos_count": len(parsed["pedidos"]),
        "montante": parsed["montante"],
        "total_geral": parsed["total_geral"],
        "nome_empresa": parsed["nome_empresa"],
        "codigo_empresa": parsed["empresa"],
        "ordem_carga": parsed["ordem_carga"],
        "pedidos_detail": parsed["pedidos"],
    }

    return payload, meta


# ── SQL Builder ─────────────────────────────────────────────────────────
def build_sql(payload, meta):
    """Build the SQL query for postgres execution"""
    def esc(v):
        return json.dumps(v, ensure_ascii=False).replace("\\", "\\\\").replace("'", "''")

    return (
        f"SELECT ops.ingest_romaneio_event_payload(\n"
        f"  '{SOURCE_CODE}',\n"
        f"  '{esc(payload)}'::jsonb,\n"
        f"  '{esc(meta)}'::jsonb\n"
        f") AS result;"
    )


# ── Database ────────────────────────────────────────────────────────────
def execute_sql(db_url, sql):
    """Execute SQL against Postgres and return result"""
    try:
        import psycopg2

        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql)
        result = cur.fetchone()
        conn.close()
        return {"ok": True, "result": result[0] if result else None}
    except ImportError:
        return {"ok": False, "error": "psycopg2 not installed"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── Main ────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Ingest Romaneio PDFs → Postgres")
    parser.add_argument("--folder", default=DEFAULT_FOLDER, help="Pasta com PDFs")
    parser.add_argument("--file", default=None, help="Processar um único PDF")
    parser.add_argument("--db", default=DEFAULT_DB_URL, help="Database URL")
    parser.add_argument("--execute", action="store_true", help="Executar ingestão real")
    parser.add_argument("--json", action="store_true", help="Output JSON em vez de tabela")
    parser.add_argument("--sql", action="store_true", help="Mostrar SQL gerado")
    args = parser.parse_args()

    # Collect PDFs
    if args.file:
        if os.path.isabs(args.file):
            pdfs = [args.file]
        else:
            pdfs = [os.path.join(args.folder, args.file)]
    else:
        pattern = os.path.join(args.folder, "ROMANEIO *.pdf")
        pdfs = sorted(glob.glob(pattern))
        # Agora LÊ OS NOTA também! Sem exclusão de arquivos baseados no nome.

    if not pdfs:
        print(f"Nenhum PDF encontrado em: {args.folder}")
        sys.exit(1)

    print(f"📂 Pasta: {args.folder}")
    print(f"📄 PDFs encontrados: {len(pdfs)} (Incluindo NOTAS juntas)")
    print(f"{'🔴 DRY-RUN' if not args.execute else '🟢 EXECUTANDO'}")
    print("─" * 70)

    results = []
    parsed_dict = {}

    # Passo 1: Fazer o Parse e Agrupar
    for pdf_path in pdfs:
        try:
            parsed = parse_romaneio_pdf(pdf_path)
            ordem = parsed["ordem_carga"]
            
            if not ordem: continue
            
            if ordem not in parsed_dict:
                parsed_dict[ordem] = parsed
            else:
                existing = parsed_dict[ordem]
                existing["montante"] += parsed["montante"]
                existing["total_geral"] += parsed["total_geral"]
                
                # Somar as quantidades de SKUs iguais
                for item in parsed["itens"]:
                    matched = next((i for i in existing["itens"] if i["sku"] == item["sku"]), None)
                    if matched:
                        matched["quantidade"] += item["quantidade"]
                        matched["quantidade_neg"] += item["quantidade_neg"]
                        matched["quantidade_vol"] += item["quantidade_vol"]
                        matched["quantity_total"] += item["quantity_total"]
                    else:
                        existing["itens"].append(item)
                
                # Junta o nome dos arquivos combinados no evento
                if parsed["file"] not in existing["file"]:
                    existing["file"] = existing["file"] + ", " + parsed["file"]

        except Exception as e:
            print(f"❌ {os.path.basename(pdf_path):25s} ERRO Parser: {e}")
            results.append({"file": os.path.basename(pdf_path), "status": "❌", "error": str(e)})

    # Passo 2: Construir array e Enviar via HTTP
    payload_to_sync = []
    for ordem, parsed in parsed_dict.items():
        payload_to_sync.append(parsed)
        
        result = {
            "file": parsed["file"],
            "ordem": parsed["ordem_carga"],
            "empresa": parsed["empresa"],
            "pedidos": len(parsed["pedidos"]),
            "itens": len(parsed["itens"]),
            "total": parsed["total_geral"],
            "status": "⌛",
        }
        results.append(result)

        if args.json:
            print(json.dumps({"parsed": parsed}, indent=2, ensure_ascii=False))
        elif not args.json and not args.sql:
            short_fname = (parsed["file"][:22] + '...') if len(parsed["file"]) > 25 else parsed["file"]
            print(
                f"Lido: {short_fname:25s} "
                f"Ordem={parsed['ordem_carga']:>4s} "
                f"Ped={len(parsed['pedidos']):>2d} "
                f"Itens={len(parsed['itens']):>2d} "
                f"R${parsed['total_geral']:>12,.2f}"
            )

    if args.execute and payload_to_sync:
        print("\n🌐 Sincronizando com o Servidor Kanban (HTTP)...")
        try:
            import urllib.request
            url = args.db if args.db.startswith("http") else "http://localhost:8765/api/pcp/romaneios-kanban/sync"
            req = urllib.request.Request(
                url, 
                method="POST", 
                data=json.dumps(payload_to_sync, ensure_ascii=False).encode('utf-8'), 
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req) as response:
                res_body = response.read().decode('utf-8')
                print(f"✅ Sincronização concluída com Sucesso! Resposta: {res_body}")
                for r in results: r["status"] = "✅"
        except Exception as e:
            print(f"❌ ERRO COMUNICAÇÃO HTTP: {e}")
            for r in results: r["status"] = "❌"

    # Summary
    ok = sum(1 for r in results if r["status"] == "✅")
    fail = sum(1 for r in results if r["status"] == "❌")
    total_itens = sum(r.get("itens", 0) for r in results)
    total_valor = sum(r.get("total", 0) for r in results)

    print("─" * 70)
    print(f"✅ Sucesso (Ordens unicas no BD): {ok} | ❌ Falha: {fail} | Total Registros: {len(results)}")
    print(f"📦 Itens extraídos e Somados: {total_itens}")
    print(f"💰 Valor total do lote: R${total_valor:,.2f}")

    if not args.execute:
        print(f"\n💡 Para gravar no banco efetivamente, adicione a opção: python3 {sys.argv[0]} --execute")



if __name__ == "__main__":
    main()

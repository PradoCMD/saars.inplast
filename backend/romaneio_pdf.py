from __future__ import annotations

import hashlib
import io
import json
import re
from datetime import datetime, timezone
from typing import Any

import pdfplumber


SOURCE_CODE = "romaneio_pcp_atual"
WORKFLOW_NAME = "PCP | 15B | PDF Romaneio Ingest"


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_romaneio_identity(value: Any) -> str:
    text = clean_text(value).upper()
    if not text:
        return ""
    match = re.search(r"ROMANEIO(?:\s+NOTA)?\s*[-_ ]*\s*(\d+)", text, re.I) or re.search(r"(\d+)", text)
    return match.group(1) if match else ""


def infer_document_kind(value: Any) -> str:
    text = clean_text(value).upper()
    return "romaneio_nota" if ("ROMANEIO" in text and "NOTA" in text) else "romaneio"


def parse_num(value: Any) -> float:
    if not value:
        return 0.0
    text = clean_text(value).replace(".", "").replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return 0.0


def parse_value(value: Any) -> float:
    if not value:
        return 0.0
    text = clean_text(value)
    if "," in text:
        return parse_num(text)
    try:
        return float(text)
    except ValueError:
        return 0.0


def parse_romaneio_pdf_bytes(file_bytes: bytes, filename: str) -> dict[str, Any]:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)

    ordem_match = re.search(r"ORDEM\s+DE\s+CARGA[:\s]+(\d+)", text, re.I)
    ordem_carga = ordem_match.group(1) if ordem_match else ""

    empresa_match = re.search(r"EMPRESA[:\s]+(\d+)\s*-\s*(.+?)(?:\n|$)", text, re.I)
    codigo_empresa = clean_text(empresa_match.group(1)) if empresa_match else ""
    nome_empresa = clean_text(empresa_match.group(2)) if empresa_match else ""

    if not ordem_carga:
        ordem_carga = normalize_romaneio_identity(filename)

    if not ordem_carga:
        raise ValueError("Não foi possível identificar a ordem de carga no PDF.")

    montante_match = re.search(r"MONTANTE[:\s]+(\d+)\s+([\d.,]+)", text, re.I)
    montante = int(montante_match.group(1)) if montante_match else 0
    total_geral = parse_value(montante_match.group(2)) if montante_match else 0.0

    pedidos: list[dict[str, Any]] = []
    pedidos_match = re.search(
        r"N°\s*UNICO.*?Valor\s*Total\s*\n(.*?)(?=MONTANTE)",
        text,
        re.S | re.I,
    )
    if pedidos_match:
        for line in pedidos_match.group(1).strip().split("\n"):
            normalized = clean_text(line)
            if not normalized:
                continue
            match = re.match(r"^(\d+)\s+(\d+)\s+(\d+)\s*-\s*(.+?)\s+([\d.,]+)$", normalized)
            if not match:
                continue
            pedidos.append(
                {
                    "numero_unico": match.group(1),
                    "ped_mercos": match.group(2),
                    "codigo_parceiro": match.group(3),
                    "parceiro": clean_text(match.group(4)),
                    "valor_total": parse_value(match.group(5)),
                }
            )

    if not montante:
        montante = len(pedidos)
    if not total_geral:
        total_geral = sum(pedido["valor_total"] for pedido in pedidos)

    itens: list[dict[str, Any]] = []
    units = r"(?:PC|UN|PT|KG|CX|MT|M2|LT|FD|SC|RL|CJ|JG|BD|GL|TB|PR|DZ|CT|MH|MO|MM|PAR|PÇ|PE|M)"
    itens_match = re.search(
        r"PRODUTO\s+UND\.\s+QTD\s+NEG\.\s+QTD\s+VOL\.\s*\n(.*?)(?=TOTAL\s*:|\Z)",
        text,
        re.S | re.I,
    )
    if itens_match:
        for line in itens_match.group(1).strip().split("\n"):
            normalized = clean_text(line)
            if not normalized:
                continue
            match = re.match(
                rf"^(\d+)\s*-\s*(.+?)\s+({units})\s+([\d.,]+)(?:\s+([\d.,]+))?\s*$",
                normalized,
                re.I,
            )
            if not match:
                continue
            sku = clean_text(match.group(1))
            descricao = clean_text(match.group(2))
            quantidade_neg = parse_num(match.group(4))
            quantidade_vol = parse_num(match.group(5) or "0")
            itens.append(
                {
                    "sku": sku,
                    "descricao": descricao,
                    "produto": f"{sku} - {descricao}",
                    "unidade": clean_text(match.group(3)).upper(),
                    "tipo_produto": "PRODUTO ACABADO",
                    "quantidade": quantidade_neg,
                    "quantidade_neg": quantidade_neg,
                    "quantidade_vol": quantidade_vol,
                    "quantity_total": quantidade_neg,
                }
            )

    return {
        "ordem_carga": ordem_carga,
        "romaneio_identity": normalize_romaneio_identity(ordem_carga or filename),
        "document_kind": infer_document_kind(f"{filename}\n{text}"),
        "empresa": codigo_empresa,
        "nome_empresa": nome_empresa,
        "pedidos": pedidos,
        "montante": montante,
        "total_geral": round(total_geral, 2),
        "itens": itens,
        "file": filename,
        "files": [filename],
        "text_length": len(text),
    }


def build_romaneio_event(parsed: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    now = datetime.now(timezone.utc).isoformat()
    fingerprint = json.dumps(
        {"oc": parsed["ordem_carga"], "ic": len(parsed["itens"]), "f": parsed["file"]},
        ensure_ascii=False,
    )
    digest = hashlib.md5(fingerprint.encode()).hexdigest()[:8]
    event_id = f"{SOURCE_CODE}:{parsed['ordem_carga']}:{now.replace(':', '').replace('-', '')}:{digest}"

    payload = {
        "event_id": event_id,
        "event_type": "update",
        "event_at": now,
        "romaneio": {
            "codigo": parsed["ordem_carga"],
            "empresa": parsed["empresa"],
            "status": "1",
            "pedido": ",".join(pedido["numero_unico"] for pedido in parsed["pedidos"]),
            "parceiro": parsed["pedidos"][0]["parceiro"] if parsed["pedidos"] else "",
            "cidade": parsed.get("cidade") or (parsed["pedidos"][0].get("cidade") if parsed["pedidos"] else ""),
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
        "file_names": parsed.get("files") or [parsed["file"]],
        "document_kind": parsed.get("document_kind") or "romaneio",
        "items_source": "pdf_itens_caminhao" if parsed["itens"] else "none",
        "items_count": len(parsed["itens"]),
        "pedidos_count": len(parsed["pedidos"]),
        "montante": parsed["montante"],
        "total_geral": parsed["total_geral"],
        "nome_empresa": parsed["nome_empresa"],
        "codigo_empresa": parsed["empresa"],
        "ordem_carga": parsed["ordem_carga"],
        "romaneio_identity": parsed.get("romaneio_identity") or parsed["ordem_carga"],
        "pedidos_detail": parsed["pedidos"],
        "source_origin": parsed.get("source_origin") or "pdf_parser",
    }

    return payload, meta

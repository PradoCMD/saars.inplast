#!/usr/bin/env python3
"""
Atualiza a planilha PEDIDOS TRANSPORTADORAS no Google Sheets
com dados extraídos dos PDFs de romaneio.

Uso:
  python3 update_planilha_gsheets.py
  python3 update_planilha_gsheets.py --sheet-id "1ABC...xyz"
  python3 update_planilha_gsheets.py --credentials "/caminho/credentials.json"
"""

import gspread
from google.oauth2.service_account import Credentials
import os
import glob
import re
import sys
from datetime import datetime, timedelta
import pdfplumber

# ── Configuração ──
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CREDENTIALS = os.path.join(SCRIPT_DIR, "google_credentials.json")
SHEET_ID_FILE = os.path.join(SCRIPT_DIR, ".sheet_id")  # Arquivo com o ID da planilha
DEFAULT_SHEET_ID = "1sp9Y4aZIY427_8i_aY0jAGzLpK1GitoUynrWFnzc6cM"  # Fallback

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


# ── Helpers ──
def ct(v):
    return re.sub(r"\s+", " ", str(v or "")).strip()

def parse_num(v):
    if not v:
        return 0.0
    s = ct(v).replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


# ── PDF Parser ──
def parse_romaneio_pdf(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)

    fname = os.path.basename(pdf_path)

    ordem_m = re.search(r"ORDEM\s+DE\s+CARGA[:\s]+(\d+)", text, re.I)
    ordem = ordem_m.group(1) if ordem_m else ""
    if not ordem:
        fn_m = re.search(r"ROMANEIO\s+(\d+)", fname, re.I)
        if fn_m:
            ordem = fn_m.group(1)

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
                pedidos.append({"cidade": "", "parceiro": ct(m.group(4))})

    itens = {}
    UNITS = r"(?:PC|UN|PT|KG|CX|MT|M2|LT|FD|SC|RL|CJ|JG|BD|GL|TB|PR|DZ|CT|MH|MO|MM|PAR|PÇ|PE|M)"
    itens_m = re.search(
        r"PRODUTO\s+UND\.\s+QTD\s+NEG\.\s+QTD\s+VOL\.\s*\n(.*?)(?=TOTAL\s*:|\Z)",
        text, re.S | re.I,
    )
    if itens_m:
        for line in itens_m.group(1).strip().split("\n"):
            l = ct(line)
            if not l:
                continue
            m = re.match(
                rf"^(\d+)\s*-\s*(.+?)\s+({UNITS})\s+([\d.,]+)(?:\s+([\d.,]+))?\s*$",
                l, re.I,
            )
            if m:
                sku = ct(m.group(1))
                qty = parse_num(m.group(4))
                itens[sku] = itens.get(sku, 0) + qty

    cidade_parceiro = pedidos[0]["parceiro"] if pedidos else "Desconhecido"

    return {
        "ordem": ordem,
        "name": f"RM {ordem} - {cidade_parceiro}",
        "itens": itens,
        "file": fname,
    }


# ── Google Sheets Connection ──
def connect_sheets(credentials_path, sheet_id):
    """Conecta ao Google Sheets e retorna o objeto da planilha."""
    if not os.path.isfile(credentials_path):
        print(f"❌ ERRO: Arquivo de credenciais não encontrado:")
        print(f"   {credentials_path}")
        print(f"\n   Siga o guia de setup para criar o google_credentials.json")
        input("\nPressione ENTER para sair...")
        sys.exit(1)

    creds = Credentials.from_service_account_file(credentials_path, scopes=SCOPES)
    gc = gspread.authorize(creds)

    try:
        spreadsheet = gc.open_by_key(sheet_id)
        print(f"✅ Conectado à planilha: {spreadsheet.title}")
        return spreadsheet
    except gspread.exceptions.SpreadsheetNotFound:
        print(f"❌ ERRO: Planilha não encontrada com ID: {sheet_id}")
        print(f"   Verifique se compartilhou a planilha com a conta de serviço.")
        input("\nPressione ENTER para sair...")
        sys.exit(1)
    except Exception as e:
        print(f"❌ ERRO ao conectar: {e}")
        input("\nPressione ENTER para sair...")
        sys.exit(1)


def get_sheet_id(args_sheet_id=None):
    """Obtém o ID da planilha por argumento, variável de ambiente ou arquivo."""
    if args_sheet_id:
        return args_sheet_id
    
    env_id = os.getenv("GOOGLE_SHEET_ID")
    if env_id:
        return env_id
    
    if os.path.isfile(SHEET_ID_FILE):
        with open(SHEET_ID_FILE, "r") as f:
            return f.read().strip()
    
    if DEFAULT_SHEET_ID:
        return DEFAULT_SHEET_ID
    
    print("❌ ERRO: ID da planilha Google Sheets não configurado!")
    input("\nPressione ENTER para sair...")
    sys.exit(1)


# ── Date helpers for Google Sheets ──
def date_to_serial(dt):
    """Converte datetime para serial number do Google Sheets (epoch: 30/12/1899)."""
    if not isinstance(dt, datetime):
        return ""
    delta = dt - datetime(1899, 12, 30)
    return delta.days + delta.seconds / 86400

def serial_to_date(serial):
    """Converte serial number do Google Sheets para datetime."""
    if not serial or not isinstance(serial, (int, float)):
        return None
    try:
        return datetime(1899, 12, 30) + timedelta(days=float(serial))
    except:
        return None

def parse_date_cell(val):
    """Tenta interpretar um valor como data."""
    if isinstance(val, datetime):
        return val
    if isinstance(val, (int, float)) and val > 40000:
        return serial_to_date(val)
    if isinstance(val, str):
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d/%m/%y"):
            try:
                return datetime.strptime(val.strip(), fmt)
            except:
                continue
    return None


def col_letter(n):
    """Converte número de coluna (1-based) para letra(s). 1→A, 27→AA, etc."""
    result = ""
    while n > 0:
        n -= 1
        result = chr(65 + n % 26) + result
        n //= 26
    return result


# ── Main ──
def main():
    import argparse
    parser = argparse.ArgumentParser(description="Atualizar planilha Google Sheets com romaneios")
    parser.add_argument("--sheet-id", default=None, help="ID da planilha Google Sheets")
    parser.add_argument("--credentials", default=DEFAULT_CREDENTIALS, help="Caminho do JSON de credenciais")
    parser.add_argument("--tab", default="PROGRAMAÇÃO", help="Nome da aba")
    args = parser.parse_args()

    print("=" * 60)
    print("  AUTOMAÇÃO - PEDIDOS TRANSPORTADORAS 2025")
    print("  Versão Google Sheets")
    print("=" * 60)

    # ── 1. Buscar PDFs ──
    POSSIVEIS_PASTAS_PDF = [
        "/Volumes/logistica/Automação Romaneio Logistica x PCP/",
        "//srv/logistica/Automação Romaneio Logistica x PCP/",
        os.path.join(os.path.dirname(SCRIPT_DIR), "Romaneios"),
    ]

    folder = None
    for pasta in POSSIVEIS_PASTAS_PDF:
        if os.path.isdir(pasta):
            folder = pasta
            break

    if not folder:
        print("\n⚠️  Nenhuma pasta de PDFs encontrada. Somente reorganizando existentes.")
        pdfs = []
    else:
        pdfs = sorted(glob.glob(os.path.join(folder, "ROMANEIO *.pdf")))
        print(f"\n📂 Pasta PDFs: {folder}")
        print(f"📄 PDFs encontrados: {len(pdfs)}")

    # ── 2. Parsear PDFs ──
    pdf_data = {}
    for p in pdfs:
        try:
            data = parse_romaneio_pdf(p)
            ordem = data["ordem"]
            if ordem:
                if ordem not in pdf_data:
                    pdf_data[ordem] = data
                else:
                    for sku, qty in data["itens"].items():
                        pdf_data[ordem]["itens"][sku] = pdf_data[ordem]["itens"].get(sku, 0) + qty
                    if "Desconhecido" in pdf_data[ordem]["name"] and "Desconhecido" not in data["name"]:
                        pdf_data[ordem]["name"] = data["name"]
        except Exception as e:
            print(f"   ❌ Erro ao ler {os.path.basename(p)}: {e}")

    if pdfs:
        print(f"   Ordens únicas dos PDFs: {len(pdf_data)}")

    # ── 3. Conectar Google Sheets ──
    sheet_id = get_sheet_id(args.sheet_id)
    print(f"\n🔗 Conectando ao Google Sheets...")
    spreadsheet = connect_sheets(args.credentials, sheet_id)

    try:
        ws = spreadsheet.worksheet(args.tab)
    except gspread.exceptions.WorksheetNotFound:
        print(f"❌ Aba '{args.tab}' não encontrada!")
        print(f"   Abas disponíveis: {[s.title for s in spreadsheet.worksheets()]}")
        input("\nPressione ENTER para sair...")
        return

    # ── 4. Ler dados existentes da planilha ──
    print("📊 Lendo dados existentes da planilha...")
    all_values = ws.get_all_values()

    if len(all_values) < 3:
        print("❌ Planilha parece vazia ou com menos de 3 linhas!")
        input("\nPressione ENTER para sair...")
        return

    row1 = all_values[0]  # Datas
    row2 = all_values[1]  # Nomes dos romaneios
    max_row = len(all_values)
    max_col = max(len(row) for row in all_values)

    # Mapa de produtos (coluna A)
    product_rows = {}
    for r_idx in range(2, max_row):  # 0-indexed, linha 3+
        val = all_values[r_idx][0] if len(all_values[r_idx]) > 0 else ""
        if val and " - " in str(val):
            sku = str(val).split(" - ")[0].strip()
            product_rows[sku] = r_idx  # 0-indexed

    print(f"   Produtos: {len(product_rows)}")

    # Extrair romaneios existentes
    romaneio_groups = []
    existing_romaneios = {}
    max_date = datetime(2023, 1, 1)

    col = 2  # 0-indexed, coluna C
    while col < max_col:
        name = row2[col] if col < len(row2) else ""
        if not name or not str(name).strip().startswith("RM "):
            col += 1
            continue

        d_str = row1[col] if col < len(row1) else ""
        d_val = parse_date_cell(d_str)

        if d_val and d_val > max_date:
            max_date = d_val

        # Extrair número da ordem
        m = re.search(r"RM\s+(\d+)", str(name), re.I)
        ordem = m.group(1) if m else None

        # Ler dados das linhas
        items = {}
        for r_idx in range(2, max_row):
            if r_idx in product_rows.values():
                cell_val = all_values[r_idx][col] if col < len(all_values[r_idx]) else ""
                if cell_val and str(cell_val).strip():
                    try:
                        num_val = float(str(cell_val).replace(",", "."))
                        if num_val != 0:
                            items[r_idx] = num_val
                    except ValueError:
                        pass

        romaneio_groups.append({
            "date": d_val,
            "name": str(name).strip(),
            "ordem": ordem,
            "items": items,
        })
        if ordem:
            existing_romaneios[ordem] = True

        col += 2  # Pular coluna ESTOQUE INT

    print(f"   Romaneios existentes: {len(romaneio_groups)}")

    # ── 5. Adicionar novos romaneios dos PDFs ──
    new_count = 0
    for rd in pdf_data.values():
        if rd["ordem"] not in existing_romaneios:
            next_date = max_date + timedelta(days=2)
            max_date = next_date

            items = {}
            for sku, qty in rd["itens"].items():
                if sku in product_rows:
                    items[product_rows[sku]] = qty

            romaneio_groups.append({
                "date": next_date,
                "name": rd["name"],
                "ordem": rd["ordem"],
                "items": items,
            })
            new_count += 1

    if new_count:
        print(f"   ➕ Novos romaneios adicionados: {new_count}")

    # ── 6. Ordenar por data ──
    com_data = [rg for rg in romaneio_groups if isinstance(rg["date"], datetime)]
    sem_data = [rg for rg in romaneio_groups if not isinstance(rg["date"], datetime)]
    com_data.sort(key=lambda x: x["date"])
    romaneio_groups_sorted = com_data + sem_data

    print(f"\n📝 Reescrevendo {len(romaneio_groups_sorted)} romaneios ordenados...")
    print(f"   Com data: {len(com_data)} | Sem data: {len(sem_data)}")

    # ── 7. Construir a grade de dados ──
    # Preparar todo o bloco de colunas C em diante
    total_rm_cols = len(romaneio_groups_sorted) * 2
    
    # Inicializar grade vazia
    grid = []
    for r in range(max_row):
        grid.append([""] * total_rm_cols)

    target = 0  # Índice na grade (0-based)
    for i, rg in enumerate(romaneio_groups_sorted):
        # Linha 1: Data
        if rg["date"]:
            grid[0][target] = rg["date"].strftime("%d/%m/%Y")
        else:
            grid[0][target] = ""

        # Linha 1: ESTOQUE INT header vazio
        grid[0][target + 1] = ""

        # Linha 2: Nome do romaneio
        grid[1][target] = rg["name"]
        grid[1][target + 1] = "ESTOQUE INT"

        # Linhas 3+: Dados
        prev_est_letter = "B" if target == 0 else col_letter(3 + target - 1)  # col C = 3
        curr_rm_letter = col_letter(3 + target)

        for r_idx in range(2, max_row):
            if r_idx in product_rows.values():
                # Valor do romaneio
                if r_idx in rg["items"]:
                    grid[r_idx][target] = rg["items"][r_idx]
                
                # Fórmula ESTOQUE INT
                row_num = r_idx + 1  # 1-indexed para fórmula
                grid[r_idx][target + 1] = f"={prev_est_letter}{row_num}-{curr_rm_letter}{row_num}"

        has_data = "✅" if rg["date"] else "⚠️"
        date_str = rg["date"].strftime("%d/%m/%Y") if rg["date"] else "---"
        print(f"  {has_data} {date_str:12s} | {rg['name']}")

        target += 2

    # ── 8. Enviar para Google Sheets ──
    print(f"\n🔄 Enviando dados para Google Sheets...")
    
    # Limpar área de romaneios (colunas C em diante)
    start_col_letter = "C"
    end_col_letter = col_letter(2 + total_rm_cols + 10)  # Extra para limpar colunas residuais
    clear_range = f"{start_col_letter}1:{end_col_letter}{max_row}"
    
    print(f"   Limpando: {clear_range}")
    ws.batch_clear([clear_range])

    # Escrever dados novos
    if total_rm_cols > 0:
        end_data_letter = col_letter(2 + total_rm_cols)
        update_range = f"C1:{end_data_letter}{max_row}"
        
        print(f"   Escrevendo: {update_range}")
        ws.update(range_name=update_range, values=grid, value_input_option="USER_ENTERED")

    # ── 9. Formatar datas ──
    print("🎨 Aplicando formatação...")
    
    sheet_id_num = ws.id
    requests = []

    # Cores exatas da planilha (3):
    LIME_GREEN = {"red": 0, "green": 1, "blue": 0}          # #00FF00 - datas
    LIGHT_GREEN = {"red": 0.85, "green": 0.92, "blue": 0.83} # #D9EAD3 - ESTOQUE INT
    BLUE_RM = {"red": 0.56, "green": 0.67, "blue": 0.86}     # #8EAADB - nome do RM
    BLACK = {"red": 0, "green": 0, "blue": 0}

    for i in range(len(romaneio_groups_sorted)):
        col_idx = 2 + (i * 2)  # 0-indexed, coluna C = 2
        has_date = romaneio_groups_sorted[i]["date"] is not None
        
        # ── Linha 1: Data (col ímpar) - #00FF00 verde limão ──
        requests.append({
            "repeatCell": {
                "range": {
                    "sheetId": sheet_id_num,
                    "startRowIndex": 0, "endRowIndex": 1,
                    "startColumnIndex": col_idx, "endColumnIndex": col_idx + 1,
                },
                "cell": {
                    "userEnteredFormat": {
                        "numberFormat": {"type": "DATE", "pattern": "dd/mm/yyyy"},
                        "backgroundColor": LIME_GREEN if has_date else LIGHT_GREEN,
                        "textFormat": {"bold": True, "fontSize": 11, "foregroundColor": BLACK},
                        "horizontalAlignment": "CENTER",
                        "verticalAlignment": "MIDDLE",
                    },
                },
                "fields": "userEnteredFormat(numberFormat,backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
            }
        })

        # ── Linha 1: ESTOQUE INT espaço (col par) - #D9EAD3 verde claro ──
        requests.append({
            "repeatCell": {
                "range": {
                    "sheetId": sheet_id_num,
                    "startRowIndex": 0, "endRowIndex": 1,
                    "startColumnIndex": col_idx + 1, "endColumnIndex": col_idx + 2,
                },
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": LIGHT_GREEN,
                        "textFormat": {"bold": True, "foregroundColor": BLACK},
                    },
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat)",
            }
        })

        # ── Linha 2: Nome do RM (col ímpar) - #8EAADB azul ──
        requests.append({
            "repeatCell": {
                "range": {
                    "sheetId": sheet_id_num,
                    "startRowIndex": 1, "endRowIndex": 2,
                    "startColumnIndex": col_idx, "endColumnIndex": col_idx + 1,
                },
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": BLUE_RM,
                        "textFormat": {"bold": True, "fontSize": 10, "foregroundColor": BLACK},
                        "horizontalAlignment": "CENTER",
                        "verticalAlignment": "MIDDLE",
                        "wrapStrategy": "WRAP",
                    },
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
            }
        })

        # ── Linha 2: "ESTOQUE INT" (col par) - #D9EAD3 verde claro ──
        requests.append({
            "repeatCell": {
                "range": {
                    "sheetId": sheet_id_num,
                    "startRowIndex": 1, "endRowIndex": 2,
                    "startColumnIndex": col_idx + 1, "endColumnIndex": col_idx + 2,
                },
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": LIGHT_GREEN,
                        "textFormat": {"bold": True, "fontSize": 10, "foregroundColor": BLACK},
                        "horizontalAlignment": "CENTER",
                        "verticalAlignment": "MIDDLE",
                    },
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
            }
        })

        # ── Linhas 3+: ESTOQUE INT dados (col par) - #D9EAD3 verde claro + bold ──
        requests.append({
            "repeatCell": {
                "range": {
                    "sheetId": sheet_id_num,
                    "startRowIndex": 2, "endRowIndex": max_row,
                    "startColumnIndex": col_idx + 1, "endColumnIndex": col_idx + 2,
                },
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": LIGHT_GREEN,
                        "textFormat": {"bold": True, "foregroundColor": BLACK},
                    },
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat)",
            }
        })

    # Nota nas datas
    for i in range(len(romaneio_groups_sorted)):
        col_idx = 2 + (i * 2)
        requests.append({
            "updateCells": {
                "range": {
                    "sheetId": sheet_id_num,
                    "startRowIndex": 0, "endRowIndex": 1,
                    "startColumnIndex": col_idx, "endColumnIndex": col_idx + 1,
                },
                "rows": [{
                    "values": [{
                        "note": "📅 Altere esta data para reordenar os romaneios.\nNa próxima execução, as colunas serão reorganizadas pela ordem das datas.",
                    }]
                }],
                "fields": "note",
            }
        })

    # Data validation nas datas
    requests.append({
        "setDataValidation": {
            "range": {
                "sheetId": sheet_id_num,
                "startRowIndex": 0, "endRowIndex": 1,
                "startColumnIndex": 2,
                "endColumnIndex": 2 + len(romaneio_groups_sorted) * 2,
            },
            "rule": {
                "condition": {"type": "DATE_IS_VALID"},
                "inputMessage": "📅 Insira uma data (dd/mm/aaaa) para reordenar os romaneios.",
                "showCustomUi": True,
                "strict": False,
            },
        }
    })

    # Centralizar TODAS as células de dados (colunas C em diante, linhas 3+)
    total_cols = 2 + len(romaneio_groups_sorted) * 2
    requests.append({
        "repeatCell": {
            "range": {
                "sheetId": sheet_id_num,
                "startRowIndex": 2, "endRowIndex": max_row,
                "startColumnIndex": 2, "endColumnIndex": total_cols,
            },
            "cell": {
                "userEnteredFormat": {
                    "horizontalAlignment": "CENTER",
                    "verticalAlignment": "MIDDLE",
                },
            },
            "fields": "userEnteredFormat(horizontalAlignment,verticalAlignment)",
        }
    })

    # Formatação condicional: fundo VERMELHO para valores < 0 (texto preto)
    requests.append({
        "addConditionalFormatRule": {
            "rule": {
                "ranges": [{
                    "sheetId": sheet_id_num,
                    "startRowIndex": 2,
                    "endRowIndex": max_row,
                    "startColumnIndex": 2,
                    "endColumnIndex": total_cols,
                }],
                "booleanRule": {
                    "condition": {
                        "type": "NUMBER_LESS",
                        "values": [{"userEnteredValue": "0"}],
                    },
                    "format": {
                        "backgroundColor": {"red": 1, "green": 0, "blue": 0},
                        "textFormat": {"foregroundColor": BLACK},
                    },
                },
            },
            "index": 0,
        }
    })

    # Enviar batch de formatação
    if requests:
        # Google Sheets API limita batch requests
        BATCH_SIZE = 50
        for batch_start in range(0, len(requests), BATCH_SIZE):
            batch = requests[batch_start:batch_start + BATCH_SIZE]
            spreadsheet.batch_update({"requests": batch})
        print(f"   ✅ {len(requests)} formatações aplicadas")

    # ── Fim ──
    sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"
    print(f"\n{'=' * 60}")
    print(f"  ✅ PLANILHA ATUALIZADA COM SUCESSO!")
    print(f"  Romaneios: {len(romaneio_groups_sorted)}")
    print(f"  Novos:     {new_count}")
    print(f"  Produtos:  {len(product_rows)}")
    print(f"  Link:      {sheet_url}")
    print(f"{'=' * 60}")
    input("\nPressione ENTER para fechar...")


if __name__ == "__main__":
    main()

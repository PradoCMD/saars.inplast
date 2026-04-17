#!/usr/bin/env python3
"""Parse the published Google Sheet for intermediate stock using native XLSX download."""

from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path

try:
    from xlsx_ledger_parser import ParserConfig, build_parser, build_records, emit_records
except ModuleNotFoundError:  # pragma: no cover - fallback for package import
    from .xlsx_ledger_parser import ParserConfig, build_parser, build_records, emit_records


DEFAULT_PUBLISHED_URL = (
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSs-C_7_vu6L1lq9ScJEcQNT3F23en4MdgHBUI2FFkqBm9c_Zq8WHdtZuXkMhQvcegp05KewJQzPlCP/pub?output=xlsx"
)


CONFIG = ParserConfig(
    movement_sheet="Movimentacoes",
    stock_sheet="Estoque",
    bank_sheet="Banco de dados",
    product_type="intermediario",
    unit_code="UN",
    location_code="ESTOQUE_INTERMEDIARIO",
    sku_prefix="EST-INT-",
    parser_name="parse_estoque_intermediario_google",
    supply_strategy="produzir",
)


def download_workbook(url: str) -> Path:
    temp_fd, temp_path = tempfile.mkstemp(suffix=".xlsx")
    os.close(temp_fd)
    path = Path(temp_path)
    
    # Faz o download via curl para garantir que seguimos redirects e cookies
    try:
        subprocess.run(
            ["curl", "-sL", url, "-o", str(path)],
            check=True,
            timeout=60
        )
    except Exception as e:
        if path.exists():
            path.unlink()
        raise RuntimeError(f"Falha ao baixar planilha do Google: {e}")
        
    return path


def main() -> int:
    parser = build_parser("Parser nativo (.xlsx) da planilha de estoque intermediario")
    parser.set_defaults(workbook=DEFAULT_PUBLISHED_URL)
    args = parser.parse_args()
    
    workbook_url = args.workbook
    temp_file = None
    
    try:
        # Se for uma URL (Google Sheets ou outro), baixa primeiro
        if workbook_url.startswith("http"):
            temp_file = download_workbook(workbook_url)
            path_to_parse = temp_file
        else:
            path_to_parse = Path(workbook_url)

        records, summary = build_records(path_to_parse, CONFIG)
        # Injeta a URL original no sumário para rastreabilidade
        summary["workbook_url"] = workbook_url
        
        return emit_records(records, summary, pretty=args.pretty, emit_summary=args.summary)
        
    finally:
        if temp_file and temp_file.exists():
            temp_file.unlink()


if __name__ == "__main__":
    raise SystemExit(main())

import datetime as dt
import os
import subprocess
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any

try:
    from xlsx_ledger_parser import (
        WorkbookReader,
        build_name_index,
        build_parser,
        clean_legacy_code,
        coalesce_display_name,
        emit_records,
        excel_serial_to_iso,
        normalize_text,
        parse_decimal,
        resolve_sku,
        ParserConfig,
        build_records,
    )
except ModuleNotFoundError:  # pragma: no cover - fallback for package import
    from .xlsx_ledger_parser import (
        WorkbookReader,
        build_name_index,
        build_parser,
        clean_legacy_code,
        coalesce_display_name,
        emit_records,
        excel_serial_to_iso,
        normalize_text,
        parse_decimal,
        resolve_sku,
        ParserConfig,
        build_records,
    )

DEFAULT_PUBLISHED_URL = (
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTTPIHy6_gEBngeXzFQQGvPdCxNPeBP_le2etDdbTPTbF8XcGRPiuzVT5QSa1YRQsLQFb_7GiFNKCFa/pub?output=xlsx"
)

CONFIG = ParserConfig(
    movement_sheet="MOVIMENTACOES DE MP",
    stock_sheet="ESTOQUE MP",
    bank_sheet="BANCO DE DADOS DE MP",
    product_type="materia_prima",
    unit_code="KG",
    location_code="ALMOXARIFADO_MP",
    sku_prefix="ALMOX-MP-",
    parser_name="parse_estoque_almoxarifado_mp_google",
)


def download_workbook(url: str) -> Path:
    temp_fd, temp_path = tempfile.mkstemp(suffix=".xlsx")
    os.close(temp_fd)
    path = Path(temp_path)
    try:
        subprocess.run(["curl", "-sL", url, "-o", str(path)], check=True, timeout=60)
    except Exception as e:
        if path.exists():
            path.unlink()
        raise RuntimeError(f"Falha ao baixar planilha Almox MP: {e}")
    return path


def main() -> int:
    parser = build_parser("Parser nativo (.xlsx) da planilha de materia-prima do almoxarifado")
    parser.set_defaults(workbook=DEFAULT_PUBLISHED_URL)
    args = parser.parse_args()
    
    workbook_url = args.workbook
    temp_file = None
    
    try:
        if workbook_url.startswith("http"):
            temp_file = download_workbook(workbook_url)
            path_to_parse = temp_file
        else:
            path_to_parse = Path(workbook_url)

        records, summary = build_records(path_to_parse, CONFIG)
        summary["workbook_url"] = workbook_url
        
        return emit_records(records, summary, pretty=args.pretty, emit_summary=args.summary)
        
    finally:
        if temp_file and temp_file.exists():
            temp_file.unlink()


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Parse the materia-prima ledger from Estoque Almoxarifado.xlsx."""

from __future__ import annotations

from pathlib import Path

try:
    from xlsx_ledger_parser import ParserConfig, build_parser, build_records, emit_records
except ModuleNotFoundError:  # pragma: no cover - fallback for package import
    from .xlsx_ledger_parser import ParserConfig, build_parser, build_records, emit_records


CONFIG = ParserConfig(
    movement_sheet="MOVIMENTACOES DE MP",
    stock_sheet="ESTOQUE MP",
    bank_sheet="BANCO DE DADOS DE MP",
    product_type="materia_prima",
    unit_code="KG",
    location_code="ALMOXARIFADO_MP",
    sku_prefix="ALMOX-MP-",
    parser_name="parse_estoque_almoxarifado_mp",
)


def main() -> int:
    parser = build_parser("Parser de materia-prima do almoxarifado")
    args = parser.parse_args()
    records, summary = build_records(Path(args.workbook), CONFIG)
    return emit_records(records, summary, pretty=args.pretty, emit_summary=args.summary)


if __name__ == "__main__":
    raise SystemExit(main())

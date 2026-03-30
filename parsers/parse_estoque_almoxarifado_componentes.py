#!/usr/bin/env python3
"""Parse bought components from the almoxarifado workbook."""

from __future__ import annotations

from pathlib import Path

try:
    from xlsx_ledger_parser import ParserConfig, build_parser, build_records, emit_records
except ModuleNotFoundError:  # pragma: no cover - fallback for package import
    from .xlsx_ledger_parser import ParserConfig, build_parser, build_records, emit_records


CONFIG = ParserConfig(
    movement_sheet="MOVIMENTACOES DE PARAFUSOS",
    stock_sheet="ESTOQUE PARAFUSOS",
    bank_sheet="BANCO DE DADOS PARAFUSOS",
    product_type="componente",
    unit_code="UN",
    location_code="ALMOXARIFADO_COMPONENTES",
    sku_prefix="ALMOX-COMP-",
    parser_name="parse_estoque_almoxarifado_componentes",
)


def main() -> int:
    parser = build_parser("Parser de componentes comprados do almoxarifado")
    args = parser.parse_args()
    records, summary = build_records(Path(args.workbook), CONFIG)
    return emit_records(records, summary, pretty=args.pretty, emit_summary=args.summary)


if __name__ == "__main__":
    raise SystemExit(main())

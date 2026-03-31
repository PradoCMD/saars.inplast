#!/usr/bin/env python3
"""Parse the published Google Sheet for almoxarifado components stock."""

from __future__ import annotations

try:
    from published_ledger_parser import PublishedLedgerConfig, build_records_from_published_sheet
    from xlsx_ledger_parser import build_parser, emit_records
except ModuleNotFoundError:  # pragma: no cover - fallback for package import
    from .published_ledger_parser import PublishedLedgerConfig, build_records_from_published_sheet
    from .xlsx_ledger_parser import build_parser, emit_records


DEFAULT_PUBLISHED_URL = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vTTPIHy6_gEBngeXzFQQGvPdCxNPeBP_le2etDdbTPTbF8XcGRPiuzVT5QSa1YRQsLQFb_7GiFNKCFa/"
    "pubhtml?widget=true&headers=false"
)

CONFIG = PublishedLedgerConfig(
    movement_gid="130817617",
    stock_gid="891527220",
    bank_gid="0",
    product_type="componente",
    unit_code="UN",
    location_code="ALMOXARIFADO_COMPONENTES",
    sku_prefix="ALMOX-COMP-",
    parser_name="parse_estoque_almoxarifado_componentes_google",
    movement_sheet="MOVIMENTACOES DE PARAFUSOS",
    stock_sheet="ESTOQUE PARAFUSOS",
    bank_sheet="BANCO DE DADOS PARAFUSOS",
)


def main() -> int:
    parser = build_parser("Parser da planilha publicada de componentes do almoxarifado")
    parser.set_defaults(workbook=DEFAULT_PUBLISHED_URL)
    args = parser.parse_args()
    records, summary = build_records_from_published_sheet(args.workbook, CONFIG)
    return emit_records(records, summary, pretty=args.pretty, emit_summary=args.summary)


if __name__ == "__main__":
    raise SystemExit(main())

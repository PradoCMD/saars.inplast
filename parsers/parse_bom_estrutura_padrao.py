#!/usr/bin/env python3
"""Parse standard BOM spreadsheets for finished and intermediate structures."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from xlsx_ledger_parser import WorkbookReader, clean_legacy_code, emit_records, slugify


TITLE_CELL = "A1"
HEADER_ROW_INDEX = 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Le uma estrutura padrao de composicao para BOM final ou intermediaria"
    )
    parser.add_argument("workbook", help="Caminho do arquivo xlsx")
    parser.add_argument("--summary", action="store_true", help="Escreve o resumo em stderr")
    parser.add_argument("--pretty", action="store_true", help="Formata o JSON com identacao")
    parser.add_argument("--sheet-name", default="Planilha1", help="Nome da aba a ser lida")
    parser.add_argument(
        "--source-scope",
        choices=("bom_final", "bom_intermediario"),
        required=True,
        help="Escopo da estrutura importada",
    )
    parser.add_argument("--company-code", default="INPLAST")
    return parser


def default_parent_profile(source_scope: str) -> tuple[str, str, str]:
    if source_scope == "bom_final":
        return "acabado", "montar", "montagem"
    return "intermediario", "produzir", "producao"


def default_component_profile(source_scope: str) -> tuple[str, str]:
    if source_scope == "bom_final":
        return "intermediario", "produzir"
    return "materia_prima", "comprar"


def fallback_sku(prefix: str, raw_code: str, raw_description: str) -> str:
    cleaned = clean_legacy_code(raw_code or "")
    if cleaned:
        return cleaned
    return f"{prefix}{slugify(raw_description or raw_code or 'ITEM')}"


def read_rows(workbook_path: Path, sheet_name: str) -> tuple[str, list[dict[str, Any]]]:
    reader = WorkbookReader(workbook_path)
    try:
        rows = reader.read_sheet(sheet_name)
    finally:
        reader.close()

    if not rows:
        raise ValueError(f"Aba sem dados: {sheet_name}")

    title = rows[0].get("A", {}).get("value", "") or ""
    return title, rows


def parse_records(workbook_path: Path, sheet_name: str, source_scope: str, company_code: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    title, rows = read_rows(workbook_path, sheet_name)
    parent_product_type, parent_supply_strategy, default_process_stage = default_parent_profile(source_scope)
    component_product_type, component_supply_strategy = default_component_profile(source_scope)

    records: list[dict[str, Any]] = []
    missing_parent_rows: list[int] = []
    missing_component_rows: list[int] = []
    missing_quantity_rows: list[int] = []
    parent_counter: dict[str, int] = {}

    current_parent_sku: str | None = None
    current_parent_description: str | None = None

    for idx, row in enumerate(rows[HEADER_ROW_INDEX + 1 :], start=HEADER_ROW_INDEX + 2):
        parent_code = (row.get("A", {}) or {}).get("value", "") or ""
        parent_description = (row.get("B", {}) or {}).get("value", "") or ""
        component_code = (row.get("C", {}) or {}).get("value", "") or ""
        component_description = (row.get("D", {}) or {}).get("value", "") or ""
        quantity_text = (row.get("E", {}) or {}).get("value", "") or ""

        if parent_code or parent_description:
            current_parent_sku = fallback_sku("BOM-PARENT-", parent_code, parent_description)
            current_parent_description = (parent_description or parent_code or "").strip()

        if not any((parent_code, parent_description, component_code, component_description, quantity_text)):
            continue

        if not current_parent_sku or not current_parent_description:
            missing_parent_rows.append(idx)
            continue

        component_sku = fallback_sku("BOM-COMP-", component_code, component_description)
        component_display = (component_description or component_code or "").strip()
        if not component_display:
            missing_component_rows.append(idx)
            continue

        try:
            quantity_per = float(str(quantity_text).replace(",", "."))
        except ValueError:
            quantity_per = 0.0

        if quantity_per <= 0:
            missing_quantity_rows.append(idx)
            continue

        parent_counter[current_parent_sku] = parent_counter.get(current_parent_sku, 0) + 1
        sequence_no = parent_counter[current_parent_sku]

        records.append(
            {
                "parent_sku": current_parent_sku,
                "parent_description": current_parent_description,
                "parent_product_type": parent_product_type,
                "parent_supply_strategy": parent_supply_strategy,
                "component_sku": component_sku,
                "component_description": component_display,
                "component_product_type": component_product_type,
                "component_supply_strategy": component_supply_strategy,
                "quantity_per": quantity_per,
                "scrap_pct": 0,
                "sequence_no": sequence_no,
                "source_scope": source_scope,
                "process_stage": default_process_stage,
                "component_role": "componente",
                "assembly_line_code": None,
                "workstation_code": None,
                "usage_notes": None,
                "company_code": company_code,
                "metadata": {
                    "parser_name": "parse_bom_estrutura_padrao",
                    "sheet_name": sheet_name,
                    "sheet_title": title,
                    "row_number": idx,
                    "parent_legacy_code": clean_legacy_code(parent_code),
                    "component_legacy_code": clean_legacy_code(component_code),
                    "raw_parent_code": str(parent_code),
                    "raw_component_code": str(component_code),
                },
            }
        )

    summary = {
        "workbook": str(workbook_path),
        "parser_name": "parse_bom_estrutura_padrao",
        "sheet_name": sheet_name,
        "sheet_title": title,
        "source_scope": source_scope,
        "record_count": len(records),
        "parent_count": len(parent_counter),
        "missing_parent_rows": missing_parent_rows,
        "missing_component_rows": missing_component_rows,
        "missing_quantity_rows": missing_quantity_rows,
    }
    return records, summary


def main() -> int:
    args = build_parser().parse_args()
    workbook_path = Path(args.workbook)
    records, summary = parse_records(
        workbook_path=workbook_path,
        sheet_name=args.sheet_name,
        source_scope=args.source_scope,
        company_code=args.company_code,
    )
    return emit_records(records, summary, pretty=args.pretty, emit_summary=args.summary)


if __name__ == "__main__":
    raise SystemExit(main())

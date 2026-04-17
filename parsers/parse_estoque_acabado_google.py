#!/usr/bin/env python3
"""Parse the published Google Sheet for finished-goods stock using native XLSX download."""

from __future__ import annotations

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
    )

DEFAULT_PUBLISHED_URL = (
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRIlcxI2E0BRlf4i2M49MIW5XiLx69xWwkrLmst0Fs5HW5gSlk-wf8wAVjur7FH1mQRz_-qmUvZGJND/pub?output=xlsx"
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
        raise RuntimeError(f"Falha ao baixar planilha Acabado: {e}")
    return path


def parse_bank_rows(rows: list[dict[str, dict[str, str | None]]]) -> tuple[dict[str, dict[str, Any]], dict[str, str], dict[str, str]]:
    product_by_sku: dict[str, dict[str, Any]] = {}
    barcode_to_sku: dict[str, str] = {}
    name_to_sku: dict[str, str] = {}
    
    # Header: A:CodProduto | B:Código do Produto | C:Código de Barras | D:Cód. de Barra Emb. | E:Produto | F:Qtd. embalagem
    for row in rows[1:]:
        sku = clean_legacy_code(row.get("B", {}).get("value") or "")
        barcode = (row.get("C", {}).get("value") or "").strip()
        barcode_emb = (row.get("D", {}).get("value") or "").strip()
        description = coalesce_display_name(row.get("E", {}).get("value") or "")
        qty_per_pack = parse_decimal(row.get("F", {}).get("value") or "0")
        
        if not sku or not description:
            continue
            
        product_by_sku[sku] = {
            "description": description,
            "qty_per_pack": qty_per_pack,
            "barcode": barcode,
            "barcode_emb": barcode_emb,
        }
        if barcode:
            barcode_to_sku[barcode] = sku
        if barcode_emb:
            barcode_to_sku[barcode_emb] = sku
        name_to_sku[normalize_text(description)] = sku
        
        # Também mapeia o nome ID+Nome da coluna A caso seja usado na aba Estoque
        full_label = row.get("A", {}).get("value") or ""
        if full_label:
            name_to_sku[normalize_text(full_label)] = sku
        
    return product_by_sku, barcode_to_sku, name_to_sku


def parse_stock_rows(rows: list[dict[str, dict[str, str | None]]], name_to_sku: dict[str, str]) -> dict[str, dict[str, Any]]:
    items: dict[str, dict[str, Any]] = {}
    # Header: A:Barcode | B:Produto | C:Quantidade | D:Volumes
    for row in rows[1:]:
        label = coalesce_display_name(row.get("B", {}).get("value") or "")
        barcode = (row.get("A", {}).get("value") or "").strip()
        if not label and not barcode:
            continue
            
        normalized_label = normalize_text(label)
        # Tenta achar o SKU pelo nome ou pelo barcode da coluna A
        sku = name_to_sku.get(normalized_label)
        if not sku and "-" in label:
            potential_sku = label.split("-")[0].strip()
            if potential_sku in name_to_sku.values():
                sku = potential_sku
        
        if not sku:
            sku = f"ACABADO-{label or barcode}" 

        items[sku] = {
            "sku": sku,
            "display_name": label,
            "sheet_stock": parse_decimal(row.get("C", {}).get("value") or "0"),
            "sheet_volumes": parse_decimal(row.get("D", {}).get("value") or "0"),
        }
    return items


def parse_movement_rows(
    rows: list[dict[str, dict[str, str | None]]],
    *,
    movement_label: str,
    barcode_to_sku: dict[str, str],
    name_to_sku: dict[str, str],
) -> tuple[dict[str, dict[str, Any]], Counter[str]]:
    items: dict[str, dict[str, Any]] = {}
    movement_counter: Counter[str] = Counter()
    sign = 1.0 if movement_label == "Entrada" else -1.0
    
    # Header: A:Data | B:Código (EAN) | C:Volumes | D:Produto | E:Qtd Embalagem | F:Qtd Total Un
    for row in rows[1:]:
        barcode = (row.get("B", {}).get("value") or "").strip()
        volumes = parse_decimal(row.get("C", {}).get("value") or "0")
        description = coalesce_display_name(row.get("D", {}).get("value") or "")
        qty_total = parse_decimal(row.get("F", {}).get("value") or "0")
        
        if not description and not barcode:
            continue
            
        sku = barcode_to_sku.get(barcode) or name_to_sku.get(normalize_text(description))
        if not sku:
            continue
            
        item = items.setdefault(
            sku,
            {
                "display_name": description,
                "calculated_stock": 0.0,
                "calculated_volumes": 0.0,
                "movement_count": 0,
                "last_movement_at": None,
                "movement_types": Counter(),
            },
        )
        item["calculated_stock"] += qty_total * sign
        item["calculated_volumes"] += volumes * sign
        item["movement_count"] += 1
        item["movement_types"][movement_label] += 1
        
        iso_timestamp = excel_serial_to_iso(row.get("A", {}).get("value") or "")
        if iso_timestamp and (item["last_movement_at"] is None or iso_timestamp > item["last_movement_at"]):
            item["last_movement_at"] = iso_timestamp
        movement_counter[movement_label] += 1
        
    return items, movement_counter


def merge_movement_indexes(*indexes: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for index in indexes:
        for sku, value in index.items():
            item = merged.setdefault(
                sku,
                {
                    "display_name": value.get("display_name", ""),
                    "calculated_stock": 0.0,
                    "calculated_volumes": 0.0,
                    "movement_count": 0,
                    "last_movement_at": None,
                    "movement_types": Counter(),
                },
            )
            item["display_name"] = coalesce_display_name(value.get("display_name", ""), item.get("display_name", ""))
            item["calculated_stock"] += float(value.get("calculated_stock", 0.0))
            item["calculated_volumes"] += float(value.get("calculated_volumes", 0.0))
            item["movement_count"] += int(value.get("movement_count", 0))
            item["movement_types"].update(value.get("movement_types", Counter()))
            candidate_dt = value.get("last_movement_at")
            if candidate_dt and (item["last_movement_at"] is None or candidate_dt > item["last_movement_at"]):
                item["last_movement_at"] = candidate_dt
    return merged


def build_records_from_xlsx(path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    reader = WorkbookReader(path)
    try:
        bank_rows = reader.read_sheet("Banco de Dados")
        entry_rows = reader.read_sheet("Entrada")
        exit_rows = reader.read_sheet("Saída")
        stock_rows = reader.read_sheet("Estoque")
    finally:
        reader.close()

    product_by_sku, barcode_to_sku, name_to_sku = parse_bank_rows(bank_rows)
    stock_index = parse_stock_rows(stock_rows, name_to_sku)
    entry_index, entry_counter = parse_movement_rows(entry_rows, movement_label="Entrada", barcode_to_sku=barcode_to_sku, name_to_sku=name_to_sku)
    exit_index, exit_counter = parse_movement_rows(exit_rows, movement_label="Saída", barcode_to_sku=barcode_to_sku, name_to_sku=name_to_sku)
    movement_index = merge_movement_indexes(entry_index, exit_index)
    movement_counter = entry_counter + exit_counter

    all_skus = sorted(set(product_by_sku) | set(stock_index) | set(movement_index))
    records: list[dict[str, Any]] = []
    
    for sku in all_skus:
        product_info = product_by_sku.get(sku, {})
        stock_info = stock_index.get(sku, {})
        movement_info = movement_index.get(sku, {})
        
        description = coalesce_display_name(
            stock_info.get("display_name", ""),
            movement_info.get("display_name", ""),
            product_info.get("description", ""),
            sku,
        )
        
        calculated_stock = round(float(movement_info.get("calculated_stock", 0.0)), 6)
        sheet_stock = round(float(stock_info.get("sheet_stock", 0.0)), 6) if stock_info else None
        
        quantity = sheet_stock if sheet_stock is not None else calculated_stock

        records.append({
            "sku": sku,
            "description": description,
            "quantity": quantity,
            "location_code": "EXPEDICAO",
            "company_code": "INPLAST",
            "unit_code": "UN",
            "product_type": "acabado",
            "supply_strategy": "montar",
            "metadata": {
                "parser_name": "parse_estoque_acabado_google",
                "bank_sheet": "Banco de Dados",
                "entry_sheet": "Entrada",
                "exit_sheet": "Saída",
                "stock_sheet": "Estoque",
                "qty_per_pack": product_info.get("qty_per_pack"),
                "barcode": product_info.get("barcode"),
                "barcode_emb": product_info.get("barcode_emb"),
                "sheet_stock": sheet_stock,
                "sheet_volumes": stock_info.get("sheet_volumes"),
                "calculated_stock": calculated_stock,
                "calculated_volumes": round(float(movement_info.get("calculated_volumes", 0.0)), 6),
                "movement_count": movement_info.get("movement_count", 0),
                "movement_types": dict(sorted(movement_info.get("movement_types", Counter()).items())),
                "last_movement_at": movement_info.get("last_movement_at"),
                "code_status": "trusted_code" if product_info else "missing_code",
            }
        })

    summary = {
        "parser_name": "parse_estoque_acabado_google",
        "product_type": "acabado",
        "record_count": len(records),
        "movement_row_count": sum(movement_counter.values()),
        "movement_types": dict(sorted(movement_counter.items())),
        "sheet_row_count": {
            "banco_de_dados": len(bank_rows),
            "entrada": len(entry_rows),
            "saida": len(exit_rows),
            "estoque": len(stock_rows),
        }
    }
    return records, summary


def main() -> int:
    parser = build_parser("Parser nativo (.xlsx) da planilha de estoque acabado")
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

        records, summary = build_records_from_xlsx(path_to_parse)
        summary["workbook_url"] = workbook_url
        
        return emit_records(records, summary, pretty=args.pretty, emit_summary=args.summary)
        
    finally:
        if temp_file and temp_file.exists():
            temp_file.unlink()


if __name__ == "__main__":
    raise SystemExit(main())

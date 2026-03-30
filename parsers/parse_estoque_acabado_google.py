#!/usr/bin/env python3
"""Parse the published Google Sheet for finished-goods stock."""

from __future__ import annotations

import datetime as dt
import html
import re
import urllib.request
from collections import Counter
from typing import Any

try:
    from xlsx_ledger_parser import build_parser, coalesce_display_name, emit_records, normalize_text, parse_decimal
except ModuleNotFoundError:  # pragma: no cover
    from .xlsx_ledger_parser import build_parser, coalesce_display_name, emit_records, normalize_text, parse_decimal


DEFAULT_PUBLISHED_URL = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vRIlcxI2E0BRlf4i2M49MIW5XiLx69xWwkrLmst0Fs5HW5gSlk-wf8wAVjur7FH1mQRz_-qmUvZGJND/"
    "pubhtml?widget=true&headers=false"
)
BANK_GID = "1765946121"
ENTRY_GID = "397580458"
EXIT_GID = "199094687"
STOCK_GID = "1334952448"
PARSER_NAME = "parse_estoque_acabado_google"
MONTHS_PT = {
    "jan": 1,
    "fev": 2,
    "mar": 3,
    "abr": 4,
    "mai": 5,
    "jun": 6,
    "jul": 7,
    "ago": 8,
    "set": 9,
    "out": 10,
    "nov": 11,
    "dez": 12,
}


def normalize_published_root(value: str) -> str:
    text = (value or "").strip()
    match = re.search(r"^(https://docs\.google\.com/spreadsheets/d/e/[^/]+)/pubhtml", text)
    if not match:
        raise ValueError("URL publicada invalida. Esperado endereco pubhtml do Google Sheets.")
    return match.group(1)


def build_sheet_url(published_url: str, gid: str) -> str:
    root = normalize_published_root(published_url)
    return f"{root}/pubhtml/sheet?headers=false&gid={gid}"


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def extract_rows(document: str) -> list[list[str]]:
    table_match = re.search(r'<table class="waffle"[^>]*>(.*?)</table>', document, re.S)
    if not table_match:
        raise ValueError("Tabela HTML nao encontrada na planilha publicada.")
    rows: list[list[str]] = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", table_match.group(1), re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        cleaned: list[str] = []
        for cell in cells:
            cell = re.sub(r"<br\s*/?>", "\n", cell)
            cell = re.sub(r"<[^>]+>", "", cell)
            cell = html.unescape(cell).strip()
            cleaned.append(cell)
        if any(cleaned):
            rows.append(cleaned)
    return rows


def parse_pt_short_date(value: str) -> str | None:
    text = (value or "").strip()
    match = re.fullmatch(r"(\d{1,2})/([A-Za-zçÇ]{3})\.?", text)
    if not match:
        return None
    day = int(match.group(1))
    month = MONTHS_PT.get(match.group(2).lower())
    if month is None:
        return None
    year = dt.date.today().year
    try:
        parsed = dt.datetime(year, month, day)
    except ValueError:
        return None
    return parsed.isoformat(timespec="seconds")


def extract_sku_from_label(value: str) -> str | None:
    text = (value or "").strip()
    match = re.match(r"^(\d+)\s*-\s*(.+)$", text)
    return match.group(1) if match else None


def extract_description_from_label(value: str) -> str:
    text = (value or "").strip()
    match = re.match(r"^(\d+)\s*-\s*(.+)$", text)
    return match.group(2).strip() if match else text


def parse_bank_rows(rows: list[list[str]]) -> tuple[dict[str, dict[str, Any]], dict[str, str], dict[str, str]]:
    product_by_sku: dict[str, dict[str, Any]] = {}
    barcode_to_sku: dict[str, str] = {}
    name_to_sku: dict[str, str] = {}
    for row in rows[1:]:
        sku = (row[1] if len(row) > 1 else "").strip()
        barcode = (row[2] if len(row) > 2 else "").strip()
        barcode_emb = (row[3] if len(row) > 3 else "").strip()
        description = coalesce_display_name(row[4] if len(row) > 4 else "")
        qty_per_pack = parse_decimal(row[5] if len(row) > 5 else "0")
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
    return product_by_sku, barcode_to_sku, name_to_sku


def parse_stock_rows(rows: list[list[str]], name_to_sku: dict[str, str]) -> dict[str, dict[str, Any]]:
    items: dict[str, dict[str, Any]] = {}
    for row in rows[1:]:
        label = coalesce_display_name(row[0] if len(row) > 0 else "")
        if not label:
            continue
        sku = extract_sku_from_label(label) or name_to_sku.get(normalize_text(label))
        description = extract_description_from_label(label)
        if not sku:
            continue
        items[sku] = {
            "sku": sku,
            "display_name": description,
            "sheet_stock": round(parse_decimal(row[1] if len(row) > 1 else "0"), 6),
            "sheet_volumes": round(parse_decimal(row[2] if len(row) > 2 else "0"), 6),
        }
    return items


def parse_movement_rows(
    rows: list[list[str]],
    *,
    movement_label: str,
    barcode_to_sku: dict[str, str],
    name_to_sku: dict[str, str],
) -> tuple[dict[str, dict[str, Any]], Counter[str]]:
    items: dict[str, dict[str, Any]] = {}
    movement_counter: Counter[str] = Counter()
    sign = 1.0 if movement_label == "Entrada" else -1.0
    for row in rows[1:]:
        barcode = (row[1] if len(row) > 1 else "").strip()
        volumes = parse_decimal(row[2] if len(row) > 2 else "0")
        description = coalesce_display_name(row[3] if len(row) > 3 else "")
        qty_total = parse_decimal(row[5] if len(row) > 5 else "0")
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
        if description:
            item["display_name"] = description
        iso_timestamp = parse_pt_short_date(row[0] if len(row) > 0 else "")
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


def build_records_from_published_sheet(published_url: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    bank_rows = extract_rows(fetch_text(build_sheet_url(published_url, BANK_GID)))
    entry_rows = extract_rows(fetch_text(build_sheet_url(published_url, ENTRY_GID)))
    exit_rows = extract_rows(fetch_text(build_sheet_url(published_url, EXIT_GID)))
    stock_rows = extract_rows(fetch_text(build_sheet_url(published_url, STOCK_GID)))

    product_by_sku, barcode_to_sku, name_to_sku = parse_bank_rows(bank_rows)
    stock_index = parse_stock_rows(stock_rows, name_to_sku)
    entry_index, entry_counter = parse_movement_rows(rows=entry_rows, movement_label="Entrada", barcode_to_sku=barcode_to_sku, name_to_sku=name_to_sku)
    exit_index, exit_counter = parse_movement_rows(rows=exit_rows, movement_label="Saída", barcode_to_sku=barcode_to_sku, name_to_sku=name_to_sku)
    movement_index = merge_movement_indexes(entry_index, exit_index)
    movement_counter = entry_counter + exit_counter

    all_skus = sorted(set(product_by_sku) | set(stock_index) | set(movement_index))
    records: list[dict[str, Any]] = []
    missing_in_stock_sheet: list[str] = []
    missing_in_movements: list[str] = []
    missing_in_bank: list[str] = []
    stock_mismatches: list[dict[str, Any]] = []

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
        if not product_info:
            missing_in_bank.append(f"{sku} - {description}")
        quantity = round(float(movement_info.get("calculated_stock", 0.0)), 6)
        sheet_stock = round(float(stock_info.get("sheet_stock", 0.0)), 6) if stock_info else None
        if sheet_stock is None:
            missing_in_stock_sheet.append(f"{sku} - {description}")
        if not movement_info:
            missing_in_movements.append(f"{sku} - {description}")
        if sheet_stock is not None and abs(sheet_stock - quantity) > 1e-6:
            stock_mismatches.append(
                {
                    "sku": sku,
                    "description": description,
                    "sheet_stock": sheet_stock,
                    "calculated_stock": quantity,
                }
            )
        records.append(
            {
                "sku": sku,
                "description": description,
                "quantity": quantity,
                "location_code": "EXPEDICAO",
                "company_code": "INPLAST",
                "unit_code": "UN",
                "product_type": "acabado",
                "supply_strategy": "montar",
                "metadata": {
                    "parser_name": PARSER_NAME,
                    "published_url": published_url,
                    "bank_sheet": "Banco de Dados",
                    "entry_sheet": "Entrada",
                    "exit_sheet": "Saída",
                    "stock_sheet": "Estoque",
                    "qty_per_pack": product_info.get("qty_per_pack"),
                    "barcode": product_info.get("barcode"),
                    "barcode_emb": product_info.get("barcode_emb"),
                    "sheet_stock": sheet_stock,
                    "sheet_volumes": stock_info.get("sheet_volumes"),
                    "calculated_volumes": round(float(movement_info.get("calculated_volumes", 0.0)), 6),
                    "movement_count": movement_info.get("movement_count", 0),
                    "movement_types": dict(sorted(movement_info.get("movement_types", Counter()).items())),
                    "last_movement_at": movement_info.get("last_movement_at"),
                    "code_status": "trusted_code" if product_info else "missing_code",
                },
            }
        )

    summary = {
        "workbook": published_url,
        "parser_name": PARSER_NAME,
        "product_type": "acabado",
        "record_count": len(records),
        "movement_row_count": sum(movement_counter.values()),
        "movement_types": dict(sorted(movement_counter.items())),
        "missing_in_stock_sheet": missing_in_stock_sheet,
        "missing_in_movements": missing_in_movements,
        "missing_in_bank": missing_in_bank,
        "stock_mismatches": stock_mismatches,
        "sheet_row_count": {
            "banco_de_dados": len(bank_rows),
            "entrada": len(entry_rows),
            "saida": len(exit_rows),
            "estoque": len(stock_rows),
        },
    }
    return records, summary


def main() -> int:
    parser = build_parser("Parser da planilha publicada de estoque acabado")
    parser.set_defaults(workbook=DEFAULT_PUBLISHED_URL)
    args = parser.parse_args()
    records, summary = build_records_from_published_sheet(args.workbook)
    return emit_records(records, summary, pretty=args.pretty, emit_summary=args.summary)


if __name__ == "__main__":
    raise SystemExit(main())

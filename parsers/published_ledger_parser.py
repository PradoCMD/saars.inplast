#!/usr/bin/env python3
"""Helpers to parse published Google Sheets ledgers using only the standard library."""

from __future__ import annotations

import datetime as dt
import html
import re
import urllib.request
from collections import Counter
from dataclasses import dataclass
from typing import Any

try:
    from xlsx_ledger_parser import (
        build_name_index,
        clean_legacy_code,
        coalesce_display_name,
        normalize_text,
        parse_decimal,
        resolve_sku,
    )
except ModuleNotFoundError:  # pragma: no cover - fallback for package import
    from .xlsx_ledger_parser import (
        build_name_index,
        clean_legacy_code,
        coalesce_display_name,
        normalize_text,
        parse_decimal,
        resolve_sku,
    )


@dataclass(frozen=True)
class PublishedLedgerConfig:
    movement_gid: str
    stock_gid: str
    bank_gid: str
    product_type: str
    unit_code: str
    location_code: str
    sku_prefix: str
    parser_name: str
    movement_sheet: str
    stock_sheet: str
    bank_sheet: str
    company_code: str = "INPLAST"
    supply_strategy: str = "comprar"


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


def parse_br_datetime(value: str) -> str | None:
    text = (value or "").strip()
    if not text:
        return None
    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y"):
        try:
            parsed = dt.datetime.strptime(text, fmt)
            return parsed.isoformat(timespec="seconds")
        except ValueError:
            continue
    return None


def parse_stock_rows(rows: list[list[str]]) -> dict[str, dict[str, Any]]:
    items: dict[str, dict[str, Any]] = {}
    for row in rows[1:]:
        display_name = coalesce_display_name(row[0] if len(row) > 0 else "")
        normalized_name = normalize_text(display_name)
        if not normalized_name:
            continue
        items[normalized_name] = {
            "display_name": display_name,
            "sheet_stock": round(parse_decimal(row[1] if len(row) > 1 else "0"), 6),
        }
    return items


def parse_movement_rows(rows: list[list[str]]) -> tuple[dict[str, dict[str, Any]], Counter[str]]:
    items: dict[str, dict[str, Any]] = {}
    movement_counter: Counter[str] = Counter()
    for row in rows[1:]:
        movement_label = coalesce_display_name(row[1] if len(row) > 1 else "")
        display_name = coalesce_display_name(row[2] if len(row) > 2 else "")
        if not movement_label and not display_name:
            continue

        quantity = parse_decimal(row[3] if len(row) > 3 else "0")
        normalized_name = normalize_text(display_name)
        if not normalized_name:
            continue

        movement_type = normalize_text(movement_label)
        multiplier = 1.0 if movement_type == "ENTRADA" else -1.0 if movement_type in {"SAIDA", "SAÍDA"} else 0.0
        movement_counter[movement_label or "SEM_TIPO"] += 1

        item = items.setdefault(
            normalized_name,
            {
                "display_name": display_name,
                "calculated_stock": 0.0,
                "movement_count": 0,
                "last_movement_at": None,
                "last_obs": "",
                "movement_types": Counter(),
            },
        )
        item["calculated_stock"] += quantity * multiplier
        item["movement_count"] += 1
        item["movement_types"][movement_label or "SEM_TIPO"] += 1
        item["display_name"] = coalesce_display_name(item["display_name"], display_name)

        iso_timestamp = parse_br_datetime(row[0] if len(row) > 0 else "")
        if iso_timestamp and (item["last_movement_at"] is None or iso_timestamp > item["last_movement_at"]):
            item["last_movement_at"] = iso_timestamp
            item["last_obs"] = coalesce_display_name(row[4] if len(row) > 4 else "")
    return items, movement_counter


def parse_bank_rows(rows: list[list[str]]) -> tuple[dict[str, set[str]], dict[str, set[str]]]:
    pairs: list[tuple[str, str]] = []
    for row in rows[1:]:
        code = clean_legacy_code(row[0] if len(row) > 0 else "")
        display_name = coalesce_display_name(row[1] if len(row) > 1 else "")
        if display_name:
            pairs.append((code or "", display_name))
    return build_name_index(pairs)


def build_records_from_published_sheet(
    published_url: str,
    config: PublishedLedgerConfig,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    movement_url = build_sheet_url(published_url, config.movement_gid)
    bank_url = build_sheet_url(published_url, config.bank_gid)
    stock_url = build_sheet_url(published_url, config.stock_gid)

    movement_rows = extract_rows(fetch_text(movement_url))
    bank_rows = extract_rows(fetch_text(bank_url))
    stock_rows = extract_rows(fetch_text(stock_url))

    stock_index = parse_stock_rows(stock_rows)
    movement_index, movement_counter = parse_movement_rows(movement_rows)
    names_to_codes, codes_to_names = parse_bank_rows(bank_rows)

    all_names = sorted(set(stock_index) | set(movement_index))
    records: list[dict[str, Any]] = []
    conflicts: list[dict[str, Any]] = []
    missing_in_stock_sheet: list[str] = []
    missing_in_movements: list[str] = []
    stock_mismatches: list[dict[str, Any]] = []

    for normalized_name in all_names:
        stock_info = stock_index.get(normalized_name, {})
        movement_info = movement_index.get(normalized_name, {})
        display_name = coalesce_display_name(
            stock_info.get("display_name", ""),
            movement_info.get("display_name", ""),
            normalized_name,
        )
        sku, code_status, trusted_code, all_codes = resolve_sku(
            normalized_name=normalized_name,
            display_name=display_name,
            names_to_codes=names_to_codes,
            codes_to_names=codes_to_names,
            sku_prefix=config.sku_prefix,
        )
        quantity = round(float(movement_info.get("calculated_stock", 0.0)), 6)
        sheet_stock = round(float(stock_info.get("sheet_stock", 0.0)), 6) if stock_info else None
        if sheet_stock is None:
            missing_in_stock_sheet.append(display_name)
        if not movement_info:
            missing_in_movements.append(display_name)
        if sheet_stock is not None and abs(sheet_stock - quantity) > 1e-6:
            stock_mismatches.append(
                {
                    "description": display_name,
                    "sheet_stock": sheet_stock,
                    "calculated_stock": quantity,
                }
            )
        if code_status != "trusted_code":
            conflicts.append(
                {
                    "description": display_name,
                    "code_status": code_status,
                    "legacy_codes": all_codes,
                }
            )

        records.append(
            {
                "sku": sku,
                "description": display_name,
                "quantity": quantity,
                "location_code": config.location_code,
                "company_code": config.company_code,
                "unit_code": config.unit_code,
                "product_type": config.product_type,
                "supply_strategy": config.supply_strategy,
                "metadata": {
                    "parser_name": config.parser_name,
                    "published_url": published_url,
                    "movement_url": movement_url,
                    "bank_url": bank_url,
                    "stock_url": stock_url,
                    "movement_sheet": config.movement_sheet,
                    "stock_sheet": config.stock_sheet,
                    "bank_sheet": config.bank_sheet,
                    "normalized_name": normalized_name,
                    "legacy_code": trusted_code,
                    "code_status": code_status,
                    "all_legacy_codes": all_codes,
                    "sheet_stock": sheet_stock,
                    "movement_count": movement_info.get("movement_count", 0),
                    "movement_types": dict(sorted(movement_info.get("movement_types", Counter()).items())),
                    "last_movement_at": movement_info.get("last_movement_at"),
                    "last_obs": movement_info.get("last_obs", ""),
                },
            }
        )

    summary = {
        "workbook": published_url,
        "parser_name": config.parser_name,
        "product_type": config.product_type,
        "record_count": len(records),
        "movement_row_count": sum(movement_counter.values()),
        "movement_types": dict(sorted(movement_counter.items())),
        "missing_in_stock_sheet": missing_in_stock_sheet,
        "missing_in_movements": missing_in_movements,
        "conflicts": conflicts,
        "stock_mismatches": stock_mismatches,
        "sheet_row_count": {
            "movimentacoes": len(movement_rows),
            "banco_de_dados": len(bank_rows),
            "estoque": len(stock_rows),
        },
    }
    return records, summary

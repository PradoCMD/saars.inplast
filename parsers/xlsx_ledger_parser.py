#!/usr/bin/env python3
"""Helpers to parse stock ledgers from xlsx files using only the standard library."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

NS = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def normalize_text(value: str) -> str:
    text = unicodedata.normalize("NFKC", value or "")
    text = re.sub(r"\s+", " ", text.strip())
    return text.upper()


def slugify(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.upper()
    text = re.sub(r"[^A-Z0-9]+", "-", text).strip("-")
    text = re.sub(r"-{2,}", "-", text)
    return text or "ITEM"


def excel_serial_to_iso(value: str) -> str | None:
    if value in (None, ""):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    timestamp = dt.datetime(1899, 12, 30) + dt.timedelta(days=number)
    return timestamp.isoformat(timespec="seconds")


def parse_decimal(value: str) -> float:
    if value is None:
        return 0.0
    text = str(value).strip()
    if not text:
        return 0.0
    text = text.replace(".", "").replace(",", ".") if "," in text and "." in text else text.replace(",", ".")
    return float(text)


def clean_legacy_code(value: str) -> str | None:
    text = normalize_text(value)
    if not text:
        return None
    if re.fullmatch(r"\d+(?:\.\d+)?E[+-]?\d+", text):
        number = float(text)
        if number.is_integer():
            return str(int(number))
        return format(number, "f").rstrip("0").rstrip(".")
    if re.fullmatch(r"\d+\.0+", text):
        text = text.split(".", 1)[0]
    return text


def coalesce_display_name(*values: str) -> str:
    for value in values:
        text = re.sub(r"\s+", " ", (value or "").strip())
        if text:
            return text
    return ""


class WorkbookReader:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.archive = zipfile.ZipFile(path)
        self.shared_strings = self._load_shared_strings()
        self.sheet_targets = self._load_sheet_targets()

    def close(self) -> None:
        self.archive.close()

    def _load_shared_strings(self) -> list[str]:
        if "xl/sharedStrings.xml" not in self.archive.namelist():
            return []
        root = ET.fromstring(self.archive.read("xl/sharedStrings.xml"))
        values: list[str] = []
        for item in root.findall("main:si", NS):
            text = "".join(part.text or "" for part in item.iterfind(".//main:t", NS))
            values.append(text)
        return values

    def _load_sheet_targets(self) -> dict[str, str]:
        workbook = ET.fromstring(self.archive.read("xl/workbook.xml"))
        rels = ET.fromstring(self.archive.read("xl/_rels/workbook.xml.rels"))
        relmap = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}
        targets: dict[str, str] = {}
        sheets = workbook.find("main:sheets", NS)
        if sheets is None:
            return targets
        for sheet in sheets:
            rel_id = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
            target = relmap[rel_id]
            if not target.startswith("worksheets/"):
                continue
            targets[sheet.attrib["name"]] = f"xl/{target}"
        return targets

    def read_sheet(self, sheet_name: str) -> list[dict[str, dict[str, str | None]]]:
        target = self.sheet_targets.get(sheet_name)
        if target is None:
            raise KeyError(f"Aba nao encontrada: {sheet_name}")
        root = ET.fromstring(self.archive.read(target))
        rows: list[dict[str, dict[str, str | None]]] = []
        for row in root.findall(".//main:sheetData/main:row", NS):
            cells: dict[str, dict[str, str | None]] = {}
            for cell in row.findall("main:c", NS):
                ref = cell.attrib.get("r", "")
                column = "".join(ch for ch in ref if ch.isalpha())
                value_node = cell.find("main:v", NS)
                formula_node = cell.find("main:f", NS)
                raw_value = value_node.text if value_node is not None else ""
                if cell.attrib.get("t") == "s" and raw_value:
                    try:
                        raw_value = self.shared_strings[int(raw_value)]
                    except (ValueError, IndexError):
                        pass
                cells[column] = {
                    "value": raw_value or "",
                    "formula": formula_node.text if formula_node is not None else None,
                }
            if cells:
                rows.append(cells)
        return rows


@dataclass(frozen=True)
class ParserConfig:
    movement_sheet: str
    stock_sheet: str
    bank_sheet: str
    product_type: str
    unit_code: str
    location_code: str
    sku_prefix: str
    parser_name: str
    company_code: str = "INPLAST"
    supply_strategy: str = "comprar"


def build_name_index(rows: list[tuple[str, str]]) -> tuple[dict[str, set[str]], dict[str, set[str]]]:
    names_to_codes: dict[str, set[str]] = defaultdict(set)
    codes_to_names: dict[str, set[str]] = defaultdict(set)
    for raw_code, raw_name in rows:
        display_name = coalesce_display_name(raw_name)
        normalized_name = normalize_text(display_name)
        code = clean_legacy_code(raw_code)
        if not normalized_name:
            continue
        if code:
            names_to_codes[normalized_name].add(code)
            codes_to_names[code].add(normalized_name)
    return names_to_codes, codes_to_names


def parse_stock_sheet(rows: list[dict[str, dict[str, str | None]]]) -> dict[str, dict[str, Any]]:
    items: dict[str, dict[str, Any]] = {}
    for row in rows[1:]:
        display_name = coalesce_display_name(row.get("A", {}).get("value", ""))
        normalized_name = normalize_text(display_name)
        if not normalized_name:
            continue
        stock_value = parse_decimal(row.get("B", {}).get("value", "0"))
        items[normalized_name] = {
            "display_name": display_name,
            "sheet_stock": stock_value,
            "sheet_formula": row.get("B", {}).get("formula"),
        }
    return items


def parse_movement_sheet(rows: list[dict[str, dict[str, str | None]]]) -> tuple[dict[str, dict[str, Any]], Counter[str]]:
    items: dict[str, dict[str, Any]] = {}
    movement_counter: Counter[str] = Counter()
    for row in rows[1:]:
        movement_label = coalesce_display_name(row.get("B", {}).get("value", ""))
        movement_type = normalize_text(movement_label)
        display_name = coalesce_display_name(row.get("C", {}).get("value", ""))
        if not movement_label and not display_name:
            continue
        quantity = parse_decimal(row.get("D", {}).get("value", "0"))
        normalized_name = normalize_text(display_name)
        if not normalized_name:
            continue
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
        iso_timestamp = excel_serial_to_iso(row.get("A", {}).get("value", ""))
        if iso_timestamp and (item["last_movement_at"] is None or iso_timestamp > item["last_movement_at"]):
            item["last_movement_at"] = iso_timestamp
            item["last_obs"] = coalesce_display_name(row.get("E", {}).get("value", ""))
    return items, movement_counter


def resolve_sku(
    normalized_name: str,
    display_name: str,
    names_to_codes: dict[str, set[str]],
    codes_to_names: dict[str, set[str]],
    sku_prefix: str,
) -> tuple[str, str, str | None, list[str]]:
    codes = sorted(names_to_codes.get(normalized_name, set()))
    if len(codes) == 1 and len(codes_to_names[codes[0]]) == 1:
        return codes[0], "trusted_code", codes[0], []
    if len(codes) == 1 and len(codes_to_names[codes[0]]) > 1:
        return f"{sku_prefix}{slugify(display_name)}", "conflicting_code", codes[0], codes
    if len(codes) > 1:
        return f"{sku_prefix}{slugify(display_name)}", "multiple_codes", None, codes
    return f"{sku_prefix}{slugify(display_name)}", "missing_code", None, []


def build_records(workbook_path: Path, config: ParserConfig) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    reader = WorkbookReader(workbook_path)
    try:
        movement_rows = reader.read_sheet(config.movement_sheet)
        stock_rows = reader.read_sheet(config.stock_sheet)
        bank_rows = reader.read_sheet(config.bank_sheet)
    finally:
        reader.close()

    stock_index = parse_stock_sheet(stock_rows)
    movement_index, movement_counter = parse_movement_sheet(movement_rows)
    bank_pairs = [
        (
            row.get("A", {}).get("value", ""),
            row.get("B", {}).get("value", ""),
        )
        for row in bank_rows[1:]
        if coalesce_display_name(row.get("B", {}).get("value", ""))
    ]
    names_to_codes, codes_to_names = build_name_index(bank_pairs)

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
                    "movement_sheet": config.movement_sheet,
                    "stock_sheet": config.stock_sheet,
                    "bank_sheet": config.bank_sheet,
                    "normalized_name": normalized_name,
                    "legacy_code": trusted_code,
                    "code_status": code_status,
                    "all_legacy_codes": all_codes,
                    "sheet_stock": sheet_stock,
                    "sheet_formula": stock_info.get("sheet_formula"),
                    "movement_count": movement_info.get("movement_count", 0),
                    "movement_types": dict(sorted(movement_info.get("movement_types", Counter()).items())),
                    "last_movement_at": movement_info.get("last_movement_at"),
                    "last_obs": movement_info.get("last_obs", ""),
                },
            }
        )

    summary = {
        "workbook": str(workbook_path),
        "parser_name": config.parser_name,
        "product_type": config.product_type,
        "record_count": len(records),
        "movement_row_count": sum(movement_counter.values()),
        "movement_types": dict(sorted(movement_counter.items())),
        "missing_in_stock_sheet": missing_in_stock_sheet,
        "missing_in_movements": missing_in_movements,
        "conflicts": conflicts,
        "stock_mismatches": stock_mismatches,
    }
    return records, summary


def build_parser(description: str) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("workbook", help="Caminho do arquivo xlsx")
    parser.add_argument("--summary", action="store_true", help="Escreve o resumo de validacao em stderr")
    parser.add_argument("--pretty", action="store_true", help="Formata o JSON com identacao")
    return parser


def emit_records(records: list[dict[str, Any]], summary: dict[str, Any], *, pretty: bool, emit_summary: bool) -> int:
    json_kwargs = {"ensure_ascii": False}
    if pretty:
        json_kwargs["indent"] = 2
    sys.stdout.write(json.dumps(records, **json_kwargs))
    sys.stdout.write("\n")
    if emit_summary:
        sys.stderr.write(json.dumps(summary, ensure_ascii=False, indent=2))
        sys.stderr.write("\n")
    return 0

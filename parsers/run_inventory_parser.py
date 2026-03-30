#!/usr/bin/env python3
"""Run a parser script and emit a single JSON envelope for n8n."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import subprocess
import sys
from pathlib import Path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Executa um parser de estoque e devolve um envelope JSON")
    parser.add_argument("--source-code", required=True)
    parser.add_argument("--parser-path", required=True)
    parser.add_argument("--workbook-path", required=True)
    parser.add_argument("--snapshot-at")
    parser.add_argument("--workflow-name", default="PCP | 12 | Almoxarifado | Ingestao")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    parser_path = Path(args.parser_path)
    workbook_path = Path(args.workbook_path)
    snapshot_at = args.snapshot_at or dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")

    cmd = [sys.executable, str(parser_path), "--summary", str(workbook_path)]
    completed = subprocess.run(cmd, capture_output=True, text=True)

    if completed.returncode != 0:
        sys.stderr.write(
            json.dumps(
                {
                    "source_code": args.source_code,
                    "parser_path": str(parser_path),
                    "workbook_path": str(workbook_path),
                    "snapshot_at": snapshot_at,
                    "error": completed.stderr.strip() or completed.stdout.strip() or f"Parser saiu com codigo {completed.returncode}",
                },
                ensure_ascii=False,
            )
        )
        sys.stderr.write("\n")
        return completed.returncode

    try:
        records = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        sys.stderr.write(
            json.dumps(
                {
                    "source_code": args.source_code,
                    "error": f"Falha ao interpretar stdout do parser: {exc}",
                    "stdout_preview": completed.stdout[:1000],
                },
                ensure_ascii=False,
            )
        )
        sys.stderr.write("\n")
        return 1

    try:
        summary = json.loads(completed.stderr) if completed.stderr.strip() else {}
    except json.JSONDecodeError:
        summary = {"stderr_text": completed.stderr.strip()}

    payload = {
        "source_code": args.source_code,
        "parser_path": str(parser_path),
        "workbook_path": str(workbook_path),
        "snapshot_at": snapshot_at,
        "record_count": len(records),
        "records": records,
        "summary": summary,
        "meta": {
            "workflow_name": args.workflow_name,
            "parser_name": summary.get("parser_name"),
            "workbook": str(workbook_path),
        },
    }

    sys.stdout.write(json.dumps(payload, ensure_ascii=False))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

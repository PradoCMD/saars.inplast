from __future__ import annotations

import datetime as dt
import json
import subprocess
import sys
from dataclasses import dataclass
from typing import Any

from .config import Settings


ALMOX_DEFAULT_WORKBOOK = "/data/ingest/Estoque Almoxarifado.xlsx"
STOCK_SOURCE_CODES = (
    "estoque_acabado_atual",
    "estoque_intermediario_atual",
    "estoque_materia_prima_almoxarifado",
    "estoque_componente_almoxarifado",
)


class SourceSyncError(RuntimeError):
    """Raised when a source cannot be synchronized."""


@dataclass(frozen=True)
class InventorySourceRequest:
    source_code: str
    source_area: str
    parser_name: str
    workbook_path: str
    config_json: dict[str, Any]


def resolve_requested_codes(payload: dict[str, Any]) -> list[str]:
    raw_codes = payload.get("source_codes")
    if raw_codes is None:
        return []
    if isinstance(raw_codes, str):
        raw_codes = [raw_codes]
    if not isinstance(raw_codes, list):
        raise SourceSyncError("`source_codes` deve ser uma string ou lista de strings.")
    codes: list[str] = []
    for value in raw_codes:
        code = str(value or "").strip()
        if code:
            codes.append(code)
    return codes


def resolve_snapshot_at(payload: dict[str, Any]) -> str:
    text = str(payload.get("snapshot_at") or "").strip()
    if text:
        return text
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def resolve_workbook_path(
    *,
    source_code: str,
    config_json: dict[str, Any],
    settings: Settings,
) -> str:
    if source_code == "estoque_acabado_atual":
        workbook_path = settings.acabado_published_url or str(config_json.get("published_url_hint") or "").strip()
        if workbook_path:
            return workbook_path
        raise SourceSyncError("Fonte `estoque_acabado_atual` sem URL publicada configurada.")

    if source_code == "estoque_intermediario_atual":
        workbook_path = settings.intermediario_published_url or str(config_json.get("published_url_hint") or "").strip()
        if workbook_path:
            return workbook_path
        raise SourceSyncError("Fonte `estoque_intermediario_atual` sem URL publicada configurada.")

    if source_code in {"estoque_materia_prima_almoxarifado", "estoque_componente_almoxarifado"}:
        workbook_path = settings.almox_workbook or str(config_json.get("workbook_path_hint") or "").strip() or ALMOX_DEFAULT_WORKBOOK
        if workbook_path:
            return workbook_path
        raise SourceSyncError(f"Fonte `{source_code}` sem workbook configurado.")

    raise SourceSyncError(f"Fonte `{source_code}` ainda nao suportada para sincronizacao direta.")


def build_source_request(source_row: dict[str, Any], settings: Settings) -> InventorySourceRequest:
    source_code = str(source_row.get("source_code") or "").strip()
    parser_name = str(source_row.get("parser_name") or "").strip()
    source_area = str(source_row.get("source_area") or "").strip()
    config_json = source_row.get("config_json")
    if not isinstance(config_json, dict):
        config_json = {}

    if source_code not in STOCK_SOURCE_CODES:
        raise SourceSyncError(f"Fonte `{source_code}` nao faz parte das sincronizacoes diretas de estoque.")
    if not parser_name:
        raise SourceSyncError(f"Fonte `{source_code}` sem parser associado em `ops.source_registry`.")

    workbook_path = resolve_workbook_path(source_code=source_code, config_json=config_json, settings=settings)
    return InventorySourceRequest(
        source_code=source_code,
        source_area=source_area,
        parser_name=parser_name,
        workbook_path=workbook_path,
        config_json=config_json,
    )


def run_parser_envelope(
    *,
    settings: Settings,
    source_request: InventorySourceRequest,
    snapshot_at: str,
) -> dict[str, Any]:
    parser_path = settings.repo_root / "parsers" / f"{source_request.parser_name}.py"
    runner_path = settings.repo_root / "parsers" / "run_inventory_parser.py"
    if not parser_path.exists():
        raise SourceSyncError(f"Parser nao encontrado: {parser_path}")
    if not runner_path.exists():
        raise SourceSyncError(f"Runner nao encontrado: {runner_path}")

    cmd = [
        sys.executable,
        str(runner_path),
        "--source-code",
        source_request.source_code,
        "--parser-path",
        str(parser_path),
        "--workbook-path",
        source_request.workbook_path,
        "--snapshot-at",
        snapshot_at,
        "--workflow-name",
        "PCP SaaS | Sync Fontes Reais",
    ]
    completed = subprocess.run(cmd, capture_output=True, text=True, cwd=str(settings.repo_root))
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout).strip()
        try:
            error_payload = json.loads(detail)
            detail = error_payload.get("error") or detail
        except json.JSONDecodeError:
            pass
        raise SourceSyncError(f"Falha ao processar `{source_request.source_code}`: {detail or 'erro desconhecido'}")

    try:
        envelope = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise SourceSyncError(
            f"Falha ao interpretar o envelope da fonte `{source_request.source_code}`: {exc}"
        ) from exc

    if not isinstance(envelope, dict):
        raise SourceSyncError(f"Envelope invalido retornado por `{source_request.source_code}`.")
    return envelope


def build_meta(envelope: dict[str, Any]) -> dict[str, Any]:
    meta = envelope.get("meta")
    if not isinstance(meta, dict):
        meta = {}
    summary = envelope.get("summary")
    if summary:
        meta["summary"] = summary
    meta["sync_origin"] = "pcp_backend"
    return meta

from __future__ import annotations

import datetime as dt
import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import Settings


ALMOX_DEFAULT_WORKBOOK = "/data/ingest/Estoque Almoxarifado.xlsx"
STOCK_SOURCE_CODES = (
    "estoque_acabado_atual",
    "estoque_intermediario_atual",
    "estoque_materia_prima_almoxarifado",
    "estoque_componente_almoxarifado",
)
PARSER_NAME_ALIASES = {
    "parse_estoque_acabado": "parse_estoque_acabado_google",
    "parse_estoque_intermediario": "parse_estoque_intermediario_google",
}
DEFAULT_PARSER_BY_SOURCE = {
    "estoque_acabado_atual": "parse_estoque_acabado_google",
    "estoque_intermediario_atual": "parse_estoque_intermediario_google",
    "estoque_materia_prima_almoxarifado": "parse_estoque_almoxarifado_mp",
    "estoque_componente_almoxarifado": "parse_estoque_almoxarifado_componentes",
}
GOOGLE_PARSER_BY_SOURCE = {
    "estoque_materia_prima_almoxarifado": "parse_estoque_almoxarifado_mp_google",
    "estoque_componente_almoxarifado": "parse_estoque_almoxarifado_componentes_google",
}


class SourceSyncError(RuntimeError):
    """Raised when a source cannot be synchronized."""


@dataclass(frozen=True)
class InventorySourceRequest:
    source_code: str
    source_area: str
    parser_name: str
    workbook_path: str
    config_json: dict[str, Any]


def is_google_published_url(value: str) -> bool:
    text = str(value or "").strip().lower()
    return "docs.google.com/spreadsheets" in text and ("/pub" in text or "/d/e/" in text)


def normalize_google_sheets_url(url: str) -> str:
    """Converte links de visualizacao (pubhtml/pubhtml?*) em links de download xlsx.

    Strip obrigatorio do query string antes de converter — URLs no formato
    pubhtml?widget=true&headers=false ficam invalidas se o query string for
    mantido durante a conversao.
    """
    if not url or "docs.google.com/spreadsheets" not in url:
        return url

    # Se ja for link de exportacao direta, mantém sem alteracao
    if "output=xlsx" in url or "output=csv" in url:
        return url

    # Descarta TODOS os query params — extrai apenas o path base
    # Ex: "https://.../pubhtml?widget=true&headers=false" → "https://.../pubhtml"
    base = url.split("?")[0]

    if "/pubhtml" in base:
        # Substitui /pubhtml → /pub e adiciona output=xlsx limpo
        base = base.replace("/pubhtml", "/pub")
        return f"{base}?output=xlsx"

    if base.endswith("/pub") or "/pub/" in base:
        return f"{base}?output=xlsx"

    # fallback: força output=xlsx no path base sem query contaminada
    return f"{base}?output=xlsx"


def repo_root_candidates(settings: Settings) -> list[Path]:
    candidates = [
        settings.repo_root,
        Path(__file__).resolve().parent.parent,
    ]
    unique_candidates: list[Path] = []
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved not in unique_candidates:
            unique_candidates.append(resolved)
    return unique_candidates


def resolve_runtime_repo_root(settings: Settings, parser_name: str) -> Path:
    for repo_root in repo_root_candidates(settings):
        parser_path = repo_root / "parsers" / f"{parser_name}.py"
        runner_path = repo_root / "parsers" / "run_inventory_parser.py"
        if parser_path.exists() and runner_path.exists():
            return repo_root
    first_candidate = repo_root_candidates(settings)[0]
    raise SourceSyncError(
        f"Parser nao encontrado: {first_candidate / 'parsers' / f'{parser_name}.py'}"
    )


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
            return normalize_google_sheets_url(workbook_path)
        raise SourceSyncError("Fonte `estoque_acabado_atual` sem URL publicada configurada.")

    if source_code == "estoque_intermediario_atual":
        workbook_path = settings.intermediario_published_url or str(config_json.get("published_url_hint") or "").strip()
        if workbook_path:
            return normalize_google_sheets_url(workbook_path)
        raise SourceSyncError("Fonte `estoque_intermediario_atual` sem URL publicada configurada.")

    if source_code in {"estoque_materia_prima_almoxarifado", "estoque_componente_almoxarifado"}:
        workbook_path = (
            settings.almox_published_url
            or str(config_json.get("published_url_hint") or "").strip()
            or settings.almox_workbook
            or str(config_json.get("workbook_path_hint") or "").strip()
            or ALMOX_DEFAULT_WORKBOOK
        )
        if workbook_path:
            return normalize_google_sheets_url(workbook_path)
        raise SourceSyncError(f"Fonte `{source_code}` sem workbook configurado.")

    raise SourceSyncError(f"Fonte `{source_code}` ainda nao suportada para sincronizacao direta.")


def build_source_request(source_row: dict[str, Any], settings: Settings) -> InventorySourceRequest:
    source_code = str(source_row.get("source_code") or "").strip()
    parser_name = str(source_row.get("parser_name") or "").strip()
    parser_name = PARSER_NAME_ALIASES.get(parser_name, parser_name) or DEFAULT_PARSER_BY_SOURCE.get(source_code, "")
    source_area = str(source_row.get("source_area") or "").strip()
    raw_config = source_row.get("config_json")
    config_json = dict(raw_config) if isinstance(raw_config, dict) else {}
    for hint_key in ("published_url_hint", "workbook_path_hint"):
        hint_value = str(source_row.get(hint_key) or "").strip()
        if hint_value and not str(config_json.get(hint_key) or "").strip():
            config_json[hint_key] = hint_value

    if source_code not in STOCK_SOURCE_CODES:
        raise SourceSyncError(f"Fonte `{source_code}` nao faz parte das sincronizacoes diretas de estoque.")
    if not parser_name:
        raise SourceSyncError(f"Fonte `{source_code}` sem parser associado em `ops.source_registry`.")

    workbook_path = resolve_workbook_path(source_code=source_code, config_json=config_json, settings=settings)
    if source_code in GOOGLE_PARSER_BY_SOURCE and is_google_published_url(workbook_path):
        parser_name = GOOGLE_PARSER_BY_SOURCE[source_code]
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
    runtime_repo_root = resolve_runtime_repo_root(settings, source_request.parser_name)
    parser_path = runtime_repo_root / "parsers" / f"{source_request.parser_name}.py"
    runner_path = runtime_repo_root / "parsers" / "run_inventory_parser.py"

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
    completed = subprocess.run(cmd, capture_output=True, text=True, cwd=str(runtime_repo_root))
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

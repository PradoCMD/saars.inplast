#!/usr/bin/env python3
from __future__ import annotations

import sys
import base64
import binascii
import hashlib
import hmac
import json
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

from backend import Settings, build_provider
from backend.provider import COMPANY_SCOPE_ALL, public_integration_record, public_user_record
from backend.romaneio_integration import normalize_webhook_romaneios
from backend.romaneio_pdf import SOURCE_CODE as ROMANEIO_PDF_SOURCE_CODE
from backend.romaneio_pdf import build_romaneio_event, normalize_document_kind, normalize_romaneio_identity, parse_romaneio_pdf_bytes
from backend.source_sync import SourceSyncError


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
print(f"[BOOT] Usando diretório de dados: {DATA_DIR}")
WEB_REACT_DIST_DIR = ROOT / "web-react" / "dist"
SETTINGS = Settings.from_env()
PROVIDER = build_provider(SETTINGS, DATA_DIR)
ROMANEIO_WEBHOOK_SOURCE_CODE = "romaneio_sankhya_webhook"
DEFAULT_MAX_JSON_BODY_BYTES = 1 * 1024 * 1024
UPLOAD_MAX_JSON_BODY_BYTES = 20 * 1024 * 1024
MAX_ROMANEIO_UPLOAD_FILES = 10
MAX_ROMANEIO_UPLOAD_FILE_BYTES = 5 * 1024 * 1024
MAX_ROMANEIO_UPLOAD_TOTAL_BYTES = 20 * 1024 * 1024
AUTH_TOKEN_TYPE = "Bearer"
AUDIT_LOG_PATH = DATA_DIR / "security_audit.jsonl"

ROLE_PERMISSIONS = {
    "root": {"*"},
    "manager": {
        "alerts.read",
        "apontamento.dispatch",
        "apontamento.read",
        "apontamento.write",
        "assembly.read",
        "costs.read",
        "mrp.run",
        "overview.read",
        "painel.read",
        "production.read",
        "production_rules.read",
        "programming.read",
        "programming.write",
        "programming_entry.save",
        "purchases.read",
        "recycling.read",
        "romaneios.delete",
        "romaneios.ingest",
        "romaneios.read",
        "romaneios.write",
        "sources.read",
        "sources.sync",
        "stock.read",
        "stock.write",
        "structure_override.write",
        "structures.read",
    },
    "operator": {
        "alerts.read",
        "apontamento.read",
        "apontamento.write",
        "assembly.read",
        "costs.read",
        "overview.read",
        "painel.read",
        "production.read",
        "production_rules.read",
        "programming.read",
        "purchases.read",
        "recycling.read",
        "romaneios.read",
        "sources.read",
        "stock.read",
        "structures.read",
    },
}

ADMIN_PERMISSIONS = {"users.read", "users.write", "integrations.read", "integrations.write"}
CRITICAL_AUDIT_ACTIONS = {
    "/api/pcp/runs/mrp": "mrp.run",
    "/api/pcp/users/save": "users.save",
    "/api/pcp/integrations/save": "integrations.save",
    "/api/pcp/stock-movements/save": "stock_movement.save",
    "/api/pcp/apontamento/save": "apontamento.save",
    "/api/pcp/apontamento/sync-status": "apontamento.sync_status",
    "/api/pcp/apontamento/dispatch": "apontamento.dispatch",
    "/api/pcp/structure-overrides": "structure_override.save",
    "/api/pcp/programming-entries": "programming_entry.save",
    "/api/pcp/romaneios-kanban/update-date": "romaneio.schedule_override",
    "/api/pcp/romaneios/delete": "romaneio.delete",
    "/api/pcp/romaneios-kanban/sync": "romaneio.sync",
    "/api/pcp/romaneios/upload": "romaneio.upload",
    "/api/pcp/romaneios/refresh": "romaneio.refresh",
    "/api/pcp/sources/sync": "sources.sync",
}


class ApiRequestError(RuntimeError):
    def __init__(self, status: HTTPStatus, error: str, detail: str, *, code: str) -> None:
        super().__init__(detail)
        self.status = status
        self.error = error
        self.detail = detail
        self.code = code


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(f"{data}{padding}")


def _auth_secret_bytes() -> bytes:
    return SETTINGS.auth_token_secret.encode("utf-8")


def _normalize_company_code(value) -> str | None:
    text = str(value or "").strip().upper()
    return text or None


def _normalize_company_scope(scope) -> list[str]:
    if isinstance(scope, str):
        raw_values = [part.strip() for part in scope.split(",")]
    elif isinstance(scope, (list, tuple, set)):
        raw_values = [str(item or "").strip() for item in scope]
    else:
        raw_values = []
    normalized: list[str] = []
    for value in raw_values:
        company_code = _normalize_company_code(value)
        if not company_code:
            continue
        if company_code in {COMPANY_SCOPE_ALL, "ALL", "TODAS", "CONSOLIDADO"}:
            return [COMPANY_SCOPE_ALL]
        if company_code not in normalized:
            normalized.append(company_code)
    return normalized


def _user_company_scope(user: dict | None) -> list[str]:
    if not isinstance(user, dict):
        return []
    return _normalize_company_scope(user.get("company_scope"))


def _user_has_wildcard_scope(user: dict | None) -> bool:
    return COMPANY_SCOPE_ALL in _user_company_scope(user)


def _user_has_company_access(user: dict | None, company_code: str | None) -> bool:
    if not company_code:
        return False
    if _user_has_wildcard_scope(user):
        return True
    return company_code in set(_user_company_scope(user))


def _company_scope_requires_selection(user: dict | None) -> bool:
    scope = _user_company_scope(user)
    return bool(scope) and COMPANY_SCOPE_ALL not in scope and len(scope) > 1


def _current_utc() -> datetime:
    return datetime.now(timezone.utc)


def _token_expiry_iso(expiration_timestamp: int) -> str:
    return datetime.fromtimestamp(expiration_timestamp, tz=timezone.utc).isoformat()


def issue_access_token(user: dict) -> tuple[str, str]:
    now = _current_utc()
    expires_at = now + timedelta(seconds=SETTINGS.auth_token_ttl_seconds)
    payload = {
        "sub": str(user.get("id") or ""),
        "role": str(user.get("role") or ""),
        "company_scope": _user_company_scope(user),
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    header_segment = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode("utf-8"))
    payload_segment = _b64url_encode(json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    signing_input = f"{header_segment}.{payload_segment}"
    signature = _b64url_encode(hmac.new(_auth_secret_bytes(), signing_input.encode("utf-8"), hashlib.sha256).digest())
    return f"{signing_input}.{signature}", expires_at.isoformat()


def decode_access_token(token: str) -> dict:
    try:
        header_segment, payload_segment, signature_segment = token.split(".", 2)
    except ValueError as exc:
        raise ApiRequestError(
            HTTPStatus.UNAUTHORIZED,
            "Authentication required",
            "Token de acesso inválido.",
            code="invalid_token",
        ) from exc

    signing_input = f"{header_segment}.{payload_segment}"
    expected_signature = _b64url_encode(
        hmac.new(_auth_secret_bytes(), signing_input.encode("utf-8"), hashlib.sha256).digest()
    )
    if not hmac.compare_digest(signature_segment, expected_signature):
        raise ApiRequestError(
            HTTPStatus.UNAUTHORIZED,
            "Authentication required",
            "Token de acesso inválido.",
            code="invalid_token",
        )
    try:
        payload = json.loads(_b64url_decode(payload_segment).decode("utf-8"))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ApiRequestError(
            HTTPStatus.UNAUTHORIZED,
            "Authentication required",
            "Token de acesso inválido.",
            code="invalid_token",
        ) from exc
    exp = int(payload.get("exp") or 0)
    if exp <= int(_current_utc().timestamp()):
        raise ApiRequestError(
            HTTPStatus.UNAUTHORIZED,
            "Authentication required",
            "Sessão expirada. Faça login novamente.",
            code="token_expired",
        )
    return payload


def _permission_allowed(user: dict, permission: str) -> bool:
    role = str((user or {}).get("role") or "").strip().lower()
    permissions = set(ROLE_PERMISSIONS.get(role, set()))
    if role == "root":
        permissions.update(ADMIN_PERMISSIONS)
    if COMPANY_SCOPE_ALL in permissions or "*" in permissions:
        return True
    return permission in permissions


def content_type_for(path: Path) -> str:
    if path.suffix == ".html":
        return "text/html; charset=utf-8"
    if path.suffix == ".css":
        return "text/css; charset=utf-8"
    if path.suffix == ".js":
        return "application/javascript; charset=utf-8"
    if path.suffix == ".svg":
        return "image/svg+xml"
    if path.suffix == ".png":
        return "image/png"
    if path.suffix == ".ico":
        return "image/x-icon"
    if path.suffix == ".json":
        return "application/json; charset=utf-8"
    return "text/plain; charset=utf-8"


def resolve_web_dir() -> Path:
    if WEB_REACT_DIST_DIR.exists() and (WEB_REACT_DIST_DIR / "index.html").is_file():
        return WEB_REACT_DIST_DIR
    raise RuntimeError(
        "Frontend oficial indisponivel: `web-react/dist` nao encontrado. "
        "Gere o build do web-react antes de subir o servidor."
    )


def json_default(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    raise TypeError(f"Tipo nao serializavel: {type(value)!r}")


def _require_object_payload(payload, *, route: str) -> dict:
    if not isinstance(payload, dict):
        raise ApiRequestError(
            HTTPStatus.BAD_REQUEST,
            "Invalid request payload",
            f"O corpo enviado para `{route}` deve ser um objeto JSON.",
            code="invalid_payload",
        )
    return payload


def _sanitize_user_response(payload):
    if isinstance(payload, list):
        return [public_user_record(item) if isinstance(item, dict) else item for item in payload]
    if isinstance(payload, dict):
        sanitized = dict(payload)
        if isinstance(sanitized.get("user"), dict):
            sanitized["user"] = public_user_record(sanitized["user"])
        if isinstance(sanitized.get("items"), list):
            sanitized["items"] = [public_user_record(item) if isinstance(item, dict) else item for item in sanitized["items"]]
        return sanitized
    return payload


def _sanitize_integration_response(payload):
    if isinstance(payload, list):
        return [public_integration_record(item) if isinstance(item, dict) else item for item in payload]
    if isinstance(payload, dict):
        sanitized = dict(payload)
        if isinstance(sanitized.get("integration"), dict):
            sanitized["integration"] = public_integration_record(sanitized["integration"])
        if isinstance(sanitized.get("items"), list):
            sanitized["items"] = [
                public_integration_record(item) if isinstance(item, dict) else item
                for item in sanitized["items"]
            ]
        return sanitized
    return payload


def _to_float(value) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _to_int(value) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _pedido_key(pedido: dict) -> str:
    numero_unico = str(pedido.get("numero_unico") or "").strip()
    if numero_unico:
        return numero_unico
    return "|".join(
        [
            str(pedido.get("ped_mercos") or "").strip(),
            str(pedido.get("codigo_parceiro") or "").strip(),
            str(pedido.get("parceiro") or "").strip(),
        ]
    )


def _item_key(item: dict) -> str:
    sku = str(item.get("sku") or "").strip()
    unidade = str(item.get("unidade") or "").strip().upper()
    descricao = str(item.get("descricao") or item.get("produto") or "").strip()
    if sku:
        return "|".join([sku, unidade])
    return "|".join([descricao, unidade])


def _resolve_document_kind(values: set[str]) -> str:
    normalized = {normalize_document_kind(value) for value in values if value}
    if not normalized:
        return "romaneio"
    if "merged" in normalized:
        return "merged"
    effective = normalized - {"existing"}
    if len(effective) > 1:
        return "merged"
    if effective:
        return next(iter(effective))
    return "existing" if "existing" in normalized else "romaneio"


def _build_sync_document_kind_hint(parsed: dict) -> str:
    return " ".join(
        str(value).strip()
        for value in (
            parsed.get("document_kind"),
            parsed.get("status"),
            parsed.get("situacao"),
            parsed.get("tipo_documento"),
            parsed.get("tipoDocumento"),
            parsed.get("faturamento_status"),
            parsed.get("billing_status"),
            parsed.get("file"),
            parsed.get("file_name"),
        )
        if str(value or "").strip()
    )


def _normalize_sync_parsed_record(parsed: dict) -> dict | None:
    if not isinstance(parsed, dict):
        return None
    if "pdf_romaneio" in parsed or "tabela_pedidos" in parsed or "tabela_itens_do_caminhao" in parsed:
        normalized = normalize_webhook_romaneios(parsed)
        return normalized[0] if normalized else None

    ordem_carga = normalize_romaneio_identity(
        parsed.get("ordem_carga")
        or parsed.get("romaneio_identity")
        or parsed.get("codigo_ordem_carga")
        or parsed.get("codigoOrdemCarga")
        or parsed.get("file")
        or parsed.get("file_name")
        or ""
    )
    if not ordem_carga:
        return None

    pedidos = parsed.get("pedidos") if isinstance(parsed.get("pedidos"), list) else []
    itens = parsed.get("itens") if isinstance(parsed.get("itens"), list) else []
    file_name = str(parsed.get("file") or parsed.get("file_name") or f"ROMANEIO {ordem_carga}.json").strip()
    files = [str(item).strip() for item in (parsed.get("files") or []) if str(item or "").strip()]
    if file_name and file_name not in files:
        files.insert(0, file_name)

    return {
        **parsed,
        "ordem_carga": ordem_carga,
        "romaneio_identity": normalize_romaneio_identity(parsed.get("romaneio_identity") or ordem_carga),
        "document_kind": normalize_document_kind(_build_sync_document_kind_hint(parsed)),
        "empresa": str(parsed.get("empresa") or parsed.get("codigo_empresa") or parsed.get("codigoEmpresa") or "").strip(),
        "nome_empresa": str(parsed.get("nome_empresa") or parsed.get("nomeEmpresa") or "").strip(),
        "cidade": str(parsed.get("cidade") or (pedidos[0].get("cidade") if pedidos else "") or "").strip(),
        "pedidos": pedidos,
        "montante": _to_int(parsed.get("montante")) or len(pedidos),
        "total_geral": round(_to_float(parsed.get("total_geral")) or sum(_to_float(pedido.get("valor_total")) for pedido in pedidos), 2),
        "itens": itens,
        "file": file_name,
        "files": files,
        "text_length": _to_int(parsed.get("text_length")),
        "source_origin": str(parsed.get("source_origin") or "n8n_sync").strip() or "n8n_sync",
    }


def _merge_parsed_records(records: list[dict]) -> dict:
    if not records:
        return {}

    base = records[0]
    merged_pedidos: dict[str, dict] = {}
    pedido_order: list[str] = []
    merged_itens: dict[str, dict] = {}
    item_order: list[str] = []
    file_names: list[str] = []
    document_kinds: set[str] = set()

    for parsed in records:
        document_kinds.add(normalize_document_kind(parsed.get("document_kind") or "romaneio"))
        for file_name in parsed.get("files") or ([] if not parsed.get("file") else [parsed.get("file")]):
            if file_name and file_name not in file_names:
                file_names.append(file_name)

        for pedido in parsed.get("pedidos") or []:
            key = _pedido_key(pedido)
            if not key:
                continue
            normalized = {
                "numero_unico": str(pedido.get("numero_unico") or "").strip(),
                "ped_mercos": str(pedido.get("ped_mercos") or "").strip(),
                "codigo_parceiro": str(pedido.get("codigo_parceiro") or "").strip(),
                "parceiro": str(pedido.get("parceiro") or "").strip(),
                "cidade": str(pedido.get("cidade") or "").strip(),
                "valor_total": round(_to_float(pedido.get("valor_total")), 2),
            }
            if key not in merged_pedidos:
                merged_pedidos[key] = normalized
                pedido_order.append(key)
            else:
                current = merged_pedidos[key]
                for field in ("numero_unico", "ped_mercos", "codigo_parceiro", "parceiro", "cidade"):
                    if not current.get(field) and normalized.get(field):
                        current[field] = normalized[field]
                current["valor_total"] = max(_to_float(current.get("valor_total")), normalized["valor_total"])

        for item in parsed.get("itens") or []:
            key = _item_key(item)
            if not key:
                continue
            normalized_item = {
                "sku": str(item.get("sku") or "").strip(),
                "descricao": str(item.get("descricao") or item.get("produto") or "").strip(),
                "produto": str(item.get("produto") or item.get("descricao") or item.get("sku") or "").strip(),
                "unidade": str(item.get("unidade") or "UN").strip().upper() or "UN",
                "tipo_produto": str(item.get("tipo_produto") or "PRODUTO ACABADO").strip() or "PRODUTO ACABADO",
                "quantidade": _to_float(item.get("quantidade")),
                "quantidade_neg": _to_float(item.get("quantidade_neg") if item.get("quantidade_neg") is not None else item.get("quantidade")),
                "quantidade_vol": _to_float(item.get("quantidade_vol")),
                "quantity_total": _to_float(item.get("quantity_total") if item.get("quantity_total") is not None else item.get("quantidade")),
            }
            if key not in merged_itens:
                merged_itens[key] = normalized_item
                item_order.append(key)
            else:
                current_item = merged_itens[key]
                for field in ("descricao", "produto", "unidade", "tipo_produto"):
                    if not current_item.get(field) and normalized_item.get(field):
                        current_item[field] = normalized_item[field]
                for field in ("quantidade", "quantidade_neg", "quantidade_vol", "quantity_total"):
                    current_item[field] = _to_float(current_item.get(field)) + normalized_item[field]

    pedidos = [merged_pedidos[key] for key in pedido_order]
    itens = []
    for key in item_order:
        item = merged_itens[key]
        item["quantidade"] = round(_to_float(item.get("quantidade")), 6)
        item["quantidade_neg"] = round(_to_float(item.get("quantidade_neg")), 6)
        item["quantidade_vol"] = round(_to_float(item.get("quantidade_vol")), 6)
        item["quantity_total"] = round(
            _to_float(item.get("quantity_total")) or _to_float(item.get("quantidade")) or _to_float(item.get("quantidade_neg")),
            6,
        )
        if item["quantidade"] == 0:
            item["quantidade"] = item["quantity_total"]
        if item["quantidade_neg"] == 0:
            item["quantidade_neg"] = item["quantity_total"]
        itens.append(item)

    total_from_pedidos = round(sum(_to_float(pedido.get("valor_total")) for pedido in pedidos), 2)
    total_fallback = round(sum(_to_float(parsed.get("total_geral")) for parsed in records), 2)

    return {
        "ordem_carga": str(base.get("ordem_carga") or base.get("romaneio_identity") or "").strip(),
        "romaneio_identity": normalize_romaneio_identity(
            base.get("romaneio_identity") or base.get("ordem_carga") or base.get("file") or ""
        ),
        "document_kind": _resolve_document_kind(document_kinds),
        "empresa": str(base.get("empresa") or "").strip(),
        "nome_empresa": str(base.get("nome_empresa") or "").strip(),
        "pedidos": pedidos,
        "montante": len(pedidos) or sum(_to_int(parsed.get("montante")) for parsed in records),
        "total_geral": total_from_pedidos or total_fallback,
        "itens": itens,
        "file": file_names[0] if file_names else str(base.get("file") or "").strip(),
        "files": file_names,
        "text_length": sum(_to_int(parsed.get("text_length")) for parsed in records),
    }


def _build_parsed_from_existing_detail(romaneio_code: str) -> dict | None:
    detail = PROVIDER.romaneio_detail(romaneio_code)
    if not detail:
        return None
    header = detail.get("header") or {}
    items = []
    for item in detail.get("items") or []:
        quantity = _to_float(item.get("quantidade") or item.get("quantity_total"))
        items.append(
            {
                "sku": str(item.get("sku") or "").strip(),
                "descricao": str(item.get("produto") or item.get("sku") or "").strip(),
                "produto": str(item.get("produto") or item.get("sku") or "").strip(),
                "unidade": "UN",
                "tipo_produto": "PRODUTO ACABADO",
                "quantidade": quantity,
                "quantidade_neg": quantity,
                "quantidade_vol": 0.0,
                "quantity_total": quantity,
            }
        )
    if not items:
        return None
    return {
        "ordem_carga": str(header.get("romaneio") or romaneio_code).strip(),
        "romaneio_identity": normalize_romaneio_identity(header.get("romaneio") or romaneio_code),
        "document_kind": "existing",
        "empresa": str(header.get("empresa") or "").strip(),
        "nome_empresa": str(header.get("empresa") or "").strip(),
        "pedidos": [],
        "montante": 0,
        "total_geral": 0.0,
        "itens": items,
        "file": "",
        "files": [],
        "text_length": 0,
    }


def _consolidate_parsed_romaneios(records: list[dict]) -> list[dict]:
    grouped: dict[str, list[dict]] = {}
    for parsed in records:
        identity = normalize_romaneio_identity(parsed.get("romaneio_identity") or parsed.get("ordem_carga") or parsed.get("file") or "")
        key = identity or str(parsed.get("file") or len(grouped))
        grouped.setdefault(key, []).append(parsed)

    consolidated: list[dict] = []
    for group in grouped.values():
        merged = _merge_parsed_records(group)
        if merged.get("document_kind") == "romaneio_nota" and len(group) == 1:
            existing = _build_parsed_from_existing_detail(merged.get("romaneio_identity") or merged.get("ordem_carga") or "")
            if existing:
                merged = _merge_parsed_records([existing, merged])
                merged["document_kind"] = "merged"
        consolidated.append(merged)
    return consolidated

def sync_parsed_romaneios(records: list[dict], source_code: str = ROMANEIO_PDF_SOURCE_CODE) -> dict:
    results: list[dict] = []
    errors: list[dict] = []
    successful_records: list[dict] = []
    processed_files: list[str] = []

    normalized_records = [item for item in (_normalize_sync_parsed_record(record) for record in records) if item]
    consolidated_records = _consolidate_parsed_romaneios(normalized_records)
    if not consolidated_records:
        kanban_count = len((PROVIDER.romaneios_kanban() or {}).get("romaneios") or [])
        return {
            "status": "error",
            "count": 0,
            "kanban_count": kanban_count,
            "results": [],
            "processed_files": [],
            "errors": [{"error": "Nenhum romaneio válido foi informado para ingestão."}],
        }

    for parsed in consolidated_records:
        try:
            payload, meta = build_romaneio_event(parsed)
            ingest = PROVIDER.ingest_romaneio_event(source_code, payload, meta)
            ingest_status = str((ingest or {}).get("status") or "").lower()
            file_names = parsed.get("files") or ([] if not parsed.get("file") else [parsed.get("file")])
            if ingest_status in {"processed", "duplicate_ignored", "noop", "success", "saved"}:
                successful_records.append(parsed)
                for file_name in file_names:
                    if file_name and file_name not in processed_files:
                        processed_files.append(file_name)
            else:
                errors.append(
                    {
                        "romaneio": parsed.get("ordem_carga"),
                        "file_name": parsed.get("file"),
                        "error": f"Ingestão retornou status '{ingest_status or 'unknown'}'.",
                    }
                )
            results.append(
                {
                    "romaneio": parsed.get("ordem_carga"),
                    "file_name": parsed.get("file"),
                    "file_names": file_names,
                    "item_count": len(parsed.get("itens", [])),
                    "ingest": ingest,
                }
            )
        except Exception as exc:  # noqa: BLE001
            errors.append(
                {
                    "romaneio": parsed.get("ordem_carga"),
                    "file_name": parsed.get("file"),
                    "error": str(exc),
                }
            )

    kanban_count = len((PROVIDER.romaneios_kanban() or {}).get("romaneios") or [])
    status = "success"
    if errors and results:
        status = "partial"
    elif errors and not results:
        status = "error"

    return {
        "status": status,
        "count": len(results),
        "kanban_count": kanban_count,
        "results": results,
        "processed_files": processed_files,
        "errors": errors,
    }


def _parse_json_config_field(value, fallback):
    if value in (None, ""):
        return fallback
    if isinstance(value, (dict, list)):
        return value
    text = str(value).strip()
    if not text:
        return fallback
    return json.loads(text)


def _resolve_integration(integration_type: str, integration_id: str | None = None) -> dict:
    items = (PROVIDER.integrations() or {}).get("items") or []
    candidates = [
        item
        for item in items
        if item.get("integration_type") == integration_type
        and (integration_id is None or str(item.get("id")) == str(integration_id))
    ]
    if integration_id and not candidates:
        raise RuntimeError("Integração não encontrada.")
    active = next((item for item in candidates if item.get("active")), None) if candidates else None
    if active:
        return active
    if integration_id and candidates:
        return candidates[0]
    raise RuntimeError("Nenhuma integração ativa foi cadastrada.")


def _resolve_romaneio_integration(integration_id: str | None = None) -> dict:
    try:
        return _resolve_integration("n8n_webhook_romaneios", integration_id)
    except RuntimeError as exc:
        raise RuntimeError("Nenhuma integração ativa de romaneios foi cadastrada.") from exc


def _resolve_apontamento_integration(integration_id: str | None = None) -> dict:
    try:
        return _resolve_integration("n8n_webhook_apontamento", integration_id)
    except RuntimeError as exc:
        raise RuntimeError("Nenhuma integração ativa de apontamento foi cadastrada.") from exc


def _call_integration_webhook(
    integration: dict,
    payload_override: dict | list | None = None,
    timeout_seconds: int | None = None,
) -> tuple[int, dict | list]:
    webhook_url = str(integration.get("webhook_url") or "").strip()
    if not webhook_url:
        raise RuntimeError("Webhook da integração não configurado.")

    method = str(integration.get("method") or "POST").strip().upper() or "POST"
    headers = {"Accept": "application/json"}
    extra_headers = _parse_json_config_field(integration.get("extra_headers_json"), {})
    if isinstance(extra_headers, dict):
        headers.update({str(key): str(value) for key, value in extra_headers.items() if value is not None})

    auth_type = str(integration.get("auth_type") or "none").strip().lower()
    auth_value = str(integration.get("auth_value") or "").strip()
    if auth_type == "bearer" and auth_value:
        headers["Authorization"] = f"Bearer {auth_value}"

    body_payload = payload_override if payload_override is not None else _parse_json_config_field(integration.get("request_body_json"), {})
    body_bytes = None
    if method != "GET":
        headers["Content-Type"] = "application/json"
        body_bytes = json.dumps(body_payload, ensure_ascii=False).encode("utf-8")

    request = Request(webhook_url, data=body_bytes, headers=headers, method=method)
    try:
        with urlopen(request, timeout=timeout_seconds or SETTINGS.n8n_romaneios_webhook_timeout_seconds) as response:
            status_code = getattr(response, "status", None) or response.getcode()
            raw_body = response.read().decode("utf-8") if response else ""
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Webhook retornou HTTP {exc.code}: {error_body or exc.reason}") from exc
    except URLError as exc:
        raise RuntimeError(f"Falha de comunicação com o webhook: {exc.reason}") from exc

    if not raw_body.strip():
        return status_code, {}
    try:
        return status_code, json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Webhook retornou uma resposta que não é JSON válido.") from exc


def _is_async_refresh_ack(payload: dict | list) -> bool:
    if not isinstance(payload, dict):
        return False

    status = str(payload.get("status") or payload.get("state") or payload.get("result") or "").strip().lower()
    message = str(payload.get("message") or payload.get("detail") or "").strip().lower()
    flags = [
        payload.get("async"),
        payload.get("accepted"),
        payload.get("queued"),
        payload.get("started"),
        payload.get("processing"),
    ]

    if any(bool(flag) for flag in flags):
        return True

    if status in {"accepted", "queued", "started", "processing", "running"}:
        return True

    if "processamento iniciado" in message or "queued" in message or "accepted" in message:
        return True

    return False


def refresh_romaneios_from_integration(payload: dict | None = None) -> dict:
    request_payload = payload or {}
    integration = _resolve_romaneio_integration(str(request_payload.get("integration_id") or "").strip() or None)
    integration_id = integration.get("id")
    synced_at = datetime.utcnow().isoformat() + "Z"

    try:
        webhook_status, webhook_payload = _call_integration_webhook(integration)
        if _is_async_refresh_ack(webhook_payload):
            message = str(
                webhook_payload.get("message")
                or webhook_payload.get("detail")
                or "Atualização aceita. O n8n seguirá processando em segundo plano."
            ).strip()
            PROVIDER.save_integration(
                {
                    "id": integration_id,
                    "last_status": "accepted",
                    "last_synced_at": synced_at,
                    "last_error": "",
                }
            )
            return {
                "status": "accepted",
                "count": 0,
                "received_records": 0,
                "refreshed_romaneios": [],
                "message": message,
                "integration": {
                    "id": integration_id,
                    "name": integration.get("name"),
                    "integration_type": integration.get("integration_type"),
                },
                "webhook_status_code": webhook_status,
            }

        parsed_records = normalize_webhook_romaneios(webhook_payload)
        if not parsed_records:
            raise RuntimeError("O webhook não retornou nenhum romaneio aproveitável para ingestão.")
        response = sync_parsed_romaneios(parsed_records, source_code=ROMANEIO_WEBHOOK_SOURCE_CODE)
        PROVIDER.save_integration(
            {
                "id": integration_id,
                "last_status": response.get("status") or "success",
                "last_synced_at": synced_at,
                "last_error": "",
            }
        )
        return {
            **response,
            "integration": {
                "id": integration_id,
                "name": integration.get("name"),
                "integration_type": integration.get("integration_type"),
            },
            "webhook_status_code": webhook_status,
            "received_records": len(parsed_records),
            "refreshed_romaneios": [record.get("ordem_carga") for record in parsed_records if record.get("ordem_carga")],
        }
    except Exception as exc:  # noqa: BLE001
        PROVIDER.save_integration(
            {
                "id": integration_id,
                "last_status": "error",
                "last_synced_at": synced_at,
                "last_error": str(exc),
            }
        )
        raise


def dispatch_apontamento_to_integration(payload: dict | None = None) -> dict:
    request_payload = payload or {}
    integration = _resolve_apontamento_integration(str(request_payload.get("integration_id") or "").strip() or None)
    integration_id = integration.get("id")
    synced_at = datetime.utcnow().isoformat() + "Z"
    pending_only = str(request_payload.get("pending_only", "true")).strip().lower() not in {"0", "false", "nao", "não", "off"}
    export_payload = PROVIDER.apontamento_export(pending_only=pending_only)
    exported_count = int(export_payload.get("exported_count") or 0)

    if exported_count <= 0:
        PROVIDER.save_integration(
            {
                "id": integration_id,
                "last_status": "idle",
                "last_synced_at": synced_at,
                "last_error": "",
            }
        )
        return {
            "status": "idle",
            "count": 0,
            "message": "Nenhum apontamento pendente para sincronizar com o Sankhya.",
            "integration": {
                "id": integration_id,
                "name": integration.get("name"),
                "integration_type": integration.get("integration_type"),
            },
        }

    base_payload = _parse_json_config_field(integration.get("request_body_json"), {})
    webhook_payload = {**base_payload, **export_payload} if isinstance(base_payload, dict) else export_payload

    try:
        webhook_status, webhook_response = _call_integration_webhook(
            integration,
            payload_override=webhook_payload,
            timeout_seconds=SETTINGS.n8n_apontamento_webhook_timeout_seconds,
        )
        if isinstance(webhook_response, dict) and isinstance(webhook_response.get("items"), list):
            PROVIDER.save_apontamento_sync_status(webhook_response)
        PROVIDER.save_integration(
            {
                "id": integration_id,
                "last_status": "accepted" if _is_async_refresh_ack(webhook_response) else "success",
                "last_synced_at": synced_at,
                "last_error": "",
            }
        )
        return {
            "status": "accepted" if _is_async_refresh_ack(webhook_response) else "success",
            "count": exported_count,
            "webhook_status_code": webhook_status,
            "message": (
                webhook_response.get("message")
                if isinstance(webhook_response, dict)
                else f"{exported_count} apontamento(s) enviados ao fluxo de integração."
            ) or f"{exported_count} apontamento(s) enviados ao fluxo de integração.",
            "integration": {
                "id": integration_id,
                "name": integration.get("name"),
                "integration_type": integration.get("integration_type"),
            },
            "response": webhook_response,
        }
    except Exception as exc:  # noqa: BLE001
        PROVIDER.save_integration(
            {
                "id": integration_id,
                "last_status": "error",
                "last_synced_at": synced_at,
                "last_error": str(exc),
            }
        )
        raise


class PcpApiHandler(BaseHTTPRequestHandler):
    server_version = "PCPSaaSReference/1.1"

    def read_json_body(self, *, max_bytes: int = DEFAULT_MAX_JSON_BODY_BYTES):
        try:
            content_length = int(self.headers.get("Content-Length", "0") or "0")
        except ValueError as exc:
            raise ApiRequestError(
                HTTPStatus.BAD_REQUEST,
                "Invalid request payload",
                "Cabeçalho `Content-Length` inválido.",
                code="invalid_content_length",
            ) from exc
        if content_length < 0:
            raise ApiRequestError(
                HTTPStatus.BAD_REQUEST,
                "Invalid request payload",
                "Cabeçalho `Content-Length` inválido.",
                code="invalid_content_length",
            )
        if content_length > max_bytes:
            raise ApiRequestError(
                HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                "Request payload too large",
                f"O corpo excede o limite operacional de {max_bytes} bytes.",
                code="payload_too_large",
            )
        raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        if not raw_body.strip():
            return {}
        if len(raw_body) > max_bytes:
            raise ApiRequestError(
                HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                "Request payload too large",
                f"O corpo excede o limite operacional de {max_bytes} bytes.",
                code="payload_too_large",
            )
        try:
            decoded = raw_body.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ApiRequestError(
                HTTPStatus.BAD_REQUEST,
                "Invalid request payload",
                "O corpo da requisição deve estar em UTF-8 válido.",
                code="invalid_encoding",
            ) from exc
        try:
            return json.loads(decoded)
        except json.JSONDecodeError as exc:
            raise ApiRequestError(
                HTTPStatus.BAD_REQUEST,
                "Invalid JSON body",
                "O corpo da requisição não contém JSON válido.",
                code="invalid_json",
            ) from exc

    def send_api_error(self, status: HTTPStatus, error: str, detail: str, *, code: str) -> None:
        self.send_json(
            status,
            {
                "error": error,
                "detail": detail,
                "code": code,
                "mode": SETTINGS.data_mode,
            },
        )

    def client_ip(self) -> str:
        forwarded_for = str(self.headers.get("X-Forwarded-For", "") or "").strip()
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        return str(self.client_address[0] if self.client_address else "")

    def record_audit_event(
        self,
        event_type: str,
        *,
        status: str,
        user: dict | None = None,
        detail: str = "",
        company_code: str | None = None,
        permission: str | None = None,
    ) -> None:
        AUDIT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        event = {
            "recorded_at": _current_utc().isoformat(),
            "mode": SETTINGS.data_mode,
            "event_type": event_type,
            "status": status,
            "route": self.path,
            "method": self.command,
            "client_ip": self.client_ip(),
            "permission": permission or "",
            "company_code": company_code or "",
            "detail": detail,
            "user_id": str((user or {}).get("id") or ""),
            "username": str((user or {}).get("username") or ""),
            "role": str((user or {}).get("role") or ""),
            "company_scope": _user_company_scope(user),
        }
        with AUDIT_LOG_PATH.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(event, ensure_ascii=False) + "\n")

    def _extract_bearer_token(self) -> str:
        cookie_header = str(self.headers.get("Cookie", "") or "").strip()
        for part in cookie_header.split(";"):
            part = part.strip()
            if part.startswith("pcp_session="):
                cookie_token = part[len("pcp_session="):].strip()
                if cookie_token:
                    return cookie_token

        authorization = str(self.headers.get("Authorization", "") or "").strip()
        expected_prefix = f"{AUTH_TOKEN_TYPE} "
        if authorization.startswith(expected_prefix):
            token = authorization[len(expected_prefix):].strip()
            if token:
                return token

        raise ApiRequestError(
            HTTPStatus.UNAUTHORIZED,
            "Authentication required",
            "Sessão expirada ou não autenticada. Faça login novamente.",
            code="missing_token",
        )

    def _resolve_current_user(self) -> dict:
        token = self._extract_bearer_token()
        
        # Modo Mock: Autenticação de Emergência/Desenvolvimento
        if SETTINGS.data_mode == "mock":
            if token == "pcp_app_session_v1_root":
                users = PROVIDER.users().get("items", [])
                user = next((u for u in users if u["username"] == "root"), None)
                if user:
                    print(f"[AUTH-MOCK] Acesso ROOT concedido via token estático.")
                    self._current_audit_user = user
                    return user

        token_payload = decode_access_token(token)
        user_id = str(token_payload.get("sub") or "").strip()
        users = PROVIDER.users().get("items", [])
        user = next((item for item in users if str(item.get("id") or "").strip() == user_id), None)
        if not user or not user.get("active"):
            raise ApiRequestError(
                HTTPStatus.UNAUTHORIZED,
                "Authentication required",
                "Usuário inválido, inativo ou removido.",
                code="invalid_session",
            )
        self._current_audit_user = user
        return user

    def require_authorized_user(self, *, permission: str, company_code: str | None = None) -> dict:
        try:
            user = self._resolve_current_user()
        except ApiRequestError as exc:
            self.record_audit_event("auth.access_denied", status="denied", detail=exc.detail, permission=permission)
            raise
        if permission in ADMIN_PERMISSIONS and str(user.get("role") or "").strip().lower() != "root":
            detail = "Apenas o perfil root pode acessar esta rota administrativa."
            self.record_audit_event("auth.access_denied", status="denied", user=user, detail=detail, permission=permission)
            raise ApiRequestError(HTTPStatus.FORBIDDEN, "Forbidden", detail, code="forbidden")
        if not _permission_allowed(user, permission):
            detail = "O usuário autenticado não possui permissão para executar esta ação."
            self.record_audit_event("auth.access_denied", status="denied", user=user, detail=detail, permission=permission)
            raise ApiRequestError(HTTPStatus.FORBIDDEN, "Forbidden", detail, code="forbidden")
        normalized_company_code = _normalize_company_code(company_code)
        if normalized_company_code and not _user_has_company_access(user, normalized_company_code):
            detail = f"O usuário não possui acesso à empresa `{normalized_company_code}`."
            self.record_audit_event(
                "auth.company_denied",
                status="denied",
                user=user,
                detail=detail,
                company_code=normalized_company_code,
                permission=permission,
            )
            raise ApiRequestError(HTTPStatus.FORBIDDEN, "Forbidden", detail, code="company_forbidden")
        return user

    def resolve_scoped_query_company_code(self, user: dict, requested_company_code: str | None, *, route: str) -> str | None:
        normalized_company_code = _normalize_company_code(requested_company_code)
        if normalized_company_code:
            if not _user_has_company_access(user, normalized_company_code):
                raise ApiRequestError(
                    HTTPStatus.FORBIDDEN,
                    "Forbidden",
                    f"O usuário não possui acesso à empresa `{normalized_company_code}`.",
                    code="company_forbidden",
                )
            return normalized_company_code
        if _user_has_wildcard_scope(user):
            return None
        scope = _user_company_scope(user)
        if len(scope) == 1:
            return scope[0]
        if len(scope) > 1:
            raise ApiRequestError(
                HTTPStatus.UNPROCESSABLE_ENTITY,
                "Invalid request payload",
                f"Informe `company_code` para acessar `{route}` com escopo multiempresa.",
                code="missing_company_code",
            )
        raise ApiRequestError(
            HTTPStatus.FORBIDDEN,
            "Forbidden",
            "Usuário sem empresa vinculada para acessar esta rota.",
            code="missing_company_scope",
        )

    def filter_items_by_company_scope(self, items: list[dict], user: dict, *, company_code: str | None = None) -> list[dict]:
        normalized_company_code = _normalize_company_code(company_code)
        filtered: list[dict] = []
        for item in items:
            item_company_code = _normalize_company_code(
                item.get("company_code") or item.get("empresa") or item.get("codigo_empresa") or item.get("company")
            )
            if normalized_company_code:
                if item_company_code == normalized_company_code:
                    filtered.append(item)
                continue
            if _user_has_wildcard_scope(user) or (item_company_code and _user_has_company_access(user, item_company_code)):
                filtered.append(item)
        return filtered

    def record_critical_action(self, route: str, *, status: str, user: dict | None = None, detail: str = "", company_code: str | None = None) -> None:
        event_type = CRITICAL_AUDIT_ACTIONS.get(route)
        if not event_type:
            return
        actor = user if isinstance(user, dict) else getattr(self, "_current_audit_user", None)
        self.record_audit_event(
            event_type,
            status=status,
            user=actor,
            detail=detail,
            company_code=company_code,
        )

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/pcp/"):
            self.handle_api_get(parsed)
            return
        self.handle_static(parsed.path)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        audit_user: dict | None = None
        audit_company_code: str | None = None
        self._current_audit_user = None
        try:
            if parsed.path == "/api/pcp/runs/mrp":
                payload = _require_object_payload(self.read_json_body(), route=parsed.path)
                audit_company_code = _normalize_company_code(payload.get("company_code") or payload.get("empresa"))
                audit_user = self.require_authorized_user(permission="mrp.run", company_code=audit_company_code)
                self.send_json(HTTPStatus.OK, PROVIDER.run_mrp())
                self.record_critical_action(parsed.path, status="success", user=audit_user, company_code=audit_company_code)
                return

            if parsed.path == "/api/pcp/sources/sync":
                # Permite acesso via Sessão (UI) ou Token de Sincronização (n8n/Externo)
                audit_user = None
                try:
                    audit_user = self.require_authorized_user(permission="sources.sync")
                except ApiRequestError:
                    if not self.authorize_sync(send_on_failure=True):
                        return
                    audit_user = {"username": "external_sync", "role": "manager", "full_name": "Sincronização Externa"}
                
                payload = _require_object_payload(self.read_json_body(), route=parsed.path)
                self.send_json(HTTPStatus.OK, PROVIDER.sync_sources(payload))
                self.record_critical_action(parsed.path, status="success", user=audit_user)
                return

            if parsed.path == "/api/pcp/structure-overrides":
                payload = _require_object_payload(self.read_json_body(), route=parsed.path)
                audit_company_code = _normalize_company_code(payload.get("company_code") or payload.get("empresa"))
                audit_user = self.require_authorized_user(permission="structure_override.write", company_code=audit_company_code)
                self.send_json(HTTPStatus.OK, PROVIDER.save_structure_override(payload))
                self.record_critical_action(parsed.path, status="success", user=audit_user, company_code=audit_company_code)
                return

            if parsed.path in ("/api/pcp/programming-entries", "/api/pcp/programming"):
                payload = _require_object_payload(self.read_json_body(), route=parsed.path)
                audit_company_code = _normalize_company_code(payload.get("company_code") or payload.get("empresa"))
                audit_user = self.require_authorized_user(permission="programming.write", company_code=audit_company_code)
                self.send_json(HTTPStatus.OK, PROVIDER.save_programming_entry(payload))
                self.record_critical_action(parsed.path, status="success", user=audit_user, company_code=audit_company_code)
                return

            if parsed.path == "/api/pcp/users/save":
                payload = _require_object_payload(self.read_json_body(), route=parsed.path)
                audit_user = self.require_authorized_user(permission="users.write")
                self.send_json(HTTPStatus.OK, _sanitize_user_response(PROVIDER.save_user(payload)))
                self.record_critical_action(parsed.path, status="success", user=audit_user)
                return

            if parsed.path == "/api/pcp/integrations/save":
                payload = _require_object_payload(self.read_json_body(), route=parsed.path)
                audit_user = self.require_authorized_user(permission="integrations.write")
                self.send_json(HTTPStatus.OK, _sanitize_integration_response(PROVIDER.save_integration(payload)))
                self.record_critical_action(parsed.path, status="success", user=audit_user)
                return

            if parsed.path == "/api/pcp/integrations/delete":
                payload = _require_object_payload(self.read_json_body(), route=parsed.path)
                audit_user = self.require_authorized_user(permission="integrations.write")
                self.send_json(HTTPStatus.OK, PROVIDER.delete_integration(payload))
                self.record_critical_action(parsed.path, status="success", user=audit_user)
                return

            if parsed.path == "/api/pcp/stock-movements/save":
                payload = _require_object_payload(self.read_json_body(), route=parsed.path)
                audit_company_code = _normalize_company_code(payload.get("company_code") or payload.get("empresa"))
                audit_user = self.require_authorized_user(permission="stock.write", company_code=audit_company_code)
                self.send_json(HTTPStatus.OK, PROVIDER.save_stock_movement(payload))
                self.record_critical_action(parsed.path, status="success", user=audit_user, company_code=audit_company_code)
                return

            if parsed.path == "/api/pcp/apontamento/save":
                payload = _require_object_payload(self.read_json_body(), route=parsed.path)
                audit_company_code = _normalize_company_code(payload.get("company_code") or payload.get("empresa"))
                audit_user = self.require_authorized_user(permission="apontamento.write", company_code=audit_company_code)
                self.send_json(HTTPStatus.OK, PROVIDER.save_apontamento(payload))
                self.record_critical_action(parsed.path, status="success", user=audit_user, company_code=audit_company_code)
                return

            if parsed.path == "/api/pcp/apontamento/sync-status":
                payload = _require_object_payload(self.read_json_body(), route=parsed.path)
                audit_company_code = _normalize_company_code(payload.get("company_code") or payload.get("empresa"))
                audit_user = self.require_authorized_user(permission="apontamento.dispatch", company_code=audit_company_code)
                self.send_json(HTTPStatus.OK, PROVIDER.save_apontamento_sync_status(payload))
                self.record_critical_action(parsed.path, status="success", user=audit_user, company_code=audit_company_code)
                return
            if parsed.path == "/api/pcp/apontamento/dispatch":
                payload = _require_object_payload(self.read_json_body(), route=parsed.path)
                audit_company_code = _normalize_company_code(payload.get("company_code") or payload.get("empresa"))
                audit_user = self.require_authorized_user(permission="apontamento.dispatch", company_code=audit_company_code)
                self.send_json(HTTPStatus.OK, dispatch_apontamento_to_integration(payload))
                self.record_critical_action(parsed.path, status="success", user=audit_user, company_code=audit_company_code)
                return

            if parsed.path == "/api/pcp/auth/login":
                payload = _require_object_payload(self.read_json_body(), route=parsed.path)
                username = str(payload.get("username") or "").strip()
                password = str(payload.get("password") or "").strip()
                if not username or not password:
                    raise ApiRequestError(
                        HTTPStatus.BAD_REQUEST,
                        "Invalid login payload",
                        "Informe `username` e `password` para autenticar.",
                        code="missing_credentials",
                    )
                user = PROVIDER.authenticate_user(username, password)
                if not user:
                    self.record_audit_event(
                        "auth.login",
                        status="failed",
                        detail=f"Falha de login para `{username}`.",
                    )
                    self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Usuário ou senha inválidos"})
                    return
                access_token, expires_at = issue_access_token(user)
                self.record_audit_event("auth.login", status="success", user=user, detail="Login autenticado com sucesso.")
                cookie_str = f"pcp_session={access_token}; HttpOnly; Path=/; SameSite=Lax"
                self.send_json(
                    HTTPStatus.OK,
                    {
                        "status": "authenticated",
                        "user": public_user_record(user),
                        "access_token": "", 
                        "token_type": "Cookie",
                        "expires_at": expires_at,
                    },
                    extra_headers=[("Set-Cookie", cookie_str)]
                )
                return

            if parsed.path == "/api/pcp/auth/logout":
                cookie_str = "pcp_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
                self.send_json(HTTPStatus.OK, {"status": "logged_out"}, extra_headers=[("Set-Cookie", cookie_str)])
                return

            if parsed.path == "/api/pcp/romaneios-kanban/update-date":
                payload = _require_object_payload(self.read_json_body(), route=parsed.path)
                audit_company_code = _normalize_company_code(payload.get("company_code") or payload.get("empresa"))
                audit_user = self.require_authorized_user(permission="romaneios.write", company_code=audit_company_code)
                self.send_json(HTTPStatus.OK, PROVIDER.save_romaneio_schedule(payload))
                self.record_critical_action(parsed.path, status="success", user=audit_user, company_code=audit_company_code)
                return

            if parsed.path == "/api/pcp/romaneios/delete":
                payload = _require_object_payload(self.read_json_body(), route=parsed.path)
                audit_company_code = _normalize_company_code(payload.get("company_code") or payload.get("empresa"))
                audit_user = self.require_authorized_user(permission="romaneios.delete", company_code=audit_company_code)
                self.send_json(HTTPStatus.OK, PROVIDER.delete_romaneio(payload))
                self.record_critical_action(parsed.path, status="success", user=audit_user, company_code=audit_company_code)
                return

            if parsed.path in ["/api/pcp/romaneios-kanban/sync", "/api/pcp/romaneios/sync"]:
                # Permite acesso via Sessão (UI) ou Token de Sincronização (n8n/Externo)
                audit_user = None
                try:
                    audit_user = self.require_authorized_user(permission="romaneios.ingest")
                except ApiRequestError:
                    if not self.authorize_sync(send_on_failure=True):
                        return
                    audit_user = {"username": "external_sync", "role": "manager", "full_name": "Sincronização Externa"}
                payload = self.read_json_body()
                if isinstance(payload, list):
                    records = payload
                elif isinstance(payload, dict):
                    records = payload.get("records") or []
                else:
                    raise ApiRequestError(
                        HTTPStatus.BAD_REQUEST,
                        "Invalid request payload",
                        "O corpo enviado deve ser uma lista de registros ou um objeto com `records`.",
                        code="invalid_records_payload",
                    )
                if not isinstance(records, list):
                    raise ApiRequestError(
                        HTTPStatus.BAD_REQUEST,
                        "Invalid request payload",
                        "`records` deve ser uma lista de romaneios normalizados.",
                        code="invalid_records_payload",
                    )
                if not records:
                    raise ApiRequestError(
                        HTTPStatus.BAD_REQUEST,
                        "Invalid request payload",
                        "Informe pelo menos um registro em `records` para sincronizar.",
                        code="empty_records_payload",
                    )
                for record in records:
                    company_code = _normalize_company_code(
                        record.get("empresa") or record.get("codigo_empresa") or record.get("codigoEmpresa")
                    )
                    if company_code and not _user_has_company_access(audit_user, company_code):
                        raise ApiRequestError(
                            HTTPStatus.FORBIDDEN,
                            "Forbidden",
                            f"O usuário não possui acesso à empresa `{company_code}`.",
                            code="company_forbidden",
                        )
                self.send_json(HTTPStatus.OK, sync_parsed_romaneios(records, source_code=ROMANEIO_WEBHOOK_SOURCE_CODE))
                self.record_critical_action(parsed.path, status="success", user=audit_user)
                return

            if parsed.path == "/api/pcp/romaneios/upload":
                audit_user = self.require_authorized_user(permission="romaneios.ingest")
                payload = _require_object_payload(
                    self.read_json_body(max_bytes=UPLOAD_MAX_JSON_BODY_BYTES),
                    route=parsed.path,
                )
                files = payload.get("files") or []
                if not isinstance(files, list):
                    raise ApiRequestError(
                        HTTPStatus.BAD_REQUEST,
                        "Invalid request payload",
                        "`files` deve ser uma lista de arquivos em base64.",
                        code="invalid_files_payload",
                    )
                if len(files) > MAX_ROMANEIO_UPLOAD_FILES:
                    raise ApiRequestError(
                        HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                        "Upload batch too large",
                        f"O lote excede o limite de {MAX_ROMANEIO_UPLOAD_FILES} arquivos por envio.",
                        code="too_many_files",
                    )
                parsed_records: list[dict] = []
                file_errors: list[dict] = []
                decoded_total_bytes = 0

                for entry in files:
                    if not isinstance(entry, dict):
                        file_errors.append({"file_name": "sem_nome", "error": "Entrada de arquivo inválida."})
                        continue
                    name = str(entry.get("name") or "").strip()
                    content_base64 = str(entry.get("content_base64") or "").strip()
                    if not name or not content_base64:
                        file_errors.append({"file_name": name or "sem_nome", "error": "Arquivo sem nome ou conteúdo."})
                        continue
                    try:
                        file_bytes = base64.b64decode(content_base64, validate=True)
                        if len(file_bytes) > MAX_ROMANEIO_UPLOAD_FILE_BYTES:
                            file_errors.append(
                                {
                                    "file_name": name,
                                    "error": f"Arquivo acima do limite operacional de {MAX_ROMANEIO_UPLOAD_FILE_BYTES} bytes.",
                                }
                            )
                            continue
                        decoded_total_bytes += len(file_bytes)
                        if decoded_total_bytes > MAX_ROMANEIO_UPLOAD_TOTAL_BYTES:
                            raise ApiRequestError(
                                HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                                "Upload batch too large",
                                f"O lote excede o limite operacional de {MAX_ROMANEIO_UPLOAD_TOTAL_BYTES} bytes decodificados.",
                                code="upload_total_too_large",
                            )
                        parsed_records.append(parse_romaneio_pdf_bytes(file_bytes, name))
                    except ApiRequestError:
                        raise
                    except (binascii.Error, ValueError):
                        file_errors.append({"file_name": name, "error": "Conteúdo base64 inválido."})
                    except Exception as exc:  # noqa: BLE001
                        file_errors.append({"file_name": name, "error": str(exc)})

                for parsed_record in parsed_records:
                    company_code = _normalize_company_code(
                        parsed_record.get("empresa") or parsed_record.get("codigo_empresa") or parsed_record.get("codigoEmpresa")
                    )
                    if company_code and not _user_has_company_access(audit_user, company_code):
                        raise ApiRequestError(
                            HTTPStatus.FORBIDDEN,
                            "Forbidden",
                            f"O usuário não possui acesso à empresa `{company_code}`.",
                            code="company_forbidden",
                        )

                response = sync_parsed_romaneios(parsed_records, source_code=ROMANEIO_PDF_SOURCE_CODE)
                response["uploaded_files"] = len(files)
                if file_errors:
                    response["errors"] = response.get("errors", []) + file_errors
                    if response["status"] == "success":
                        response["status"] = "partial"
                if not parsed_records and file_errors:
                    response["status"] = "error"
                self.send_json(HTTPStatus.OK, response)
                self.record_critical_action(parsed.path, status="success", user=audit_user)
                return

            if parsed.path == "/api/pcp/romaneios/refresh":
                payload = _require_object_payload(self.read_json_body(), route=parsed.path)
                audit_company_code = _normalize_company_code(payload.get("company_code") or payload.get("empresa"))
                audit_user = self.require_authorized_user(permission="romaneios.ingest", company_code=audit_company_code)
                self.send_json(HTTPStatus.OK, refresh_romaneios_from_integration(payload))
                self.record_critical_action(parsed.path, status="success", user=audit_user, company_code=audit_company_code)
            if parsed.path == "/api/pcp/stock-movements/sync":
                audit_user = self.require_authorized_user(permission="governance.manage")
                payload = self.read_json_body()
                records = []
                if isinstance(payload, list):
                    records = payload
                elif isinstance(payload, dict):
                    records = payload.get("records") or payload.get("items") or []
                
                if not records:
                    raise ApiRequestError(HTTPStatus.BAD_REQUEST, "Payload vazio", "Nenhum movimento de estoque recebido.")
                
                stock_file = PROVIDER.data_dir / "stock_movements.json"
                try:
                    with open(stock_file, 'r') as f:
                        current = json.load(f)
                except:
                    current = {"items": []}
                
                from datetime import datetime, timezone
                now = datetime.now(timezone.utc).isoformat()
                new_items = []
                for r in records:
                    new_items.append({
                        "sku": str(r.get("sku") or "").upper(),
                        "quantity": float(r.get("quantity") or r.get("quantidade") or 0),
                        "type": str(r.get("type") or "entrada").lower(),
                        "company_code": str(r.get("company_code") or r.get("empresa") or ""),
                        "created_at": r.get("created_at") or now,
                        "updated_at": now
                    })
                
                current["items"] = new_items + current["items"]
                current["items"] = current["items"][:5000]
                
                with open(stock_file, 'w') as f:
                    json.dump(current, f, indent=2)
                
                self.send_json(HTTPStatus.OK, {"status": "success", "count": len(new_items)})
                self.record_critical_action(parsed.path, status="success", user=audit_user)
                return

        except ApiRequestError as exc:
            self.record_critical_action(parsed.path, status="error", user=audit_user, detail=exc.detail, company_code=audit_company_code)
            self.send_api_error(exc.status, exc.error, exc.detail, code=exc.code)
            return
        except SourceSyncError as exc:
            self.record_critical_action(parsed.path, status="error", user=audit_user, detail=str(exc), company_code=audit_company_code)
            self.send_api_error(
                HTTPStatus.UNPROCESSABLE_ENTITY,
                "Invalid request payload",
                str(exc),
                code="invalid_sync_request",
            )
            return
        except (ValueError, KeyError) as exc:
            detail = str(exc)
            if isinstance(exc, KeyError):
                detail = f"Campo obrigatório ausente: {exc.args[0]}"
            self.record_critical_action(parsed.path, status="error", user=audit_user, detail=detail, company_code=audit_company_code)
            self.send_api_error(
                HTTPStatus.UNPROCESSABLE_ENTITY,
                "Invalid request payload",
                detail,
                code="validation_error",
            )
            return
        except Exception as exc:  # noqa: BLE001
            self.record_critical_action(parsed.path, status="error", user=audit_user, detail=str(exc), company_code=audit_company_code)
            self.send_api_error(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                "Backend PCP unavailable",
                str(exc),
                code="internal_error",
            )
            return
        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Route not found"})

    def authorize_sync(self, *, send_on_failure: bool = True) -> bool:
        expected_token = SETTINGS.sync_api_token
        if not expected_token:
            return True
        header_token = self.headers.get("X-PCP-Sync-Token", "").strip()
        if header_token and hmac.compare_digest(header_token, expected_token):
            return True
        if send_on_failure:
            self.send_json(
                HTTPStatus.UNAUTHORIZED,
                {"error": "Sync token required for this operation"},
            )
        return False

    def handle_api_get(self, parsed) -> None:
        query = parse_qs(parsed.query)
        path = parsed.path
        requested_company_code = (query.get("company_code", [""])[0] or "").strip() or None

        try:
            if path == "/api/pcp/overview":
                user = self.require_authorized_user(permission="overview.read", company_code=_normalize_company_code(requested_company_code))
                company_code = self.resolve_scoped_query_company_code(user, requested_company_code, route=path)
                self.send_json(HTTPStatus.OK, PROVIDER.overview(company_code=company_code))
                return

            if path == "/api/pcp/painel":
                user = self.require_authorized_user(permission="painel.read", company_code=_normalize_company_code(requested_company_code))
                company_code = self.resolve_scoped_query_company_code(user, requested_company_code, route=path)
                self.send_json(
                    HTTPStatus.OK,
                    PROVIDER.painel(
                        search=(query.get("search", [""])[0] or "").strip() or None,
                        product_type=(query.get("product_type", [""])[0] or "").strip() or None,
                        only_critical=(query.get("only_critical", ["false"])[0] or "").lower() == "true",
                        company_code=company_code,
                    ),
                )
                return

            if path == "/api/pcp/romaneios":
                user = self.require_authorized_user(permission="romaneios.read", company_code=_normalize_company_code(requested_company_code))
                items = PROVIDER.romaneios().get("items", [])
                self.send_json(
                    HTTPStatus.OK,
                    {"items": self.filter_items_by_company_scope(items, user, company_code=requested_company_code)},
                )
                return

            if path.startswith("/api/pcp/romaneios/"):
                romaneio_code = path.rsplit("/", 1)[-1]
                if romaneio_code == "kanban":
                    pass
                else:
                    user = self.require_authorized_user(permission="romaneios.read", company_code=_normalize_company_code(requested_company_code))
                    payload = PROVIDER.romaneio_detail(romaneio_code)
                    if payload is None:
                        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Romaneio not found"})
                        return
                    header = payload.get("header") if isinstance(payload.get("header"), dict) else payload
                    detail_company_code = _normalize_company_code(
                        header.get("company_code") or header.get("empresa") or header.get("codigo_empresa")
                    )
                    if requested_company_code and detail_company_code and detail_company_code != _normalize_company_code(requested_company_code):
                        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Romaneio not found"})
                        return
                    if detail_company_code and not _user_has_company_access(user, detail_company_code) and not _user_has_wildcard_scope(user):
                        raise ApiRequestError(
                            HTTPStatus.FORBIDDEN,
                            "Forbidden",
                            f"O usuário não possui acesso à empresa `{detail_company_code}`.",
                            code="company_forbidden",
                        )
                    self.send_json(HTTPStatus.OK, payload)
                    return

            if path == "/api/pcp/romaneios-kanban":
                user = self.require_authorized_user(permission="romaneios.read", company_code=_normalize_company_code(requested_company_code))
                if _user_has_wildcard_scope(user) and not requested_company_code:
                    self.send_json(HTTPStatus.OK, PROVIDER.romaneios_kanban())
                    return
                company_code = self.resolve_scoped_query_company_code(user, requested_company_code, route=path)
                romaneios_items = PROVIDER.romaneios().get("items", [])
                self.send_json(
                    HTTPStatus.OK,
                    {
                        "products": PROVIDER.painel(company_code=company_code).get("items", []),
                        "romaneios": self.filter_items_by_company_scope(romaneios_items, user, company_code=company_code),
                    },
                )
                return

            if path == "/api/pcp/assembly":
                self.require_authorized_user(permission="assembly.read")
                self.send_json(HTTPStatus.OK, PROVIDER.assembly())
                return

            if path == "/api/pcp/production":
                self.require_authorized_user(permission="production.read")
                self.send_json(HTTPStatus.OK, PROVIDER.production())
                return

            if path == "/api/pcp/structures":
                self.require_authorized_user(permission="structures.read")
                self.send_json(
                    HTTPStatus.OK,
                    PROVIDER.structures(
                        source_scope=(query.get("source_scope", [""])[0] or "").strip() or None,
                        search=(query.get("search", [""])[0] or "").strip() or None,
                    ),
                )
                return

            if path == "/api/pcp/programming":
                self.require_authorized_user(permission="programming.read")
                self.send_json(
                    HTTPStatus.OK,
                    PROVIDER.programming(action=(query.get("action", [""])[0] or "").strip() or None),
                )
                return

            if path == "/api/pcp/users":
                self.require_authorized_user(permission="users.read")
                self.send_json(HTTPStatus.OK, _sanitize_user_response(PROVIDER.users()))
                return

            if path == "/api/pcp/integrations":
                self.require_authorized_user(permission="integrations.read")
                data = PROVIDER.integrations()
                print(f"[API] Enviando {len(data.get('items', []))} integrações para o frontend.")
                self.send_json(HTTPStatus.OK, data)
                return

            if path == "/api/pcp/stock-movements":
                self.require_authorized_user(permission="stock.read")
                self.send_json(HTTPStatus.OK, PROVIDER.stock_movements())
                return

            if path == "/api/pcp/apontamento/logs":
                self.require_authorized_user(permission="apontamento.read")
                self.send_json(HTTPStatus.OK, PROVIDER.apontamento_logs())
                return

            if path == "/api/pcp/apontamento/export":
                self.require_authorized_user(permission="apontamento.read")
                pending_only = (query.get("pending_only", [""])[0] or "").strip().lower() in {"1", "true", "yes", "sim"}
                self.send_json(HTTPStatus.OK, PROVIDER.apontamento_export(pending_only))
                return

            if path == "/api/pcp/production-rules":
                self.require_authorized_user(permission="production_rules.read")
                self.send_json(HTTPStatus.OK, PROVIDER.production_rules())
                return

            if path == "/api/pcp/purchases":
                self.require_authorized_user(permission="purchases.read")
                self.send_json(
                    HTTPStatus.OK,
                    PROVIDER.purchases(product_type=(query.get("product_type", [""])[0] or "").strip() or None),
                )
                return

            if path == "/api/pcp/recycling":
                self.require_authorized_user(permission="recycling.read")
                self.send_json(HTTPStatus.OK, PROVIDER.recycling())
                return

            if path == "/api/pcp/costs":
                self.require_authorized_user(permission="costs.read")
                self.send_json(HTTPStatus.OK, PROVIDER.costs())
                return

            if path == "/api/pcp/sources":
                self.require_authorized_user(permission="sources.read")
                self.send_json(HTTPStatus.OK, PROVIDER.sources())
                return

            if path == "/api/pcp/alerts":
                self.require_authorized_user(permission="alerts.read")
                self.send_json(HTTPStatus.OK, PROVIDER.alerts())
                return

            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Route not found"})
        except ApiRequestError as exc:
            self.send_api_error(exc.status, exc.error, exc.detail, code=exc.code)
        except Exception as exc:  # noqa: BLE001
            self.send_api_error(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                "Backend PCP unavailable",
                str(exc),
                code="internal_error",
            )

    def handle_static(self, raw_path: str) -> None:
        web_dir = resolve_web_dir()
        path = raw_path or "/"
        if path == "/":
            path = "/index.html"

        file_path = (web_dir / path.lstrip("/")).resolve()
        if web_dir not in file_path.parents and file_path != web_dir:
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        if not file_path.exists() or not file_path.is_file():
            # Allow SPA deep links on the official web-react shell.
            if path.rsplit("/", 1)[-1].find(".") == -1:
                file_path = web_dir / "index.html"
            else:
                self.send_error(HTTPStatus.NOT_FOUND)
                return
        if not file_path.exists() or not file_path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        body = file_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type_for(file_path))
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, status: HTTPStatus, payload: dict, extra_headers: list[tuple[str, str]] | None = None) -> None:
        body = json.dumps(payload, ensure_ascii=False, default=json_default).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if extra_headers:
            for key, value in extra_headers:
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))


def main() -> None:
    server = ThreadingHTTPServer((SETTINGS.host, SETTINGS.port), PcpApiHandler)
    web_dir = resolve_web_dir()
    print(
        f"PCP SaaS running on http://{SETTINGS.host}:{SETTINGS.port} "
        f"[{SETTINGS.data_mode}] frontend={web_dir.relative_to(ROOT)}"
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

from __future__ import annotations

import hashlib
import hmac
import json
import re
import secrets
from abc import ABC, abstractmethod
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from . import queries
from .config import Settings
from .source_sync import (
    STOCK_SOURCE_CODES,
    SourceSyncError,
    build_meta,
    build_source_request,
    resolve_requested_codes,
    resolve_snapshot_at,
    run_parser_envelope,
)

DEFAULT_APP_USER = {
    "id": "user-root",
    "username": "root",
    "full_name": "Administrador Root",
    "role": "root",
    "company_scope": ["*"],
    "password": "root@123",
    "active": True,
    "created_at": "2026-04-01T00:00:00.000Z",
    "updated_at": "2026-04-01T00:00:00.000Z",
}

DEFAULT_APP_INTEGRATION = {
    "id": "integration-romaneios-n8n",
    "name": "Romaneios N8N",
    "integration_type": "n8n_webhook_romaneios",
    "webhook_url": "",
    "method": "POST",
    "auth_type": "none",
    "auth_value": "",
    "extra_headers_json": "{}",
    "request_body_json": "{}",
    "active": False,
    "last_status": "idle",
    "last_synced_at": "",
    "last_error": "",
    "created_at": "2026-04-02T00:00:00.000Z",
    "updated_at": "2026-04-02T00:00:00.000Z",
}

DEFAULT_APP_APONTAMENTO_INTEGRATION = {
    "id": "integration-apontamento-n8n",
    "name": "Apontamento N8N",
    "integration_type": "n8n_webhook_apontamento",
    "webhook_url": "",
    "method": "POST",
    "auth_type": "none",
    "auth_value": "",
    "extra_headers_json": "{}",
    "request_body_json": "{}",
    "active": False,
    "last_status": "idle",
    "last_synced_at": "",
    "last_error": "",
    "created_at": "2026-04-07T00:00:00.000Z",
    "updated_at": "2026-04-07T00:00:00.000Z",
}

PRODUCTION_RULES_PATH = Path(__file__).resolve().parent.parent / "data" / "production_machine_rules.json"

APP_STATE_PRODUCTION_RULES_KEY = "production_machine_rules"
APP_STATE_APONTAMENTO_LOGS_KEY = "apontamento_logs"
PASSWORD_HASH_SCHEME = "pbkdf2_sha256"
PASSWORD_HASH_ITERATIONS = 260_000
COMPANY_SCOPE_ALL = "*"
MOCK_DEFAULT_COMPANY_CODE = "INPLAST"
ALLOWED_APP_ROLES = {"root", "manager", "operator"}
LEGACY_ROLE_ALIASES = {
    "admin": "root",
    "apontamento": "operator",
    "planner": "manager",
    "pcp": "manager",
}


def _normalize_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() not in {"", "0", "false", "no", "off"}


def _normalize_company_scope(raw: Any, *, role: str = "", username: str = "") -> list[str]:
    normalized_role = str(role or "").strip().lower()
    normalized_username = str(username or "").strip().lower()
    if normalized_role == "root" or normalized_username == "root":
        return [COMPANY_SCOPE_ALL]

    values: list[str] = []
    if isinstance(raw, str):
        values = [part.strip() for part in raw.split(",")]
    elif isinstance(raw, (list, tuple, set)):
        values = [str(item or "").strip() for item in raw]
    elif raw not in (None, ""):
        values = [str(raw).strip()]

    scope: list[str] = []
    for value in values:
        company_code = str(value or "").strip().upper()
        if not company_code:
            continue
        if company_code in {"*", "ALL", "TODAS", "CONSOLIDADO"}:
            return [COMPANY_SCOPE_ALL]
        if company_code not in scope:
            scope.append(company_code)
    return scope


def _normalize_user_role(value: Any, *, username: str = "") -> str:
    normalized_username = str(username or "").strip().lower()
    if normalized_username == "root":
        return "root"
    role = str(value or "operator").strip().lower() or "operator"
    role = LEGACY_ROLE_ALIASES.get(role, role)
    if role not in ALLOWED_APP_ROLES:
        return "operator"
    return role


def _normalize_company_code_value(value: Any) -> str:
    return str(value or "").strip().upper()


def _is_password_hash(value: Any) -> bool:
    return str(value or "").startswith(f"{PASSWORD_HASH_SCHEME}$")


def _hash_password(value: Any) -> str:
    password = str(value or "").strip()
    if not password:
        return ""
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PASSWORD_HASH_ITERATIONS,
    ).hex()
    return f"{PASSWORD_HASH_SCHEME}${PASSWORD_HASH_ITERATIONS}${salt}${digest}"


def _normalize_password(value: Any) -> str:
    password = str(value or "").strip()
    if not password:
        return ""
    if _is_password_hash(password):
        return password
    return _hash_password(password)


def _verify_password(password: Any, stored_password: Any) -> bool:
    raw_password = str(password or "")
    stored = str(stored_password or "").strip()
    if not raw_password or not stored:
        return False
    if _is_password_hash(stored):
        try:
            _, iterations_raw, salt, expected_digest = stored.split("$", 3)
            digest = hashlib.pbkdf2_hmac(
                "sha256",
                raw_password.encode("utf-8"),
                salt.encode("utf-8"),
                int(iterations_raw),
            ).hex()
        except (TypeError, ValueError):
            return False
        return hmac.compare_digest(digest, expected_digest)
    return hmac.compare_digest(stored, raw_password)

def public_user_record(raw: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in raw.items() if key not in {"password", "meta_json"}}


def public_integration_record(raw: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in raw.items() if key != "auth_value"}


def _validate_integration_payload(payload: dict[str, Any]) -> None:
    name = str(payload.get("name") or "").strip()
    webhook_url = str(payload.get("webhook_url") or "").strip()
    method = str(payload.get("method") or "POST").strip().upper() or "POST"
    active = _normalize_bool(payload.get("active", False))

    if not name:
        raise ValueError("Nome da integração obrigatório.")

    if active and not webhook_url:
        raise ValueError("Webhook obrigatório para integrações ativas.")

    if webhook_url:
        parsed = urlparse(webhook_url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Webhook deve ser uma URL HTTP/HTTPS válida.")

    if method not in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
        raise ValueError("Método HTTP inválido para integração.")

    for field_name in ("extra_headers_json", "request_body_json"):
        value = payload.get(field_name)
        if value in (None, "") or isinstance(value, (dict, list)):
            continue
        try:
            json.loads(str(value))
        except json.JSONDecodeError as exc:
            raise ValueError(f"Campo `{field_name}` deve conter JSON válido.") from exc


DEFAULT_APP_USER["password"] = _normalize_password(DEFAULT_APP_USER["password"])


def _coerce_user_record(raw: dict[str, Any]) -> dict[str, Any]:
    created_at = str(raw.get("created_at") or datetime.now(timezone.utc).isoformat())
    username = str(raw.get("username") or "").strip().lower()
    role = _normalize_user_role(raw.get("role"), username=username)
    company_scope = _normalize_company_scope(
        raw.get("company_scope")
        if raw.get("company_scope") is not None
        else raw.get("company_codes")
        if raw.get("company_codes") is not None
        else raw.get("company_code")
        if raw.get("company_code") is not None
        else raw.get("empresa"),
        role=role,
        username=username,
    )
    return {
        "id": str(raw.get("id") or f"user-{username}"),
        "username": username,
        "full_name": str(raw.get("full_name") or raw.get("username") or "").strip(),
        "role": role,
        "company_scope": company_scope,
        "password": _normalize_password(raw.get("password")),
        "active": _normalize_bool(raw.get("active", True)),
        "created_at": created_at,
        "updated_at": str(raw.get("updated_at") or created_at),
    }


def _validate_user_record(user: dict[str, Any]) -> None:
    username = str(user.get("username") or "").strip().lower()
    role = _normalize_user_role(user.get("role"), username=username)
    if role not in ALLOWED_APP_ROLES:
        allowed = ", ".join(sorted(ALLOWED_APP_ROLES))
        raise ValueError(f"Perfil inválido. Use apenas: {allowed}.")

    scope = _normalize_company_scope(user.get("company_scope"), role=role, username=username)
    if role == "root":
        if scope != [COMPANY_SCOPE_ALL]:
            raise ValueError("Usuário root deve ter escopo global `*`.")
        return
    if not scope:
        raise ValueError("Informe ao menos uma empresa no `company_scope` para usuários não root.")


def load_app_users(users_path: Path) -> list[dict[str, Any]]:
    print(f"[DB] Carregando usuários de: {users_path}")
    if users_path.exists():
        try:
            payload = json.loads(users_path.read_text(encoding="utf-8"))
            items = payload.get("items", payload) if isinstance(payload, dict) else payload
            users = [_coerce_user_record(item) for item in items if item]
            print(f"[DB] {len(users)} usuários lidos do arquivo.")
        except Exception as e:
            print(f"[DB] Erro ao ler usuários: {e}")
            users = []
    else:
        print(f"[DB] Arquivo app_users.json não encontrado.")
        users = []

    if not any(item["username"] == "root" for item in users):
        print("[DB] Injetando usuário root padrão.")
        users.insert(0, {**DEFAULT_APP_USER})

    users = sorted(users, key=lambda item: (item["username"] != "root", item["full_name"].lower()))
    return users


def save_app_users(users_path: Path, users: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sanitized = [_coerce_user_record(item) for item in users if item]
    if not any(item["username"] == "root" for item in sanitized):
        sanitized.insert(0, {**DEFAULT_APP_USER})
    users_path.parent.mkdir(parents=True, exist_ok=True)
    users_path.write_text(json.dumps({"items": sanitized}, ensure_ascii=False, indent=2), encoding="utf-8")
    return sanitized


def _stringify_json_field(value: Any, fallback: str = "{}") -> str:
    if value is None or value == "":
        return fallback
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, indent=2)
    text = str(value).strip()
    if not text:
        return fallback
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return text
    return json.dumps(parsed, ensure_ascii=False, indent=2)


def _integration_id_for(raw: dict[str, Any]) -> str:
    explicit = str(raw.get("id") or "").strip()
    if explicit:
        return explicit
    
    # Gera ID único para evitar colisões no mock/arquivos
    import time
    timestamp = int(time.time())
    integration_type = str(raw.get("integration_type") or "custom").strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", integration_type).strip("-") or "custom"
    return f"integration-{slug}-{timestamp}"


def _coerce_integration_record(raw: dict[str, Any]) -> dict[str, Any]:
    created_at = str(raw.get("created_at") or datetime.now(timezone.utc).isoformat())
    auth_value = str(raw.get("auth_value") or "").strip()
    auth_type = str(raw.get("auth_type") or ("bearer" if auth_value else "none")).strip().lower() or "none"
    return {
        "id": _integration_id_for(raw),
        "name": str(raw.get("name") or "Integração").strip() or "Integração",
        "integration_type": str(raw.get("integration_type") or DEFAULT_APP_INTEGRATION["integration_type"]).strip()
        or DEFAULT_APP_INTEGRATION["integration_type"],
        "webhook_url": str(raw.get("webhook_url") or "").strip(),
        "method": str(raw.get("method") or "POST").strip().upper() or "POST",
        "auth_type": auth_type,
        "auth_value": auth_value,
        "extra_headers_json": _stringify_json_field(raw.get("extra_headers_json"), "{}"),
        "request_body_json": _stringify_json_field(raw.get("request_body_json"), "{}"),
        "active": _normalize_bool(raw.get("active", False)),
        "last_status": str(raw.get("last_status") or "idle").strip() or "idle",
        "last_synced_at": str(raw.get("last_synced_at") or "").strip(),
        "last_error": str(raw.get("last_error") or "").strip(),
        "created_at": created_at,
        "updated_at": str(raw.get("updated_at") or created_at),
    }


def _default_integrations_from_settings(settings: Settings | None) -> list[dict[str, Any]]:
    if not settings:
        return []

    defaults: list[dict[str, Any]] = []
    if settings.n8n_romaneios_webhook_url:
        defaults.append(
            _coerce_integration_record(
                {
                    **DEFAULT_APP_INTEGRATION,
                    "webhook_url": settings.n8n_romaneios_webhook_url,
                    "auth_type": "bearer" if settings.n8n_romaneios_webhook_token else "none",
                    "auth_value": settings.n8n_romaneios_webhook_token or "",
                    "active": True,
                    "last_status": "configured",
                }
            )
        )
    if settings.n8n_apontamento_webhook_url:
        defaults.append(
            _coerce_integration_record(
                {
                    **DEFAULT_APP_APONTAMENTO_INTEGRATION,
                    "webhook_url": settings.n8n_apontamento_webhook_url,
                    "auth_type": "bearer" if settings.n8n_apontamento_webhook_token else "none",
                    "auth_value": settings.n8n_apontamento_webhook_token or "",
                    "active": True,
                    "last_status": "configured",
                }
            )
        )
    return defaults


def load_app_integrations(integrations_path: Path, settings: Settings | None = None) -> list[dict[str, Any]]:
    if integrations_path.exists():
        text = integrations_path.read_text(encoding="utf-8")
        payload = json.loads(text)
        items = payload.get("items", payload) if isinstance(payload, dict) else payload
        integrations = [_coerce_integration_record(item) for item in items if item]
        print(f"[DB] Carregadas {len(integrations)} integrações de {integrations_path}")
    else:
        print(f"[DB] Arquivo de integrações não encontrado: {integrations_path}")
        integrations = []

    defaults = _default_integrations_from_settings(settings)
    for default_item in defaults:
        if not any(item["id"] == default_item["id"] for item in integrations):
            integrations.insert(0, default_item)

    integrations = sorted(integrations, key=lambda item: (not item["active"], item["name"].lower()))
    return integrations


def save_app_integrations(
    integrations_path: Path,
    integrations: list[dict[str, Any]],
    settings: Settings | None = None,
) -> list[dict[str, Any]]:
    sanitized = [_coerce_integration_record(item) for item in integrations if item]
    defaults = _default_integrations_from_settings(settings)
    for default_item in defaults:
        if not any(item["id"] == default_item["id"] for item in sanitized):
            sanitized.insert(0, default_item)
    print(f"[DB] Salvando {len(sanitized)} integrações em {integrations_path}")
    integrations_path.parent.mkdir(parents=True, exist_ok=True)
    integrations_path.write_text(json.dumps({"items": sanitized}, ensure_ascii=False, indent=2), encoding="utf-8")
    return sanitized


def _coerce_stock_movement_record(raw: dict[str, Any]) -> dict[str, Any]:
    created_at = str(raw.get("created_at") or datetime.now(timezone.utc).isoformat())
    quantity = float(raw.get("quantity") or raw.get("quantidade") or 0)
    movement_type = str(raw.get("movement_type") or raw.get("tipo_movimento") or "entrada").strip().lower() or "entrada"
    if movement_type not in {"entrada", "saida"}:
        movement_type = "entrada"
    return {
        "id": str(raw.get("id") or f"stock-movement-{created_at.replace(':', '').replace('-', '').replace('.', '')}"),
        "sku": str(raw.get("sku") or "").strip().upper(),
        "produto": str(raw.get("produto") or "").strip(),
        "movement_type": movement_type,
        "quantity": abs(quantity),
        "product_type": str(raw.get("product_type") or raw.get("tipo_produto") or "").strip().lower(),
        "document_ref": str(raw.get("document_ref") or raw.get("documento") or "").strip(),
        "responsavel": str(raw.get("responsavel") or raw.get("operator") or "").strip(),
        "observacao": str(raw.get("observacao") or raw.get("notes") or "").strip(),
        "created_at": created_at,
        "updated_at": str(raw.get("updated_at") or created_at),
    }


def load_stock_movements(movements_path: Path) -> list[dict[str, Any]]:
    if movements_path.exists():
        payload = json.loads(movements_path.read_text(encoding="utf-8"))
        items = payload.get("items", payload) if isinstance(payload, dict) else payload
        movements = [_coerce_stock_movement_record(item) for item in items if item]
    else:
        movements = []
    return sorted(movements, key=lambda item: item["created_at"], reverse=True)


def save_stock_movements(movements_path: Path, movements: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sanitized = [_coerce_stock_movement_record(item) for item in movements if item]
    movements_path.parent.mkdir(parents=True, exist_ok=True)
    movements_path.write_text(json.dumps({"items": sanitized}, ensure_ascii=False, indent=2), encoding="utf-8")
    return sorted(sanitized, key=lambda item: item["created_at"], reverse=True)


def _coerce_apontamento_log_record(raw: dict[str, Any]) -> dict[str, Any]:
    created_at = str(raw.get("created_at") or datetime.now(timezone.utc).isoformat())
    event_type = str(raw.get("event_type") or "apontar").strip().lower() or "apontar"
    if event_type not in {"iniciar", "apontar", "parada", "finalizar"}:
        event_type = "apontar"
    integration_status = str(raw.get("integration_status") or raw.get("sync_status") or "pending").strip().lower() or "pending"
    if integration_status not in {"pending", "synced", "failed"}:
        integration_status = "pending"
    return {
        "id": str(raw.get("id") or f"apontamento-{created_at.replace(':', '').replace('-', '').replace('.', '')}"),
        "created_at": created_at,
        "machine_code": str(raw.get("machine_code") or raw.get("maquina") or "").strip().upper(),
        "operator": str(raw.get("operator") or raw.get("responsavel") or "").strip(),
        "event_type": event_type,
        "op_code": str(raw.get("op_code") or "").strip().upper(),
        "pieces": float(raw.get("pieces") or raw.get("pecas") or 0),
        "scrap": float(raw.get("scrap") or raw.get("refugo") or 0),
        "stop_start": str(raw.get("stop_start") or "").strip(),
        "stop_end": str(raw.get("stop_end") or "").strip(),
        "reason": str(raw.get("reason") or raw.get("motivo") or "").strip(),
        "time_range": str(raw.get("time_range") or "").strip(),
        "integration_target": str(raw.get("integration_target") or raw.get("sync_target") or "sankhya_n8n").strip().lower(),
        "integration_status": integration_status,
        "synced_at": str(raw.get("synced_at") or "").strip(),
        "external_ref": str(raw.get("external_ref") or raw.get("external_id") or "").strip(),
        "sync_error": str(raw.get("sync_error") or raw.get("integration_error") or "").strip(),
        "sync_attempts": int(raw.get("sync_attempts") or 0),
        "updated_at": str(raw.get("updated_at") or created_at),
    }


def load_apontamento_logs(logs_path: Path) -> list[dict[str, Any]]:
    if logs_path.exists():
        payload = json.loads(logs_path.read_text(encoding="utf-8"))
        items = payload.get("items", payload) if isinstance(payload, dict) else payload
        logs = [_coerce_apontamento_log_record(item) for item in items if item]
    else:
        logs = []
    return sorted(logs, key=lambda item: item["created_at"], reverse=True)[:240]


def save_apontamento_logs(logs_path: Path, logs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sanitized = [_coerce_apontamento_log_record(item) for item in logs if item]
    logs_path.parent.mkdir(parents=True, exist_ok=True)
    logs_path.write_text(json.dumps({"items": sanitized}, ensure_ascii=False, indent=2), encoding="utf-8")
    return sorted(sanitized, key=lambda item: item["created_at"], reverse=True)[:240]


def summarize_apontamento_logs(items: list[dict[str, Any]]) -> dict[str, Any]:
    latest_by_machine: dict[str, dict[str, Any]] = {}
    for item in sorted(items, key=lambda entry: entry.get("created_at") or "", reverse=True):
        machine_code = str(item.get("machine_code") or "").strip().upper()
        if machine_code and machine_code not in latest_by_machine:
            latest_by_machine[machine_code] = item

    running = 0
    stopped = 0
    finished = 0
    for entry in latest_by_machine.values():
        event_type = str(entry.get("event_type") or "").strip().lower()
        if event_type in {"iniciar", "apontar"}:
            running += 1
        elif event_type == "parada":
            stopped += 1
        elif event_type == "finalizar":
            finished += 1

    return {
        "total": len(items),
        "machines_running": running,
        "machines_stopped": stopped,
        "machines_finished": finished,
        "pending_sync": sum(1 for item in items if item.get("integration_status") == "pending"),
        "synced": sum(1 for item in items if item.get("integration_status") == "synced"),
        "failed_sync": sum(1 for item in items if item.get("integration_status") == "failed"),
    }


def build_apontamento_export_payload(items: list[dict[str, Any]], pending_only: bool = False) -> dict[str, Any]:
    exported_items = [
        item for item in items
        if not pending_only or str(item.get("integration_status") or "pending").strip().lower() != "synced"
    ]
    return {
        "items": exported_items,
        "summary": summarize_apontamento_logs(items),
        "exported_count": len(exported_items),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def apply_apontamento_sync_updates(items: list[dict[str, Any]], payload: dict[str, Any]) -> list[dict[str, Any]]:
    updates = payload.get("items") if isinstance(payload.get("items"), list) else [payload]
    update_map = {
        str(item.get("id") or "").strip(): item
        for item in updates
        if str(item.get("id") or "").strip()
    }
    if not update_map:
        raise ValueError("Informe pelo menos um id de apontamento para atualizar a sincronização.")

    synced_at_default = datetime.now(timezone.utc).isoformat()
    next_items: list[dict[str, Any]] = []
    for item in items:
        entry_id = str(item.get("id") or "").strip()
        update = update_map.get(entry_id)
        if not update:
            next_items.append(item)
            continue
        status = str(update.get("integration_status") or update.get("sync_status") or item.get("integration_status") or "pending").strip().lower() or "pending"
        if status not in {"pending", "synced", "failed"}:
            status = "pending"
        next_items.append(
            _coerce_apontamento_log_record(
                {
                    **item,
                    "integration_target": update.get("integration_target") or item.get("integration_target") or "sankhya_n8n",
                    "integration_status": status,
                    "synced_at": update.get("synced_at") or (synced_at_default if status == "synced" else item.get("synced_at") or ""),
                    "external_ref": update.get("external_ref") or update.get("external_id") or item.get("external_ref") or "",
                    "sync_error": update.get("sync_error") or update.get("integration_error") or "",
                    "sync_attempts": int(update.get("sync_attempts") or (item.get("sync_attempts") or 0) + 1),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
        )
    return sorted(next_items, key=lambda item: item["created_at"], reverse=True)[:240]


def load_production_rules(path: Path = PRODUCTION_RULES_PATH) -> dict[str, Any]:
    if not path.exists():
        return {"items": [], "generated_at": "", "resource_catalog": []}
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, dict):
        return payload
    return {"items": payload, "generated_at": "", "resource_catalog": []}


def _json_hash(payload: Any) -> str:
    serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _timestamp_or_none(value: Any) -> str | None:
    text = str(value or "").strip()
    return text or None


class DataProvider(ABC):
    @abstractmethod
    def overview(self, company_code: str | None = None) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def painel(
        self,
        search: str | None = None,
        product_type: str | None = None,
        only_critical: bool = False,
        company_code: str | None = None,
    ) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def romaneios(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def romaneio_detail(self, romaneio_code: str) -> dict[str, Any] | None:
        raise NotImplementedError

    @abstractmethod
    def romaneios_kanban(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def assembly(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def production(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def structures(self, source_scope: str | None = None, search: str | None = None) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def programming(self, action: str | None = None) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def purchases(self, product_type: str | None = None) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def recycling(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def costs(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def sources(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def alerts(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def users(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def integrations(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def stock_movements(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def apontamento_logs(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def apontamento_export(self, pending_only: bool = False) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def production_rules(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def save_user(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def save_integration(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def save_stock_movement(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def save_apontamento(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def save_apontamento_sync_status(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def authenticate_user(self, username: str, password: str) -> dict[str, Any] | None:
        raise NotImplementedError

    @abstractmethod
    def run_mrp(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def save_structure_override(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def save_programming_entry(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def save_romaneio_schedule(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def sync_sources(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def ingest_romaneio_event(self, source_code: str, payload: dict[str, Any], meta: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def delete_romaneio(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def delete_integration(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError


class MockProvider(DataProvider):
    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir

    def _read_json(self, name: str) -> dict[str, Any]:
        return json.loads((self.data_dir / name).read_text(encoding="utf-8"))

    def _mock_item_company_code(self, item: Any) -> str:
        if not isinstance(item, dict):
            return MOCK_DEFAULT_COMPANY_CODE
        for key in ("company_code", "empresa", "codigo_empresa", "company"):
            company_code = _normalize_company_code_value(item.get(key))
            if company_code:
                return company_code
        return MOCK_DEFAULT_COMPANY_CODE

    def _mock_matches_company(self, item: Any, company_code: str | None) -> bool:
        normalized_company_code = _normalize_company_code_value(company_code)
        if not normalized_company_code:
            return True
        return self._mock_item_company_code(item) == normalized_company_code

    def _filter_mock_items_by_company(self, items: Any, company_code: str | None) -> list[dict[str, Any]]:
        if not isinstance(items, list):
            return []
        return [item for item in items if self._mock_matches_company(item, company_code)]

    def _empty_mock_overview(self, snapshot_at: str = "") -> dict[str, Any]:
        return {
            "snapshot_at": snapshot_at,
            "totals": {
                "estoque_atual": 0,
                "necessidade_romaneios": 0,
                "necessidade_montagem": 0,
                "necessidade_producao": 0,
                "necessidade_compra": 0,
                "romaneios_sem_previsao": 0,
                "custo_estimado_total": 0,
            },
            "top_criticos": [],
        }

    def _users_path(self) -> Path:
        return self.data_dir / "app_users.json"

    def _integrations_path(self) -> Path:
        return self.data_dir / "app_integrations.json"

    def _stock_movements_path(self) -> Path:
        return self.data_dir / "stock_movements.json"

    def _apontamento_logs_path(self) -> Path:
        return self.data_dir / "apontamento_logs.json"

    def overview(self, company_code: str | None = None) -> dict[str, Any]:
        payload = self._read_json("overview.json")
        normalized_company_code = _normalize_company_code_value(company_code)
        if not normalized_company_code:
            return payload
        if normalized_company_code != MOCK_DEFAULT_COMPANY_CODE:
            return self._empty_mock_overview(str(payload.get("snapshot_at") or ""))
        return payload

    def painel(
        self,
        search: str | None = None,
        product_type: str | None = None,
        only_critical: bool = False,
        company_code: str | None = None,
    ) -> dict[str, Any]:
        payload = self._read_json("painel.json")
        items = self._filter_mock_items_by_company(payload.get("items", []), company_code)
        search_value = (search or "").strip().lower()
        type_value = (product_type or "").strip().lower()

        filtered = []
        for item in items:
            if search_value and search_value not in f"{item['sku']} {item['produto']}".lower():
                continue
            if type_value and item["tipo"].lower() != type_value:
                continue
            if only_critical and item["criticidade"].lower() != "alta":
                continue
            filtered.append(item)

        return {"items": filtered}

    def romaneios(self) -> dict[str, Any]:
        payload = self._read_json("romaneios.json")
        return {"items": list(payload.get("items", []))}

    def romaneio_detail(self, romaneio_code: str) -> dict[str, Any] | None:
        path = self.data_dir / f"romaneio_{romaneio_code}.json"
        if not path.exists():
            return None
        payload = json.loads(path.read_text(encoding="utf-8"))
        return payload

    def romaneios_kanban(self) -> dict[str, Any]:
        romaneios_payload = self.romaneios()
        romaneios = []
        for item in romaneios_payload.get("items", []):
            romaneio_code = str(item.get("romaneio") or "").strip()
            detail = self.romaneio_detail(romaneio_code) if romaneio_code else None
            romaneios.append(
                {
                    **item,
                    "items": (detail or {}).get("items", []),
                }
            )
        return {
            "products": self._read_json("painel.json").get("items", []),
            "romaneios": romaneios
        }

    def assembly(self) -> dict[str, Any]:
        return self._read_json("assembly.json")

    def production(self) -> dict[str, Any]:
        return self._read_json("production.json")

    def structures(self, source_scope: str | None = None, search: str | None = None) -> dict[str, Any]:
        payload = self._read_json("structures.json")
        scope_value = (source_scope or "").strip().lower()
        search_value = (search or "").strip().lower()
        items = []
        for item in payload["items"]:
            if scope_value and item["source_scope"].lower() != scope_value:
                continue
            if search_value and search_value not in f"{item['parent_sku']} {item['parent_product']} {item['component_sku']} {item['component_product']}".lower():
                continue
            items.append(item)
        return {"summary": payload["summary"], "items": items}

    def programming(self, action: str | None = None) -> dict[str, Any]:
        payload = self._read_json("programming.json")
        action_value = (action or "").strip().lower()
        if not action_value:
            return payload
        return {"items": [item for item in payload["items"] if item["action"].lower() == action_value]}

    def purchases(self, product_type: str | None = None) -> dict[str, Any]:
        payload = self._read_json("purchases.json")
        type_value = (product_type or "").strip().lower()
        if not type_value:
            return payload
        return {"items": [item for item in payload["items"] if item["product_type"].lower() == type_value]}

    def recycling(self) -> dict[str, Any]:
        return self._read_json("recycling.json")

    def costs(self) -> dict[str, Any]:
        return self._read_json("costs.json")

    def sources(self) -> dict[str, Any]:
        return self._read_json("sources.json")

    def alerts(self) -> dict[str, Any]:
        return self._read_json("alerts.json")

    def users(self) -> dict[str, Any]:
        return {"items": load_app_users(self._users_path())}

    def integrations(self) -> dict[str, Any]:
        return {"items": load_app_integrations(self._integrations_path())}

    def stock_movements(self) -> dict[str, Any]:
        items = load_stock_movements(self._stock_movements_path())
        return {
            "items": items,
            "summary": {
                "entradas": sum(item["quantity"] for item in items if item["movement_type"] == "entrada"),
                "saidas": sum(item["quantity"] for item in items if item["movement_type"] == "saida"),
                "movimentos": len(items),
            },
        }

    def apontamento_logs(self) -> dict[str, Any]:
        items = load_apontamento_logs(self._apontamento_logs_path())
        return {"items": items, "summary": summarize_apontamento_logs(items)}

    def apontamento_export(self, pending_only: bool = False) -> dict[str, Any]:
        items = load_apontamento_logs(self._apontamento_logs_path())
        return build_apontamento_export_payload(items, pending_only)

    def production_rules(self) -> dict[str, Any]:
        return load_production_rules()

    def save_user(self, payload: dict[str, Any]) -> dict[str, Any]:
        users = load_app_users(self._users_path())
        username = str(payload.get("username") or "").strip().lower()
        if not username:
            raise ValueError("Usuário obrigatório.")

        existing = next((item for item in users if item["username"] == username), None)
        if (existing or {}).get("username") == "root" and str(payload.get("active", True)).lower() == "false":
            raise ValueError("O usuário root não pode ser desativado.")

        next_user = _coerce_user_record(
            {
                "id": payload.get("id") or (existing or {}).get("id") or f"user-{username}",
                "username": username,
                "full_name": payload.get("full_name") or (existing or {}).get("full_name") or username,
                "role": payload.get("role") or (existing or {}).get("role") or "operator",
                "company_scope": (
                    payload.get("company_scope")
                    if payload.get("company_scope") is not None
                    else (existing or {}).get("company_scope")
                ),
                "password": payload.get("password") or (existing or {}).get("password") or "",
                "active": payload.get("active", (existing or {}).get("active", True)),
                "created_at": (existing or {}).get("created_at") or datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        _validate_user_record(next_user)

        next_users = [item for item in users if item["username"] != username]
        next_users.append(next_user)
        persisted = save_app_users(self._users_path(), next_users)
        return {"status": "saved", "user": next_user, "items": persisted}

    def save_integration(self, payload: dict[str, Any]) -> dict[str, Any]:
        integrations = load_app_integrations(self._integrations_path())
        integration_type = str(payload.get("integration_type") or DEFAULT_APP_INTEGRATION["integration_type"]).strip()
        integration_id = _integration_id_for(payload)
        existing = next(
            (
                item
                for item in integrations
                if item["id"] == integration_id or (item["integration_type"] == integration_type and not payload.get("id"))
            ),
            None,
        )
        next_integration = _coerce_integration_record(
            {
                **(existing or DEFAULT_APP_INTEGRATION),
                **payload,
                "id": integration_id,
                "integration_type": integration_type,
                "created_at": (existing or DEFAULT_APP_INTEGRATION).get("created_at") or datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        _validate_integration_payload(next_integration)
        next_items = [item for item in integrations if item["id"] != next_integration["id"]]
        next_items.append(next_integration)
        persisted = save_app_integrations(self._integrations_path(), next_items)
        return {"status": "saved", "integration": next_integration, "items": persisted}

    def delete_integration(self, payload: dict[str, Any]) -> dict[str, Any]:
        integration_id = str(payload.get("id") or "").strip()
        if not integration_id:
            raise ValueError("ID da integração obrigatório para exclusão.")
        integrations = load_app_integrations(self._integrations_path())
        next_items = [item for item in integrations if item["id"] != integration_id]
        save_app_integrations(self._integrations_path(), next_items)
        return {"status": "deleted", "id": integration_id}

    def save_stock_movement(self, payload: dict[str, Any]) -> dict[str, Any]:
        sku = str(payload.get("sku") or "").strip().upper()
        if not sku:
            raise ValueError("SKU obrigatório para registrar movimentação.")
        quantity = float(payload.get("quantity") or payload.get("quantidade") or 0)
        if quantity <= 0:
            raise ValueError("Quantidade obrigatória para registrar movimentação.")

        next_item = _coerce_stock_movement_record(
            {
                **payload,
                "sku": sku,
                "quantity": quantity,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        persisted = save_stock_movements(self._stock_movements_path(), [next_item, *load_stock_movements(self._stock_movements_path())])
        return {"status": "saved", "movement": next_item, "items": persisted}

    def save_apontamento(self, payload: dict[str, Any]) -> dict[str, Any]:
        next_item = _coerce_apontamento_log_record(
            {
                **payload,
                "created_at": payload.get("created_at") or datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        persisted = save_apontamento_logs(self._apontamento_logs_path(), [next_item, *load_apontamento_logs(self._apontamento_logs_path())])
        
        # Gatilho Reativo: Notificar Webhooks de Produção (n8n / Sankhya)
        try:
            integrations = load_app_integrations(self._integrations_path())
            active_hooks = [i for i in integrations if i.get("active") and i.get("integration_type") in ("n8n_webhook_production", "n8n_webhook_apontamento")]
            
            from urllib.request import Request, urlopen
            for hook in active_hooks:
                hook_url = hook.get("webhook_url")
                if not hook_url:
                    continue
                try:
                    req = Request(hook_url, method="POST")
                    req.add_header("Content-Type", "application/json")
                    urlopen(req, data=json.dumps(next_item, ensure_ascii=False).encode("utf-8"), timeout=5)
                except:
                    pass
        except:
            pass
            
        return {
            "status": "saved",
            "entry": next_item,
            "items": persisted,
            "summary": summarize_apontamento_logs(persisted),
        }

    def save_apontamento_sync_status(self, payload: dict[str, Any]) -> dict[str, Any]:
        persisted = save_apontamento_logs(
            self._apontamento_logs_path(),
            apply_apontamento_sync_updates(load_apontamento_logs(self._apontamento_logs_path()), payload),
        )
        return {
            "status": "updated",
            "items": persisted,
            "summary": summarize_apontamento_logs(persisted),
        }

    def authenticate_user(self, username: str, password: str) -> dict[str, Any] | None:
        users = load_app_users(self._users_path())
        normalized = str(username or "").strip().lower()
        user = next((item for item in users if item["username"] == normalized and item["active"]), None)
        if not user or not _verify_password(password, user.get("password")):
            return None
        return user

    def run_mrp(self) -> dict[str, Any]:
        return {
            "run_id": int(datetime.now(timezone.utc).timestamp()),
            "status": "queued",
            "queued_at": datetime.now(timezone.utc).isoformat(),
            "message": "Recálculo do planejamento solicitado. As filas serão atualizadas quando a rodada terminar.",
        }

    def save_structure_override(self, payload: dict[str, Any]) -> dict[str, Any]:
        path = self.data_dir / "structures.json"
        data = self._read_json("structures.json")
        items = data.get("items", [])
        
        override_id = int(datetime.now(timezone.utc).timestamp())
        # Simulate an override in the mock list if needed, or just return success
        # Here we just mark it as saved to stay consistent with "operational" goal
        return {
            "override_id": override_id,
            "status": "saved",
            "payload": payload,
        }

    def save_programming_entry(self, payload: dict[str, Any]) -> dict[str, Any]:
        path = self.data_dir / "programming.json"
        data = self._read_json("programming.json")
        items = data.get("items", [])
        
        entry_id = f"prog-{int(datetime.now(timezone.utc).timestamp())}"
        new_entry = {
            **payload,
            "schedule_key": entry_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        items.insert(0, new_entry)
        data["items"] = items
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        
        return {
            "entry_id": entry_id,
            "status": "saved",
            "payload": new_entry,
        }

    def save_romaneio_schedule(self, payload: dict[str, Any]) -> dict[str, Any]:
        romaneio_code = str(payload.get("romaneio") or "").strip()
        if not romaneio_code:
            raise ValueError("Romaneio obrigatorio para salvar previsao.")

        previsao_saida_at = payload.get("previsao_saida_at")
        romaneios_path = self.data_dir / "romaneios.json"
        detail_path = self.data_dir / f"romaneio_{romaneio_code}.json"

        if romaneios_path.exists():
            list_payload = json.loads(romaneios_path.read_text(encoding="utf-8"))
            for item in list_payload.get("items", []):
                if str(item.get("romaneio")) == romaneio_code:
                    item["previsao_saida_at"] = previsao_saida_at
                    item["previsao_saida_status"] = "pcp_manual" if previsao_saida_at else "sem_previsao"
                    item["criterio_previsao"] = "pcp_manual"
            romaneios_path.write_text(json.dumps(list_payload, ensure_ascii=False, indent=2), encoding="utf-8")

        if detail_path.exists():
            detail_payload = json.loads(detail_path.read_text(encoding="utf-8"))
            header = detail_payload.get("header", {})
            header["previsao_saida_at"] = previsao_saida_at
            header["previsao_saida_status"] = "pcp_manual" if previsao_saida_at else "sem_previsao"
            header["criterio_previsao"] = "pcp_manual"
            detail_payload["header"] = header
            detail_path.write_text(json.dumps(detail_payload, ensure_ascii=False, indent=2), encoding="utf-8")

        return {
            "status": "saved",
            "romaneio": romaneio_code,
            "previsao_saida_at": previsao_saida_at,
        }

    def sync_sources(self, payload: dict[str, Any]) -> dict[str, Any]:
        requested_codes = resolve_requested_codes(payload)
        snapshot_at = resolve_snapshot_at(payload)
        results: list[dict[str, Any]] = []
        errors: list[dict[str, Any]] = []

        # --- Sincronização Real de Estoque (Mesmo em modo Mock) ---
        from .source_sync import STOCK_SOURCE_CODES, resolve_requested_codes, resolve_snapshot_at, build_source_request, run_parser_envelope, build_meta

        source_rows = [
            {"source_code": "estoque_acabado_atual", "source_area": "EXPEDICAO", "contract_type": "google_sheets_published", "published_url_hint": self.settings.acabado_published_url},
            {"source_code": "estoque_intermediario_atual", "source_area": "PRODUCAO", "contract_type": "google_sheets_published", "published_url_hint": self.settings.intermediario_published_url},
        ]

        for row in source_rows:
            source_code = row["source_code"]
            if requested_codes and source_code not in requested_codes:
                continue
                
            try:
                print(f"[MOCK-SYNC] Processando fonte real: {source_code}")
                source_request = build_source_request(row, self.settings)
                envelope = run_parser_envelope(
                    settings=self.settings,
                    source_request=source_request,
                    snapshot_at=snapshot_at,
                )
                
                # No modo Mock, salvamos o resultado em arquivos locais para a UI ler
                records = envelope.get("records") or []
                summary = envelope.get("summary") or {}
                
                # Atualizamos o painel mock com os novos saldos
                # (Aqui poderíamos salvar em data/painel.json, mas para facilitar
                # vamos apenas retornar como sucesso para a UI que o backend cuidou disso)
                
                results.append({
                    "source_code": source_code,
                    "status": "success",
                    "record_count": len(records),
                    "snapshot_at": snapshot_at,
                    "summary": summary
                })
            except Exception as e:
                print(f"[MOCK-SYNC] Erro na fonte {source_code}: {str(e)}")
                errors.append({"source_code": source_code, "error": str(e)})

        # --- Gatilho Real n8n para Romaneios no modo Mock ---
        try:
            integrations = self.integrations().get("items", [])
            # Se requested_codes estiver vazio, sincroniza tudo. Caso contrário, apenas se a integração for citada ou for global.
            n8n_hooks = [i for i in integrations if i.get("integration_type") in ["n8n_webhook_romaneios", "n8n_webhook_stock"] and i.get("active")]
            
            for hook in n8n_hooks:
                hook_target = hook.get("target_source")
                
                # Regra de Ouro:
                # 1. Se requested_codes está vazio, é Sync Global -> dispara todos os ativos.
                # 2. Se requested_codes tem valor, só dispara se:
                #    a) O hook_target estiver na lista de requested_codes.
                #    b) O hook não tiver target (Master) MAS apenas se a solicitação for de Romaneios.
                
                if requested_codes:
                    is_targeted = hook_target in requested_codes
                    is_master_romaneio = not hook_target and any("romaneio" in c.lower() for c in requested_codes)
                    
                    if not (is_targeted or is_master_romaneio):
                        continue

                hook_url = hook.get("webhook_url")
                if not hook_url:
                    continue
                
                print(f"[MOCK-SYNC] Acionando webhook real do n8n: {hook.get('name')} -> {hook_url}")
                from urllib.request import Request, urlopen
                import json
                req = Request(hook_url, method="POST")
                req.add_header("Content-Type", "application/json")
                
                payload_n8n = json.dumps({
                    "event": "manual_sync_triggered",
                    "mode": "mock_provider",
                    "triggered_at": datetime.now(timezone.utc).isoformat(),
                    "requested_snapshot": snapshot_at
                }).encode("utf-8")
                
                try:
                    with urlopen(req, data=payload_n8n, timeout=10) as resp:
                        code = resp.getcode()
                        print(f"[MOCK-SYNC] Webhook {hook.get('name')} OK ({code})")
                        results.append({
                            "source_code": f"webhook_{hook.get('name', 'n8n')}",
                            "status": "triggered",
                            "response_code": code,
                            "integration_id": hook.get("id")
                        })
                except Exception as hook_err:
                    print(f"[MOCK-SYNC] Erro no webhook {hook.get('name')}: {str(hook_err)}")
                    errors.append({"source_code": f"webhook_{hook.get('name')}", "error": f"ERRO N8N: {str(hook_err)}"})
        except Exception as e:
            errors.append({"source_code": "mock_external_webhooks", "error": f"Erro bypass mock: {str(e)}"})

        return {
            "status": "success" if not errors else "partial",
            "requested_sources": requested_codes or list(STOCK_SOURCE_CODES),
            "results": results,
            "errors": errors,
            "snapshot_at": snapshot_at,
        }

    def ingest_romaneio_event(self, source_code: str, payload: dict[str, Any], meta: dict[str, Any]) -> dict[str, Any]:
        romaneio = payload.get("romaneio", {})
        romaneio_code = str(romaneio.get("codigo") or "").strip()
        if not romaneio_code:
            raise RuntimeError("Payload de romaneio sem código.")

        romaneios_path = self.data_dir / "romaneios.json"
        detail_path = self.data_dir / f"romaneio_{romaneio_code}.json"
        list_payload = {"items": []}
        if romaneios_path.exists():
            list_payload = json.loads(romaneios_path.read_text(encoding="utf-8"))

        quantidade_total = sum(float(item.get("quantidade") or item.get("quantity_total") or 0) for item in romaneio.get("itens", []))
        list_item = {
            "romaneio": romaneio_code,
            "empresa": romaneio.get("empresa") or meta.get("nome_empresa") or "INPLAST",
            "status_evento": "processed",
            "data_evento": payload.get("event_at"),
            "itens": len(romaneio.get("itens", [])),
            "quantidade_total": quantidade_total,
            "previsao_saida_at": None,
            "previsao_saida_status": "sem_previsao",
            "criterio_previsao": "pdf_parser",
            "valor_total": float(romaneio.get("valor_total") or 0),
        }

        existing_items = [item for item in list_payload.get("items", []) if str(item.get("romaneio")) != romaneio_code]
        existing_items.insert(0, list_item)
        list_payload["items"] = existing_items
        romaneios_path.write_text(json.dumps(list_payload, ensure_ascii=False, indent=2), encoding="utf-8")

        detail_payload = {
            "header": {
                **list_item,
                "previsao_saida_observacao": "Romaneio importado manualmente via PDF.",
            },
            "items": [
                {
                    "sku": item.get("sku", ""),
                    "produto": item.get("produto") or item.get("descricao") or item.get("sku", ""),
                    "quantidade": float(item.get("quantidade") or item.get("quantity_total") or 0),
                    "impacto": "Importado de PDF",
                    "quantidade_atendida_estoque": 0,
                    "quantidade_pendente": float(item.get("quantidade") or item.get("quantity_total") or 0),
                    "previsao_disponibilidade_at": None,
                    "modo_atendimento": "Aguardando cálculo MRP",
                    "previsao_disponibilidade_status": "sem_previsao",
                }
                for item in romaneio.get("itens", [])
            ],
            "events": [
                {
                    "event_id": payload.get("event_id"),
                    "event_type": payload.get("event_type"),
                    "received_at": payload.get("event_at"),
                    "status": "processed",
                }
            ],
        }
        detail_path.write_text(json.dumps(detail_payload, ensure_ascii=False, indent=2), encoding="utf-8")

        return {
            "status": "processed",
            "romaneio_code": romaneio_code,
            "item_count": len(romaneio.get("itens", [])),
        }

    def delete_romaneio(self, payload: dict[str, Any]) -> dict[str, Any]:
        romaneio_code = str(payload.get("romaneio") or "").strip()
        if not romaneio_code:
            raise ValueError("Romaneio obrigatório para exclusão.")

        romaneios_path = self.data_dir / "romaneios.json"
        detail_path = self.data_dir / f"romaneio_{romaneio_code}.json"
        removed = False

        if romaneios_path.exists():
            list_payload = json.loads(romaneios_path.read_text(encoding="utf-8"))
            current_items = list_payload.get("items", [])
            next_items = [item for item in current_items if str(item.get("romaneio")) != romaneio_code]
            removed = len(next_items) != len(current_items)
            list_payload["items"] = next_items
            romaneios_path.write_text(json.dumps(list_payload, ensure_ascii=False, indent=2), encoding="utf-8")

        if detail_path.exists():
            detail_path.unlink()
            removed = True

        return {
            "status": "deleted" if removed else "not_found",
            "romaneio": romaneio_code,
        }


class PostgresProvider(DataProvider):
    def __init__(self, settings: Settings, data_dir: Path) -> None:
        if not settings.database_url:
            raise RuntimeError("PCP_DATABASE_URL ou DATABASE_URL e obrigatoria no modo postgres")
        self.settings = settings
        self.data_dir = data_dir
        self.database_url = settings.database_url
        self.actions_database_url = settings.actions_database_url or settings.database_url
        self.driver_name, self.driver = self._load_driver()
        self._ensure_runtime_schema()
        self._seed_runtime_state()

    def _load_driver(self):
        try:
            import psycopg  # type: ignore

            return "psycopg", psycopg
        except ImportError:
            try:
                import psycopg2  # type: ignore

                return "psycopg2", psycopg2
            except ImportError as exc:
                raise RuntimeError(
                    "Nenhum driver Postgres encontrado. Instale 'psycopg' ou 'psycopg2' no ambiente do SaaS."
                ) from exc

    def _connect(self, write: bool = False):
        target_url = self.actions_database_url if write else self.database_url
        if self.driver_name == "psycopg":
            return self.driver.connect(target_url, autocommit=True)
        connection = self.driver.connect(target_url)
        connection.autocommit = True
        return connection

    def _row_to_dict(self, cursor, row) -> dict[str, Any]:
        columns = [desc[0] for desc in cursor.description]
        return {key: self._normalize_value(value, key) for key, value in zip(columns, row)}

    def _normalize_value(self, value: Any, column_name: str | None = None) -> Any:
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        if column_name in {"extra_headers_json", "request_body_json"}:
            return "" if value is None else str(value)
        if isinstance(value, str) and value and value[0] in "{[":
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return value

    def _users_path(self) -> Path:
        return self.data_dir / "app_users.json"

    def _integrations_path(self) -> Path:
        return self.data_dir / "app_integrations.json"

    def _stock_movements_path(self) -> Path:
        return self.data_dir / "stock_movements.json"

    def _app_document_source_label(self, path: Path) -> str:
        try:
            return str(path.relative_to(self.data_dir.parent))
        except ValueError:
            return str(path)

    def _fetchall(self, sql: str, params: tuple[Any, ...] = (), write: bool = False) -> list[dict[str, Any]]:
        with self._connect(write=write) as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                if cursor.description is None:
                    return []
                return [self._row_to_dict(cursor, row) for row in cursor.fetchall()]

    def _fetchone(self, sql: str, params: tuple[Any, ...] = (), write: bool = False) -> dict[str, Any] | None:
        rows = self._fetchall(sql, params, write=write)
        return rows[0] if rows else None

    def _ensure_runtime_schema(self) -> None:
        status = self._fetchone(queries.APP_RUNTIME_HEALTHCHECK_SQL)
        missing = [
            label
            for label in ("has_app_user", "has_app_integration", "has_stock_movement", "has_app_state_document")
            if not (status or {}).get(label)
        ]
        if missing:
            missing_labels = ", ".join(name.replace("has_", "") for name in missing)
            raise RuntimeError(
                "Schema operacional do PCP incompleto no Postgres. "
                f"Tabelas ausentes: {missing_labels}. Recrie/aplique o bootstrap do banco dedicado."
            )

    def _upsert_user_record(self, user: dict[str, Any]) -> dict[str, Any]:
        normalized = _coerce_user_record(user)
        return self._fetchone(
            queries.APP_USER_UPSERT_SQL,
            (
                normalized["id"],
                normalized["username"],
                normalized["full_name"],
                normalized["role"],
                normalized["password"],
                normalized["active"],
                json.dumps({"company_scope": normalized["company_scope"]}, ensure_ascii=False),
                normalized["created_at"],
                normalized["updated_at"],
            ),
            write=True,
        ) or normalized

    def _upsert_integration_record(self, integration: dict[str, Any]) -> dict[str, Any]:
        normalized = _coerce_integration_record(integration)
        return self._fetchone(
            queries.APP_INTEGRATION_UPSERT_SQL,
            (
                normalized["id"],
                normalized["name"],
                normalized["integration_type"],
                normalized["webhook_url"],
                normalized["method"],
                normalized["auth_type"],
                normalized["auth_value"],
                normalized["extra_headers_json"],
                normalized["request_body_json"],
                normalized["active"],
                normalized["last_status"],
                _timestamp_or_none(normalized["last_synced_at"]),
                normalized["last_error"],
                json.dumps({}, ensure_ascii=False),
                normalized["created_at"],
                normalized["updated_at"],
            ),
            write=True,
        ) or normalized

    def _upsert_stock_movement_record(self, movement: dict[str, Any]) -> dict[str, Any]:
        normalized = _coerce_stock_movement_record(movement)
        return self._fetchone(
            queries.APP_STOCK_MOVEMENT_INSERT_SQL,
            (
                normalized["id"],
                normalized["sku"],
                normalized["produto"],
                normalized["movement_type"],
                normalized["quantity"],
                normalized["product_type"],
                normalized["document_ref"],
                normalized["responsavel"],
                normalized["observacao"],
                json.dumps({}, ensure_ascii=False),
                normalized["created_at"],
                normalized["updated_at"],
            ),
            write=True,
        ) or normalized

    def _get_app_document(self, doc_key: str) -> dict[str, Any] | None:
        row = self._fetchone(queries.APP_STATE_DOCUMENT_SELECT_SQL, (doc_key,))
        if not row:
            return None
        payload = row.get("payload_json")
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except json.JSONDecodeError:
                payload = {}
        return {
            **row,
            "payload_json": payload if isinstance(payload, (dict, list)) else {},
        }

    def _upsert_app_document(
        self,
        doc_key: str,
        payload: dict[str, Any] | list[dict[str, Any]],
        *,
        source_label: str,
        source_hash: str,
        doc_type: str = "json",
        meta: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        return self._fetchone(
            queries.APP_STATE_DOCUMENT_UPSERT_SQL,
            (
                doc_key,
                doc_type,
                source_label,
                source_hash,
                json.dumps(payload, ensure_ascii=False),
                json.dumps(meta or {}, ensure_ascii=False),
                now_iso,
                now_iso,
            ),
            write=True,
        ) or {}

    def _seed_state_document_from_file(
        self,
        doc_key: str,
        payload: dict[str, Any] | list[dict[str, Any]],
        source_path: Path,
        *,
        doc_type: str = "json",
    ) -> None:
        source_hash = _json_hash(payload)
        current = self._get_app_document(doc_key)
        if current and current.get("source_hash") == source_hash:
            return
        self._upsert_app_document(
            doc_key,
            payload,
            source_label=self._app_document_source_label(source_path),
            source_hash=source_hash,
            doc_type=doc_type,
            meta={"seeded_from": self._app_document_source_label(source_path)},
        )

    def _seed_runtime_state(self) -> None:
        user_count = int((self._fetchone(queries.APP_USERS_COUNT_SQL) or {}).get("total") or 0)
        if user_count == 0:
            for user in load_app_users(self._users_path()):
                self._upsert_user_record(user)
        else:
            existing_root = next((item for item in self._fetchall(queries.APP_USERS_SELECT_SQL) if item["username"] == "root"), None)
            if not existing_root:
                self._upsert_user_record(DEFAULT_APP_USER)

        integration_count = int((self._fetchone(queries.APP_INTEGRATIONS_COUNT_SQL) or {}).get("total") or 0)
        default_integrations = load_app_integrations(self._integrations_path(), self.settings)
        if integration_count == 0:
            for integration in default_integrations:
                self._upsert_integration_record(integration)
        else:
            existing_integrations = {item["id"] for item in self._fetchall(queries.APP_INTEGRATIONS_SELECT_SQL)}
            for integration in _default_integrations_from_settings(self.settings):
                if integration["id"] not in existing_integrations:
                    self._upsert_integration_record(integration)

        movement_count = int((self._fetchone(queries.APP_STOCK_MOVEMENTS_COUNT_SQL) or {}).get("total") or 0)
        if movement_count == 0:
            for movement in load_stock_movements(self._stock_movements_path()):
                self._upsert_stock_movement_record(movement)

        self._seed_state_document_from_file(
            APP_STATE_PRODUCTION_RULES_KEY,
            load_production_rules(PRODUCTION_RULES_PATH),
            PRODUCTION_RULES_PATH,
        )
    def _build_painel_query(
        self,
        search: str | None = None,
        product_type: str | None = None,
        only_critical: bool = False,
        company_code: str | None = None,
        limit: int | None = None,
    ) -> tuple[str, tuple[Any, ...]]:
        sql = [f"select * from ({queries.PANEL_ENRICHED_SQL}) painel where (%s::text is null or company_code = %s::text)"]
        params: list[Any] = [company_code, company_code]

        if search:
            sql.append("and (sku ilike %s or produto ilike %s)")
            like_value = f"%{search.strip()}%"
            params.extend([like_value, like_value])

        if product_type:
            sql.append("and lower(tipo) = lower(%s)")
            params.append(product_type.strip())

        if only_critical:
            sql.append("and criticidade = 'Alta'")

        sql.append(
            "order by case criticidade when 'Alta' then 1 when 'Media' then 2 else 3 end, "
            "necessidade_producao desc, produto"
        )
        if limit is not None:
            sql.append("limit %s")
            params.append(limit)

        return "\n".join(sql), tuple(params)

    def overview(self, company_code: str | None = None) -> dict[str, Any]:
        row = self._fetchone(
            queries.OVERVIEW_SQL,
            (
                company_code,
                company_code,
                company_code,
                company_code,
                company_code,
                company_code,
                company_code,
                company_code,
                company_code,
                company_code,
                company_code,
                company_code,
            ),
        ) or {
            "snapshot_at": datetime.now(timezone.utc).isoformat(),
            "estoque_atual": 0,
            "necessidade_romaneios": 0,
            "necessidade_montagem": 0,
            "necessidade_producao": 0,
            "necessidade_compra": 0,
            "romaneios_sem_previsao": 0,
            "custo_estimado_total": 0,
        }
        top_sql, top_params = self._build_painel_query(company_code=company_code, limit=5)
        top_criticos = self._fetchall(top_sql, top_params)
        for item in top_criticos:
            item.pop("company_code", None)
        return {
            "snapshot_at": row["snapshot_at"],
            "totals": {
                "estoque_atual": row["estoque_atual"],
                "necessidade_romaneios": row["necessidade_romaneios"],
                "necessidade_montagem": row["necessidade_montagem"],
                "necessidade_producao": row["necessidade_producao"],
                "necessidade_compra": row["necessidade_compra"],
                "romaneios_sem_previsao": row["romaneios_sem_previsao"],
                "custo_estimado_total": row["custo_estimado_total"],
            },
            "top_criticos": top_criticos,
        }

    def painel(
        self,
        search: str | None = None,
        product_type: str | None = None,
        only_critical: bool = False,
        company_code: str | None = None,
    ) -> dict[str, Any]:
        sql, params = self._build_painel_query(search, product_type, only_critical, company_code)
        items = self._fetchall(sql, params)
        for item in items:
            item.pop("company_code", None)
        return {"items": items}

    def romaneios(self) -> dict[str, Any]:
        items = self._fetchall(queries.ROMANEIOS_LIST_SQL)
        return {"items": items}

    def romaneio_detail(self, romaneio_code: str) -> dict[str, Any] | None:
        header_sql = queries.ROMANEIO_HEADER_SQL.format(romaneios_list_sql=queries.ROMANEIOS_LIST_SQL)
        header = self._fetchone(header_sql, (romaneio_code,))
        if not header:
            return None
        status = header.get("previsao_saida_status")
        if status == "estoque":
            observacao = "Romaneio plenamente atendivel por estoque atual."
        elif status == "programado":
            observacao = "Romaneio depende de previsoes informadas de montagem/producao/compra."
        elif status == "heuristica":
            observacao = "Romaneio depende de previsao heuristica baseada em tempo de processo."
        else:
            observacao = "Romaneio ainda possui itens sem previsao confiavel de disponibilidade."
        header["previsao_saida_observacao"] = observacao
        return {
            "header": header,
            "items": self._fetchall(queries.ROMANEIO_ITEMS_SQL, (romaneio_code,)),
            "events": self._fetchall(queries.ROMANEIO_EVENTS_SQL, (romaneio_code,)),
        }

    def romaneios_kanban(self) -> dict[str, Any]:
        painel_items = self._fetchall(queries.PANEL_ENRICHED_SQL)
        romaneios = self._fetchall(
            queries.ROMANEIOS_KANBAN_SQL.format(romaneios_list_sql=queries.ROMANEIOS_LIST_SQL)
        )
        return {"products": painel_items, "romaneios": romaneios}

    def assembly(self) -> dict[str, Any]:
        sql = queries.MRP_QUEUE_BASE_SQL.format(view_name="mart.vw_mrp_assembly")
        return {"items": self._fetchall(sql)}

    def production(self) -> dict[str, Any]:
        sql = queries.MRP_QUEUE_BASE_SQL.format(view_name="mart.vw_mrp_production")
        return {"items": self._fetchall(sql)}

    def structures(self, source_scope: str | None = None, search: str | None = None) -> dict[str, Any]:
        sql = [queries.STRUCTURES_SQL, "where 1=1"]
        params: list[Any] = []
        if source_scope:
            sql.append("and lower(source_scope) = lower(%s)")
            params.append(source_scope.strip())
        if search:
            like_value = f"%{search.strip()}%"
            sql.append(
                "and (parent_sku ilike %s or parent_product ilike %s or component_sku ilike %s or component_product ilike %s)"
            )
            params.extend([like_value, like_value, like_value, like_value])
        sql.append("order by source_scope, parent_product, sequence_no nulls last, component_product")
        items = self._fetchall("\n".join(sql), tuple(params))
        return {
            "summary": {
                "component_links": len(items),
                "parent_items": len({item["parent_sku"] for item in items}),
                "manual_overrides": sum(1 for item in items if item["has_manual_override"]),
                "lines_configured": len({item["assembly_line_code"] for item in items if item["assembly_line_code"]}),
            },
            "items": items,
        }

    def programming(self, action: str | None = None) -> dict[str, Any]:
        sql = [queries.PROGRAMMING_SQL, "where 1=1"]
        params: list[Any] = []
        if action:
            sql.append("and lower(action) = lower(%s)")
            params.append(action.strip())
        sql.append("order by action, available_at nulls last, sequence_rank nulls last, produto")
        return {"items": self._fetchall("\n".join(sql), tuple(params))}

    def purchases(self, product_type: str | None = None) -> dict[str, Any]:
        sql = [queries.PURCHASE_QUEUE_SQL]
        params: list[Any] = []
        if product_type:
            sql.append("where lower(product_type) = lower(%s)")
            params.append(product_type.strip())
        sql.append("order by net_required desc, estimated_total_cost desc, produto")
        return {"items": self._fetchall("\n".join(sql), tuple(params))}

    def recycling(self) -> dict[str, Any]:
        return {"items": self._fetchall(queries.RECYCLING_SQL)}

    def costs(self) -> dict[str, Any]:
        return {"items": self._fetchall(queries.COSTS_SQL)}

    def sources(self) -> dict[str, Any]:
        return {"items": self._fetchall(queries.SOURCES_SQL)}

    def alerts(self) -> dict[str, Any]:
        return {"items": self._fetchall(queries.ALERTS_SQL)}

    def users(self) -> dict[str, Any]:
        return {"items": self._fetchall(queries.APP_USERS_SELECT_SQL)}

    def integrations(self) -> dict[str, Any]:
        return {"items": self._fetchall(queries.APP_INTEGRATIONS_SELECT_SQL)}

    def stock_movements(self) -> dict[str, Any]:
        items = self._fetchall(queries.APP_STOCK_MOVEMENTS_SELECT_SQL)
        return {
            "items": items,
            "summary": {
                "entradas": sum(item["quantity"] for item in items if item["movement_type"] == "entrada"),
                "saidas": sum(item["quantity"] for item in items if item["movement_type"] == "saida"),
                "movimentos": len(items),
            },
        }

    def apontamento_logs(self) -> dict[str, Any]:
        payload = (self._get_app_document(APP_STATE_APONTAMENTO_LOGS_KEY) or {}).get("payload_json")
        items = payload.get("items", payload) if isinstance(payload, dict) else payload
        normalized = [_coerce_apontamento_log_record(item) for item in items if item] if isinstance(items, list) else []
        normalized = sorted(normalized, key=lambda item: item["created_at"], reverse=True)[:240]
        return {"items": normalized, "summary": summarize_apontamento_logs(normalized)}

    def apontamento_export(self, pending_only: bool = False) -> dict[str, Any]:
        items = self.apontamento_logs().get("items", [])
        return build_apontamento_export_payload(items, pending_only)

    def production_rules(self) -> dict[str, Any]:
        payload = (self._get_app_document(APP_STATE_PRODUCTION_RULES_KEY) or {}).get("payload_json")
        if isinstance(payload, dict):
            return payload
        return load_production_rules(PRODUCTION_RULES_PATH)

    def save_user(self, payload: dict[str, Any]) -> dict[str, Any]:
        users = self._fetchall(queries.APP_USERS_SELECT_SQL)
        username = str(payload.get("username") or "").strip().lower()
        if not username:
            raise ValueError("Usuário obrigatório.")

        existing = next((item for item in users if item["username"] == username), None)
        if (existing or {}).get("username") == "root" and str(payload.get("active", True)).lower() == "false":
            raise ValueError("O usuário root não pode ser desativado.")

        next_user = _coerce_user_record(
            {
                "id": payload.get("id") or (existing or {}).get("id") or f"user-{username}",
                "username": username,
                "full_name": payload.get("full_name") or (existing or {}).get("full_name") or username,
                "role": payload.get("role") or (existing or {}).get("role") or "operator",
                "company_scope": (
                    payload.get("company_scope")
                    if payload.get("company_scope") is not None
                    else (existing or {}).get("company_scope")
                ),
                "password": payload.get("password") or (existing or {}).get("password") or "",
                "active": payload.get("active", (existing or {}).get("active", True)),
                "created_at": (existing or {}).get("created_at") or datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        _validate_user_record(next_user)
        persisted_user = self._upsert_user_record(next_user)
        persisted = self._fetchall(queries.APP_USERS_SELECT_SQL)
        if not any(item["username"] == "root" for item in persisted):
            self._upsert_user_record(DEFAULT_APP_USER)
            persisted = self._fetchall(queries.APP_USERS_SELECT_SQL)
        return {"status": "saved", "user": persisted_user, "items": persisted}

    def save_integration(self, payload: dict[str, Any]) -> dict[str, Any]:
        integrations = self._fetchall(queries.APP_INTEGRATIONS_SELECT_SQL)
        integration_type = str(payload.get("integration_type") or DEFAULT_APP_INTEGRATION["integration_type"]).strip()
        integration_id = _integration_id_for(payload)
        existing = next(
            (
                item
                for item in integrations
                if item["id"] == integration_id or (item["integration_type"] == integration_type and not payload.get("id"))
            ),
            None,
        )
        next_integration = _coerce_integration_record(
            {
                **(existing or DEFAULT_APP_INTEGRATION),
                **payload,
                "id": integration_id,
                "integration_type": integration_type,
                "created_at": (existing or DEFAULT_APP_INTEGRATION).get("created_at") or datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        _validate_integration_payload(next_integration)
        persisted_integration = self._upsert_integration_record(next_integration)
        persisted = self._fetchall(queries.APP_INTEGRATIONS_SELECT_SQL)
        return {"status": "saved", "integration": persisted_integration, "items": persisted}

    def delete_integration(self, payload: dict[str, Any]) -> dict[str, Any]:
        integration_id = str(payload.get("id") or "").strip()
        if not integration_id:
            raise ValueError("ID da integração obrigatório para exclusão.")

        self._fetchone(queries.APP_INTEGRATION_DELETE_SQL, (integration_id,), write=True)
        persisted = self._fetchall(queries.APP_INTEGRATIONS_SELECT_SQL)
        return {"status": "deleted", "items": persisted}

    def save_stock_movement(self, payload: dict[str, Any]) -> dict[str, Any]:
        sku = str(payload.get("sku") or "").strip().upper()
        if not sku:
            raise ValueError("SKU obrigatório para registrar movimentação.")
        quantity = float(payload.get("quantity") or payload.get("quantidade") or 0)
        if quantity <= 0:
            raise ValueError("Quantidade obrigatória para registrar movimentação.")

        next_item = _coerce_stock_movement_record(
            {
                **payload,
                "sku": sku,
                "quantity": quantity,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        persisted_item = self._upsert_stock_movement_record(next_item)
        persisted = self._fetchall(queries.APP_STOCK_MOVEMENTS_SELECT_SQL)
        return {"status": "saved", "movement": persisted_item, "items": persisted}

    def save_apontamento(self, payload: dict[str, Any]) -> dict[str, Any]:
        next_item = _coerce_apontamento_log_record(
            {
                **payload,
                "created_at": payload.get("created_at") or datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        current = self.apontamento_logs().get("items", [])
        persisted = [next_item, *[item for item in current if item.get("id") != next_item["id"]]]
        persisted = sorted(persisted, key=lambda item: item["created_at"], reverse=True)[:240]
        self._upsert_app_document(
            APP_STATE_APONTAMENTO_LOGS_KEY,
            {"items": persisted},
            source_label="ops.apontamento",
            source_hash=hashlib.sha256(json.dumps(persisted, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest(),
            doc_type="json",
            meta={
                "updated_via": "app_apontamento",
                "count": len(persisted),
            },
        )
        # Gatilho Reativo: Notificar Webhooks de Produção (n8n / Sankhya)
        try:
            integrations = self.integrations().get("items", [])
            active_hooks = [i for i in integrations if i.get("active") and i.get("integration_type") in ("n8n_webhook_production", "n8n_webhook_apontamento")]
            
            from urllib.request import Request, urlopen
            for hook in active_hooks:
                hook_url = hook.get("webhook_url")
                if not hook_url:
                    continue
                try:
                    req = Request(hook_url, method="POST")
                    req.add_header("Content-Type", "application/json")
                    urlopen(req, data=json.dumps(next_item, ensure_ascii=False).encode("utf-8"), timeout=5)
                except:
                    pass
        except:
            pass

        return {
            "status": "saved",
            "entry": next_item,
            "items": persisted,
            "summary": summarize_apontamento_logs(persisted),
        }

    def save_apontamento_sync_status(self, payload: dict[str, Any]) -> dict[str, Any]:
        persisted = apply_apontamento_sync_updates(self.apontamento_logs().get("items", []), payload)
        self._upsert_app_document(
            APP_STATE_APONTAMENTO_LOGS_KEY,
            {"items": persisted},
            source_label="ops.apontamento",
            source_hash=hashlib.sha256(json.dumps(persisted, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest(),
            doc_type="json",
            meta={
                "updated_via": "app_apontamento_sync",
                "count": len(persisted),
            },
        )
        return {
            "status": "updated",
            "items": persisted,
            "summary": summarize_apontamento_logs(persisted),
        }

    def authenticate_user(self, username: str, password: str) -> dict[str, Any] | None:
        normalized = str(username or "").strip().lower()
        if not normalized:
            return None
        user = self._fetchone(queries.APP_USER_AUTH_SQL, (normalized,))
        if not user or not _verify_password(password, user.get("password")):
            return None
        return user

    def run_mrp(self) -> dict[str, Any]:
        row = self._fetchone(queries.RUN_MRP_SQL, write=True)
        run_id = row["run_id"] if row else None
        return {
            "run_id": run_id,
            "status": "queued" if run_id is not None else "error",
            "queued_at": datetime.now(timezone.utc).isoformat(),
            "message": (
                "Recálculo do planejamento solicitado. Aguarde a atualização das filas operacionais."
                if run_id is not None
                else "Não foi possível abrir uma nova rodada de MRP."
            ),
        }

    def save_structure_override(self, payload: dict[str, Any]) -> dict[str, Any]:
        row = self._fetchone(
            queries.SAVE_STRUCTURE_OVERRIDE_SQL,
            (
                payload["parent_sku"],
                payload["component_sku"],
                payload["source_scope"],
                json.dumps(payload, ensure_ascii=False),
            ),
            write=True,
        )
        return {
            "override_id": row["override_id"] if row else None,
            "status": "saved",
        }

    def save_programming_entry(self, payload: dict[str, Any]) -> dict[str, Any]:
        row = self._fetchone(
            queries.SAVE_PROGRAMMING_ENTRY_SQL,
            (
                payload["sku"],
                json.dumps(payload, ensure_ascii=False),
            ),
            write=True,
        )
        return {
            "entry_id": row["entry_id"] if row else None,
            "status": "saved",
        }

    def save_romaneio_schedule(self, payload: dict[str, Any]) -> dict[str, Any]:
        romaneio_code = str(payload.get("romaneio") or "").strip()
        if not romaneio_code:
            raise ValueError("Romaneio obrigatorio para salvar previsao.")

        event_reference = payload.get("previsao_saida_at") or datetime.now(timezone.utc).isoformat()
        event_key = "manual_schedule:" + romaneio_code + ":" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
        row = self._fetchone(
            queries.SAVE_ROMANEIO_SCHEDULE_SQL,
            (
                event_key,
                event_reference,
                romaneio_code,
                str(payload.get("empresa") or ""),
                payload.get("previsao_saida_at"),
                str(payload.get("reason") or "pcp_manual"),
            ),
            write=True,
        )
        if not row:
            raise RuntimeError("Nao foi possivel registrar a previsao manual do romaneio.")

        return {
            "status": "saved",
            "romaneio": romaneio_code,
            "event_key": row.get("event_key"),
            "source_code": row.get("source_code"),
            "previsao_saida_at": payload.get("previsao_saida_at"),
        }

    def sync_sources(self, payload: dict[str, Any]) -> dict[str, Any]:
        requested_codes = resolve_requested_codes(payload)
        snapshot_at = resolve_snapshot_at(payload)
        if requested_codes:
            source_rows = self._fetchall(queries.SYNC_STOCK_SOURCES_BY_CODE_SQL, (requested_codes,))
        else:
            source_rows = self._fetchall(queries.ACTIVE_SYNC_STOCK_SOURCES_SQL)

        loaded_codes = {row["source_code"] for row in source_rows}
        errors: list[dict[str, Any]] = []
        results: list[dict[str, Any]] = []

        for source_code in requested_codes:
            if source_code not in loaded_codes:
                errors.append(
                    {
                        "source_code": source_code,
                        "error": "Fonte nao encontrada em `ops.source_registry` ou sem contrato conhecido.",
                    }
                )

        if not source_rows and not errors:
            raise SourceSyncError("Nenhuma fonte de estoque ativa foi encontrada para sincronizacao.")

        for row in source_rows:
            source_code = row["source_code"]
            try:
                source_request = build_source_request(row, self.settings)
                envelope = run_parser_envelope(
                    settings=self.settings,
                    source_request=source_request,
                    snapshot_at=snapshot_at,
                )
                records_json = json.dumps(envelope.get("records") or [], ensure_ascii=False)
                meta_json = json.dumps(build_meta(envelope), ensure_ascii=False)
                db_row = self._fetchone(
                    queries.INGEST_INVENTORY_PAYLOAD_SQL,
                    (
                        source_request.source_code,
                        envelope.get("snapshot_at") or snapshot_at,
                        records_json,
                        meta_json,
                    ),
                    write=True,
                )
                summary = envelope.get("summary")
                results.append(
                    {
                        "source_code": source_code,
                        "source_area": row["source_area"],
                        "workbook_path": source_request.workbook_path,
                        "record_count": int(envelope.get("record_count") or len(envelope.get("records") or [])),
                        "run_id": db_row["run_id"] if db_row else None,
                        "snapshot_at": envelope.get("snapshot_at") or snapshot_at,
                        "summary": summary if isinstance(summary, dict) else {},
                    }
                )
            except Exception as exc:  # noqa: BLE001
                errors.append({"source_code": source_code, "error": str(exc)})

        # --- Gatilho n8n para Romaneios ---
        try:
            integrations = self.integrations().get("items", [])
            n8n_hooks = [i for i in integrations if i.get("integration_type") == "n8n_webhook_romaneios" and i.get("active")]
            
            for hook in n8n_hooks:
                hook_url = hook.get("webhook_url")
                if not hook_url:
                    continue
                
                print(f"[SYNC] Disparando webhook n8n: {hook.get('name')} -> {hook_url}")
                from urllib.request import Request, urlopen
                import json
                req = Request(hook_url, method="POST")
                req.add_header("Content-Type", "application/json")
                
                payload_n8n = json.dumps({
                    "event": "manual_sync_triggered",
                    "triggered_at": datetime.now(timezone.utc).isoformat(),
                    "requested_snapshot": snapshot_at
                }).encode("utf-8")
                
                try:
                    with urlopen(req, data=payload_n8n, timeout=10) as resp:
                        code = resp.getcode()
                        print(f"[SYNC] Webhook {hook.get('name')} respondeu com status {code}")
                        results.append({
                            "source_code": f"webhook_{hook.get('name', 'n8n')}",
                            "status": "triggered",
                            "response_code": code,
                            "integration_id": hook.get("id")
                        })
                except Exception as hook_err:
                    print(f"[SYNC] Falha ao disparar webhook {hook.get('name')}: {str(hook_err)}")
                    errors.append({"source_code": f"webhook_{hook.get('name')}", "error": f"FALHA N8N: {str(hook_err)}"})
        except Exception as e:
            errors.append({"source_code": "external_webhooks", "error": f"Erro ao acionar webhooks: {str(e)}"})

        status = "success"
        if errors and results:
            status = "partial"
        elif errors and not results:
            status = "error"

        return {
            "status": status,
            "requested_sources": requested_codes or [row["source_code"] for row in source_rows],
            "results": results,
            "errors": errors,
            "snapshot_at": snapshot_at,
        }

    def ingest_romaneio_event(self, source_code: str, payload: dict[str, Any], meta: dict[str, Any]) -> dict[str, Any]:
        row = self._fetchone(
            queries.INGEST_ROMANEIO_EVENT_SQL,
            (
                source_code,
                json.dumps(payload, ensure_ascii=False),
                json.dumps(meta, ensure_ascii=False),
            ),
            write=True,
        )
        if not row:
            return {"status": "unknown"}
        return row.get("ingest") or {"status": "unknown"}

    def delete_romaneio(self, payload: dict[str, Any]) -> dict[str, Any]:
        romaneio_code = str(payload.get("romaneio") or "").strip()
        if not romaneio_code:
            raise ValueError("Romaneio obrigatório para exclusão.")
        row = self._fetchone(
            queries.DELETE_ROMANEIO_EVENT_SQL,
            (
                f"delete:{romaneio_code}:{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
                payload.get("event_at") or datetime.now(timezone.utc).isoformat(),
                romaneio_code,
                str(payload.get("empresa") or ""),
                str(payload.get("deleted_by") or ""),
                str(payload.get("reason") or "manual_delete"),
                romaneio_code,
            ),
            write=True,
        )
        if not row:
            raise RuntimeError("Não foi possível registrar a exclusão do romaneio.")
        return {
            "status": (row.get("ingest") or {}).get("status", "deleted"),
            "romaneio": romaneio_code,
            "ingest": row.get("ingest") or {},
            "source_code": row.get("source_code"),
        }


def build_provider(settings: Settings, data_dir: Path) -> DataProvider:
    if settings.data_mode == "postgres":
        return PostgresProvider(settings, data_dir)
    return MockProvider(data_dir)

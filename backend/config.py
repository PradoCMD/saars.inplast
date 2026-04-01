from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote


def _env(name: str) -> str | None:
    value = (os.getenv(name) or "").strip()
    return value or None


def _build_database_url_from_parts(username: str, password_env: str) -> str | None:
    password = _env(password_env)
    if not password:
        return None

    host = _env("PCP_POSTGRES_HOST") or "pcp-postgres"
    port = _env("PCP_POSTGRES_INTERNAL_PORT") or "5432"
    database = _env("PCP_POSTGRES_DB") or "inplast_pcp"
    return f"postgresql://{quote(username)}:{quote(password)}@{host}:{port}/{quote(database)}"


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    data_mode: str
    database_url: str | None
    actions_database_url: str | None
    repo_root: Path
    acabado_published_url: str | None
    intermediario_published_url: str | None
    almox_published_url: str | None
    almox_workbook: str | None
    sync_api_token: str | None

    @classmethod
    def from_env(cls) -> "Settings":
        data_mode = os.getenv("PCP_DATA_MODE", "mock").strip().lower() or "mock"
        if data_mode not in {"mock", "postgres"}:
            raise RuntimeError("PCP_DATA_MODE deve ser 'mock' ou 'postgres'")

        port_raw = os.getenv("PCP_PORT", "8765").strip() or "8765"
        default_repo_root = Path(__file__).resolve().parent.parent
        database_url = (
            _env("PCP_DATABASE_URL")
            or _env("DATABASE_URL")
            or _build_database_url_from_parts("pcp_app", "PCP_APP_DB_PASSWORD")
        )
        actions_database_url = (
            _env("PCP_ACTIONS_DATABASE_URL")
            or _env("PCP_WRITE_DATABASE_URL")
            or _build_database_url_from_parts("pcp_integration", "PCP_INTEGRATION_DB_PASSWORD")
        )
        return cls(
            host=os.getenv("PCP_HOST", "127.0.0.1").strip() or "127.0.0.1",
            port=int(port_raw),
            data_mode=data_mode,
            database_url=database_url,
            actions_database_url=actions_database_url,
            repo_root=Path((os.getenv("PCP_REPO_ROOT") or "").strip() or default_repo_root),
            acabado_published_url=(os.getenv("PCP_ACABADO_PUBLISHED_URL") or "").strip() or None,
            intermediario_published_url=(os.getenv("PCP_INTERMEDIARIO_PUBLISHED_URL") or "").strip() or None,
            almox_published_url=(os.getenv("PCP_ALMOX_PUBLISHED_URL") or "").strip() or None,
            almox_workbook=(os.getenv("PCP_ALMOX_WORKBOOK") or "").strip() or None,
            sync_api_token=(os.getenv("PCP_SYNC_API_TOKEN") or "").strip() or None,
        )

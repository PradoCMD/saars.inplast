from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    data_mode: str
    database_url: str | None
    actions_database_url: str | None

    @classmethod
    def from_env(cls) -> "Settings":
        data_mode = os.getenv("PCP_DATA_MODE", "mock").strip().lower() or "mock"
        if data_mode not in {"mock", "postgres"}:
            raise RuntimeError("PCP_DATA_MODE deve ser 'mock' ou 'postgres'")

        port_raw = os.getenv("PCP_PORT", "8765").strip() or "8765"
        return cls(
            host=os.getenv("PCP_HOST", "127.0.0.1").strip() or "127.0.0.1",
            port=int(port_raw),
            data_mode=data_mode,
            database_url=(os.getenv("PCP_DATABASE_URL") or os.getenv("DATABASE_URL") or "").strip() or None,
            actions_database_url=(
                os.getenv("PCP_ACTIONS_DATABASE_URL")
                or os.getenv("PCP_WRITE_DATABASE_URL")
                or ""
            ).strip()
            or None,
        )

from __future__ import annotations

import json
from abc import ABC, abstractmethod
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

from . import queries
from .config import Settings


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
    def run_mrp(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def save_structure_override(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def save_programming_entry(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError


class MockProvider(DataProvider):
    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir

    def _read_json(self, name: str) -> dict[str, Any]:
        return json.loads((self.data_dir / name).read_text(encoding="utf-8"))

    def overview(self, company_code: str | None = None) -> dict[str, Any]:
        return self._read_json("overview.json")

    def painel(
        self,
        search: str | None = None,
        product_type: str | None = None,
        only_critical: bool = False,
        company_code: str | None = None,
    ) -> dict[str, Any]:
        payload = self._read_json("painel.json")
        items = payload["items"]
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
        return self._read_json("romaneios.json")

    def romaneio_detail(self, romaneio_code: str) -> dict[str, Any] | None:
        path = self.data_dir / f"romaneio_{romaneio_code}.json"
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

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

    def run_mrp(self) -> dict[str, Any]:
        return {
            "run_id": int(datetime.now(timezone.utc).timestamp()),
            "status": "queued",
            "queued_at": datetime.now(timezone.utc).isoformat(),
        }

    def save_structure_override(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "override_id": int(datetime.now(timezone.utc).timestamp()),
            "status": "mock_saved",
            "payload": payload,
        }

    def save_programming_entry(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "entry_id": int(datetime.now(timezone.utc).timestamp()),
            "status": "mock_saved",
            "payload": payload,
        }


class PostgresProvider(DataProvider):
    def __init__(self, settings: Settings) -> None:
        if not settings.database_url:
            raise RuntimeError("PCP_DATABASE_URL ou DATABASE_URL e obrigatoria no modo postgres")
        self.database_url = settings.database_url
        self.actions_database_url = settings.actions_database_url or settings.database_url
        self.driver_name, self.driver = self._load_driver()

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
        return {key: self._normalize_value(value) for key, value in zip(columns, row)}

    def _normalize_value(self, value: Any) -> Any:
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        if isinstance(value, str) and value and value[0] in "{[":
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return value

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
        return {"items": self._fetchall(queries.ROMANEIOS_LIST_SQL)}

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

    def run_mrp(self) -> dict[str, Any]:
        row = self._fetchone(queries.RUN_MRP_SQL, write=True)
        run_id = row["run_id"] if row else None
        return {
            "run_id": run_id,
            "status": "queued" if run_id is not None else "error",
            "queued_at": datetime.now(timezone.utc).isoformat(),
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


def build_provider(settings: Settings, data_dir: Path) -> DataProvider:
    if settings.data_mode == "postgres":
        return PostgresProvider(settings)
    return MockProvider(data_dir)

from __future__ import annotations

import json
from abc import ABC, abstractmethod
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

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

    def save_romaneio_schedule(self, payload: dict[str, Any]) -> dict[str, Any]:
        romaneio_code = str(payload.get("romaneio") or "").strip()
        if not romaneio_code:
            raise RuntimeError("Romaneio obrigatorio para salvar previsao.")

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
        return {
            "status": "mock_synced",
            "requested_sources": requested_codes or list(STOCK_SOURCE_CODES),
            "results": [],
            "errors": [],
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


class PostgresProvider(DataProvider):
    def __init__(self, settings: Settings) -> None:
        if not settings.database_url:
            raise RuntimeError("PCP_DATABASE_URL ou DATABASE_URL e obrigatoria no modo postgres")
        self.settings = settings
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

    def romaneios_kanban(self) -> dict[str, Any]:
        painel_items = self._fetchall(queries.PANEL_ENRICHED_SQL)
        romaneios = self._fetchall(
            queries.ROMANEIOS_KANBAN_SQL.format(romaneios_list_sql=queries.ROMANEIOS_LIST_SQL)
        )
        return {
            "products": painel_items,
            "romaneios": romaneios
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

    def save_romaneio_schedule(self, payload: dict[str, Any]) -> dict[str, Any]:
        romaneio_code = str(payload.get("romaneio") or "").strip()
        if not romaneio_code:
            raise RuntimeError("Romaneio obrigatorio para salvar previsao.")

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


def build_provider(settings: Settings, data_dir: Path) -> DataProvider:
    if settings.data_mode == "postgres":
        return PostgresProvider(settings)
    return MockProvider(data_dir)

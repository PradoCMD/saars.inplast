#!/usr/bin/env python3
from __future__ import annotations

import base64
import json
from datetime import date, datetime
from decimal import Decimal
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

from backend import Settings, build_provider
from backend.romaneio_integration import normalize_webhook_romaneios
from backend.romaneio_pdf import SOURCE_CODE as ROMANEIO_PDF_SOURCE_CODE
from backend.romaneio_pdf import build_romaneio_event, normalize_romaneio_identity, parse_romaneio_pdf_bytes


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
WEB_DIR = ROOT / "web"
SETTINGS = Settings.from_env()
PROVIDER = build_provider(SETTINGS, DATA_DIR)


def content_type_for(path: Path) -> str:
    if path.suffix == ".html":
        return "text/html; charset=utf-8"
    if path.suffix == ".css":
        return "text/css; charset=utf-8"
    if path.suffix == ".js":
        return "application/javascript; charset=utf-8"
    if path.suffix == ".json":
        return "application/json; charset=utf-8"
    return "text/plain; charset=utf-8"


def json_default(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    raise TypeError(f"Tipo nao serializavel: {type(value)!r}")


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
    return "|".join([sku, unidade, descricao])


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
        document_kinds.add(str(parsed.get("document_kind") or "romaneio"))
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
        "document_kind": next(iter(document_kinds)) if len(document_kinds) == 1 else "merged",
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

def sync_parsed_romaneios(records: list[dict]) -> dict:
    results: list[dict] = []
    errors: list[dict] = []
    successful_records: list[dict] = []
    processed_files: list[str] = []

    consolidated_records = _consolidate_parsed_romaneios(records)

    for parsed in consolidated_records:
        try:
            payload, meta = build_romaneio_event(parsed)
            ingest = PROVIDER.ingest_romaneio_event(ROMANEIO_PDF_SOURCE_CODE, payload, meta)
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


def _resolve_romaneio_integration(integration_id: str | None = None) -> dict:
    items = (PROVIDER.integrations() or {}).get("items") or []
    candidates = [
        item
        for item in items
        if item.get("integration_type") == "n8n_webhook_romaneios"
        and (integration_id is None or str(item.get("id")) == str(integration_id))
    ]
    if integration_id and not candidates:
        raise RuntimeError("Integração de romaneios não encontrada.")
    active = next((item for item in candidates if item.get("active")), None) if candidates else None
    if active:
        return active
    if integration_id and candidates:
        return candidates[0]
    raise RuntimeError("Nenhuma integração ativa de romaneios foi cadastrada.")


def _call_integration_webhook(integration: dict) -> tuple[int, dict | list]:
    webhook_url = str(integration.get("webhook_url") or "").strip()
    if not webhook_url:
        raise RuntimeError("Webhook da integração de romaneios não configurado.")

    method = str(integration.get("method") or "POST").strip().upper() or "POST"
    headers = {"Accept": "application/json"}
    extra_headers = _parse_json_config_field(integration.get("extra_headers_json"), {})
    if isinstance(extra_headers, dict):
        headers.update({str(key): str(value) for key, value in extra_headers.items() if value is not None})

    auth_type = str(integration.get("auth_type") or "none").strip().lower()
    auth_value = str(integration.get("auth_value") or "").strip()
    if auth_type == "bearer" and auth_value:
        headers["Authorization"] = f"Bearer {auth_value}"

    body_payload = _parse_json_config_field(integration.get("request_body_json"), {})
    body_bytes = None
    if method != "GET":
        headers["Content-Type"] = "application/json"
        body_bytes = json.dumps(body_payload, ensure_ascii=False).encode("utf-8")

    request = Request(webhook_url, data=body_bytes, headers=headers, method=method)
    try:
        with urlopen(request, timeout=60) as response:
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
        raise RuntimeError("Webhook de romaneios retornou uma resposta que não é JSON válido.") from exc


def refresh_romaneios_from_integration(payload: dict | None = None) -> dict:
    request_payload = payload or {}
    integration = _resolve_romaneio_integration(str(request_payload.get("integration_id") or "").strip() or None)
    integration_id = integration.get("id")
    synced_at = datetime.utcnow().isoformat() + "Z"

    try:
        webhook_status, webhook_payload = _call_integration_webhook(integration)
        parsed_records = normalize_webhook_romaneios(webhook_payload)
        if not parsed_records:
            raise RuntimeError("O webhook não retornou nenhum romaneio aproveitável para ingestão.")
        response = sync_parsed_romaneios(parsed_records)
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


class PcpApiHandler(BaseHTTPRequestHandler):
    server_version = "PCPSaaSReference/1.1"

    def read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0") or "0")
        raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        if not raw_body.strip():
            return {}
        return json.loads(raw_body.decode("utf-8"))

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/pcp/"):
            self.handle_api_get(parsed)
            return
        self.handle_static(parsed.path)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/api/pcp/runs/mrp":
                self.send_json(HTTPStatus.OK, PROVIDER.run_mrp())
                return

            if parsed.path == "/api/pcp/sources/sync":
                if not self.authorize_sync():
                    return
                payload = self.read_json_body()
                self.send_json(HTTPStatus.OK, PROVIDER.sync_sources(payload))
                return

            if parsed.path == "/api/pcp/structure-overrides":
                payload = self.read_json_body()
                self.send_json(HTTPStatus.OK, PROVIDER.save_structure_override(payload))
                return

            if parsed.path == "/api/pcp/programming-entries":
                payload = self.read_json_body()
                self.send_json(HTTPStatus.OK, PROVIDER.save_programming_entry(payload))
                return

            if parsed.path == "/api/pcp/users/save":
                payload = self.read_json_body()
                self.send_json(HTTPStatus.OK, PROVIDER.save_user(payload))
                return

            if parsed.path == "/api/pcp/integrations/save":
                payload = self.read_json_body()
                self.send_json(HTTPStatus.OK, PROVIDER.save_integration(payload))
                return

            if parsed.path == "/api/pcp/auth/login":
                payload = self.read_json_body()
                username = str(payload.get("username") or "").strip()
                password = str(payload.get("password") or "").strip()
                user = PROVIDER.authenticate_user(username, password)
                if not user:
                    self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Usuário ou senha inválidos"})
                    return
                self.send_json(HTTPStatus.OK, {"status": "authenticated", "user": user})
                return

            if parsed.path == "/api/pcp/romaneios-kanban/update-date":
                payload = self.read_json_body()
                self.send_json(HTTPStatus.OK, PROVIDER.save_romaneio_schedule(payload))
                return

            if parsed.path == "/api/pcp/romaneios/delete":
                payload = self.read_json_body()
                self.send_json(HTTPStatus.OK, PROVIDER.delete_romaneio(payload))
                return

            if parsed.path == "/api/pcp/romaneios-kanban/sync":
                payload = self.read_json_body()
                records = payload if isinstance(payload, list) else payload.get("records") or []
                self.send_json(HTTPStatus.OK, sync_parsed_romaneios(records))
                return

            if parsed.path == "/api/pcp/romaneios/upload":
                payload = self.read_json_body()
                files = payload.get("files") or []
                parsed_records: list[dict] = []
                file_errors: list[dict] = []

                for entry in files:
                    name = str(entry.get("name") or "").strip()
                    content_base64 = str(entry.get("content_base64") or "").strip()
                    if not name or not content_base64:
                        file_errors.append({"file_name": name or "sem_nome", "error": "Arquivo sem nome ou conteúdo."})
                        continue
                    try:
                        file_bytes = base64.b64decode(content_base64)
                        parsed_records.append(parse_romaneio_pdf_bytes(file_bytes, name))
                    except Exception as exc:  # noqa: BLE001
                        file_errors.append({"file_name": name, "error": str(exc)})

                response = sync_parsed_romaneios(parsed_records)
                response["uploaded_files"] = len(files)
                if file_errors:
                    response["errors"] = response.get("errors", []) + file_errors
                    if response["status"] == "success":
                        response["status"] = "partial"
                self.send_json(HTTPStatus.OK, response)
                return

            if parsed.path == "/api/pcp/romaneios/refresh":
                payload = self.read_json_body()
                self.send_json(HTTPStatus.OK, refresh_romaneios_from_integration(payload))
                return
        except Exception as exc:  # noqa: BLE001
            self.send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {
                    "error": "Backend PCP unavailable",
                    "detail": str(exc),
                    "mode": SETTINGS.data_mode,
                },
            )
            return
        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Route not found"})

    def authorize_sync(self) -> bool:
        expected_token = SETTINGS.sync_api_token
        if not expected_token:
            return True
        header_token = self.headers.get("X-PCP-Sync-Token", "").strip()
        auth_header = self.headers.get("Authorization", "").strip()
        bearer_token = ""
        if auth_header.lower().startswith("bearer "):
            bearer_token = auth_header[7:].strip()
        if header_token == expected_token or bearer_token == expected_token:
            return True
        self.send_json(
            HTTPStatus.UNAUTHORIZED,
            {"error": "Sync token required for this operation"},
        )
        return False

    def handle_api_get(self, parsed) -> None:
        query = parse_qs(parsed.query)
        path = parsed.path
        company_code = (query.get("company_code", [""])[0] or "").strip() or None

        try:
            if path == "/api/pcp/overview":
                self.send_json(HTTPStatus.OK, PROVIDER.overview(company_code=company_code))
                return

            if path == "/api/pcp/painel":
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
                self.send_json(HTTPStatus.OK, PROVIDER.romaneios())
                return

            if path.startswith("/api/pcp/romaneios/"):
                romaneio_code = path.rsplit("/", 1)[-1]
                if romaneio_code == "kanban":
                    pass
                else:
                    payload = PROVIDER.romaneio_detail(romaneio_code)
                    if payload is None:
                        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Romaneio not found"})
                        return
                    self.send_json(HTTPStatus.OK, payload)
                    return

            if path == "/api/pcp/romaneios-kanban":
                self.send_json(HTTPStatus.OK, PROVIDER.romaneios_kanban())
                return

            if path == "/api/pcp/assembly":
                self.send_json(HTTPStatus.OK, PROVIDER.assembly())
                return

            if path == "/api/pcp/production":
                self.send_json(HTTPStatus.OK, PROVIDER.production())
                return

            if path == "/api/pcp/structures":
                self.send_json(
                    HTTPStatus.OK,
                    PROVIDER.structures(
                        source_scope=(query.get("source_scope", [""])[0] or "").strip() or None,
                        search=(query.get("search", [""])[0] or "").strip() or None,
                    ),
                )
                return

            if path == "/api/pcp/programming":
                self.send_json(
                    HTTPStatus.OK,
                    PROVIDER.programming(action=(query.get("action", [""])[0] or "").strip() or None),
                )
                return

            if path == "/api/pcp/users":
                self.send_json(HTTPStatus.OK, PROVIDER.users())
                return

            if path == "/api/pcp/integrations":
                self.send_json(HTTPStatus.OK, PROVIDER.integrations())
                return

            if path == "/api/pcp/purchases":
                self.send_json(
                    HTTPStatus.OK,
                    PROVIDER.purchases(product_type=(query.get("product_type", [""])[0] or "").strip() or None),
                )
                return

            if path == "/api/pcp/recycling":
                self.send_json(HTTPStatus.OK, PROVIDER.recycling())
                return

            if path == "/api/pcp/costs":
                self.send_json(HTTPStatus.OK, PROVIDER.costs())
                return

            if path == "/api/pcp/sources":
                self.send_json(HTTPStatus.OK, PROVIDER.sources())
                return

            if path == "/api/pcp/alerts":
                self.send_json(HTTPStatus.OK, PROVIDER.alerts())
                return

            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Route not found"})
        except Exception as exc:  # noqa: BLE001
            self.send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {
                    "error": "Backend PCP unavailable",
                    "detail": str(exc),
                    "mode": SETTINGS.data_mode,
                },
            )

    def handle_static(self, raw_path: str) -> None:
        path = raw_path or "/"
        if path == "/":
            path = "/index.html"

        file_path = (WEB_DIR / path.lstrip("/")).resolve()
        if WEB_DIR not in file_path.parents and file_path != WEB_DIR:
            self.send_error(HTTPStatus.FORBIDDEN)
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

    def send_json(self, status: HTTPStatus, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False, default=json_default).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return


def main() -> None:
    server = ThreadingHTTPServer((SETTINGS.host, SETTINGS.port), PcpApiHandler)
    print(f"PCP SaaS reference server running on http://{SETTINGS.host}:{SETTINGS.port} [{SETTINGS.data_mode}]")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

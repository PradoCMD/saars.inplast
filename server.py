#!/usr/bin/env python3
from __future__ import annotations

import base64
import json
from datetime import date, datetime
from decimal import Decimal
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from backend import Settings, build_provider
from backend.romaneio_pdf import SOURCE_CODE as ROMANEIO_PDF_SOURCE_CODE
from backend.romaneio_pdf import build_romaneio_event, parse_romaneio_pdf_bytes


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


def upsert_kanban_romaneios(records: list[dict]) -> int:
    db_path = ROOT / "backend" / "kanban_db.json"
    db_data = {"romaneios": []}
    if db_path.exists():
        try:
            db_data = json.loads(db_path.read_text(encoding="utf-8"))
        except Exception:
            db_data = {"romaneios": []}

    rom_map = {str(item.get("romaneio")): item for item in db_data.get("romaneios", []) if item.get("romaneio")}

    for incoming in records:
        romaneio_code = str(incoming.get("ordem_carga") or "").strip()
        if not romaneio_code:
            continue
        existing = rom_map.get(romaneio_code, {})
        rom_map[romaneio_code] = {
            "romaneio": romaneio_code,
            "empresa": incoming.get("nome_empresa") or existing.get("empresa", ""),
            "data_evento": existing.get("data_evento") or datetime.now().isoformat(),
            "previsao_saida_at": existing.get("previsao_saida_at"),
            "items": incoming.get("itens", []),
            "valor_total": incoming.get("total_geral", 0),
        }

    db_data["romaneios"] = list(rom_map.values())
    db_path.write_text(json.dumps(db_data, ensure_ascii=False, indent=2), encoding="utf-8")
    return len(db_data["romaneios"])


def sync_parsed_romaneios(records: list[dict]) -> dict:
    results: list[dict] = []
    errors: list[dict] = []
    successful_records: list[dict] = []

    for parsed in records:
        try:
            payload, meta = build_romaneio_event(parsed)
            ingest = PROVIDER.ingest_romaneio_event(ROMANEIO_PDF_SOURCE_CODE, payload, meta)
            ingest_status = str((ingest or {}).get("status") or "").lower()
            if ingest_status in {"processed", "duplicate_ignored", "noop", "success", "saved"}:
                successful_records.append(parsed)
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

    kanban_count = upsert_kanban_romaneios([parsed for parsed in successful_records if parsed.get("ordem_carga")])
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
        "errors": errors,
    }


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

            if parsed.path == "/api/pcp/romaneios-kanban/update-date":
                payload = self.read_json_body()
                self.send_json(HTTPStatus.OK, {"ok": True})
                db_path = Path(__file__).parent / "backend/kanban_db.json"
                if db_path.exists():
                    db_data = json.loads(db_path.read_text("utf-8"))
                    for r in db_data.get("romaneios", []):
                        if r["romaneio"] == payload.get("romaneio"):
                            r["previsao_saida_at"] = payload.get("previsao_saida_at")
                    db_path.write_text(json.dumps(db_data, indent=2))
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

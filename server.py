#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from backend import Settings, build_provider


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

            if parsed.path == "/api/pcp/structure-overrides":
                payload = self.read_json_body()
                self.send_json(HTTPStatus.OK, PROVIDER.save_structure_override(payload))
                return

            if parsed.path == "/api/pcp/programming-entries":
                payload = self.read_json_body()
                self.send_json(HTTPStatus.OK, PROVIDER.save_programming_entry(payload))
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
                payload = PROVIDER.romaneio_detail(romaneio_code)
                if payload is None:
                    self.send_json(HTTPStatus.NOT_FOUND, {"error": "Romaneio not found"})
                    return
                self.send_json(HTTPStatus.OK, payload)
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

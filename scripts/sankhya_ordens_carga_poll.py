#!/usr/bin/env python3
"""Poll Sankhya ordens de carga endpoints and normalize them into PCP romaneio events."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any


LIST_DEFAULT_URL = "https://api.sankhya.com.br/v1/logistica/ordens-carga"
DETAIL_DEFAULT_TEMPLATE = "https://api.sankhya.com.br/v1/logistica/empresas/{codigoEmpresa}/ordens-carga/{codigoOrdemCarga}"
PEDIDOS_DEFAULT_TEMPLATE = ""
SOURCE_CODE_DEFAULT = "romaneio_sankhya_webhook"


@dataclass(frozen=True)
class PollConfig:
    list_url: str
    detail_url_template: str
    pedidos_url_template: str
    authorization: str
    source_code: str
    company_code: str
    modified_since: str
    page: int
    max_pages: int
    include_empty_items: bool


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Consulta ordens de carga no Sankhya e devolve eventos normalizados.")
    parser.add_argument("--list-url", default=os.getenv("SANKHYA_ORDENS_CARGA_LIST_URL") or LIST_DEFAULT_URL)
    parser.add_argument(
        "--detail-url-template",
        default=os.getenv("SANKHYA_ORDENS_CARGA_DETAIL_URL_TEMPLATE") or DETAIL_DEFAULT_TEMPLATE,
    )
    parser.add_argument(
        "--pedidos-url-template",
        default=os.getenv("SANKHYA_ORDENS_CARGA_PEDIDOS_URL_TEMPLATE") or PEDIDOS_DEFAULT_TEMPLATE,
    )
    parser.add_argument("--authorization", default=os.getenv("SANKHYA_AUTHORIZATION") or "")
    parser.add_argument("--source-code", default=os.getenv("SANKHYA_SOURCE_CODE") or SOURCE_CODE_DEFAULT)
    parser.add_argument("--codigo-empresa", default=os.getenv("SANKHYA_CODIGO_EMPRESA") or "")
    parser.add_argument("--modified-since", default=os.getenv("SANKHYA_ORDENS_CARGA_MODIFIED_SINCE") or "")
    parser.add_argument("--page", type=int, default=int(os.getenv("SANKHYA_ORDENS_CARGA_PAGE") or "1"))
    parser.add_argument("--max-pages", type=int, default=int(os.getenv("SANKHYA_ORDENS_CARGA_MAX_PAGES") or "1"))
    parser.add_argument("--include-empty-items", action="store_true")
    parser.add_argument("--pretty", action="store_true")
    return parser.parse_args()


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def parse_number(value: Any) -> float:
    if value in (None, ""):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    text = clean_text(value)
    if not text:
        return 0.0
    if "," in text and "." in text:
        if text.rfind(",") > text.rfind("."):
            text = text.replace(".", "").replace(",", ".")
        else:
            text = text.replace(",", "")
    else:
        text = text.replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return 0.0


def parse_datetime(value: Any, fallback: dt.datetime) -> str:
    text = clean_text(value)
    if not text:
        return fallback.isoformat(timespec="seconds")

    candidate = text.replace("Z", "+00:00") if text.endswith("Z") else text
    for fmt in (
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%Y-%m-%d",
        "%d/%m/%Y",
    ):
        try:
            parsed = dt.datetime.strptime(candidate, fmt)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=dt.timezone.utc)
            return parsed.isoformat(timespec="seconds")
        except ValueError:
            continue

    try:
        parsed = dt.datetime.fromisoformat(candidate)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed.isoformat(timespec="seconds")
    except ValueError:
        return fallback.isoformat(timespec="seconds")


def get_nested(payload: Any, path: str) -> Any:
    current = payload
    for part in path.split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return current


def pick_first(payload: Any, *paths: str) -> Any:
    for path in paths:
        value = get_nested(payload, path)
        if value not in (None, "", []):
            return value
    return None


def find_first_collection(payload: Any, depth: int = 0) -> list[Any]:
    if depth > 6:
        return []
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        preferred_keys = (
            "data",
            "items",
            "results",
            "records",
            "content",
            "ordensCarga",
            "ordens_carga",
            "rows",
            "value",
            "response",
        )
        for key in preferred_keys:
            if key in payload:
                found = find_first_collection(payload[key], depth + 1)
                if found:
                    return found
        for value in payload.values():
            found = find_first_collection(value, depth + 1)
            if found:
                return found
    return []


def find_first_mapping(payload: Any, depth: int = 0) -> dict[str, Any]:
    if depth > 6:
        return {}
    if isinstance(payload, dict):
        preferred_keys = ("data", "item", "result", "response", "ordemCarga", "ordem_carga")
        for key in preferred_keys:
            if key in payload and isinstance(payload[key], dict):
                found = find_first_mapping(payload[key], depth + 1)
                if found:
                    return found
        return payload
    if isinstance(payload, list):
        for item in payload:
            found = find_first_mapping(item, depth + 1)
            if found:
                return found
    return {}


def append_query(url: str, params: dict[str, Any]) -> str:
    parsed = urllib.parse.urlsplit(url)
    existing = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    merged = dict(existing)
    for key, value in params.items():
        text = clean_text(value)
        if text:
            merged[key] = text
    return urllib.parse.urlunsplit(parsed._replace(query=urllib.parse.urlencode(merged)))


def fetch_json(url: str, authorization: str) -> Any:
    headers = {"accept": "application/json"}
    if clean_text(authorization):
        headers["Authorization"] = authorization
    request = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def build_url_from_template(template: str, *, codigo_empresa: str, codigo_ordem_carga: str) -> str:
    if not clean_text(template):
        return ""
    return template.format(
        codigoEmpresa=urllib.parse.quote(clean_text(codigo_empresa), safe=""),
        codigoOrdemCarga=urllib.parse.quote(clean_text(codigo_ordem_carga), safe=""),
    )


def normalize_item(raw_item: dict[str, Any]) -> dict[str, Any] | None:
    sku = clean_text(
        pick_first(
            raw_item,
            "sku",
            "codigoProduto",
            "codProduto",
            "produto.codigo",
            "produto.codigoProduto",
        )
    )
    descricao = clean_text(
        pick_first(
            raw_item,
            "descricao",
            "descricaoProduto",
            "nomeProduto",
            "produto",
            "produto.descricao",
            "produto.nome",
        )
    )
    unidade = clean_text(pick_first(raw_item, "unidade", "unidadeMedida", "siglaUnidade")) or "UN"
    tipo_produto = clean_text(
        pick_first(
            raw_item,
            "tipo_produto",
            "tipoProduto",
            "produto.tipoProduto",
            "produto.tipo",
        )
    ) or "PRODUTO ACABADO"

    quantidade = parse_number(
        pick_first(
            raw_item,
            "quantidade",
            "qtd",
            "quantidadeTotal",
            "qtdTotal",
            "quantidadeSeparada",
        )
    )
    quantidade_neg = parse_number(
        pick_first(
            raw_item,
            "quantidade_neg",
            "quantidadeNeg",
            "quantidadeNegociada",
            "qtdNegociada",
        )
    )
    quantidade_vol = parse_number(
        pick_first(
            raw_item,
            "quantidade_vol",
            "quantidadeVol",
            "quantidadeVolume",
            "qtdVolume",
        )
    )
    quantity_total = max(quantidade, quantidade_neg + quantidade_vol)

    if not sku and not descricao:
        return None

    produto = clean_text(f"{sku} - {descricao}" if sku and descricao else descricao or sku)
    return {
        "sku": sku,
        "descricao": descricao or produto,
        "produto": produto,
        "unidade": unidade,
        "tipo_produto": tipo_produto,
        "quantidade": round(quantidade or quantity_total, 6),
        "quantidade_neg": round(quantidade_neg, 6),
        "quantidade_vol": round(quantidade_vol, 6),
        "quantity_total": round(quantity_total, 6),
    }


def extract_items(payload: Any) -> list[dict[str, Any]]:
    if payload in (None, "", []):
        return []

    candidates: list[list[Any]] = []
    if isinstance(payload, list):
        candidates.append(payload)
    elif isinstance(payload, dict):
        for path in (
            "itens",
            "items",
            "produtos",
            "pedidoItens",
            "itensPedido",
            "pedidos",
            "data",
        ):
            value = get_nested(payload, path)
            if isinstance(value, list):
                candidates.append(value)

    for candidate in candidates:
        normalized: list[dict[str, Any]] = []
        for item in candidate:
            if not isinstance(item, dict):
                continue
            if any(isinstance(item.get(key), list) for key in ("itens", "items", "produtos", "pedidoItens", "itensPedido")):
                normalized.extend(extract_items(item))
                continue
            prepared = normalize_item(item)
            if prepared and prepared["quantity_total"] > 0:
                normalized.append(prepared)
        if normalized:
            return normalized
    return []


def build_event(
    *,
    order_row: dict[str, Any],
    detail_payload: Any,
    pedidos_payload: Any,
    config: PollConfig,
    now_utc: dt.datetime,
) -> tuple[dict[str, Any] | None, str | None]:
    detail_obj = find_first_mapping(detail_payload) if detail_payload else {}
    pedidos_obj = find_first_mapping(pedidos_payload) if pedidos_payload else {}
    merged = [detail_obj, pedidos_obj, order_row]

    def first_value(*paths: str) -> Any:
        for payload in merged:
            value = pick_first(payload, *paths)
            if value not in (None, "", []):
                return value
        return None

    codigo = clean_text(
        first_value(
            "codigoOrdemCarga",
            "codigo",
            "codOrdemCarga",
            "nuOrdemCarga",
            "numero",
            "romaneio",
        )
    )
    empresa = clean_text(
        first_value(
            "codigoEmpresa",
            "codEmp",
            "empresa.codigo",
            "empresa",
        )
    ) or clean_text(config.company_code) or "INPLAST"

    if not codigo:
        return None, "ordem_sem_codigo"

    event_at = parse_datetime(
        first_value(
            "dataAlteracao",
            "dhAlter",
            "ultimaAlteracao",
            "modifiedAt",
            "modifiedSince",
            "dataHoraAlteracao",
            "dataCadastro",
        ),
        now_utc,
    )
    status = clean_text(first_value("situacao", "status", "statusOrdemCarga")) or "aberto"
    parceiro = clean_text(first_value("parceiro", "nomeParceiro", "cliente", "destinatario"))
    cidade = clean_text(first_value("cidade", "nomeCidade", "municipio", "destinoCidade"))
    pedido = clean_text(first_value("pedido", "codigoPedido", "numeroPedido"))
    valor_total = round(
        parse_number(first_value("valorTotal", "valor_total", "vlrTotal", "total")),
        2,
    )

    items = extract_items(detail_payload)
    if not items:
        items = extract_items(pedidos_payload)
    if not items:
        items = extract_items(order_row)

    if not items and not config.include_empty_items:
        return None, f"ordem_sem_itens:{codigo}"

    event_key = f"{config.source_code}:{codigo}:{event_at.replace(':', '').replace('-', '')}"
    payload = {
        "event_id": event_key,
        "event_type": "update",
        "event_at": event_at,
        "romaneio": {
            "codigo": codigo,
            "empresa": empresa,
            "status": status,
            "pedido": pedido,
            "parceiro": parceiro,
            "cidade": cidade,
            "valor_total": valor_total,
            "itens": items,
        },
    }
    return payload, None


def build_config(args: argparse.Namespace) -> PollConfig:
    return PollConfig(
        list_url=clean_text(args.list_url) or LIST_DEFAULT_URL,
        detail_url_template=clean_text(args.detail_url_template),
        pedidos_url_template=clean_text(args.pedidos_url_template),
        authorization=clean_text(args.authorization),
        source_code=clean_text(args.source_code) or SOURCE_CODE_DEFAULT,
        company_code=clean_text(args.codigo_empresa),
        modified_since=clean_text(args.modified_since),
        page=max(int(args.page or 1), 1),
        max_pages=max(int(args.max_pages or 1), 1),
        include_empty_items=bool(args.include_empty_items),
    )


def poll_ordens(config: PollConfig) -> dict[str, Any]:
    now_utc = dt.datetime.now(dt.timezone.utc)
    warnings: list[str] = []
    orders: list[dict[str, Any]] = []
    pages_fetched = 0

    for offset in range(config.max_pages):
        page = config.page + offset
        page_url = append_query(
            config.list_url,
            {
                "page": page,
                "modifiedSince": config.modified_since,
                "codigoEmpresa": config.company_code,
            },
        )
        response_payload = fetch_json(page_url, config.authorization)
        batch = find_first_collection(response_payload)
        pages_fetched += 1
        if not batch:
            break
        orders.extend(item for item in batch if isinstance(item, dict))
        if len(batch) == 0:
            break

    events: list[dict[str, Any]] = []
    detail_calls = 0
    pedidos_calls = 0

    for order_row in orders:
        codigo = clean_text(
            pick_first(
                order_row,
                "codigoOrdemCarga",
                "codigo",
                "codOrdemCarga",
                "nuOrdemCarga",
                "numero",
            )
        )
        empresa = clean_text(
            pick_first(
                order_row,
                "codigoEmpresa",
                "codEmp",
                "empresa.codigo",
                "empresa",
            )
        ) or config.company_code

        detail_payload: Any = order_row
        if codigo and empresa and config.detail_url_template:
            detail_url = build_url_from_template(
                config.detail_url_template,
                codigo_empresa=empresa,
                codigo_ordem_carga=codigo,
            )
            detail_payload = fetch_json(detail_url, config.authorization)
            detail_calls += 1

        pedidos_payload: Any = None
        if codigo and empresa and config.pedidos_url_template:
            pedidos_url = build_url_from_template(
                config.pedidos_url_template,
                codigo_empresa=empresa,
                codigo_ordem_carga=codigo,
            )
            pedidos_payload = fetch_json(pedidos_url, config.authorization)
            pedidos_calls += 1

        event_payload, warning = build_event(
            order_row=order_row,
            detail_payload=detail_payload,
            pedidos_payload=pedidos_payload,
            config=config,
            now_utc=now_utc,
        )
        if warning:
            warnings.append(warning)
        if event_payload:
            events.append(event_payload)

    return {
        "source_code": config.source_code,
        "fetched_at": now_utc.isoformat(timespec="seconds"),
        "events": events,
        "summary": {
            "list_url": config.list_url,
            "detail_url_template": config.detail_url_template,
            "pedidos_url_template": config.pedidos_url_template,
            "pages_fetched": pages_fetched,
            "orders_seen": len(orders),
            "events_built": len(events),
            "detail_calls": detail_calls,
            "pedidos_calls": pedidos_calls,
            "warnings": warnings,
        },
    }


def main() -> int:
    args = parse_args()
    config = build_config(args)
    result = poll_ordens(config)
    json_kwargs = {"ensure_ascii": False}
    if args.pretty:
        json_kwargs["indent"] = 2
    sys.stdout.write(json.dumps(result, **json_kwargs))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

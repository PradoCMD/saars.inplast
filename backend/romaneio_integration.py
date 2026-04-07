from __future__ import annotations

import json
import re
from typing import Any

from .romaneio_pdf import normalize_document_kind, normalize_romaneio_identity


ROMANEIO_CODE_KEYS = (
    "romaneio",
    "romaneio_identity",
    "ordem_carga",
    "codigo_ordem_carga",
    "codigoOrdemCarga",
    "codigo_romaneio",
    "codigoRomaneio",
    "numero_romaneio",
    "numeroRomaneio",
)

FILE_NAME_KEYS = (
    "file_name",
    "file",
    "filename",
    "pdf_name",
    "nome_arquivo",
    "arquivo",
    "document_name",
)

COMPANY_CODE_KEYS = (
    "empresa",
    "codigo_empresa",
    "codigoEmpresa",
)

COMPANY_NAME_KEYS = (
    "nome_empresa",
    "nomeEmpresa",
    "empresa_nome",
    "nomeFantasia",
    "nome_empresa_fantasia",
)


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def parse_number(value: Any) -> float:
    if value is None or value == "":
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


def _walk(value: Any):
    if isinstance(value, dict):
        yield value
        for nested in value.values():
            yield from _walk(nested)
    elif isinstance(value, list):
        for item in value:
            yield from _walk(item)


def find_first_value(payload: Any, candidate_keys: tuple[str, ...]) -> str:
    lookup = {key.lower() for key in candidate_keys}
    for node in _walk(payload):
        if not isinstance(node, dict):
            continue
        for key, value in node.items():
            if key.lower() in lookup:
                text = clean_text(value)
                if text:
                    return text
    return ""


def split_product_label(value: Any) -> tuple[str, str]:
    text = clean_text(value)
    if not text:
        return "", ""
    match = re.match(r"^(\d+)\s*-\s*(.+)$", text)
    if match:
        return clean_text(match.group(1)), clean_text(match.group(2))
    return "", text


def extract_response_records(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if not isinstance(payload, dict):
        return []
    if "pdf_romaneio" in payload:
        return [payload]
    for key in ("items", "records", "results", "data"):
        value = payload.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    return [payload]


def normalize_webhook_pedido(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "numero_unico": clean_text(raw.get("numero_unico") or raw.get("n_unico") or raw.get("nUnico")),
        "ped_mercos": clean_text(raw.get("ped_mercos") or raw.get("pedMercos")),
        "codigo_parceiro": clean_text(raw.get("codigo_parceiro") or raw.get("codigoParceiro")),
        "parceiro": clean_text(raw.get("parceiro") or raw.get("cliente")),
        "cidade": clean_text(raw.get("cidade")),
        "valor_total": round(parse_number(raw.get("valor_total") or raw.get("valorTotal")), 2),
    }


def webhook_pedido_key(pedido: dict[str, Any]) -> str:
    numero_unico = clean_text(pedido.get("numero_unico"))
    if numero_unico:
        return numero_unico
    ped_mercos = clean_text(pedido.get("ped_mercos"))
    codigo_parceiro = clean_text(pedido.get("codigo_parceiro"))
    parceiro = clean_text(pedido.get("parceiro"))
    cidade = clean_text(pedido.get("cidade"))
    return "|".join((ped_mercos, codigo_parceiro, parceiro, cidade))


def normalize_webhook_item(raw: dict[str, Any]) -> dict[str, Any] | None:
    explicit_sku = clean_text(raw.get("sku") or raw.get("codProduto") or raw.get("codigoProduto"))
    sku, descricao = split_product_label(raw.get("produto") or raw.get("descricao") or raw.get("descricaoProduto"))
    sku = explicit_sku or sku
    descricao = clean_text(raw.get("descricao") or raw.get("descricaoProduto") or descricao)
    unidade = clean_text(raw.get("und") or raw.get("unidade") or "UN").upper() or "UN"
    quantidade_neg = parse_number(
        raw.get("qtd_neg")
        or raw.get("quantidade_neg")
        or raw.get("qtdNeg")
        or raw.get("quantidade")
        or raw.get("quantity_total")
    )
    quantidade_vol = parse_number(raw.get("qtd_vol") or raw.get("quantidade_vol") or raw.get("qtdVol"))
    quantity_total = parse_number(raw.get("quantity_total") or raw.get("quantidade") or quantidade_neg or quantidade_vol)
    if not sku and not descricao:
        return None
    produto = f"{sku} - {descricao}".strip(" -") if sku else descricao
    return {
        "sku": sku,
        "descricao": descricao or produto,
        "produto": produto,
        "unidade": unidade,
        "tipo_produto": clean_text(raw.get("tipo_produto") or raw.get("tipoProduto") or "PRODUTO ACABADO") or "PRODUTO ACABADO",
        "quantidade": quantity_total,
        "quantidade_neg": quantidade_neg,
        "quantidade_vol": quantidade_vol,
        "quantity_total": quantity_total,
    }


def webhook_item_key(item: dict[str, Any]) -> str:
    sku = clean_text(item.get("sku"))
    unidade = clean_text(item.get("unidade") or "UN").upper() or "UN"
    descricao = clean_text(item.get("descricao") or item.get("produto"))
    if sku:
        return "|".join((sku, unidade))
    return "|".join((descricao, unidade))


def consolidate_webhook_pedidos(pedidos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    ordered_keys: list[str] = []
    for pedido in pedidos:
        key = webhook_pedido_key(pedido)
        if not key.strip("|"):
            continue
        normalized = {
            "numero_unico": clean_text(pedido.get("numero_unico")),
            "ped_mercos": clean_text(pedido.get("ped_mercos")),
            "codigo_parceiro": clean_text(pedido.get("codigo_parceiro")),
            "parceiro": clean_text(pedido.get("parceiro")),
            "cidade": clean_text(pedido.get("cidade")),
            "valor_total": round(parse_number(pedido.get("valor_total")), 2),
        }
        if key not in merged:
            merged[key] = normalized
            ordered_keys.append(key)
            continue
        current = merged[key]
        for field in ("numero_unico", "ped_mercos", "codigo_parceiro", "parceiro", "cidade"):
            if not current.get(field) and normalized.get(field):
                current[field] = normalized[field]
        current["valor_total"] = max(parse_number(current.get("valor_total")), normalized["valor_total"])
    return [merged[key] for key in ordered_keys]


def consolidate_webhook_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    ordered_keys: list[str] = []
    for item in items:
        key = webhook_item_key(item)
        if not key.strip("|"):
            continue
        normalized = {
            "sku": clean_text(item.get("sku")),
            "descricao": clean_text(item.get("descricao") or item.get("produto") or item.get("sku")),
            "produto": clean_text(item.get("produto") or item.get("descricao") or item.get("sku")),
            "unidade": clean_text(item.get("unidade") or "UN").upper() or "UN",
            "tipo_produto": clean_text(item.get("tipo_produto") or "PRODUTO ACABADO") or "PRODUTO ACABADO",
            "quantidade": parse_number(item.get("quantidade") or item.get("quantity_total")),
            "quantidade_neg": parse_number(item.get("quantidade_neg")),
            "quantidade_vol": parse_number(item.get("quantidade_vol")),
            "quantity_total": parse_number(item.get("quantity_total") or item.get("quantidade")),
        }
        if key not in merged:
            merged[key] = normalized
            ordered_keys.append(key)
            continue
        current = merged[key]
        for field in ("descricao", "produto", "unidade", "tipo_produto"):
            if not current.get(field) and normalized.get(field):
                current[field] = normalized[field]
        for field in ("quantidade", "quantidade_neg", "quantidade_vol", "quantity_total"):
            current[field] = round(parse_number(current.get(field)) + normalized[field], 6)

    consolidated: list[dict[str, Any]] = []
    for key in ordered_keys:
        item = merged[key]
        fallback_total = parse_number(item.get("quantity_total")) or parse_number(item.get("quantidade")) or parse_number(item.get("quantidade_neg"))
        item["quantity_total"] = round(fallback_total, 6)
        if parse_number(item.get("quantidade")) == 0:
            item["quantidade"] = item["quantity_total"]
        if parse_number(item.get("quantidade_neg")) == 0:
            item["quantidade_neg"] = item["quantity_total"]
        consolidated.append(item)
    return consolidated


def _build_document_kind_hint(record: dict[str, Any], container: dict[str, Any]) -> str:
    return " ".join(
        clean_text(value)
        for value in (
            record.get("document_kind"),
            container.get("document_kind"),
            record.get("status"),
            container.get("status"),
            record.get("situacao"),
            container.get("situacao"),
            record.get("tipo_documento"),
            record.get("tipoDocumento"),
            container.get("tipo_documento"),
            container.get("tipoDocumento"),
            record.get("faturamento_status"),
            record.get("billing_status"),
            record.get("file_name"),
            record.get("file"),
        )
        if clean_text(value)
    )


def normalize_webhook_romaneios(payload: Any) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for record in extract_response_records(payload):
        container = record.get("pdf_romaneio") if isinstance(record.get("pdf_romaneio"), dict) else record
        if not isinstance(container, dict):
            continue

        file_name = clean_text(
            find_first_value(record, FILE_NAME_KEYS)
            or find_first_value(container, FILE_NAME_KEYS)
            or f"webhook-romaneio.json"
        )
        romaneio_code = normalize_romaneio_identity(
            find_first_value(record, ROMANEIO_CODE_KEYS)
            or find_first_value(container, ROMANEIO_CODE_KEYS)
            or file_name
        )
        if not romaneio_code:
            raise RuntimeError(
                "O webhook de romaneios precisa informar o código do romaneio/ordem ou um nome de arquivo como 'ROMANEIO 556.pdf'."
            )

        pedidos_raw = container.get("tabela_pedidos") or container.get("pedidos") or []
        itens_raw = container.get("tabela_itens_do_caminhao") or container.get("itens") or []
        pedidos = consolidate_webhook_pedidos(
            [pedido for pedido in (normalize_webhook_pedido(item) for item in pedidos_raw if isinstance(item, dict)) if pedido]
        )
        itens = consolidate_webhook_items(
            [item for item in (normalize_webhook_item(entry) for entry in itens_raw if isinstance(entry, dict)) if item]
        )

        total_geral = round(
            parse_number(container.get("valor_total_da_carga") or container.get("valor_total") or container.get("total_geral"))
            or round(sum(parse_number(pedido.get("valor_total")) for pedido in pedidos), 2),
            2,
        )
        cidade = clean_text(container.get("cidade") or (pedidos[0].get("cidade") if pedidos else ""))

        normalized.append(
            {
                "ordem_carga": romaneio_code,
                "romaneio_identity": romaneio_code,
                "document_kind": normalize_document_kind(_build_document_kind_hint(record, container)),
                "empresa": clean_text(find_first_value(record, COMPANY_CODE_KEYS) or find_first_value(container, COMPANY_CODE_KEYS)),
                "nome_empresa": clean_text(find_first_value(record, COMPANY_NAME_KEYS) or find_first_value(container, COMPANY_NAME_KEYS)),
                "cidade": cidade,
                "pedidos": pedidos,
                "montante": int(parse_number(container.get("montante_total_quantidade") or container.get("montante"))) or len(pedidos),
                "total_geral": total_geral,
                "itens": itens,
                "file": clean_text(file_name or f"webhook-romaneio-{romaneio_code}.json"),
                "files": [clean_text(file_name or f"webhook-romaneio-{romaneio_code}.json")],
                "text_length": len(json.dumps(container, ensure_ascii=False)),
                "source_origin": "n8n_webhook",
            }
        )

    return normalized

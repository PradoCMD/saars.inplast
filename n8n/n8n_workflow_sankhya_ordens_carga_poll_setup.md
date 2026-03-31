# Setup do workflow de polling de Ordens de Carga do Sankhya

Arquivos:

- `n8n/n8n_workflow_sankhya_ordens_carga_poll.json`
- `scripts/sankhya_ordens_carga_poll.py`

## Objetivo

Consultar periodicamente o endpoint oficial de Ordens de Carga do Sankhya e transformar a resposta no mesmo contrato de romaneio usado pelo PCP.

Esse fluxo escreve no Postgres pela funcao:

- `ops.ingest_romaneio_event_payload(...)`

## Endpoint oficial usado

Lista de ordens:

- `GET https://api.sankhya.com.br/v1/logistica/ordens-carga`

Opcionalmente, o script tambem suporta:

- detalhe da ordem por template de URL
- consulta complementar de pedidos por template de URL

## Variaveis esperadas no `n8n`

- `PCP_REPO_ROOT=/opt/saars.inplast`
- `SANKHYA_AUTHORIZATION=Bearer SEU_TOKEN`
- `SANKHYA_ORDENS_CARGA_LIST_URL=https://api.sankhya.com.br/v1/logistica/ordens-carga`
- `SANKHYA_ORDENS_CARGA_DETAIL_URL_TEMPLATE=https://api.sankhya.com.br/v1/logistica/empresas/{codigoEmpresa}/ordens-carga/{codigoOrdemCarga}`
- `SANKHYA_ORDENS_CARGA_PEDIDOS_URL_TEMPLATE=`
- `SANKHYA_CODIGO_EMPRESA=`
- `SANKHYA_ORDENS_CARGA_MODIFIED_SINCE=`
- `SANKHYA_ORDENS_CARGA_PAGE=1`
- `SANKHYA_ORDENS_CARGA_MAX_PAGES=1`
- `SANKHYA_ORDENS_CARGA_INCLUDE_EMPTY_ITEMS=false`

## Como o fluxo funciona

1. dispara manualmente ou a cada 15 minutos
2. executa o script `scripts/sankhya_ordens_carga_poll.py`
3. o script consulta a lista de ordens de carga
4. se existir template de detalhe, consulta cada ordem individualmente
5. se existir template de pedidos, consulta os pedidos por ordem
6. normaliza tudo para payloads no formato:

```json
{
  "event_id": "romaneio_sankhya_webhook:598:20260331T120000",
  "event_type": "update",
  "event_at": "2026-03-31T12:00:00+00:00",
  "romaneio": {
    "codigo": "598",
    "empresa": "1",
    "status": "aberto",
    "pedido": "42620",
    "parceiro": "CLIENTE XPTO",
    "cidade": "MACEIO",
    "valor_total": 7723.31,
    "itens": [
      {
        "sku": "4300001",
        "descricao": "MANGUEIRA LISA 1 25MM C 100M",
        "produto": "4300001 - MANGUEIRA LISA 1 25MM C 100M",
        "unidade": "PC",
        "tipo_produto": "PRODUTO ACABADO",
        "quantidade": 150,
        "quantidade_neg": 150,
        "quantidade_vol": 0,
        "quantity_total": 150
      }
    ]
  }
}
```

7. monta uma unica query SQL com todos os eventos
8. grava tudo em `ops.ingest_romaneio_event_payload(...)`

## Observacao importante

O endpoint de lista sozinho pode nao trazer os itens do romaneio.

Se isso acontecer no seu tenant:

- mantenha o endpoint de lista para descobrir as ordens alteradas
- preencha `SANKHYA_ORDENS_CARGA_DETAIL_URL_TEMPLATE`
- e, se necessario, `SANKHYA_ORDENS_CARGA_PEDIDOS_URL_TEMPLATE`

Se ainda assim os itens nao vierem, o fluxo vai devolver avisos em `summary.warnings` e pode terminar com `event_count=0`.

## Importacao

1. criar um novo workflow no `n8n`
2. importar `n8n/n8n_workflow_sankhya_ordens_carga_poll.json`
3. configurar a credencial do node `Postgres | Ingest Romaneio Event`
4. preencher as variaveis de ambiente acima
5. testar primeiro com o workflow `inactive`

## Teste manual sugerido

Rode pelo `Manual Trigger`.

Resultado esperado:

- `status=processed` quando houver payloads com itens
- `status=noop` quando a consulta nao trouxer eventos utilizaveis

## Leitura do resultado

O node final devolve:

- `event_count`
- `results`
- `summary`

Dentro de `summary`, acompanhe:

- `orders_seen`
- `events_built`
- `detail_calls`
- `pedidos_calls`
- `warnings`

## Consultas uteis

Ultimos eventos de romaneio:

```sql
select
  event_key,
  status,
  reference_at,
  run_id,
  received_at,
  finished_at,
  error_message
from ops.webhook_event
order by received_at desc
limit 20;
```

Linhas atuais de demanda:

```sql
select
  d.snapshot_at,
  d.romaneio_code,
  p.sku,
  p.description,
  d.quantity,
  d.company_code
from core.vw_romaneio_line_current d
join core.product p on p.product_id = d.product_id
where d.source_id = (
  select source_id
  from ops.source_registry
  where source_code = 'romaneio_sankhya_webhook'
)
order by d.snapshot_at desc, d.romaneio_code, p.description;
```

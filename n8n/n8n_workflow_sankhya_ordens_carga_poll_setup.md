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
- `SANKHYA_ORDENS_CARGA_LIST_URL=https://api.sankhya.com.br/v1/logistica/ordens-carga`
- `SANKHYA_ORDENS_CARGA_DETAIL_URL_TEMPLATE=https://api.sankhya.com.br/v1/logistica/empresas/{codigoEmpresa}/ordens-carga/{codigoOrdemCarga}`
- `SANKHYA_ORDENS_CARGA_PEDIDOS_URL_TEMPLATE=`
- `SANKHYA_CODIGO_EMPRESA=`
- `SANKHYA_ORDENS_CARGA_MODIFIED_SINCE=`
- `SANKHYA_ORDENS_CARGA_PAGE=0`
- `SANKHYA_ORDENS_CARGA_MAX_PAGES=1`
- `SANKHYA_ORDENS_CARGA_INCLUDE_EMPTY_ITEMS=false`

Opcional de fallback:

- `SANKHYA_AUTHORIZATION=Bearer ...`

Esse fallback so vale se voce quiser testar manualmente sem reaproveitar o seu node de autenticacao.

## Token de autenticacao

Este workflow foi ajustado para receber o bearer do node anterior.

Ou seja:

- se voce ja tem um `HTTP Request` que autentica no Sankhya, mantenha esse node
- conecte a saida dele no node `Build Poll Config`
- o `Build Poll Config` aceita estes formatos de entrada:
  - `access_token`
  - `accessToken`
  - `token`
  - `authorization`
  - `Authorization`
  - `bearer`
  - `bearer_token`
  - `bearerToken`
  - e os mesmos campos dentro de `data`

Se o node anterior ja devolver o valor completo `Bearer ...`, o workflow usa direto.

Se o node anterior devolver so o token puro, o workflow monta `Bearer <token>` automaticamente.

## Formato real da resposta de lista

No payload real que voce trouxe, a lista vem assim:

- um array externo
- dentro dele um objeto com `ordensCarga`
- e `pagination.hasMore`

O parser foi ajustado para esse formato e para paginacao zero-based:

- `pagination.page` começa em `0`
- por isso o default recomendado e `SANKHYA_ORDENS_CARGA_PAGE=0`
- se `pagination.hasMore=true`, aumente `SANKHYA_ORDENS_CARGA_MAX_PAGES` para buscar as paginas seguintes

## Como o fluxo funciona

1. dispara manualmente ou a cada 15 minutos
2. recebe o bearer do seu node de autenticacao
3. executa o script `scripts/sankhya_ordens_carga_poll.py`
4. o script consulta a lista de ordens de carga
5. se existir template de detalhe, consulta cada ordem individualmente
6. se existir template de pedidos, consulta os pedidos por ordem
7. normaliza tudo para payloads no formato:

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

8. monta uma unica query SQL com todos os eventos
9. grava tudo em `ops.ingest_romaneio_event_payload(...)`

## Autenticacao oficial da Sankhya

Se voce precisar montar ou revisar o node de autenticacao, a documentacao oficial da Sankhya recomenda OAuth 2.0 `client_credentials` em:

- [Autenticação com OAuth 2.0 (Client Credentials)](https://developer.sankhya.com.br/reference/post_authenticate)

Essa chamada usa:

- `POST https://api.sankhya.com.br/authenticate`
- header `X-Token`
- body `grant_type=client_credentials`
- body `client_id`
- body `client_secret`

Mas esse node nao precisa ficar dentro deste workflow de polling se voce ja possui um fluxo/autenticacao pronta no n8n.

## Observacao importante

O endpoint de lista sozinho pode nao trazer os itens do romaneio.

E foi exatamente isso que apareceu no seu retorno: vieram os cabecalhos das ordens, mas nao vieram os produtos/itens.

Se isso acontecer no seu tenant:

- mantenha o endpoint de lista para descobrir as ordens alteradas
- preencha `SANKHYA_ORDENS_CARGA_DETAIL_URL_TEMPLATE`
- e, se necessario, `SANKHYA_ORDENS_CARGA_PEDIDOS_URL_TEMPLATE`

Se ainda assim os itens nao vierem, o fluxo vai devolver avisos em `summary.warnings` e pode terminar com `event_count=0`.

## Importacao

1. criar um novo workflow no `n8n`
2. importar `n8n/n8n_workflow_sankhya_ordens_carga_poll.json`
3. encaixar o seu node de autenticacao antes do node `Build Poll Config`
4. configurar a credencial do node `Postgres | Ingest Romaneio Event`
5. preencher as variaveis de ambiente acima
6. testar primeiro com o workflow `inactive`

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

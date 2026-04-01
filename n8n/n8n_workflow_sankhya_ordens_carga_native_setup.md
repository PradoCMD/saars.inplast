# Setup do workflow nativo de Ordens de Carga do Sankhya

Arquivos:

- `n8n/n8n_workflow_sankhya_ordens_carga_native.json`
- `n8n/n8n_workflow_sankhya_webhook_romaneio.json`

## Objetivo

Consultar periodicamente as Ordens de Carga no Sankhya usando apenas nodes nativos do `n8n`, sem `Execute Command`, e montar o romaneio em duas etapas:

- listar as ordens
- listar os pedidos de cada ordem pela API de logística
- detalhar cada pedido em `vendas/pedidos` usando o `codigoPedido` retornado pela etapa anterior

Esse fluxo grava no Postgres pela funcao:

- `ops.ingest_romaneio_event_payload(...)`

## Endpoints usados

- lista de ordens:
  - [GET /v1/logistica/ordens-carga](https://developer.sankhya.com.br/reference/getordenscarga)
- pedidos da ordem:
  - [GET /v1/logistica/empresas/{codigoEmpresa}/ordens-carga/{codigoOrdemCarga}/pedidos](https://developer.sankhya.com.br/reference/getpedidosbyordemcarga)
- detalhe do pedido:
  - [GET /v1/vendas/pedidos](https://developer.sankhya.com.br/reference/getpedidos)
- autenticacao:
  - [POST /authenticate](https://developer.sankhya.com.br/reference/post_authenticate)

Observacao importante:

- no tenant validado, `v1/logistica/empresas/{codigoEmpresa}/ordens-carga/{codigoOrdemCarga}/pedidos` responde corretamente
- no mesmo tenant, `v1/vendas/pedidos?codigoEmpresa=<empresa>&codigoOrdemCarga=<ordem>` estava retornando `404 RESOURCE_NOT_FOUND`
- por isso o workflow nao tenta mais consultar `vendas/pedidos` direto pela ordem

## Estrutura do workflow

1. `Manual Trigger`
2. `Schedule Trigger`
3. `HTTP Request | Authenticate Sankhya`
4. `Build Config`
5. `HTTP Request | Lista Ordens`
6. `Expand Orders`
7. `HTTP Request | Pedidos da Ordem`
8. `Normalize Romaneio Event`
9. `Build Romaneio SQL`
10. `Postgres | Ingest Romaneio Event`
11. `Build Workflow Result`

## O que preencher apos importar

### 1. Node `HTTP Request | Authenticate Sankhya`

Preencha estes tres valores:

- header `X-Token`
- body `client_id`
- body `client_secret`

Se voce ja tiver um node de autenticacao pronto:

- pode remover esse node do workflow importado
- e ligar o seu node direto em `Build Config`

O `Build Config` aceita como entrada:

- `access_token`
- `accessToken`
- `token`
- `authorization`
- `Authorization`
- e os mesmos campos dentro de `data`

Se vier apenas o token puro, ele mesmo monta `Bearer <token>`.

### 2. Node `Build Config`

Abra o codigo e ajuste os defaults no `return`.

Campos mais importantes:

- `list_url`
- `pedidos_ordem_tpl`
- `pedidos_venda_url`
- `pedidos_page`
- `max_orders`
- `include_empty_items`
- `only_pending`
- `exclude_status`

Default atual:

```js
return [{ json: {
  source_code: 'romaneio_sankhya_webhook',
  workflow_name: 'PCP | 15A | Sankhya | Ordens de Carga Native',
  authorization,
  list_url: 'https://api.sankhya.com.br/v1/logistica/ordens-carga',
  pedidos_ordem_tpl: 'https://api.sankhya.com.br/v1/logistica/empresas/{emp}/ordens-carga/{id}/pedidos',
  pedidos_venda_url: 'https://api.sankhya.com.br/v1/vendas/pedidos',
  pedidos_page: 1,
  max_orders: 25,
  include_empty_items: false,
  only_pending: true,
  exclude_status: ['entregue', 'finalizada', 'finalizado', 'fechada', 'fechado', 'cancelada', 'cancelado', 'concluida', 'concluido']
}}];
```

Para carga historica:

- aumente `max_orders`

Para polling de producao:

- mantenha `only_pending: true`
- mantenha `max_orders` baixo

## Comportamento atual

Esse workflow:

- autentica
- busca a lista de ordens de carga
- explode uma ordem por item de execucao
- consulta `GET /v1/logistica/empresas/{codigoEmpresa}/ordens-carga/{codigoOrdemCarga}/pedidos`
- recebe os `codigoPedido` da ordem
- para cada `codigoPedido`, consulta `GET /v1/vendas/pedidos?page=1&codigoEmpresa=<empresa>&codigoNota=<codigoPedido>`
- se necessario, faz fallback para `numeroNota=<numeroPedido>`
- consolida `registros[].itens`
- normaliza para o contrato do PCP
- grava cada evento via `ops.ingest_romaneio_event_payload(...)`

## Metadata util para debug

O node `Normalize Romaneio Event` devolve em `meta`:

- `pedidos_ordem_url`
- `pedidos_ordem_status_code`
- `pedidos_ordem_ok`
- `pedidos_ordem_count`
- `pedidos_ordem_payload`
- `pedidos_venda_lookup_results`
- `pedidos_count`
- `pedidos_codigos`
- `order_row`

Isso ajuda a distinguir:

- falha na listagem de pedidos da ordem
- falha no detalhe do pedido em `vendas/pedidos`
- ordem sem itens aproveitaveis

## Regra de filtragem

Quando `include_empty_items=false`:

- se nenhuma consulta de detalhe trouxer `registros[].itens`, a ordem e filtrada
- e nada sera gravado para aquela ordem

Quando `include_empty_items=true`:

- o evento sai mesmo sem itens, o que pode ser util para diagnostico

## Teste manual recomendado

1. deixe `max_orders=1`
2. execute pelo `Manual Trigger`
3. confira a saida do node `HTTP Request | Lista Ordens`
4. confira a saida do node `HTTP Request | Pedidos da Ordem`
5. confira a saida do node `Normalize Romaneio Event`
6. confira em `meta.pedidos_venda_lookup_results` qual query trouxe registros

Resultado esperado:

- `Build Workflow Result.ok=true` quando existir ao menos um pedido detalhado com itens
- ou nenhum item saindo de `Normalize Romaneio Event` se a ordem nao tiver itens aproveitaveis e `include_empty_items=false`

## Credencial do Postgres

Depois de importar:

1. abra o node `Postgres | Ingest Romaneio Event`
2. configure a conexao para o banco operacional do PCP
3. salve antes do primeiro teste

## Consultas uteis

Ultimos eventos ingeridos:

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
where source_id = (
  select source_id
  from ops.source_registry
  where source_code = 'romaneio_sankhya_webhook'
)
order by received_at desc
limit 20;
```

Demanda atual de romaneios:

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

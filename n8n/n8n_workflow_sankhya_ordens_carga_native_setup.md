# Setup do workflow nativo de Ordens de Carga do Sankhya

Arquivos:

- `n8n/n8n_workflow_sankhya_ordens_carga_native.json`
- `n8n/n8n_workflow_sankhya_webhook_romaneio.json`

## Objetivo

Consultar periodicamente as Ordens de Carga no Sankhya usando apenas nodes nativos do `n8n`, sem `Execute Command` e sem depender de `$env` dentro de `Code` nodes, cruzando a lista de ordens com os pedidos de venda para obter os itens.

Esse fluxo grava no Postgres pela funcao:

- `ops.ingest_romaneio_event_payload(...)`

## Endpoints oficiais usados

- lista de ordens:
  - [GET /v1/logistica/ordens-carga](https://developer.sankhya.com.br/reference/getordenscarga)
- pedidos de venda:
  - [GET /v1/vendas/pedidos](https://developer.sankhya.com.br/reference/getpedidos)
- referencia adicional de logística:
  - [GET /v1/logistica/empresas/{codigoEmpresa}/ordens-carga/{codigoOrdemCarga}/pedidos/{codigoPedido}](https://developer.sankhya.com.br/reference/getpedidosbyordemcarga)
- autenticacao:
  - [POST /authenticate](https://developer.sankhya.com.br/reference/post_authenticate)

## Estrutura do workflow

O fluxo importado fica assim:

1. `Manual Trigger`
2. `Schedule Trigger`
3. `Merge Triggers`
4. `HTTP Request | Authenticate Sankhya`
5. `Build Config and Pages`
6. `HTTP Request | Lista Ordens`
7. `Expand Orders`
8. `HTTP Request | Pedidos Venda`
9. `Normalize Romaneio Event`
10. `Build Romaneio SQL`
11. `Postgres | Ingest Romaneio Event`
12. `Build Workflow Result`

## O que preencher apos importar

### 1. Node `HTTP Request | Authenticate Sankhya`

Preencha estes tres valores:

- header `X-Token`
- body `client_id`
- body `client_secret`

Se voce ja tiver um node de autenticacao pronto:

- pode remover esse node do workflow importado
- e ligar o seu node direto em `Build Config and Pages`

O `Build Config and Pages` aceita como entrada:

- `access_token`
- `accessToken`
- `token`
- `authorization`
- `Authorization`
- e os mesmos campos dentro de `data`

Se vier apenas o token puro, ele mesmo monta `Bearer <token>`.

### 2. Node `Build Config and Pages`

Abra o codigo e ajuste o objeto `CONFIG` no topo.

Campos mais importantes:

- `list_url`
- `pedidos_url`
- `codigo_empresa`
- `modified_since`
- `start_page`
- `max_pages`
- `pedidos_page`
- `include_empty_items`

Default atual:

```js
const CONFIG = {
  source_code: 'romaneio_sankhya_webhook',
  workflow_name: 'PCP | 15A | Sankhya | Ordens de Carga Native',
  list_url: 'https://api.sankhya.com.br/v1/logistica/ordens-carga',
  pedidos_url: 'https://api.sankhya.com.br/v1/vendas/pedidos',
  codigo_empresa: '',
  modified_since: '',
  start_page: 0,
  max_pages: 3,
  pedidos_page: 1,
  include_empty_items: false
};
```

## Formato real da resposta de lista

O parser desse workflow ja foi preparado para o payload real que voce trouxe:

- array externo
- objeto interno com `ordensCarga`
- paginacao em `pagination`
- `pagination.page` com base `0`
- `pagination.hasMore`

Por isso o `start_page` default ficou em `0`.

## Comportamento atual

Esse workflow:

- autentica
- busca a lista paginada de ordens
- explode uma ordem por item de execucao
- consulta `vendas/pedidos` filtrando por `codigoEmpresa` e `codigoOrdemCarga`
- consolida `registros[].itens`
- normaliza para o contrato do PCP
- grava cada evento via `ops.ingest_romaneio_event_payload(...)`

## Observacao importante

O endpoint de lista de ordens continua trazendo apenas o cabecalho do romaneio.

Por isso o workflow passa a depender de `HTTP Request | Pedidos Venda` para achar os itens.

Se o seu tenant nao aceitar o filtro por `codigoOrdemCarga` no endpoint `vendas/pedidos`:

- use como fallback o endpoint de logística de pedidos da ordem
- e depois refinamos o fluxo para uma segunda consulta por pedido

Se `vendas/pedidos` voltar sem `registros[].itens`:

- o node `Normalize Romaneio Event` vai filtrar a ordem
- e nada sera gravado para aquela ordem quando `include_empty_items=false`

## Credencial do Postgres

Depois de importar:

1. abra o node `Postgres | Ingest Romaneio Event`
2. configure a conexao para o banco operacional do PCP
3. salve antes do primeiro teste

## Teste manual recomendado

1. deixe `max_pages=1`
2. execute pelo `Manual Trigger`
3. confira a saida do node `HTTP Request | Lista Ordens`
4. confira a saida do node `HTTP Request | Pedidos Venda`
5. confira a saida do node `Normalize Romaneio Event`

Resultado esperado:

- `Build Workflow Result.ok=true` quando `registros[].itens` vierem preenchidos
- ou nenhum item saindo de `Normalize Romaneio Event` se os pedidos vierem sem itens

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

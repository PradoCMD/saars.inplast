# Setup do workflow nativo de Ordens de Carga do Sankhya

Arquivos:

- `n8n/n8n_workflow_sankhya_ordens_carga_native.json`
- `n8n/n8n_workflow_sankhya_webhook_romaneio.json`

## Objetivo

Consultar periodicamente as Ordens de Carga no Sankhya usando apenas nodes nativos do `n8n`, sem `Execute Command` e sem depender de `$env` dentro de `Code` nodes, cruzando a lista de ordens com o `loadRecords` de `CabecalhoNota` para descobrir as notas vinculadas e, depois, buscando os itens reais em `vendas/pedidos`.

Esse fluxo grava no Postgres pela funcao:

- `ops.ingest_romaneio_event_payload(...)`

## Endpoints oficiais usados

- lista de ordens:
  - [GET /v1/logistica/ordens-carga](https://developer.sankhya.com.br/reference/getordenscarga)
- consultas genericas:
  - [GET /loadRecords](https://developer.sankhya.com.br/reference/get_loadrecords)
- pedidos de venda:
  - [GET /v1/vendas/pedidos](https://developer.sankhya.com.br/reference/getpedidos)
- referencia adicional de logística:
  - [GET /v1/logistica/empresas/{codigoEmpresa}/ordens-carga/{codigoOrdemCarga}/pedidos/{codigoPedido}](https://developer.sankhya.com.br/reference/getpedidosbyordemcarga)
- referencias legadas uteis:
  - [Consulta de Ordens de Carga](https://developer.sankhya.com.br/reference/get_ordemcarga)
  - [Vincular de Ordem de Carga](https://developer.sankhya.com.br/reference/post_vincularordemcarga)
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
8. `HTTP Request | Notas Vinculadas (loadRecords)`
9. `Expand Notas Vinculadas`
10. `HTTP Request | Pedidos Venda`
11. `Attach Pedido Context`
12. `Normalize Romaneio Event`
13. `Build Romaneio SQL`
14. `Postgres | Ingest Romaneio Event`
15. `Build Workflow Result`

Os modos dos `Code` nodes ja ficam definidos no JSON importado:

- `Build Config and Pages`: `Run Once for All Items`
- `Expand Orders`: `Run Once for Each Item`
- `Expand Notas Vinculadas`: `Run Once for Each Item`
- `Attach Pedido Context`: `Run Once for Each Item`
- `Normalize Romaneio Event`: `Run Once for All Items`
- `Build Romaneio SQL`: `Run Once for Each Item`
- `Build Workflow Result`: `Run Once for Each Item`

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
- `loadrecords_url`
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
  loadrecords_url: 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
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
- consulta `CabecalhoNota` via `loadRecords` usando `CODEMP` e `ORDEMCARGA`
- expande as `NUNOTA` vinculadas a cada ordem
- consulta `vendas/pedidos` usando `codigoNota=NUNOTA`
- consolida `registros[].itens` de todas as notas da ordem
- normaliza para o contrato do PCP
- grava cada evento via `ops.ingest_romaneio_event_payload(...)`

## Observacao importante

O endpoint de lista de ordens continua trazendo apenas o cabecalho do romaneio.

Por isso o workflow passa a depender de uma ponte em duas etapas:

- `loadRecords(CabecalhoNota)` para encontrar as notas vinculadas por `ORDEMCARGA`
- `vendas/pedidos?codigoNota=...` para trazer os itens reais

Essa ponte foi validada no tenant da Inplast com a ordem `298`, retornando `NUNOTA 28269` e `31016`.

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
4. confira a saida do node `HTTP Request | Notas Vinculadas (loadRecords)`
5. confira a saida do node `Expand Notas Vinculadas`
6. confira a saida do node `HTTP Request | Pedidos Venda`
7. confira a saida do node `Normalize Romaneio Event`

Resultado esperado:

- `Build Workflow Result.ok=true` quando as notas vinculadas forem encontradas e `registros[].itens` vierem preenchidos
- ou nenhum item saindo de `Normalize Romaneio Event` se a ordem nao tiver `CabecalhoNota` vinculada ou se os pedidos vierem sem itens

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

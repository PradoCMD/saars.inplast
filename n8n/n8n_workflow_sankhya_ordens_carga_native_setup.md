# Setup do workflow nativo de Ordens de Carga do Sankhya

Arquivos:

- `n8n/n8n_workflow_sankhya_ordens_carga_native.json`
- `n8n/n8n_workflow_sankhya_webhook_romaneio.json`

## Objetivo

Consultar periodicamente as Ordens de Carga no Sankhya usando apenas nodes nativos do `n8n`, sem `Execute Command`, e montar o romaneio na ordem mais aderente ao SQL do ERP:

- listar as ordens
- consultar o catalogo de produtos em `Produto` para validar `CODPROD`, descricao, unidade e `M3`
- consultar as notas da ordem em `CabecalhoNota` para obter `NUNOTA` e `NUMNOTA`
- consultar os itens de cada nota em `ItemNota`
- cruzar `ItemNota + Produto + CabecalhoNota` para gerar o romaneio

Esse fluxo grava no Postgres pela funcao:

- `ops.ingest_romaneio_event_payload(...)`

## Endpoints usados

- lista de ordens:
  - [GET /v1/logistica/ordens-carga](https://developer.sankhya.com.br/reference/getordenscarga)
- catalogo de produtos, notas e itens:
  - [CRUDServiceProvider.loadRecords](https://developer.sankhya.com.br/reference/get_loadrecords)
- autenticacao:
  - [POST /authenticate](https://developer.sankhya.com.br/reference/post_authenticate)

Observacao importante:

- para esse fluxo, a cadeia mais confiavel ficou:
  - `Produto -> CabecalhoNota -> ItemNota -> Ordem de Carga`
- em termos de cruzamento de dados, o romaneio final sai de:
  - `TGFPRO + TGFITE + TGFCAB`
- isso espelha a consulta SQL usada no ERP e evita depender de rotas intermediarias que podem responder com `404` ou sem itens

## Estrutura do workflow

1. `Manual Trigger`
2. `Schedule Trigger`
3. `HTTP Request | Authenticate Sankhya`
4. `Build Config`
5. `HTTP Request | Lista Ordens`
6. `Expand Orders`
7. `Normalize Romaneio Event`
8. `Build Romaneio SQL`
9. `Postgres | Ingest Romaneio Event`
10. `Build Workflow Result`

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
- `loadrecords_url`
- `max_orders`
- `max_product_pages`
- `max_note_pages`
- `max_item_pages`
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
  loadrecords_url: 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
  max_orders: 25,
  max_product_pages: 40,
  max_note_pages: 10,
  max_item_pages: 10,
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
- carrega o catalogo de produtos em `Produto` e monta um mapa por `CODPROD`
- para cada ordem, consulta `CabecalhoNota` com filtro `CODEMP + ORDEMCARGA`
- recebe os `NUNOTA` e `NUMNOTA` vinculados a ordem
- para cada `NUNOTA`, consulta `ItemNota`
- cruza cada item com o catalogo de produtos para completar `DESCRPROD`, `CODVOL` e `M3`
- monta os itens com base no desenho SQL `TGFPRO + TGFITE + TGFCAB`
- normaliza para o contrato do PCP
- grava cada evento via `ops.ingest_romaneio_event_payload(...)`
- quando uma ordem vier sem itens e `include_empty_items=false`, o workflow nao some mais: ele sai com `noop`

## Metadata util para debug

O node `Normalize Romaneio Event` devolve em `meta`:

- `produtos_catalogo_count`
- `produtos_catalogo_debug`
- `notas_cabecalho_count`
- `notas_cabecalho_debug`
- `notas_codigos`
- `notas_vinculadas_rows`
- `itemnota_debug`
- `produtos_nao_localizados`
- `order_row`

Isso ajuda a distinguir:

- falha na carga do catalogo de produtos
- falha na consulta de `CabecalhoNota` por ordem
- falha no `loadRecords` de `ItemNota` por nota
- item cujo `CODPROD` nao foi localizado no catalogo
- ordem sem itens aproveitaveis mesmo com o detalhe do item consultado

## Regra de filtragem

Quando `include_empty_items=false`:

- se a ordem vier sem itens aproveitaveis, o `Build Romaneio SQL` devolve `noop`
- isso evita que o fluxo fique sem output e simplifica o debug

Quando `include_empty_items=true`:

- o evento segue com `should_ingest=true` mesmo sem itens
- isso pode ser util quando voce quiser gravar diagnostico no banco

## Teste manual recomendado

1. deixe `max_orders=1`
2. execute pelo `Manual Trigger`
3. confira a saida do node `HTTP Request | Lista Ordens`
4. confira a saida do node `Normalize Romaneio Event`
5. confira em `meta.produtos_catalogo_count` se o catalogo de produtos foi carregado
6. confira em `meta.notas_vinculadas_rows` quais notas a ordem retornou
7. confira em `meta.itemnota_debug` quais `NUNOTA` trouxeram linhas
8. confira em `meta.produtos_nao_localizados` se algum `CODPROD` nao bateu com o catalogo

Resultado esperado:

- `Build Workflow Result.ok=true` quando existir ao menos um item retornado por `loadRecords`
- `Build Workflow Result.ingest.status='noop'` quando a ordem vier sem itens aproveitaveis e `include_empty_items=false`

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

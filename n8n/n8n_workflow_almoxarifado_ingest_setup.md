# Setup do workflow novo de almoxarifado

Arquivo do workflow:

- `n8n/n8n_workflow_almoxarifado_ingest.json`

## Objetivo

Criar um fluxo novo no `n8n` para ingestao de:

- materia-prima
- componentes comprados

sem conflitar com o fluxo legado atual.

## Antes de importar

Garanta que o banco ja recebeu a versao atual de:

- `database/pcp_operacional_postgres.sql`

Ponto importante:

- esse SQL agora inclui `ops.ingest_inventory_payload(...)`
- e essa funcao e o ponto central do workflow

## Como importar

1. criar um novo workflow no `n8n`
2. importar o arquivo `n8n/n8n_workflow_almoxarifado_ingest.json`
3. configurar a credencial do node `Postgres | Ingest Inventory Payload`
4. abrir o node `Build Source Queue`
5. revisar os caminhos:
   - `workbook_path`
   - `parser_path`
   - `runner_path`

## Caminhos atuais no JSON

Hoje o workflow usa estas variaveis de ambiente no node `Build Source Queue`:

- `PCP_REPO_ROOT`
- `PCP_ALMOX_WORKBOOK`

Defaults incluidos:

- workbook:
  - `/data/ingest/Estoque Almoxarifado.xlsx`
- parser MP:
  - `$env.PCP_REPO_ROOT/parsers/parse_estoque_almoxarifado_mp.py`
- parser componentes:
  - `$env.PCP_REPO_ROOT/parsers/parse_estoque_almoxarifado_componentes.py`
- runner:
  - `$env.PCP_REPO_ROOT/parsers/run_inventory_parser.py`

Exemplo recomendado na `vm apps`:

- `PCP_REPO_ROOT=/opt/saars.inplast`
- `PCP_ALMOX_WORKBOOK=/data/ingest/Estoque Almoxarifado.xlsx`

Se o `n8n` estiver rodando em outra VM ou container, ajuste essas duas variaveis para o filesystem daquela instancia.

## O que o fluxo faz

1. dispara por `Manual Trigger` ou `Schedule Trigger`
2. monta duas cargas:
   - `estoque_materia_prima_almoxarifado`
   - `estoque_componente_almoxarifado`
3. executa o wrapper `run_inventory_parser.py`
4. recebe um envelope JSON com:
   - `source_code`
   - `snapshot_at`
   - `records`
   - `summary`
   - `meta`
5. monta o SQL de ingestao
6. chama `ops.ingest_inventory_payload(...)`

## Primeira execucao recomendada

1. deixar o workflow `inactive`
2. executar manualmente
3. conferir no banco:
   - `ops.ingestion_run`
   - `raw.landing_payload`
   - `core.inventory_snapshot`
   - `core.product`
   - `core.product_code`
4. validar se os `source_code` geraram linhas:
   - `estoque_materia_prima_almoxarifado`
   - `estoque_componente_almoxarifado`

## Consultas uteis

Ultimas execucoes:

```sql
select
  run_id,
  source_id,
  started_at,
  finished_at,
  status,
  record_count,
  error_message
from ops.ingestion_run
order by run_id desc
limit 20;
```

Ultimos snapshots de estoque do almoxarifado:

```sql
select
  i.snapshot_at,
  p.sku,
  p.description,
  i.stock_scope,
  i.location_code,
  i.quantity
from core.inventory_snapshot i
join core.product p on p.product_id = i.product_id
join ops.source_registry s on s.source_id = i.source_id
where s.source_code in (
  'estoque_materia_prima_almoxarifado',
  'estoque_componente_almoxarifado'
)
order by i.snapshot_at desc, p.description;
```

## Ajustes futuros esperados

- trocar a planilha de homologacao pela fonte real montada na VM Linux
- adicionar alerta se `summary.conflicts` vier com itens
- adicionar alerta se houver item com estoque negativo
- integrar esse workflow ao `PCP | 20 | Planejamento e Publicacao`

## Observacao

O fluxo novo foi pensado para rodar em paralelo com o legado.

Ou seja:

- nao substitui o atual ainda
- nao escreve no Excel
- nao depende do robo VBA

# Setup do workflow de estoque intermediario publicado

Arquivo:

- `n8n_workflow_estoque_intermediario_google_ingest.json`

Objetivo:

- ler a planilha publicada do Google Sheets
- recalcular o saldo a partir da aba `Movimentacoes`
- conferir contra a aba `Estoque`
- gravar em `ops.ingest_inventory_payload(...)`

## Variaveis esperadas no `n8n`

- `PCP_REPO_ROOT=/opt/saars.inplast`
- `PCP_INTERMEDIARIO_PUBLISHED_URL=https://docs.google.com/spreadsheets/d/e/2PACX-1vSs-C_7_vu6L1lq9ScJEcQNT3F23en4MdgHBUI2FFkqBm9c_Zq8WHdtZuXkMhQvcegp05KewJQzPlCP/pubhtml?widget=true&headers=false`

## Nodes

1. `Manual Trigger`
2. `Schedule Trigger`
3. `Merge Triggers`
4. `Build Source Queue`
5. `Run Parser Envelope`
6. `Parse Envelope`
7. `Build SQL`
8. `Postgres | Ingest Inventory Payload`
9. `Build Result`

## Fonte usada

- `source_code=estoque_intermediario_atual`

Mantive esse `source_code` para encaixar imediatamente no banco que ja esta rodando. Em uma segunda etapa, podemos renomear a fonte para algo como `estoque_intermediario_google_publicado`.

## Parser usado

- `parsers/parse_estoque_intermediario_google.py`

Ele usa somente leitura da publicacao e considera:

- `Movimentacoes` como dado bruto
- `Banco de dados` como de-para do codigo legado
- `Estoque` como conferencia do saldo consolidado

## Resultado esperado

- `core.inventory_snapshot` atualizado para `stock_scope='intermediario'`
- painel SaaS deixando de mostrar alerta da fonte `estoque_intermediario_atual`

## Observacao operacional

Essa fonte nao depende de Excel, macro ou PC ligado. A unica dependencia e a publicacao do Google Sheets continuar acessivel pela VM `apps`.

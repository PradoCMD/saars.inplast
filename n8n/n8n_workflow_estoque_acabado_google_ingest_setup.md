# Setup do workflow de estoque acabado publicado

Arquivo:

- `n8n_workflow_estoque_acabado_google_ingest.json`

Objetivo:

- ler a planilha publicada de estoque da expedicao
- recalcular saldo a partir das abas `Entrada` e `Saída`
- conferir contra a aba `Estoque`
- gravar em `ops.ingest_inventory_payload(...)`

## Variaveis esperadas no `n8n`

- `PCP_REPO_ROOT=/opt/saars.inplast`
- `PCP_ACABADO_PUBLISHED_URL=https://docs.google.com/spreadsheets/d/e/2PACX-1vRIlcxI2E0BRlf4i2M49MIW5XiLx69xWwkrLmst0Fs5HW5gSlk-wf8wAVjur7FH1mQRz_-qmUvZGJND/pubhtml?widget=true&headers=false`

## Fonte usada

- `source_code=estoque_acabado_atual`

## Parser usado

- `parsers/parse_estoque_acabado_google.py`

Ele considera:

- `Banco de Dados` como cadastro principal
- `Entrada` e `Saída` como movimentos brutos
- `Estoque` como conferência do consolidado

## Resultado esperado

- `core.inventory_snapshot` atualizado para `stock_scope='acabado'`
- painel SaaS deixando de mostrar alerta da fonte `estoque_acabado_atual`
- ETA dos romaneios passando a considerar estoque real de expedicao antes de cair em montagem

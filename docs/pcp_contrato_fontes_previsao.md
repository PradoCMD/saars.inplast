# Contrato das fontes de previsao operacional

Data: 2026-03-30

## Objetivo

Definir o formato minimo das fontes que alimentam a previsao de saida dos romaneios.

Essas fontes entram no banco pela tabela:

- `core.supply_forecast_snapshot`

## Regra principal

Cada linha representa um lote programado com data de disponibilidade.

Importante:

- um mesmo `sku` pode aparecer em varias linhas
- cada linha deve representar uma quantidade e uma data especifica
- a data deve ser de disponibilidade real para uso, nao apenas de inicio do processo

## Campos obrigatorios comuns

- `snapshot_at`
  - data/hora em que o extrato foi gerado
- `forecast_key`
  - identificador unico da linha de previsao
  - pode ser numero da ordem + sequencia da linha
- `sku`
  - codigo do item no cadastro oficial do PCP
- `available_at`
  - data/hora em que a quantidade ficara disponivel
- `quantity_planned`
  - quantidade liquida prevista para disponibilizacao
- `company_code`
  - empresa/planta responsavel

## Campos opcionais comuns

- `notes`
- `status_programacao`
- `resource_code`
- `resource_name`
- `order_code`
- `document_code`
- `turno`
- `responsavel`

Os opcionais podem ir para `meta_json`.

## Mapeamento para o banco

- `snapshot_at` -> `core.supply_forecast_snapshot.snapshot_at`
- `forecast_key` -> `core.supply_forecast_snapshot.forecast_key`
- `sku` -> `product_id` via `core.product`
- `available_at` -> `core.supply_forecast_snapshot.available_at`
- `quantity_planned` -> `core.supply_forecast_snapshot.quantity_planned`
- `notes` -> `core.supply_forecast_snapshot.notes`
- extras -> `core.supply_forecast_snapshot.meta_json`

O campo `action` nao precisa vir no arquivo se a fonte for segregada. Ele pode ser fixado pelo parser:

- previsao de montagem -> `montar`
- previsao de producao -> `produzir`
- previsao de compra -> `comprar`

## Fonte 1. Previsao de montagem

### Significado

Data em que o produto acabado ficara liberado apos a montagem.

### Unidade

- quantidade liquida pronta para expedicao/estoque

### Nao usar como `available_at`

- inicio da montagem
- data de apontamento parcial sem liberacao

### Campos recomendados

- `linha_montagem`
- `ordem_montagem`
- `status_programacao`

## Fonte 2. Previsao de producao

### Significado

Data em que o item intermediario ficara liberado para uso na montagem.

### Unidade

- quantidade liquida disponivel depois de perda/refugo esperado

### Nao usar como `available_at`

- inicio da injeção
- troca de molde
- previsão bruta antes de refugo

### Campos recomendados

- `maquina`
- `molde`
- `ordem_producao`
- `status_programacao`

## Fonte 3. Previsao de compra

### Significado

Data em que a materia-prima ou componente comprado estara fisicamente disponivel no almoxarifado.

### Unidade

- quantidade prevista para recebimento util

### Nao usar como `available_at`

- data de emissao do pedido
- data prometida sem confirmacao logistica

### Campos recomendados

- `pedido_compra`
- `fornecedor`
- `status_pedido`
- `documento_recebimento`

## Regras de qualidade minima

- `forecast_key` nao pode repetir dentro do mesmo `snapshot_at` e `source_code`
- `sku` deve existir no cadastro do PCP
- `quantity_planned` deve ser maior ou igual a zero
- `available_at` deve ser preenchido
- a data deve refletir disponibilidade real

## Como o sistema usa essas linhas

1. o sistema respeita a fila dos romaneios
2. consome primeiro o estoque atual
3. depois consome as linhas de previsao por ordem de `available_at`
4. a saida do romaneio vira a maior data entre os itens dele

## Quando a fonte ainda nao existir

Enquanto a programacao oficial nao estiver disponivel:

- montagem e producao podem usar fallback heuristico por tempo de processo
- compra continua como `sem_previsao` se nao houver data de recebimento confiavel

## Arquivos de template

- `source_templates/template_previsao_montagem.csv`
- `source_templates/template_previsao_producao.csv`
- `source_templates/template_previsao_compra.csv`

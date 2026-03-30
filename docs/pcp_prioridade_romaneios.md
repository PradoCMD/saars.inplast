# Prioridade dos romaneios

## Regra inicial

A fila de atendimento nasce com a regra:

- ordem por `data_evento` do pedido
- dentro da mesma data, ordem por `romaneio_code`
- atendimento respeitando disponibilidade real do estoque

Na pratica:

- se o item ja existe em estoque, ele atende imediatamente
- se faltar, entra na previsao de montagem, producao ou compra
- a data de saida do romaneio depende do item mais tardio necessario para fechar o pedido

## Regra ajustavel pelo PCP

O PCP pode alterar a prioridade operacional quando houver necessidade de:

- antecipar um romaneio critico
- postergar um romaneio por falta de programacao
- refletir mudancas na fila por programacao de montagem
- refletir mudancas na fila por programacao de producao

## Modelo tecnico

Tabela:

- `core.romaneio_priority_override`

View corrente:

- `core.vw_romaneio_priority_current`

Campos principais:

- `romaneio_code`
- `priority_rank`
- `reason`
- `effective_at`
- `is_active`
- `meta_json`

## Como interpretar

- romaneios sem override seguem a ordem cronologica padrao
- romaneios com `priority_rank` manual entram na fila conforme esse rank
- rank menor = maior prioridade
- o PCP pode usar rank alto para empurrar um romaneio para depois dos demais

## Efeito no ETA

As views:

- `mart.vw_romaneio_eta_line_current`
- `mart.vw_romaneio_eta_current`

passam a calcular alocacao e previsao com base nessa fila ajustada.

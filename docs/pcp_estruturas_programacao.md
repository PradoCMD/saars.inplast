# Estruturas e programacao do PCP

## Objetivo

Deixar a solucao pronta para:

- receber a composicao de produto acabado e intermediario no mesmo layout
- preservar a estrutura importada como base oficial
- permitir ajustes operacionais do PCP sem perder historico
- registrar programacao manual de montagem, producao e compra
- alimentar a previsao de disponibilidade e a previsao de saida dos romaneios

## Layout homologado de estrutura

Arquivo de referencia:

- `PARTE 1 - COMP DE PRODUTOS.xlsx`

Layout:

- `A`: codigo do item pai
- `B`: descricao do item pai
- `C`: codigo do componente
- `D`: descricao do componente
- `E`: quantidade por

Regra:

- quando `A/B` estao vazios, a linha continua pertencendo ao ultimo item pai informado
- o mesmo parser atende `bom_final` e `bom_intermediario`

## Camadas no banco

- `core.bom_component`
  - estrutura base importada
- `core.bom_component_override`
  - camada de ajuste do PCP por componente
- `core.vw_bom_component_current`
  - visao consolidada usada pelo MRP
- `core.supply_programming_entry`
  - programacao manual de disponibilidade
- `core.vw_supply_forecast_current`
  - une previsoes vindas de fonte com programacao manual

## Campos editaveis do PCP

Estruturas:

- `quantity_per`
- `scrap_pct`
- `sequence_no`
- `process_stage`
- `component_role`
- `assembly_line_code`
- `workstation_code`
- `usage_notes`
- `is_blocked`
- `reason`

Programacao:

- `planned_start_at`
- `available_at`
- `quantity_planned`
- `assembly_line_code`
- `workstation_code`
- `sequence_rank`
- `planning_status`
- `notes`

## Efeito na previsao

- ajustes em estrutura passam a ser lidos por `core.vw_bom_component_current`
- a explosao do MRP passa a usar a visao consolidada
- programacoes manuais entram em `core.vw_supply_forecast_current`
- `mart.vw_supply_availability_current` e `mart.vw_romaneio_eta_current` passam a enxergar essas datas

## Modulo SaaS

Novos endpoints:

- `GET /api/pcp/structures`
- `GET /api/pcp/programming`
- `POST /api/pcp/structure-overrides`
- `POST /api/pcp/programming-entries`

Novas secoes:

- `Estruturas`
- `Programacao`

## Parser

Arquivos:

- `parsers/parse_bom_estrutura_padrao.py`
- `parsers/run_bom_parser.py`

Exemplo:

```bash
python3 parsers/parse_bom_estrutura_padrao.py --summary --source-scope bom_final \
  "/caminho/PARTE 1 - COMP DE PRODUTOS.xlsx"
```

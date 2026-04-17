---
tags: [frontend, react, simulador, fabrica, producao]
relacionado: [[Rastreamento de Produção]], [[Apontamento de Produção]], [[MRP]]
status: ativo
tipo: componente
versao: 1.0.0
---

# Simulador de Fábrica

Ferramenta de simulação do ambiente fabril para planejamento e análise de cenários de produção. Permite modelar capacidade, turnos e cargas de trabalho.

## Como funciona

`web-react/src/pages/FactorySimulator.jsx` (25 KB) é o maior componente da área de planejamento. Oferece:
- Simulação de cenários de produção com diferentes parâmetros
- Visualização de carga por linha e turno
- Identificação de gargalos e ociosidades
- Comparativo entre cenários

É uma ferramenta de análise — não registra apontamentos reais.

## Arquivos principais

- `web-react/src/pages/FactorySimulator.jsx` — componente de simulação

## Integrações

Este módulo se conecta com:
- [[Rastreamento de Produção]]
- [[MRP]]
- [[Estruturas e BOM]]

## Configuração

Endpoints consumidos:
- `GET /api/pcp/production`
- `GET /api/pcp/assembly`

## Observações importantes

- Este é um módulo de **simulação** — não gera dados operacionais oficiais
- Resultados de simulação não devem ser confundidos com o cenário operacional vigente
- Interface deve deixar explícito que está em modo de análise/simulação

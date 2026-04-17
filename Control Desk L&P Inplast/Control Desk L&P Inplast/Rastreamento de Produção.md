---
tags: [frontend, react, producao, rastreamento, tracking]
relacionado: [[Apontamento de Produção]], [[MRP]], [[Servidor HTTP]], [[Banco de Dados Postgres]]
status: ativo
tipo: componente
versao: 1.0.0
---

# Rastreamento de Produção

Tela de acompanhamento operacional do chão de fábrica. Exibe o status de ordens de produção ativas, lançamentos e histórico de apontamentos.

## Como funciona

`web-react/src/pages/ProductionTracking.jsx` (29 KB) consolida:

- Ordens de produção ativas por linha e turno
- Status de execução por ordem (em andamento, pausada, concluída)
- Métricas de eficiência e comparativo planejado vs realizado
- Integração com apontamentos registrados

Diferença para [[Apontamento de Produção]]: esta tela é para **visualização e gestão** — não para operação direta.

## Arquivos principais

- `web-react/src/pages/ProductionTracking.jsx` — componente de rastreamento

## Integrações

Este módulo se conecta com:
- [[Apontamento de Produção]]
- [[MRP]]
- [[Servidor HTTP]]
- [[Banco de Dados Postgres]]

## Configuração

Endpoints consumidos:
- `GET /api/pcp/production`
- `GET /api/pcp/apontamento/logs`

## Observações importantes

- A UI deve exibir última sincronização válida e estado de frescor
- Dados de empresa ativa devem estar sempre visíveis
- Estados obrigatórios: `loading`, `error`, `empty`, `stale_data`, `permission_denied`

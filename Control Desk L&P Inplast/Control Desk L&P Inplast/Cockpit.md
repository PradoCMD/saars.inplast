---
tags: [frontend, react, vite, ui, cockpit, dashboard]
relacionado: [[Servidor HTTP]], [[Sincronização de Fontes]], [[MRP]], [[Romaneios]], [[Governança de Fontes]]
status: ativo
tipo: componente
versao: 1.0.0
---

# Cockpit

Dashboard operacional principal do módulo PCP. Exibe indicadores consolidados de estoque, carteira, filas, criticidade e alertas. Suporta filtro por empresa e modo consolidado do grupo.

## Como funciona

O Cockpit (`web-react/src/pages/Cockpit.jsx`) consome os endpoints `/api/pcp/overview`, `/api/pcp/painel`, `/api/pcp/alerts` e `/api/pcp/sources`. Renderiza:

- Indicadores de estoque útil, carteira e filas por empresa
- Cards de gargalos críticos e riscos que impactam romaneios e MRP
- Status de frescor de cada fonte de dados
- Alertas de integração com origem e severidade
- Última sincronização válida por fonte e empresa

Estados suportados: `loading`, `error`, `empty`, `stale_data`, `permission_denied`.

## Arquivos principais

- `web-react/src/pages/Cockpit.jsx` — componente principal
- `data/overview.json` — seed de indicadores (modo mock)
- `data/alerts.json` — seed de alertas (modo mock)
- `data/sources.json` — seed de status das fontes (modo mock)

## Integrações

Este módulo se conecta com:
- [[Sincronização de Fontes]]
- [[Governança de Fontes]]
- [[MRP]]
- [[Romaneios]]
- [[Servidor HTTP]]

## Configuração

Endpoints consumidos:
- `GET /api/pcp/overview`
- `GET /api/pcp/painel`
- `GET /api/pcp/alerts`
- `GET /api/pcp/sources`

## Observações importantes

- Sem dados para uma empresa, a UI exibe empty state sem quebrar os cards
- Dados `stale` devem ficar visivelmente marcados — não podem parecer atuais
- A UI deve explicitar empresa ativa e nível de consolidação em toda tela operacional
- A UI deve diferenciar previsão automática de override manual
- Fonte parcial permite leitura do último cenário válido com aviso

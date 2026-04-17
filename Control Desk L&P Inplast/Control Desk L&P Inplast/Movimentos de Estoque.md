---
tags: [frontend, react, estoque, almoxarifado, movimentos]
relacionado: [[Governança do Sistema]], [[Banco de Dados Postgres]], [[Servidor HTTP]]
status: ativo
tipo: componente
versao: 1.0.0
---

# Movimentos de Estoque

Tela de registro e consulta de entrada e saída do almoxarifado. Permite gestão manual de movimentos de estoque integrados ao módulo PCP.

## Como funciona

`web-react/src/pages/StockMovements.jsx` (7 KB) exibe:
- Histórico de movimentos de entrada e saída por item
- Formulário de novo movimento (entrada/saída manual)
- Filtro por item, tipo de movimento e período

No modo postgres, os movimentos são persistidos no banco dedicado. No modo mock, são temporários na sessão.

## Arquivos principais

- `web-react/src/pages/StockMovements.jsx` — componente principal

## Integrações

Este módulo se conecta com:
- [[Governança do Sistema]]
- [[Banco de Dados Postgres]]
- [[Servidor HTTP]]

## Configuração

Endpoints:
- `GET /api/pcp/stock-movements`
- `POST /api/pcp/stock-movements/save` — requer `stock_movements.manage`

## Observações importantes

- Toda movimentação manual é auditada obrigatoriamente
- Permissão `stock_movements.manage` é restrita a perfis específicos

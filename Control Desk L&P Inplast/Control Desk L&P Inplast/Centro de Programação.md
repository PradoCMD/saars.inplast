---
tags: [frontend, react, programacao, planejamento, producao]
relacionado: [[MRP]], [[Estruturas e BOM]], [[Banco de Dados Postgres]], [[Servidor HTTP]]
status: ativo
tipo: componente
versao: 1.0.0
---

# Centro de Programação

Tela de planejamento manual de produção. Permite inserir, visualizar e ajustar entradas de programação que alimentam o MRP.

## Como funciona

`web-react/src/pages/ProgrammingCenter.jsx` (26 KB) oferece ao usuário de PCP:

- Criação de entradas manuais de programação por produto/intermediário
- Visualização do quadro de programação vigente por período
- Ajuste de quantidades planejadas e datas de disponibilidade
- Integração com o ciclo de MRP — entradas manuais são respeitadas mesmo durante recálculo automático

Toda entrada manual gera evento de auditoria (`changed_by_user_id`, `changed_fields`, `before`, `after`).

## Arquivos principais

- `web-react/src/pages/ProgrammingCenter.jsx` — componente principal
- `web-react/src/pages/OperationsWorkspace.css` — estilos da área de operações
- `docs/pcp_estruturas_programacao.md` — contrato de estruturas e programação
- `server.py` — handler `POST /api/pcp/programming-entries`

## Integrações

Este módulo se conecta com:
- [[MRP]]
- [[Estruturas e BOM]]
- [[Rastreamento de Produção]]
- [[Banco de Dados Postgres]]

## Configuração

Endpoints:
- `GET /api/pcp/programming` — lê quadro de programação vigente
- `POST /api/pcp/programming-entries` — insere entrada manual (requer `programming.write`)

## Observações importantes

- Entradas manuais prevalecem sobre automáticas no ciclo de MRP
- Toda alteração manual é auditada obrigatoriamente
- A tela deve distinguir visualmente programação automática de manual
- Estados obrigatórios: `loading`, `error`, `empty`, `permission_denied`
- Último relatório de QA (ver `docs/qa_audit_programming_center.md`) identificou edge cases em validações de input

# Handoff: TESTE Auditor para confirmar `non-repro` no worktree atual

Data: 2026-04-09
Projeto: `saars.inplast`
Responsavel anterior: CODE Reviewer
Responsavel seguinte: TESTE Auditor
Status de entrada: `reteste curto necessario`

## 1. Objetivo deste handoff

Validar se os dois `P0` realmente continuam abertos ou se o handoff anterior ficou desalinhado com o worktree atual.

Esta etapa nao e para redesenhar a UI nem para abrir nova remediacao sem prova.

O objetivo e responder com rigor:

1. os `P0` ainda reproduzem hoje?
2. ou estamos diante de `drift` entre evidencia anterior e estado atual do repositorio?

## 2. Leitura obrigatoria

Leia nesta ordem:

1. [SPEC.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json)
3. [handoff_code_reviewer_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_code_reviewer_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md)
4. [relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md)
5. [relatorio_non_repro_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_non_repro_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md)
6. [server.py](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py)
7. [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx)
8. [web-react/src/pages/KanbanBoard.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx)
9. [web-react/src/pages/SourcesGovernance.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx)

## 3. O que o CODE Reviewer confirmou localmente

### `sources.sync`

No worktree atual:

- sem token -> `401`
- `operator_inplast` -> `403`
- `manager_inplast` -> `200`

Referencias:

- [server.py:1169](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1169)
- [server.py:1463](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1463)

### Build/startup do `web-react`

No worktree atual:

- `npm run build` passou
- Vite subiu limpo
- `KanbanBoard.jsx` existe no disco

Referencias:

- [App.jsx:8](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx#L8)
- [KanbanBoard.jsx:1](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx#L1)

### Fluxos preservados

No reteste local:

- login real de `manager_multi`
- `Governanca` abre sem empresa
- `Cockpit` exige empresa
- `Kanban` exige empresa
- `Romaneios` continua distinguindo backend oficial e buffer local

## 4. O que voce precisa testar agora

### Bloco A: confirmar ou derrubar o `non-repro`

Execute primeiro:

1. `POST /api/pcp/sources/sync` sem token
2. `POST /api/pcp/sources/sync` com `operator_inplast`
3. `POST /api/pcp/sources/sync` com `manager_inplast`
4. `npm run build`
5. boot limpo do Vite

Se esses checks passarem, trate isso explicitamente como:

- `finding anterior nao reproduzido no worktree atual`

Nao como bug aberto.

### Bloco B: regressao curta obrigatoria

Depois, valide:

1. login real
2. persistencia de sessao
3. reset em `401`
4. `manager_multi` abrindo `Governanca` sem empresa
5. `Cockpit` exigindo empresa
6. `Kanban` exigindo empresa
7. `Romaneios` separando backend oficial e buffer local

## 5. Ambiente recomendado

Backend:

- `PCP_DATA_MODE=mock`
- `PCP_PORT=8876`
- `PCP_AUTH_TOKEN_SECRET=qa-secret`

Frontend:

- `npm run dev -- --host 127.0.0.1 --port 5173`

Credenciais:

- `root / root@123`
- `manager_inplast / m123`
- `manager_multi / m123`
- `operator_inplast / o123`

## 6. Resultado esperado

Sua devolutiva deve responder com clareza:

1. Os dois `P0` realmente ainda reproduzem?
2. Ou o worktree atual ja esta com eles fechados?
3. Houve `drift` entre a evidencia anterior e o estado atual do repositorio?
4. O `401` continua correto?
5. O projeto pode seguir ou precisa mesmo de nova remediacao?

Formato esperado:

- findings primeiro
- depois testes executados
- depois validacoes aprovadas
- depois riscos residuais
- depois recomendacao final de go/no-go

# Handoff: TESTE Auditor Pos-Remediacao de `Governanca de Fontes` e `Cockpit` no `web-react`

Data: 2026-04-09
Projeto: `saars.inplast`
Responsavel anterior: CODE Reviewer / remediacao tecnica
Responsavel seguinte: TESTE Auditor
Status de entrada para teste: `P0` de backend corrigido, build limpo confirmado localmente, pronto para reteste curto

## 1. Leitura obrigatoria

Antes de iniciar o reteste, leia nesta ordem:

1. [SPEC.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json)
3. [handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md)
4. [relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md)
5. [handoff_code_reviewer_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_code_reviewer_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md)
6. [relatorio_remediacao_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_remediacao_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md)
7. [server.py](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py)
8. [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx)
9. [web-react/src/pages/SourcesGovernance.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx)
10. [web-react/src/pages/Cockpit.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx)
11. [web-react/src/pages/KanbanBoard.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx)

## 2. O que mudou desde o reteste anterior

O CODE Reviewer confirmou e tratou apenas o que era de alta confianca:

- o bypass de auth/RBAC em `POST /api/pcp/sources/sync` foi corrigido
- o `sync_api_token` deixou de competir com o Bearer da sessao do usuario
- o frontend nao foi alterado para o `P0` de `KanbanBoard`, porque esse problema nao reproduziu no worktree atual

## 3. O que ja foi validado localmente

### Backend

Casos validados localmente:

1. sem token em `POST /api/pcp/sources/sync` -> `401`
2. `operator_inplast` -> `403`
3. `manager_inplast` -> `200`

Auditoria observada em [security_audit.jsonl](/Users/sistemas2/Documents/Playground 2/saars.inplast/data/security_audit.jsonl):

- negacao sem token
- negacao por falta de permissao
- sucesso com `manager`

### Frontend `web-react`

Casos validados localmente:

1. `npm run build` passou
2. Vite subiu limpo
3. login real de `manager_multi`
4. `Governanca` abriu sem empresa
5. `Cockpit` continuou exigindo empresa
6. `Kanban` continuou exigindo empresa
7. `401` continuou limpando a sessao e voltando ao login

## 4. O que voce precisa testar agora

### Bloco A: confirmar fechamento do `P0` corrigido

Execute primeiro:

1. `POST /api/pcp/sources/sync` sem token
2. `POST /api/pcp/sources/sync` com `operator_inplast`
3. `POST /api/pcp/sources/sync` com `manager_inplast`

Objetivo:

- confirmar que o backend sustenta auth/RBAC por conta propria
- garantir que o bloqueio nao depende so da UI

### Bloco B: reconfirmar o `P0` de frontend que nao reproduziu

Execute:

1. `npm run build`
2. boot limpo do Vite
3. abertura do shell em sessao fresca

Objetivo:

- confirmar que o finding de import nao resolvido realmente nao esta mais presente
- separar bug real de problema ja resolvido no worktree atual

### Bloco C: regressao curta obrigatoria

Depois dos P0, valide:

1. login real
2. persistencia de sessao
3. reset em `401`
4. `manager_multi` abrindo `Governanca` sem empresa
5. `manager_multi` exigindo empresa em `Cockpit`
6. `manager_multi` exigindo empresa em `Kanban`
7. `Romaneios` permanecendo honesto sobre backend oficial vs buffer local

## 5. Ambiente recomendado

Backend:

- `PCP_DATA_MODE=mock`
- `PCP_PORT=8876`
- `PCP_AUTH_TOKEN_SECRET=qa-secret`

Frontend:

- `npm run dev -- --host 127.0.0.1 --port 5173`

Credenciais uteis:

- `root / root@123`
- `manager_inplast / m123`
- `manager_multi / m123`
- `operator_inplast / o123`

## 6. O que nao deve virar finding novo automaticamente

So marque como finding novo se houver evidencia objetiva:

- a documentacao de sync ainda estar falando em `Authorization: Bearer SEU_TOKEN` quando ha `PCP_SYNC_API_TOKEN`
- modulos em transicao fora do escopo desta rodada
- riscos antigos de multiempresa estrutural, MRP ou `Romaneios` sem evidencia de regressao nova

## 7. Resultado esperado do seu trabalho

Sua devolutiva deve responder com clareza:

1. O `P0` de `sources.sync` ficou realmente fechado?
2. O `P0` de build/startup do `web-react` realmente nao se reproduz mais?
3. O shell React preservou sessao, `401`, papel e contexto multiempresa?
4. `Governanca`, `Cockpit` e `Kanban` continuam coerentes entre si?
5. A rodada pode seguir para a proxima fase ou precisa de nova correcao?

Formato esperado:

- findings primeiro
- depois testes executados
- depois validacoes aprovadas
- depois riscos residuais confirmados
- depois recomendacao final de go/no-go

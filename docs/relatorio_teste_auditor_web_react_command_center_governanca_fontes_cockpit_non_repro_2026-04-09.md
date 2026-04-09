# Relatorio: Reteste Auditor `non-repro` de `Governanca de Fontes` e `Cockpit` no `web-react`

Data: 2026-04-09
Projeto: `saars.inplast`
Escopo desta etapa: confirmar se os `P0` reabertos ainda reproduziam no worktree atual e rodar regressao curta de auth, sessao, `401`, multiempresa, `Governanca`, `Cockpit`, `Kanban` e `Romaneios`
Status final desta rodada: `go`

## 1. Resumo executivo

O reteste independente confirmou que os dois `P0` desta trilha nao reproduzem no worktree atual.

Checks objetivos confirmados:

- `POST /api/pcp/sources/sync` respondeu `401 / 403 / 200` como esperado
- `npm run build` passou
- o Vite subiu limpo
- `KanbanBoard.jsx` existe no worktree atual e o import resolve corretamente

Na regressao curta, o shell React preservou:

- login real
- sessao
- reset em `401`
- `manager_multi` abrindo `Governanca` sem empresa
- `Cockpit` exigindo empresa
- `Kanban` exigindo empresa
- `Romaneios` com separacao clara entre backend oficial e buffer local

Traducao pratica:

- os dois `P0` podem ser tratados como `non-repro` no estado atual do repositorio
- houve drift entre a evidencia anterior e o worktree atual
- a base autenticada e operacional do `web-react/` esta liberada para a proxima fase de UX/UI

## 2. Findings

### 2.1 Nenhum finding novo ou reaberto no worktree atual

Nesta rodada, nao encontrei bug novo de alta confianca.

Os dois `P0` anteriores ficaram com status:

- `finding anterior nao reproduzido no worktree atual`

### 2.2 `P0` de `sources.sync` nao reproduz no backend atual

Referencias:

- [server.py:1168](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1168)
- [server.py:1463](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1463)
- [nonrepro_sync_noauth_body.json](/tmp/nonrepro_sync_noauth_body.json)
- [nonrepro_sync_operator_body.json](/tmp/nonrepro_sync_operator_body.json)
- [nonrepro_sync_manager_body.json](/tmp/nonrepro_sync_manager_body.json)

Resultado observado:

- sem token -> `401`
- `operator_inplast` -> `403`
- `manager_inplast` -> `200`

Conclusao:

- o backend atual sustenta auth e permissao de `sources.sync`
- o `P0` anterior nao se sustenta mais como bug aberto no worktree atual

### 2.3 `P0` de build/startup limpo do `web-react` nao reproduz no frontend atual

Referencias:

- [App.jsx:8](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx#L8)
- [KanbanBoard.jsx:1](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx#L1)

Resultado observado:

- `npm run build` passou
- Vite subiu limpo
- o shell abriu em sessao fresca

Conclusao:

- o problema de import/build nao esta presente no worktree atual
- o `P0` anterior deve ser tratado como `nao reproduzido`, nao como bloqueio ainda aberto

## 3. Testes executados

### 3.1 Leitura de contexto

Arquivos-base lidos:

1. [prompt_teste_auditor_web_react_command_center_governanca_fontes_cockpit_non_repro_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/prompt_teste_auditor_web_react_command_center_governanca_fontes_cockpit_non_repro_2026-04-09.md)
2. [handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_non_repro_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_non_repro_2026-04-09.md)
3. [relatorio_non_repro_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_non_repro_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md)
4. [SPEC.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json)
5. [BACKLOG.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json)
6. [server.py](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py)
7. [App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx)
8. [KanbanBoard.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx)
9. [SourcesGovernance.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx)

### 3.2 Backend real

Ambiente:

- backend mock em `8876`
- `PCP_AUTH_TOKEN_SECRET=qa-secret`

Casos executados:

1. login `manager_inplast`
2. login `operator_inplast`
3. login `manager_multi`
4. `POST /api/pcp/sources/sync` sem token
5. `POST /api/pcp/sources/sync` com `operator_inplast`
6. `POST /api/pcp/sources/sync` com `manager_inplast`
7. `GET /api/pcp/sources` com `manager_multi` sem empresa
8. `GET /api/pcp/overview` com `manager_multi` sem `company_code`

### 3.3 Frontend real

Ambiente:

- Vite em `5173`

Casos executados:

1. `npm run build`
2. boot limpo do Vite
3. login invalido
4. login valido
5. reload no mesmo browser para confirmar sessao
6. invalidação forçada de token para validar reset em `401`
7. `manager_multi` em `Governanca`
8. `manager_multi` em `Cockpit`
9. `manager_multi` em `Kanban`
10. `Romaneios` com separacao oficial vs buffer

## 4. Validacoes aprovadas

### 4.1 Login real e sessao

Passou.

O shell:

- mostrou erro correto para credencial invalida
- autenticou `manager_multi`
- preservou sessao apos reload no mesmo browser

### 4.2 Reset em `401`

Passou.

Depois de forcar `access_token='bad-token'` no `localStorage`:

- a sessao foi removida
- o login reapareceu
- a UI mostrou `Token de acesso inválido.`

### 4.3 Coerencia multiempresa

Passou.

Para `manager_multi`:

- `Governanca` abre sem empresa
- `Cockpit` exige empresa
- `Kanban` exige empresa

### 4.4 Honestidade operacional

Passou.

`Romaneios` continuou deixando claro:

- o que e backend oficial
- o que e buffer local
- que as duas camadas nao sao misturadas silenciosamente

## 5. Avaliacao de drift

Houve drift objetivo entre a evidencia anterior e o worktree atual.

O que o reteste confirmou:

- os dois `P0` nao estao mais abertos agora
- os artefatos anteriores que tratavam esses `P0` como reproduziveis ficaram desalinhados com o estado atual do repositorio

Interpretacao recomendada:

- nao abrir nova remediacao tecnica para esses dois pontos
- tratar o resultado desta etapa como `non-repro confirmado`

## 6. Riscos residuais

Os riscos residuais desta etapa nao sao bugs novos:

- existe risco de processo quando handoff e estado real do worktree saem de sincronia
- modulos em transicao continuam exigindo honestidade de UX nas proximas fases
- a proxima rodada deve evoluir produto sem reabrir auth, sessao, multiempresa ou o contraste entre dado oficial e buffer

## 7. Recomendacao final

Recomendacao: devolver para o agente `UX/UI Design Engineer`.

Ordem recomendada:

1. usar esta rodada como liberacao formal da base autenticada e operacional
2. avançar a direcao de UX para `Governanca`, `Cockpit`, `Kanban` e `Romaneios`
3. manter congelados os contratos de auth, `401`, papel, multiempresa e honestidade operacional

Conclusao:

- a rodada esta em `go`
- os `P0` podem ser considerados `nao reproduzidos no worktree atual`
- o proximo passo correto e UX/UI, nao nova remediacao tecnica

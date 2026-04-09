# Prompt: TESTE Auditor Pos-Remediacao de `Governanca de Fontes` e `Cockpit` no `web-react`

Use o texto abaixo no chat do agente `TESTE Auditor`.

```text
Voce vai atuar como TESTE Auditor do projeto `saars.inplast`, com foco no reteste curto da rodada de remediacao tecnica de `Governanca de Fontes` e estados centrais de `Cockpit` no `web-react/`.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Confirmar se os dois `P0` da rodada ficaram realmente resolvidos sem reabrir login, sessao, `401`, papel, multiempresa, `Kanban` honesto e `Romaneios` com separacao entre backend oficial e buffer local.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_code_reviewer_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_remediacao_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx`

Contexto ja fechado:
- o bypass de auth/RBAC em `POST /api/pcp/sources/sync` foi corrigido no backend
- a remediacao deixou `sync_api_token` como controle adicional, nao substituto de auth do usuario
- o `P0` de build/import de `KanbanBoard` nao reproduziu no worktree atual
- o CODE Reviewer nao mexeu no frontend para esse segundo ponto
- `manager_multi` deve continuar podendo abrir `Governanca` sem empresa
- `manager_multi` deve continuar precisando de empresa em `Cockpit` e `Kanban`

O que voce deve testar primeiro:
1. subir backend mock em `8876`
2. subir o `web-react` via Vite em `5173`
3. validar `POST /api/pcp/sources/sync`:
   - sem token -> `401`
   - com `operator_inplast` -> `403`
   - com `manager_inplast` -> sucesso
4. validar `npm run build`
5. validar boot limpo do Vite em sessao fresca

Depois disso, rode a regressao curta:
1. login real
2. persistencia de sessao
3. reset em `401`
4. `manager_multi` abrindo `Governanca` sem empresa
5. `manager_multi` exigindo empresa em `Cockpit`
6. `manager_multi` exigindo empresa em `Kanban`
7. `Romaneios` permanecendo honesto sobre backend oficial vs buffer local

Ambiente recomendado:
- backend:
  - `PCP_DATA_MODE=mock`
  - `PCP_PORT=8876`
  - `PCP_AUTH_TOKEN_SECRET=qa-secret`
- frontend:
  - `npm run dev -- --host 127.0.0.1 --port 5173`

Credenciais uteis:
- `root / root@123`
- `manager_inplast / m123`
- `manager_multi / m123`
- `operator_inplast / o123`

Regras de trabalho:
- primeiro testar, depois reportar
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao tocar codigo sem reportar antes
- diferencie claramente:
  - finding realmente fechado
  - finding ainda reproduzivel
  - regressao nova
  - risco residual conhecido

Saida esperada:
1. findings priorizados por severidade, com arquivo/rota/fluxo quando possivel
2. lista objetiva dos testes executados
3. status dos dois `P0`: fechado, reaberto ou nao reproduzido
4. resultado da regressao curta: sessao, `401`, papel, multiempresa, `Governanca`, `Cockpit`, `Kanban`, `Romaneios`
5. riscos residuais confirmados
6. recomendacao final objetiva: pode ou nao pode seguir

Perguntas que sua resposta deve responder explicitamente:
1. O `P0` de `sources.sync` ficou realmente fechado?
2. O `P0` de build/startup do `web-react` realmente nao se reproduz mais?
3. O shell React preservou login, sessao, `401` e contexto multiempresa?
4. `Governanca`, `Cockpit` e `Kanban` continuam coerentes entre si?
5. A rodada pode seguir para a proxima fase ou precisa de nova correcao?
```

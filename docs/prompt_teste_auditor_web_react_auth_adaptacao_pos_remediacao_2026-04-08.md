# Prompt: TESTE Auditor Pos-Remediacao do `web-react/`

Use o texto abaixo no chat do agente `TESTE Auditor`.

```text
Voce vai atuar como TESTE Auditor do projeto `saars.inplast`, com foco no reteste final do `web-react/` apos a remediacao do bloqueio de integracao no fluxo real do Vite.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Confirmar se o `P0` do `web-react/` no fluxo real ficou realmente fechado e validar que a correcao nao reabriu sessao, `401`, papel, multiempresa e honestidade operacional ja aprovados.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_auth_adaptacao_2026-04-08.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_auth_adaptacao_2026-04-08.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_code_reviewer_web_react_auth_adaptacao_2026-04-08.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_remediacao_web_react_auth_adaptacao_2026-04-08.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_auth_adaptacao_pos_remediacao_2026-04-08.md`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/vite.config.js`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx`

Contexto ja fechado:
- o shell React ja havia se mostrado correto quando falava com o backend autenticado certo
- o bloqueio real do reteste anterior era o acoplamento do Vite ao backend errado
- a remediacao atuou apenas na configuracao de proxy/base URL
- nao reabra backend auth, RBAC ou `company_scope` sem evidencia objetiva de regressao

O que voce deve testar primeiro:
1. subir backend autenticado em `8876`
2. subir `web-react` via Vite em `5173`
3. validar login real sem override de rede
4. confirmar que `Route not found` nao reaparece

Depois disso, rode a regressao essencial:
1. persistencia de sessao
2. logout
3. reset em `401`
4. `manager` com `MRP` e `Sincronizar`
5. `operator` sem `MRP`
6. `operator` sem ingestao local de romaneios
7. `manager_multi` exigindo empresa
8. `Kanban` honesto e `Romaneios` com separacao clara entre backend oficial e buffer local

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

Artefatos uteis ja existentes:
- `/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/web_react_manager_real_proxy_authenticated.png`
- `/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/web_react_real_proxy_session_expired.png`
- `/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/web_react_operator_real_proxy_restrictions.png`
- `/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/web_react_manager_multi_real_proxy.png`

Regras de trabalho:
- primeiro testar, depois reportar
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao tocar codigo sem reportar antes
- diferencie claramente:
  - finding remediado e confirmado
  - finding reaberto
  - regressao real
  - risco residual conhecido

Saida esperada:
1. findings priorizados por severidade, com arquivo/rota/fluxo quando possivel
2. lista objetiva dos testes executados
3. status do `P0` remediado: fechado ou reaberto
4. resultado dos blocos de regressao: sessao, `401`, papel, multiempresa, `Kanban`, `Romaneios`
5. riscos residuais confirmados
6. recomendacao final objetiva: pode ou nao pode seguir para a proxima fase

Perguntas que sua resposta deve responder explicitamente:
1. O `P0` do fluxo real do Vite ficou realmente fechado?
2. A correcao preservou o contrato ja validado de sessao, `401`, papel e multiempresa?
3. O `web-react/` continua honesto em `Kanban` e `Romaneios`?
4. Existe alguma regressao relevante introduzida por esta remediacao?
5. O projeto pode seguir para a proxima fase ou precisa de nova rodada de correcao?
```

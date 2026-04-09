# Prompt: TESTE Auditor para confirmar `non-repro` no worktree atual

Use o texto abaixo no chat do agente `TESTE Auditor`.

```text
Voce vai atuar como TESTE Auditor do projeto `saars.inplast`, com foco em confirmar se os `P0` recentemente reabertos em `Governanca de Fontes` e `Cockpit` realmente continuam reproduzindo no worktree atual ou se houve drift entre a evidencia anterior e o estado atual do repositorio.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Executar um reteste curto e objetivo do worktree atual, tratando explicitamente a possibilidade de `non-repro` como resultado valido. Nao reabra nova rodada de correcao sem antes confirmar que os `P0` ainda existem de fato agora.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_code_reviewer_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_non_repro_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_non_repro_2026-04-09.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx`

Contexto importante:
- o CODE Reviewer reexecutou os checks no worktree atual
- `POST /api/pcp/sources/sync` respondeu `401 / 403 / 200` como esperado
- `npm run build` passou
- `KanbanBoard.jsx` existe no worktree atual
- `Governanca`, `Cockpit`, `Kanban` e `Romaneios` continuaram coerentes no navegador
- o ponto que ainda merece confirmacao independente e o reset em `401`

O que voce deve testar primeiro:
1. subir backend mock em `8876`
2. subir Vite em `5173`
3. validar:
   - `POST /api/pcp/sources/sync` sem token
   - `POST /api/pcp/sources/sync` com `operator_inplast`
   - `POST /api/pcp/sources/sync` com `manager_inplast`
4. rodar `npm run build`
5. validar boot limpo do Vite

Se esses checks passarem, registre explicitamente:
- `finding anterior nao reproduzido no worktree atual`

Depois disso, rode a regressao curta:
1. login real
2. persistencia de sessao
3. reset em `401`
4. `manager_multi` abrindo `Governanca` sem empresa
5. `Cockpit` exigindo empresa
6. `Kanban` exigindo empresa
7. `Romaneios` separando backend oficial e buffer local

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
  - bug ainda reproduzivel
  - bug nao reproduzivel no worktree atual
  - drift de evidencia
  - regressao nova
  - risco residual conhecido

Saida esperada:
1. findings priorizados por severidade
2. lista objetiva dos testes executados
3. status de cada `P0`: reproduzivel ou nao reproduzivel no worktree atual
4. resultado da regressao curta
5. avaliacao explicita sobre drift entre evidencia anterior e estado atual
6. recomendacao final: seguir ou nao seguir

Perguntas que sua resposta deve responder explicitamente:
1. Os dois `P0` realmente ainda estao abertos hoje?
2. Ou o worktree atual ja esta com eles fechados?
3. Houve drift entre o relatorio anterior e o estado atual do repositorio?
4. O reset em `401` continua correto?
5. O projeto pode seguir ou precisa mesmo de nova remediacao tecnica?
```

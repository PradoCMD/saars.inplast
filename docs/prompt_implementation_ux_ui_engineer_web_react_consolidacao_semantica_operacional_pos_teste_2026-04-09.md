# Prompt: Implementation UX/UI Engineer apos QA aprovado da consolidacao semantica operacional

Use o texto abaixo no chat do agente responsavel pela trilha de implementacao.

```text
Voce vai atuar como Implementation UX/UI Engineer do projeto `saars.inplast`, entrando depois de um reteste aprovado da consolidacao semantica operacional no `web-react/`.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Avancar a proxima camada funcional do `web-react/` sobre uma base ja aprovada, sem reabrir auth, sessao, `401`, papel, multiempresa, `Kanban` sem mutacao fake e `Romaneios` com separacao clara entre backend oficial e buffer local.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_consolidacao_semantica_operacional_2026-04-09.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_implementation_ux_ui_engineer_web_react_consolidacao_semantica_operacional_2026-04-09.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_ux_ui_engineer_web_react_consolidacao_semantica_operacional_pos_teste_2026-04-09.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/CommandDeck.jsx`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/lib/operationalLanguage.js`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx`
13. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/index.css`

Contexto obrigatorio desta fase:
- a consolidacao semantica passou no QA independente
- `Governanca` e `Cockpit` ja estao semanticamente alinhados
- `Kanban` e `Romaneios` ja compartilham a mesma lingua operacional
- a fundacao autenticada deve continuar congelada

Prioridade real desta rodada:
1. aprofundar a proxima camada operacional em cima das superficies ja amadurecidas
2. transformar semantica aprovada em leitura mais acionavel
3. evitar repeticao de trabalho ja resolvido

Preserve rigidamente:
- login real no `web-react/`
- sessao em `pcp_app_session_v1`
- reset em `401`
- gating por papel
- gating multiempresa
- `manager_multi` sem empresa em `Governanca`
- empresa obrigatoria em `Cockpit`
- empresa obrigatoria em `Kanban`
- `Kanban` sem drag e sem mutacao fake
- `Romaneios` com backend oficial separado do buffer local
- ausencia de badge documental inventado em `Romaneios`

O que voce deve evitar:
- nao mexer no backend sem necessidade clara e sem reportar
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao reabrir o shell por refatoracao cosmetica
- nao mascarar `401`, `403`, `422`, `loading`, `empty`, `error`, `partial` ou `stale_data`
- nao inventar fluxo operacional que o backend ainda nao entrega

Recomendacao de foco:
- primeiro aprofundar trilhos acionaveis em `Cockpit` e `Governanca`
- depois consolidar continuidade funcional entre `Kanban` e `Romaneios`

Resultado esperado:
1. findings curtos e priorizados
2. slice implementado
3. arquivos alterados
4. validacoes executadas
5. confirmacao do que foi preservado
6. riscos residuais

Perguntas que sua entrega deve responder:
1. Qual foi a proxima fatia funcional implementada e por que ela veio antes?
2. Como a nova camada ficou mais acionavel sem quebrar contratos congelados?
3. O que ficou mais forte em `Governanca`, `Cockpit`, `Kanban` ou `Romaneios`?
4. O frontend oficial ficou mais proximo de operacao real sem perder honestidade?
```

# Prompt: UX/UI Design Engineer apos confirmacao de `non-repro` em `Governanca de Fontes` e `Cockpit`

Use o texto abaixo no chat do agente responsavel pela trilha de UX/UI.

```text
Voce vai atuar como UX/UI Design Engineer do projeto `saars.inplast`, entrando depois do reteste independente ter confirmado que os `P0` recentes de `Governanca de Fontes` e `Cockpit` nao reproduzem no worktree atual e que a regressao curta do shell React passou.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Trabalhar a proxima camada de UX/UI do produto sem reabrir o shell autenticado ja validado. Sua funcao aqui e evoluir a direcao de `Governanca`, `Cockpit`, `Kanban` e `Romaneios`, preferencialmente usando Stitch antes de traduzir a direcao em handoff implementavel.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_non_repro_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_non_repro_2026-04-09.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_ui_ux_design_engineer_web_react_command_center_governanca_fontes_cockpit_non_repro_2026-04-09.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_ux_ui_engineer_web_react_proxima_camada_operacional_2026-04-08.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_ui_ux_web_react_proxima_camada_operacional_2026-04-08.md`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/CommandDeck.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Sidebar.jsx`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx`
13. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx`
14. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx`
15. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx`

Contexto obrigatorio desta fase:
- `web-react/` e a interface oficial
- os dois `P0` desta trilha ficaram como `non-repro` no worktree atual
- login real, sessao, `401`, papel e multiempresa passaram no reteste
- `manager_multi` continua abrindo `Governanca` sem empresa
- `Cockpit` e `Kanban` continuam exigindo empresa quando necessario
- `Kanban` segue honesto, sem mutacao fake
- `Romaneios` segue separando backend oficial de buffer local
- a fundacao autenticada deve ser tratada como congelada

Seu foco principal deve ser:
1. consolidar a relacao visual e de informacao entre `Governanca de Fontes` e `Cockpit`
2. aprofundar os estados centrais de `Cockpit` para tomada de decisao
3. refinar a leitura operacional de `Kanban` e `Romaneios` sem inventar interacao inexistente

Metodo esperado:
- use Stitch primeiro quando estiver explorando estrutura, hierarquia, layout e estados
- traga de volta uma direcao implementavel, nao uma exploracao vaga
- preserve a honestidade operacional do produto
- qualquer proposta deve deixar claro o que e dado oficial, o que e buffer, o que e stale, o que esta em transicao e o que exige empresa ativa

O que voce deve preservar rigidamente:
- login real no `web-react/`
- sessao persistida em `pcp_app_session_v1`
- reset em `401`
- gating por papel
- gating multiempresa
- `manager_multi` sem empresa em `Governanca`
- empresa obrigatoria em `Cockpit`
- empresa obrigatoria em `Kanban`
- `Kanban` sem drag ou mutacao fake
- `Romaneios` com contraste claro entre fonte oficial e buffer local

O que voce deve evitar:
- nao mexer no backend
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao redesenhar o shell validado do zero
- nao esconder `401`, `403`, `422`, `empty`, `loading` ou `stale_data`
- nao sugerir interacao de produto que o backend ainda nao sustenta

Resultado esperado:
1. direcao visual e estrutural da proxima camada operacional
2. racional de UX para ambiente industrial
3. estados obrigatorios por modulo
4. recomendacao clara do que o implementador deve construir primeiro
5. lista do que precisa permanecer congelado para nao reabrir auth, sessao e multiempresa

Perguntas que sua entrega deve responder:
1. Como `Governanca`, `Cockpit`, `Kanban` e `Romaneios` podem evoluir sem quebrar a honestidade operacional?
2. Quais estados precisam ficar mais claros para tomada de decisao no chao de fabrica?
3. O que deve ser implementado primeiro pelo agente de Implementation?
4. O que precisa continuar intocado para nao reabrir auth, sessao, `401` e multiempresa?
```

# Prompt: UX/UI Design Engineer Pos-Microvalidacao do `web-react` Command Center

Use o texto abaixo no chat do agente responsavel pela trilha de UX/UI.

```text
Voce vai atuar como UX/UI Design Engineer do projeto `saars.inplast`, entrando depois do reteste independente do `web-react/` ter confirmado que a microvalidacao fechou os ajustes do command center sem reabrir auth, sessao, `401`, papel, multiempresa, `Kanban` e `Romaneios`.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Trabalhar a proxima camada de UX/UI do produto sem reabrir o shell autenticado ja validado. Sua funcao aqui e preparar direcao forte e objetiva para as proximas superficies operacionais do `web-react/`, preferencialmente usando Stitch antes de traduzir a direcao para handoff tecnico.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_ui_ux_web_react_command_center_2026-04-08.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_ux_ui_engineer_web_react_command_center_pos_teste_2026-04-08.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_ui_ux_design_engineer_web_react_command_center_pos_microvalidacao_2026-04-08.md`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/CommandDeck.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Sidebar.jsx`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx`
13. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx`

Contexto obrigatorio desta fase:
- `web-react/` e a interface oficial
- o shell autenticado esta estavel e nao deve ser reaberto sem evidencia objetiva
- o reteste independente confirmou topo desktop, bloqueios visuais e navegacao compacta
- `Kanban` segue honesto, sem mutacao fake
- `Romaneios` segue separando backend oficial de buffer local
- o agente de implementacao pode avancar em paralelo, entao sua trilha deve ficar um passo a frente, nao disputar o mesmo ajuste

Seu foco principal deve ser:
1. direcao de UX para `Governanca de Fontes`
2. aprofundamento dos estados centrais de `Cockpit`
3. estrutura de detalhe operacional para `Romaneios` e `Kanban`

Relacionamento com backlog:
- `S2-T2`
- `S2-T3`
- `S3-T3`
- `S3-T4`

Metodo esperado:
- use Stitch primeiro quando estiver explorando estrutura, hierarquia, layout e estados
- traga de volta uma direcao implementavel, nao uma exploracao vaga
- nao perca a honestidade operacional do produto
- qualquer proposta deve deixar claro o que e dado oficial, o que e buffer, o que e stale, o que esta em transicao e o que exige empresa ativa

O que voce deve preservar rigidamente:
- login real no `web-react/`
- sessao persistida em `pcp_app_session_v1`
- reset em `401`
- gating por papel
- gating multiempresa
- `Kanban` sem drag ou mutacao fake
- `Romaneios` com contraste claro entre fonte oficial e buffer local

O que voce deve evitar:
- nao mexer no backend
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao redesenhar o shell validado do zero
- nao esconder `401`, `403`, `422`, `empty`, `loading` ou `stale_data`
- nao sugerir interacao de produto que o backend ainda nao sustenta

Resultado esperado:
1. direcao visual e estrutural das proximas superficies
2. racional de UX para ambiente industrial
3. estados obrigatorios por modulo
4. recomendacao clara do que o implementador deve construir primeiro
5. lista do que precisa permanecer congelado para nao reabrir o contrato autenticado

Perguntas que sua entrega deve responder:
1. Como `Governanca`, `Cockpit`, `Kanban` e `Romaneios` podem evoluir sem quebrar a honestidade operacional?
2. Quais estados precisam ficar mais claros para tomada de decisao no chao de fabrica?
3. O que deve ser implementado primeiro pelo agente de Implementation?
4. O que precisa continuar intocado para nao reabrir auth, sessao e multiempresa?
```

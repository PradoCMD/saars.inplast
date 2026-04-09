# Prompt: Implementation UX/UI Engineer Pos-Microvalidacao do `web-react` Command Center

Use o texto abaixo no chat do agente responsavel pela trilha de implementacao.

```text
Voce vai atuar como Implementation UX/UI Engineer do projeto `saars.inplast`, entrando depois do reteste independente do `web-react/` ter confirmado que a microvalidacao fechou os ajustes do command center e preservou auth, sessao, `401`, papel, multiempresa, `Kanban` e `Romaneios`.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Seguir com as proximas etapas reais do `web-react/` sem reabrir a camada autenticada estabilizada. Sua funcao agora e transformar a proxima fatia do backlog em entrega concreta no frontend oficial, com foco operacional e disciplina de produto.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_ui_ux_web_react_command_center_2026-04-08.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_ux_ui_engineer_web_react_command_center_pos_teste_2026-04-08.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_ux_ui_engineer_web_react_command_center_pos_microvalidacao_2026-04-08.md`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/CommandDeck.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Sidebar.jsx`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx`
13. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx`
14. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/index.css`

Contexto obrigatorio desta fase:
- `web-react/` e a interface oficial
- o shell autenticado esta estabilizado e nao deve ser reaberto sem evidencia objetiva
- topo desktop, bloqueios visuais e navegacao compacta ja passaram em reteste independente
- `Kanban` continua honesto, sem mutacao fake
- `Romaneios` continua separando backend oficial de buffer local
- se o agente de UX/UI tambem estiver rodando, ele deve ficar um passo a frente na direcao; voce deve focar em entrega real no codigo

Prioridade recomendada desta fase:
1. avancar em `Governanca de Fontes` e estados centrais de `Cockpit`
2. depois aprofundar `Romaneios` e `Kanban` contra o backlog oficial

Tickets de backlog mais alinhados:
- `S2-T2`
- `S2-T3`
- `S3-T3`
- `S3-T4`

Preserve rigidamente:
- login real no `web-react/`
- sessao em `pcp_app_session_v1`
- reset em `401`
- gating por papel
- gating multiempresa
- `operator` sem `MRP`
- `operator` sem ingestao local
- `Kanban` sem drag ou mutacao fake
- `Romaneios` com contraste claro entre fonte oficial e buffer local

O que voce deve evitar:
- nao mexer no backend sem necessidade clara e sem reportar
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao tocar proxy/base URL do Vite sem evidencia objetiva
- nao reabrir o shell validado por refatoracao cosmetica
- nao mascarar `401`, `403`, `422`, `empty`, `loading`, `error` ou `stale_data`
- nao inventar interacao operacional que o backend ainda nao sustenta

Instrucao de metodo:
- se a direcao estiver clara, implemente direto
- se precisar comparar rapidamente uma organizacao de tela antes de codar, use Stitch e traga a decisao de volta para o repositorio
- pense como implementador de produto industrial: leitura clara, estado honesto e operacao confiavel acima de enfeite

Resultado esperado:
1. plano curto da fase escolhida
2. quais tickets ou slices do backlog serao atacados
3. alteracoes aplicadas
4. validacoes executadas
5. confirmacao do que foi preservado
6. riscos residuais

Perguntas que sua entrega deve responder:
1. Qual proxima fatia do backlog foi implementada e por que ela veio primeiro?
2. Como a entrega aumentou valor operacional no `web-react/`?
3. O que foi mantido intacto para nao reabrir a camada autenticada?
4. O que ainda fica para a proxima rodada?
5. O frontend oficial ficou mais perto do fluxo real de produto?
```

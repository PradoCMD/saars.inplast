# Prompt: Implementation UX/UI Engineer para a Proxima Camada Operacional do `web-react`

Use o texto abaixo no chat do agente responsavel pela trilha de implementacao.

```text
Voce vai atuar como Implementation UX/UI Engineer do projeto `saars.inplast`, entrando depois da fase de direcao UX/UI que fechou a proxima camada operacional do `web-react/` sem reabrir o shell autenticado ja validado.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Implementar no `web-react/` a proxima fatia de produto com maior ganho operacional e baixo risco, seguindo a direcao definida para `Governanca de Fontes`, `Cockpit`, `Romaneios` e `Kanban`, sem reabrir auth, sessao, `401`, papel, multiempresa ou a honestidade operacional ja aprovada.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_ui_ux_web_react_proxima_camada_operacional_2026-04-08.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_ux_ui_engineer_web_react_proxima_camada_operacional_2026-04-08.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_ux_ui_engineer_web_react_command_center_pos_microvalidacao_2026-04-08.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/index.css`

Contexto obrigatorio desta fase:
- `web-react/` e a interface oficial
- o shell autenticado ja passou em reteste independente
- login, logout, sessao, `401`, papel e multiempresa devem permanecer congelados
- `Kanban` continua sem drag ou mutacao fake
- `Romaneios` continua separando backend oficial de buffer local
- a prioridade agora e promover confianca operacional modulo por modulo

Ordem recomendada de trabalho:
1. `Governanca de Fontes`
2. `Cockpit`
3. `Romaneios`
4. `Kanban`

Tickets de backlog mais alinhados:
- `S2-T2`
- `S2-T3`
- `S3-T3`
- `S3-T4`

Direcao obrigatoria desta rodada:
- em `Governanca`, elevar integridade do snapshot, ultimo snapshot valido, agrupamento por estado e leitura de fallback
- em `Cockpit`, deixar a primeira dobra mais decisoria e explicitar melhor `stale but usable`, vazio por contexto e risco imediato
- em `Romaneios`, promover lista oficial + detalhe consolidado, mantendo o buffer local como apoio operacional
- em `Kanban`, explicitar melhor a origem da previsao e reforcar o protocolo read-only sem inventar mutacao

Stitch disponivel para consulta:
- projeto `projects/6162515088644226406`
- design system `Ironforge Industrial`
- screen `Governanca de Fontes - Command Center`: `projects/6162515088644226406/screens/0ab9c591089946fcad2174050c4c9fc5`
- screen `Romaneio Consolidado Detail View`: `projects/6162515088644226406/screens/a82d99d5f94e4f82a548106692eb6ab3`
- screen `Kanban Logistico - Command Center`: `projects/6162515088644226406/screens/79677434b2e84e2c9cb686a38f9b8e67`

Use Stitch apenas para confirmar hierarquia e estados quando isso reduzir risco; depois implemente no codigo real.

Preserve rigidamente:
- login real no `web-react/`
- sessao em `pcp_app_session_v1`
- reset em `401`
- proxy real do Vite
- gating por papel
- gating multiempresa
- `operator` sem `MRP`
- `operator` sem ingestao local
- `Kanban` sem drag ou mutacao fake
- `Romaneios` com contraste claro entre fonte oficial e buffer local

O que voce deve evitar:
- nao mexer no backend sem necessidade clara e sem reportar
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao reabrir o shell por refatoracao cosmetica
- nao mascarar `401`, `403`, `422`, `empty`, `loading`, `error`, `partial` ou `stale_data`
- nao inventar fluxo operacional que o backend atual nao sustenta

Resultado esperado:
1. findings curtos e priorizados
2. modulo ou slice realmente implementado
3. arquivos alterados
4. validacoes executadas
5. confirmacao explicita do que foi preservado
6. riscos residuais

Perguntas que sua entrega deve responder:
1. Qual modulo ou slice do backlog veio primeiro e por que?
2. Como a implementacao aumentou a confianca operacional do `web-react/`?
3. O que ficou explicitamente preservado para nao reabrir a camada autenticada?
4. O que ainda fica para a proxima rodada?
5. A interface oficial ficou mais proxima do produto real sem recorrer a interacao fake?
```

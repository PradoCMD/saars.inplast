# Prompt: Implementation UX/UI Engineer apos `non-repro` e consolidacao da proxima camada operacional

Use o texto abaixo no chat do agente responsavel pela trilha de implementacao.

```text
Voce vai atuar como Implementation UX/UI Engineer do projeto `saars.inplast`, entrando depois da fase de UX/UI que revisou o worktree atual apos o `non-repro` de `Governanca` e `Cockpit` e consolidou a proxima camada operacional do `web-react/`.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Implementar a proxima camada de consolidacao operacional no `web-react/`, sem reabrir auth, sessao, `401`, papel, multiempresa, `Kanban` sem mutacao fake e `Romaneios` com separacao clara entre backend oficial e buffer local.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_non_repro_2026-04-09.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_ui_ux_web_react_proxima_camada_operacional_non_repro_2026-04-09.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_ux_ui_engineer_web_react_proxima_camada_operacional_non_repro_2026-04-09.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/CommandDeck.jsx`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/index.css`

Contexto obrigatorio desta fase:
- `web-react/` e a interface oficial
- os `P0` recentes ficaram como `non-repro` no worktree atual em 2026-04-09
- `Governanca`, `Cockpit`, `Kanban` e `Romaneios` ja absorveram parte importante da direcao anterior
- a fundacao autenticada deve continuar congelada

Prioridade real desta rodada:
1. consolidar `Governanca` e `Cockpit` como superficies irmas, mas nao redundantes
2. alinhar `Kanban` e `Romaneios` no mesmo vocabulario de previsao, excecao e fonte de verdade
3. evitar repetir trabalho que ja entrou no codigo

Direcao obrigatoria desta rodada:
- `Governanca` deve operar como camada transversal de integridade e impacto nos modulos
- `Cockpit` deve operar como camada contextual de decisao por empresa, sem espelhar `Governanca` em miniatura
- `Kanban` deve reforcar fila + excecao, mantendo protocolo read-only
- `Romaneios` deve reforcar detalhe oficial + source of truth, mantendo buffer local subordinado

Primitive set recomendado:
- `Snapshot Integrity Rail`
- `Operational Impact Panel`
- `Forecast Origin Badge Set`
- `Source of Truth Panel`
- `Read-only Protocol Panel`

Stitch disponivel para consulta:
- projeto `projects/6162515088644226406`
- design system `Ironforge Industrial`
- `Governanca de Fontes - Command Center`: `projects/6162515088644226406/screens/0ab9c591089946fcad2174050c4c9fc5`
- `Kanban Logistico - Command Center`: `projects/6162515088644226406/screens/79677434b2e84e2c9cb686a38f9b8e67`
- `Romaneio Consolidado Detail View`: `projects/6162515088644226406/screens/a82d99d5f94e4f82a548106692eb6ab3`

Observacao:
- nesta rodada o `generate_screen_from_text` falhou no Stitch com `invalid argument`
- use os screens existentes como referencia de hierarquia, nao como copia literal

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

O que voce deve evitar:
- nao mexer no backend sem necessidade clara e sem reportar
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao reabrir o shell por refatoracao cosmetica
- nao mascarar `401`, `403`, `422`, `loading`, `empty`, `error`, `partial` ou `stale_data`
- nao inventar badge documental que a API atual nao sustenta com confianca
- nao inventar fluxo operacional que o backend ainda nao entrega

Resultado esperado:
1. findings curtos e priorizados
2. slice implementado
3. arquivos alterados
4. validacoes executadas
5. confirmacao do que foi preservado
6. riscos residuais

Perguntas que sua entrega deve responder:
1. O que foi implementado primeiro e por que isso veio antes?
2. Como `Governanca` e `Cockpit` ficaram mais coerentes sem virar telas redundantes?
3. Como `Kanban` e `Romaneios` ficaram mais consistentes entre si?
4. O que foi mantido intacto para nao reabrir auth, sessao, `401` e multiempresa?
5. O frontend oficial ficou mais proximo de um produto unico e menos de modulos montados em paralelo?
```

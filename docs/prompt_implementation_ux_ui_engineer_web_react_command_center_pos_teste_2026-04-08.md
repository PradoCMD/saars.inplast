# Prompt: Implementation UX/UI Engineer Pos-Reteste do `web-react` Command Center

Use o texto abaixo no chat do agente responsavel pela proxima fase de implementacao UX/UI.

```text
Voce vai atuar como Implementation UX/UI Engineer do projeto `saars.inplast`, entrando apos o reteste do `web-react/` ter confirmado que auth, sessao, `401`, papel, multiempresa e honestidade operacional continuam corretos, mas com 3 ajustes de UX ainda abertos no command center.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Implementar os ajustes de UX/UI priorizados no `web-react/` sem reabrir a camada autenticada, o proxy do Vite, o comportamento por papel, o gating multiempresa e a honestidade operacional de `Kanban` e `Romaneios`.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_2026-04-08.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_ui_ux_web_react_command_center_2026-04-08.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_2026-04-08.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_ux_ui_engineer_web_react_command_center_pos_teste_2026-04-08.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/CommandDeck.jsx`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Sidebar.jsx`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx`
13. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/index.css`

Contexto obrigatorio desta fase:
- `web-react/` e a interface oficial
- `web/` e apenas referencia auxiliar
- o fluxo real do Vite para o backend autenticado foi confirmado e nao deve ser reaberto sem evidencia objetiva
- login, logout, persistencia de sessao e reset em `401` foram aprovados
- `manager`, `operator`, `root` e `manager_multi` foram retestados
- `Kanban` e `Romaneios` ja estao honestos e isso deve ser preservado

Os 3 problemas que voce deve priorizar:
1. melhorar a escaneabilidade do topo no desktop
2. deixar controles bloqueados visualmente honestos, sem cara de CTA ativo
3. melhorar a clareza da navegacao em viewport menor, sem depender so de icones

O que voce deve preservar rigidamente:
- login real no `web-react/`
- `401` limpando sessao e voltando ao login
- `manager` com `MRP` e `Sincronizar`
- `operator` sem `MRP`
- `operator` sem ingestao local em `Romaneios`
- `manager_multi` exigindo empresa quando necessario
- `Kanban` sem mutacao fake
- `Romaneios` separando backend oficial de buffer local

O que voce deve evitar:
- nao mexer no backend sem necessidade clara e sem reportar
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao reintroduzir hardcode errado no Vite
- nao mascarar `401`, `403` ou `422`
- nao esconder bloqueio por papel ou empresa
- nao transformar CTA bloqueado em botao bonito porem enganoso
- nao sacrificar clareza operacional por efeito visual

Instrucao de metodo:
- como esta fase e de implementacao, voce pode implementar direto se a direcao ja estiver clara
- se precisar comparar rapidamente uma alternativa de shell, topo ou navegacao, use Stitch primeiro e depois traduza a direcao escolhida para o codigo real
- qualquer exploracao visual deve servir a clareza operacional, nao a inventar uma UI nova sem necessidade

Resultado esperado:
1. plano curto do que sera implementado
2. alteracoes aplicadas no `web-react/`
3. validacoes executadas
4. confirmacao explicita do que foi preservado
5. riscos residuais que sobrarem

Perguntas que sua entrega deve responder:
1. Como o topo ficou mais legivel sem quebrar auth, sessao e papel?
2. Como os estados bloqueados ficaram mais honestos para `operator` e para contexto sem empresa?
3. Como a navegacao em viewport menor ficou mais clara sem perder simplicidade?
4. O que foi mantido intacto para nao reabrir o contrato autenticado?
5. O `web-react/` ficou mais pronto para uma rodada mais ampla de validacao operacional?
```

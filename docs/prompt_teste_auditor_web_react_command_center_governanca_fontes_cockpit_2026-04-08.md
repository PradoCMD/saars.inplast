# Prompt: TESTE Auditor apos implementacao de `Governanca de Fontes` e estados centrais de `Cockpit`

Use o texto abaixo no chat do agente `TESTE Auditor`.

```text
Voce vai atuar como TESTE Auditor do projeto `saars.inplast`, entrando depois de uma rodada de implementacao no `web-react/` que promoveu `Governanca de Fontes` e aprofundou os estados centrais de `Cockpit`.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Executar um reteste independente do `web-react/` para confirmar que a nova fatia real do backlog esta funcional e honesta, sem reabrir auth, sessao, `401`, papel, multiempresa, proxy do Vite, `Kanban` sem mutacao fake e `Romaneios` com separacao clara entre backend oficial e buffer local.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_implementation_ux_ui_engineer_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Sidebar.jsx`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx`
13. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/index.css`

Contexto desta entrada:
- `web-react/` continua sendo a interface oficial
- backend, `SPEC.json`, `BACKLOG.json` e proxy do Vite nao foram alterados nesta rodada
- a implementacao entregou `Governanca de Fontes` como tela real e trouxe fontes/alertas para dentro do `Cockpit`
- `npm run lint` e `npm run build` ja passaram localmente, mas agora precisamos do seu reteste independente

Priorize verificar primeiro:
1. `Governanca de Fontes` para `manager`
2. `Governanca de Fontes` para `operator`
3. `Governanca de Fontes` para `manager_multi` sem empresa selecionada
4. novos paineis de fontes e alertas no `Cockpit`
5. confirmacao de que empresa obrigatoria continua apenas onde necessario

O que voce deve preservar e retestar explicitamente:
- login real no `web-react/`
- persistencia de sessao
- reset em `401`
- `manager` com `MRP` e `Sincronizar`
- `operator` sem `MRP`
- `operator` sem ingestao local em `Romaneios`
- `manager_multi` exigindo empresa em `Cockpit` e `Kanban`
- `manager_multi` podendo acessar `Governanca de Fontes` sem bloqueio artificial
- `Kanban` sem mutacao fake
- `Romaneios` com contraste claro entre backend oficial e buffer local

O que voce deve evitar:
- nao reabrir backend auth ou proxy do Vite sem evidencia objetiva
- nao tratar modulo em transicao honesto como bug novo automaticamente
- nao marcar como bug o fato de `Governanca` ser transversal ao shell autenticado e nao exigir empresa ativa para abrir
- nao confundir ausencia de automacao local desta rodada com falha do produto sem reproduzir

Ambiente recomendado:
- backend:
  - `PCP_DATA_MODE=mock`
  - `PCP_AUTH_TOKEN_SECRET=qa-secret`
  - `PCP_PORT=8876`
- frontend:
  - `npm run dev -- --host 127.0.0.1 --port 5173`

Saida esperada:
1. findings primeiro
2. testes executados
3. validacoes aprovadas
4. riscos residuais
5. recomendacao final de go/no-go

Perguntas que sua entrega deve responder:
1. `Governanca de Fontes` virou uma tela operacional real e honesta?
2. O `Cockpit` agora comunica melhor a confiabilidade das entradas?
3. Multiempresa continua correto sem bloquear modulo que nao depende de empresa?
4. Auth, sessao, `401`, papel, multiempresa, `Kanban` e `Romaneios` continuam intactos?
5. O `web-react/` pode seguir para a proxima fatia de backlog?
```

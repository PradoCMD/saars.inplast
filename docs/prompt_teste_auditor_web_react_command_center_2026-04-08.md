# Prompt: TESTE Auditor Pos-Evolucao do `web-react/` como Command Center

Use o texto abaixo no chat do agente `TESTE Auditor`.

```text
Voce vai atuar como TESTE Auditor do projeto `saars.inplast`, entrando apos uma nova rodada de evolucao visual e estrutural do `web-react/`.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Executar um reteste dirigido do `web-react/` para validar se a nova camada de shell, navegacao, hierarquia e clareza operacional realmente melhorou a interface oficial sem reabrir auth, sessao, `401`, papel, multiempresa e honestidade operacional que ja estavam estabilizados.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_ui_ux_design_engineer_web_react_auth_adaptacao_pos_teste_2026-04-08.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_auth_adaptacao_pos_remediacao_2026-04-08.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_ui_ux_web_react_command_center_2026-04-08.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_2026-04-08.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/vite.config.js`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/CommandDeck.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Sidebar.jsx`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx`
13. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx`
14. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/index.css`

Direcao desta rodada:
- `web-react/` continua sendo a UI oficial
- `web/` continua sendo apenas referencia auxiliar
- auth, sessao, `401`, papel e multiempresa nao devem ser reabertos sem evidencia objetiva de regressao
- `Kanban` deve continuar honesto e read-only
- `Romaneios` deve continuar separando backend oficial de buffer local

O que voce deve priorizar:
1. shell novo e `command deck`
2. clareza do topo e da navegacao lateral
3. leitura acima da dobra
4. escaneabilidade do `Kanban`
5. contraste visual entre oficial e buffer em `Romaneios`
6. confirmacao de que auth, sessao, `401`, papel e multiempresa continuam intactos

O que voce deve validar explicitamente:
- se o novo shell melhora a leitura de escopo, papel e modo do modulo
- se o topo nao ficou mais bonito porem menos claro
- se o `Kanban` continua sem interacao fake e agora esta mais escaneavel
- se o `Romaneios` agora diferencia de forma forte e inequívoca o backend oficial do buffer local
- se `operator` continua sem `MRP`
- se `operator` continua sem ingestao local de romaneios
- se `manager_multi` continua exigindo empresa quando necessario
- se `401` continua derrubando a sessao e limpando o estado autenticado
- se desktop e viewport menor continuam legiveis apos os novos agrupamentos

O que voce deve evitar:
- nao reabrir backend auth ou proxy do Vite sem evidencia real
- nao tratar falta de modulos finais fora do escopo como regressao desta rodada
- nao confundir “modulo em transicao” com bug novo se a interface estiver honesta sobre isso

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
4. riscos residuais confirmados
5. recomendacao final de go/no-go para a proxima fase

Perguntas que sua entrega deve responder:
1. O shell novo realmente melhorou a leitura operacional do `web-react/`?
2. A rodada visual preservou auth, sessao, `401`, papel e multiempresa?
3. O `Kanban` ficou mais forte sem voltar a parecer uma interacao fake?
4. O `Romaneios` agora comunica com clareza suficiente o que e oficial e o que e apenas buffer local?
5. O projeto pode seguir para nova rodada de implementacao frontend/fullstack?
```

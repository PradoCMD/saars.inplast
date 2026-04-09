# Prompt: TESTE Auditor Pos-Microvalidacao do `web-react` Command Center

Use o texto abaixo no chat do agente `TESTE Auditor`.

```text
Voce vai atuar como TESTE Auditor do projeto `saars.inplast`, entrando apos uma rodada de implementacao UX/UI no `web-react/` seguida de microvalidacao local aprovada.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Executar um reteste independente do `web-react/` para confirmar se os 3 findings de UX desta rodada realmente foram fechados sem reabrir auth, sessao, `401`, papel, multiempresa, `Kanban` honesto e `Romaneios` com separacao clara entre backend oficial e buffer local.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_ux_ui_engineer_web_react_command_center_pos_teste_2026-04-08.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_2026-04-08.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Sidebar.jsx`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/index.css`

Contexto desta entrada:
- `web-react/` continua sendo a interface oficial
- backend, proxy do Vite, `SPEC.json` e `BACKLOG.json` nao foram alterados nesta rodada
- a implementacao mirou 3 problemas priorizados de UX no shell oficial
- uma microvalidacao local ja passou, mas agora e necessario reteste independente

Os 3 pontos que voce deve verificar primeiro:
1. escaneabilidade do topo no desktop
2. honestidade visual dos controles bloqueados
3. clareza da navegacao em viewport menor sem depender so de icones

O que foi microvalidado localmente e pode servir apenas como referencia, nao como verdade final:
- `npm run lint`
- `npm run build`
- `POST /api/pcp/auth/login` via `5173`: `200`
- `GET /api/pcp/overview?company_code=INPLAST` sem token: `401`
- `GET /api/pcp/overview?company_code=INPLAST` com token: `200`
- `manager` desktop com topo reorganizado
- `manager` tablet/mobile com navegacao compacta mantendo texto
- `operator` em `Romaneios` com bloqueios visuais honestos
- `manager_multi` exigindo empresa e liberando cockpit apos selecao de `INPLAST`

Evidencias locais disponiveis:
- `/tmp/saars-microvalidation-2026-04-08/summary.json`
- `/tmp/saars-microvalidation-2026-04-08/manager-desktop.png`
- `/tmp/saars-microvalidation-2026-04-08/manager-tablet.png`
- `/tmp/saars-microvalidation-2026-04-08/manager-mobile.png`
- `/tmp/saars-microvalidation-2026-04-08/operator-romaneios.png`
- `/tmp/saars-microvalidation-2026-04-08/manager-multi-before.png`
- `/tmp/saars-microvalidation-2026-04-08/manager-multi-after.png`

O que voce deve preservar e retestar explicitamente:
- login real no `web-react/`
- persistencia de sessao
- reset em `401`
- `manager` com `MRP` e `Sincronizar`
- `operator` sem `MRP`
- `operator` sem ingestao local em `Romaneios`
- `manager_multi` exigindo empresa quando necessario
- `Kanban` sem mutacao fake
- `Romaneios` separando backend oficial de buffer local

O que voce deve evitar:
- nao reabrir backend auth ou proxy do Vite sem evidencia objetiva
- nao tratar modulo em transicao honesto como bug novo automaticamente
- nao confundir melhoria visual com regressao sem reproduzir de ponta a ponta

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
5. recomendacao final de go/no-go para a proxima fase

Perguntas que sua entrega deve responder:
1. O topo do shell ficou realmente mais escaneavel no desktop?
2. Os bloqueios por papel e por contexto ficaram visualmente honestos?
3. Tablet e mobile mantiveram navegacao com contexto suficiente?
4. Auth, sessao, `401`, papel e multiempresa continuam intactos?
5. O `web-react/` pode seguir para uma validacao operacional mais ampla?
```

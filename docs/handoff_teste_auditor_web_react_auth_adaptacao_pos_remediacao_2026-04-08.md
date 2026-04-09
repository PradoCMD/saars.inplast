# Handoff: TESTE Auditor Pos-Remediacao do `web-react/`

Data: 2026-04-08
Projeto: `saars.inplast`
Responsavel anterior: CODE Reviewer
Responsavel seguinte: TESTE Auditor
Status de entrada para teste: bloqueio `P0` do fluxo real do Vite corrigido e validado localmente

## 1. Leitura obrigatoria

Antes de iniciar, leia nesta ordem:

1. [SPEC.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json)
3. [handoff_teste_auditor_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_auth_adaptacao_2026-04-08.md)
4. [relatorio_teste_auditor_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_auth_adaptacao_2026-04-08.md)
5. [handoff_code_reviewer_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_code_reviewer_web_react_auth_adaptacao_2026-04-08.md)
6. [relatorio_remediacao_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_remediacao_web_react_auth_adaptacao_2026-04-08.md)
7. [web-react/vite.config.js](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/vite.config.js)
8. [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx)
9. [web-react/src/components/Topbar.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx)
10. [web-react/src/pages/KanbanBoard.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx)
11. [web-react/src/pages/RomaneiosInbox.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx)

## 2. O que mudou desde o ultimo reteste

O unico finding bloqueante aberto no reteste anterior era:

- `P0` o `web-react/` subia via Vite apontando para backend errado no fluxo real e falhava login valido

Esse ponto foi remediado em `vite.config.js` com:

- alvo padrao seguro para `8876`
- suporte a override por `VITE_API_PROXY_TARGET`
- suporte a override por `PCP_API_PROXY_TARGET`
- suporte a resolucao por `PCP_PORT`

## 3. O que ja foi validado localmente

### Fluxo real do Vite

Confirmado localmente:

- `POST /api/pcp/auth/login` via `http://127.0.0.1:5173` retornou `200` para `manager_inplast / m123`

### Browser-level

Confirmado localmente:

- login real de `manager_inplast`
- persistencia de sessao apos reload
- logout limpo
- reset em `401`
- `operator_inplast` sem `MRP`
- `operator_inplast` sem `Sincronizar`
- `operator_inplast` sem ingestao local de romaneios
- `manager_multi` exigindo empresa e liberando o `Kanban` apos selecao

## 4. O que voce precisa testar agora

### Bloco A: confirmar fechamento do `P0`

1. subir backend autenticado em `8876`
2. subir `web-react` via Vite em `5173`
3. validar login real sem override de rede
4. confirmar que o erro `Route not found` nao reaparece

### Bloco B: confirmar que a remediacao nao reabriu o shell

1. persistencia de sessao
2. logout
3. reset em `401`
4. comportamento por papel
5. comportamento multiempresa

### Bloco C: regressao objetiva de produto

1. `manager` com `MRP` e `Sincronizar`
2. `operator` sem `MRP`
3. `operator` sem ingestao local de romaneios
4. `Kanban` honesto, sem mutacao fake
5. `Romaneios` separando backend oficial de buffer local

## 5. Ambiente recomendado

Backend:

- `PCP_DATA_MODE=mock`
- `PCP_PORT=8876`
- `PCP_AUTH_TOKEN_SECRET=qa-secret`

Frontend:

- `npm run dev -- --host 127.0.0.1 --port 5173`

Credenciais uteis de reteste:

- `root / root@123`
- `manager_inplast / m123`
- `manager_multi / m123`
- `operator_inplast / o123`

## 6. Evidencias uteis ja geradas

- [web_react_manager_real_proxy_authenticated.png](/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/web_react_manager_real_proxy_authenticated.png)
- [web_react_real_proxy_session_expired.png](/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/web_react_real_proxy_session_expired.png)
- [web_react_operator_real_proxy_restrictions.png](/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/web_react_operator_real_proxy_restrictions.png)
- [web_react_manager_multi_real_proxy.png](/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/web_react_manager_multi_real_proxy.png)

## 7. Riscos residuais conhecidos

Nao marque como bug novo sem separar de risco residual:

- documentacao do projeto ainda pode citar `8765` em alguns pontos antigos
- `ProductionTracking` segue como superficie honesta, mas ainda nao e modulo operacional final
- `web-react/` ainda nao tem paridade completa com o legado `web/`

## 8. Resultado esperado do seu trabalho

Sua resposta deve dizer com clareza:

1. o `P0` do fluxo real do Vite ficou realmente fechado?
2. houve regressao em sessao, `401`, papel, multiempresa, `Kanban` ou `Romaneios`?
3. o `web-react/` pode seguir para a proxima fase?

Formato esperado:

- findings primeiro
- depois testes executados
- depois validacoes aprovadas
- depois riscos residuais confirmados
- depois recomendacao final de go/no-go

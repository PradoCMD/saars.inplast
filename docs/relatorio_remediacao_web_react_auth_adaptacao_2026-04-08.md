# Relatorio: Remediacao do Bloqueio de Integracao do `web-react/`

Data: 2026-04-08
Projeto: `saars.inplast`
Escopo desta etapa: correcao tecnica do bloqueio `P0` do `web-react/` no fluxo real do Vite
Status atual: correcao aplicada e validada no fluxo real, pronta para reteste independente
Destino deste relatorio: orientar o `TESTE Auditor` na rodada de confirmacao final do `web-react/`

## 1. Objetivo deste relatorio

Este documento consolida a remediacao tecnica aplicada apos o reteste do `web-react/` ter identificado um bloqueio real no fluxo normal de desenvolvimento.

O foco aqui nao e redesenhar a UI nem reabrir o backend.
O foco e explicar:

- qual era a causa real do bloqueio
- o que foi alterado
- como a correcao foi validada
- o que ainda permanece como risco residual fora do recorte desta rodada

Este relatorio nao altera `SPEC.json` nem `BACKLOG.json`.

## 2. Base usada nesta remediacao

Arquivos e handoffs lidos antes da correcao:

1. `SPEC.json`
2. `BACKLOG.json`
3. `docs/handoff_teste_auditor_web_react_auth_adaptacao_2026-04-08.md`
4. `docs/relatorio_ui_ux_web_react_auth_adaptacao_2026-04-08.md`
5. `docs/relatorio_teste_auditor_web_react_auth_adaptacao_2026-04-08.md`
6. `docs/handoff_code_reviewer_web_react_auth_adaptacao_2026-04-08.md`
7. `web-react/vite.config.js`
8. `web-react/src/App.jsx`
9. `web-react/src/components/Topbar.jsx`
10. `web-react/src/pages/KanbanBoard.jsx`
11. `web-react/src/pages/RomaneiosInbox.jsx`

## 3. Finding confirmado

### Finding unico desta remediacao

- Titulo: `web-react/` sobe pelo Vite apontando para backend errado no fluxo real
- Severidade: `P0`
- Status apos remediacao: corrigido e validado localmente

Causa confirmada:

- o shell React estava correto ao fazer `fetch` relativo para `/api/pcp/auth/login`
- o problema real estava no `vite.config.js`, que ainda mantinha proxy hardcoded para o backend legado em `8765`
- no ambiente atual da rodada, o backend autenticado valido estava em `8876`

Efeito observado antes da correcao:

- login valido falhava no fluxo real com `Route not found`
- nenhuma sessao era persistida
- a rodada parecia quebrada mesmo com o shell React se comportando bem quando ligado manualmente ao backend certo

Pontos tecnicos que confirmaram a causa:

- [web-react/vite.config.js:5](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/vite.config.js#L5)
- [web-react/vite.config.js:17](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/vite.config.js#L17)
- [web-react/src/App.jsx:462](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx#L462)

## 4. Correcao aplicada

Arquivo alterado:

- [web-react/vite.config.js](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/vite.config.js#L1)

O que mudou:

- remocao do hardcode direto para `http://localhost:8765`
- definicao de alvo padrao seguro para `http://127.0.0.1:8876`
- suporte a override de ambiente por:
  - `VITE_API_PROXY_TARGET`
  - `PCP_API_PROXY_TARGET`
  - `PCP_PORT`

Isso permite:

- manter o setup local da rodada funcionando sem override manual
- evitar novo acoplamento cego a uma porta legada
- continuar claro e previsivel para outros ambientes

Importante:

- nao houve alteracao em `App.jsx`
- nao houve alteracao em auth, RBAC, `company_scope` ou logica de sessao
- nao houve alteracao nas regras visuais ja aprovadas de papel, `Kanban` ou `Romaneios`

## 5. O que foi preservado

Durante a remediacao, os comportamentos abaixo foram preservados e confirmados:

- sessao em `pcp_app_session_v1`
- reset completo em `401`
- logout limpo
- `manager` com `MRP` e `Sincronizar`
- `operator` sem `MRP`
- `operator` sem `Sincronizar`
- `operator` sem ingestao local de romaneios
- multiempresa exigindo empresa ativa
- `Kanban` honesto, sem mutacao fake
- `Romaneios` separando backend oficial de buffer local

Pontos de referencia no codigo:

- [web-react/src/App.jsx:263](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx#L263)
- [web-react/src/App.jsx:282](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx#L282)
- [web-react/src/App.jsx:495](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx#L495)
- [web-react/src/App.jsx:520](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx#L520)
- [web-react/src/App.jsx:732](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx#L732)
- [web-react/src/components/Topbar.jsx:70](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx#L70)
- [web-react/src/components/Topbar.jsx:81](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx#L81)
- [web-react/src/pages/RomaneiosInbox.jsx:229](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx#L229)

## 6. Validacoes executadas

### Checks de consistencia

Executado com sucesso em `web-react/`:

- `npm run lint`
- `npm run build`

### Smoke HTTP no fluxo real do Vite

Ambiente usado:

- backend autenticado em `8876`
- Vite em `5173`

Caso validado:

- `POST http://127.0.0.1:5173/api/pcp/auth/login`
- credenciais: `manager_inplast / m123`

Resultado:

- `200`
- usuario `manager_inplast`
- papel `manager`

### Reteste browser-level no fluxo real

Ambiente usado:

- `PCP_DATA_MODE=mock`
- `PCP_PORT=8876`
- `PCP_AUTH_TOKEN_SECRET=qa-secret`
- `web-react` via `npm run dev -- --host 127.0.0.1 --port 5173`

Casos validados:

1. login real de `manager_inplast`
2. persistencia de sessao apos reload
3. logout
4. reset em `401`
5. `operator_inplast` sem `MRP`
6. `operator_inplast` sem `Sincronizar`
7. `operator_inplast` com ingestao local travada em `Romaneios`
8. `manager_multi` exigindo selecao de empresa
9. liberacao do `Kanban` apos selecao de empresa

Resultados observados:

- `manager_inplast` autenticou e persistiu sessao
- logout removeu a sessao e voltou para a tela de login
- `401` voltou para login e limpou `localStorage`
- `operator` ficou com `MRP` e `Sincronizar` desabilitados
- o buffer local de `Romaneios` ficou travado para `operator`
- `manager_multi` recebeu banner de empresa obrigatoria e o `Kanban` so abriu apos escolha de empresa

## 7. Evidencias geradas

Artefatos desta remediacao:

- [web_react_manager_real_proxy_authenticated.png](/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/web_react_manager_real_proxy_authenticated.png)
- [web_react_real_proxy_session_expired.png](/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/web_react_real_proxy_session_expired.png)
- [web_react_operator_real_proxy_restrictions.png](/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/web_react_operator_real_proxy_restrictions.png)
- [web_react_manager_multi_real_proxy.png](/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/web_react_manager_multi_real_proxy.png)

## 8. Riscos residuais

Os itens abaixo continuam como risco residual conhecido e nao devem ser confundidos com regressao desta remediacao:

- referencias antigas a `8765` ainda existem em parte da documentacao operacional
- `ProductionTracking` continua mais perto de storyboard do que de modulo operacional final
- `web-react/` ainda nao cobre todos os modulos do legado `web/`
- multiempresa estrutural do produto continua sendo tema maior do backend, nao desta rodada de proxy

## 9. Recomendacao para o TESTE Auditor

O proximo TESTE Auditor deve fazer um reteste de confirmacao, nao um reboot da investigacao.

Prioridade recomendada:

1. confirmar que o `P0` do proxy/base URL realmente ficou fechado no fluxo real do Vite
2. confirmar que sessao, `401`, papel e multiempresa continuaram intactos
3. separar claramente regressao real de gap residual conhecido
4. emitir recomendacao final objetiva de go/no-go para a proxima fase

## 10. Conclusao

Esta remediacao fechou o unico bloqueio real que impedia o `web-react/` de funcionar no fluxo normal do Vite.

O resultado pratico e importante:

- o shell React ja nao depende de override manual para autenticar
- o contrato aprovado de sessao e permissao continuou preservado
- o projeto agora esta em condicao adequada para um reteste final independente do `web-react/`

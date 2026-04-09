# Relatorio: Reteste Auditor do `web-react` apos implementacao de `Governanca de Fontes` e estados centrais de `Cockpit`

Data: 2026-04-09
Projeto: `saars.inplast`
Escopo desta etapa: retestar de forma independente a nova fatia do `web-react/` centrada em `Governanca de Fontes` e `Cockpit`, preservando auth, sessao, `401`, papel, multiempresa, proxy do Vite, `Kanban` honesto e `Romaneios` com separacao oficial vs buffer
Status final desta rodada: `no-go`

## 1. Resumo executivo

O reteste encontrou dois bloqueios reais:

1. `POST /api/pcp/sources/sync` reabriu uma falha de auth/RBAC no backend e aceita chamada sem autenticacao efetiva.
2. o `web-react/` nao sobe limpo em ambiente fresco e falha no build por import nao resolvido de `KanbanBoard`.

Ao mesmo tempo, a leitura funcional da nova superficie foi boa enquanto o app ainda estava rodando em sessao aquecida:

- `Governanca de Fontes` se comportou como tela real para `manager`
- `operator` viu a leitura liberada com bloqueios honestos de sync
- `manager_multi` continuou exigindo empresa em `Cockpit` e `Kanban`, mas conseguiu abrir `Governanca` sem bloqueio artificial
- `Romaneios` continuou honesto sobre backend oficial e buffer local

Traducao pratica:

- a direcao de produto da nova tela foi boa
- a rodada nao pode ser liberada porque reabriu seguranca no backend e deixou o frontend incapaz de subir de forma confiavel em ambiente limpo

## 2. Findings

### 2.1 BLOQUEANTE: `POST /api/pcp/sources/sync` aceita chamadas sem auth/RBAC efetivo

Severidade: BLOQUEANTE

Area afetada:

- backend
- auth/RBAC
- integracoes criticas de fontes

Passos para reproduzir:

1. subir backend mock autenticado em `8876`
2. subir Vite em `5173`
3. chamar `POST http://127.0.0.1:5173/api/pcp/sources/sync` sem token
4. chamar a mesma rota com token de `operator`

Resultado esperado:

- sem token: `401`
- com `operator`: `403`
- sync de fontes so pode ser disparado por perfil com permissao real de `sources.sync`

Resultado atual:

- sem token: `200`
- com `operator`: `200`
- o backend responde `mock_synced`

Evidencias:

- [sync_noauth.json](/tmp/sync_noauth.json)
- [sync_operator.json](/tmp/sync_operator.json)
- [server.py:1168](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1168)
- [server.py:1457](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1457)

Impacto operacional:

- qualquer cliente pode disparar uma mutacao critica de integracao
- a UI bloqueia o `operator`, mas o backend nao sustenta a regra
- isso reabre um P0 de seguranca logo numa rota que acabou de entrar no shell oficial

Hipotese da causa:

- quando `sync_api_token` nao esta configurado, `authorize_sync()` devolve `True`
- nesse caminho, a rota nao chama `require_authorized_user(permission="sources.sync")`

Recomendacao objetiva:

- exigir auth e permissao de `sources.sync` sempre
- tratar `sync_api_token` apenas como controle adicional, nunca como substituto de auth/RBAC do modulo

### 2.2 BLOQUEANTE: `web-react/` falha em ambiente fresco por import nao resolvido de `KanbanBoard`

Severidade: BLOQUEANTE

Area afetada:

- frontend
- boot do shell oficial
- build e startup limpo

Passos para reproduzir:

1. entrar em `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react`
2. rodar `npm run build`
3. ou reiniciar o Vite e abrir a pagina do zero

Resultado esperado:

- build fecha com sucesso
- Vite sobe limpo
- shell React abre de forma confiavel em sessao fresca

Resultado atual:

- `npm run build` falha com `UNRESOLVED_IMPORT`
- o Vite acusa falha para resolver `./pages/KanbanBoard`
- depois do restart limpo, o browser cai em tela vazia ou reload quebrado

Evidencias:

- [App.jsx:8](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx#L8)
- [src/pages](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages)

Saida do build:

- `Could not resolve './pages/KanbanBoard' in src/App.jsx`

Impacto operacional:

- a nova rodada nao e reproduzivel de forma limpa
- o reteste de `401` e de boot do shell fica contaminado por falha estrutural de import
- isso bloqueia qualquer continuidade segura da fatia

Hipotese da causa:

- arquivo `KanbanBoard.jsx` ausente em `src/pages`
- `App.jsx` continua importando esse modulo como dependencia obrigatoria

Recomendacao objetiva:

- restaurar o arquivo esperado ou corrigir o import para o modulo real
- so considerar a rodada liberada quando `npm run build` e startup limpo passarem de novo

## 3. Testes executados

### 3.1 Leitura de contexto e codigo

Arquivos-base lidos:

1. [SPEC.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json)
3. [handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md)
4. [relatorio_implementation_ux_ui_engineer_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_implementation_ux_ui_engineer_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md)
5. [App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx)
6. [Cockpit.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx)
7. [SourcesGovernance.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx)
8. [Topbar.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx)
9. [server.py](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py)

### 3.2 Smoke HTTP real

Casos executados:

1. login de `manager_inplast`
2. login de `operator_inplast`
3. login de `manager_multi`
4. `GET /api/pcp/sources` com `manager`
5. `GET /api/pcp/sources` com `manager_multi` sem empresa
6. `GET /api/pcp/overview` com `manager_multi` sem `company_code`
7. `POST /api/pcp/sources/sync` sem token
8. `POST /api/pcp/sources/sync` com `operator`

Resultados principais:

- `sources` com `manager_multi` sem empresa: `200`
- `overview` com `manager_multi` sem empresa: `422`
- `sources/sync` sem token: `200`
- `sources/sync` com `operator`: `200`

### 3.3 Browser retest

Fluxos executados:

1. `Governanca de Fontes` com `manager`
2. `Governanca de Fontes` com `operator`
3. `Governanca de Fontes` com `manager_multi` sem empresa
4. `Cockpit` com novos paineis de fontes e alertas
5. regressao curta de `Kanban`
6. regressao curta de `Romaneios`
7. logout e troca de perfis
8. tentativa de regressao de `401`

### 3.4 Ambiente limpo

Checks executados:

- restart limpo do Vite
- `npm run build`

Resultado:

- o build falhou
- o Vite revelou erro estrutural de import

## 4. Validacoes aprovadas

Apesar do `no-go`, os seguintes pontos passaram:

### 4.1 `Governanca de Fontes` com `manager`

Passou visualmente.

O modulo exibiu:

- resumo de saude
- ultimo sucesso valido
- alertas centrais
- lista por fonte
- sync global e por fonte

### 4.2 `Governanca de Fontes` com `operator`

Passou visualmente.

O modulo exibiu:

- leitura liberada
- `Sync bloqueado` no topo
- `Sync bloqueado por papel` na tela
- explicacao honesta de papel sem affordance enganosa

### 4.3 `manager_multi` sem empresa

Passou no comportamento esperado de escopo:

- `Cockpit` seguiu exigindo empresa
- `Kanban` seguiu exigindo empresa
- `Governanca` abriu sem bloqueio artificial

### 4.4 `Romaneios`

Seguiu honesto sobre oficial vs buffer local.

## 5. Riscos residuais

Pontos que continuam fora do escopo desta rodada ou nao devem virar finding novo automaticamente:

- modulos em transicao honestos
- `ProductionTracking` ainda nao ser modulo operacional final
- ambiente mock continuar usando dados estaticos e stale em parte das telas

Mas estes riscos residuais nao anulam os dois bloqueios encontrados.

## 6. Recomendacao final

`No-go`.

Ordem recomendada:

1. devolver para o `CODE Reviewer`
2. corrigir o bypass de auth/RBAC em `sources.sync`
3. restaurar build e startup limpo do `web-react`
4. rodar reteste curto focado em:
   - `POST /api/pcp/sources/sync` sem token
   - `POST /api/pcp/sources/sync` com `operator`
   - `npm run build`
   - boot limpo do Vite
   - regressao de `401`

# Relatorio: Reteste Auditor Pos-Remediacao de `Governanca de Fontes` e `Cockpit` no `web-react`

Data: 2026-04-09
Projeto: `saars.inplast`
Escopo desta etapa: confirmar o fechamento dos `P0` da rodada anterior e rodar regressao curta em `Governanca de Fontes`, `Cockpit`, `Kanban`, `Romaneios`, auth, sessao e `401`
Status final desta rodada: `no-go`

## 1. Resumo executivo

O reteste independente nao confirmou a remediacao como fechada.

Os dois `P0` que deveriam estar resolvidos continuam com problema objetivo:

1. `POST /api/pcp/sources/sync` segue aceitando chamada sem auth/RBAC efetivo.
2. o `web-react/` segue sem fechar build/startup limpo no worktree atual por import nao resolvido de `KanbanBoard`.

Ao mesmo tempo, a camada visual e funcional da nova superficie continuou boa quando avaliada em sessao aquecida:

- `Governanca de Fontes` ficou coerente para `manager`
- `operator` segue vendo bloqueios honestos
- `manager_multi` continua podendo abrir `Governanca` sem empresa
- `Cockpit` e `Kanban` continuam exigindo empresa quando o contrato pede
- `Romaneios` segue honesto sobre backend oficial vs buffer local

Traducao pratica:

- a direcao de produto da fatia continua boa
- a rodada nao pode seguir porque os dois bloqueios tecnicos continuam reproduziveis

## 2. Findings

### 2.1 BLOQUEANTE: `POST /api/pcp/sources/sync` continua aceitando chamadas sem auth/RBAC efetivo

Severidade: BLOQUEANTE

Area afetada:

- backend
- auth/RBAC
- mutacao critica de fontes

Passos para reproduzir:

1. subir backend mock autenticado em `8876`
2. chamar `POST /api/pcp/sources/sync` sem token
3. chamar `POST /api/pcp/sources/sync` com token de `operator_inplast`

Resultado esperado:

- sem token: `401`
- com `operator`: `403`
- somente perfil com permissao real de `sources.sync` deve conseguir sucesso

Resultado atual:

- sem token: `200`
- com `operator`: `200`
- o backend retorna `mock_synced`

Evidencias:

- [sync_noauth.json](/tmp/sync_noauth.json)
- [sync_operator.json](/tmp/sync_operator.json)
- [server.py](/Users/sistemas2/Documents/Playground%202/saars.inplast/server.py#L1168)
- [server.py](/Users/sistemas2/Documents/Playground%202/saars.inplast/server.py#L1457)

Impacto operacional:

- a rota critica pode ser disparada sem sessao valida
- a UI promete bloqueio de papel, mas o backend nao sustenta a regra
- isso reabre um P0 de seguranca exatamente na nova camada oficial do shell

Hipotese da causa:

- `authorize_sync()` continua servindo como atalho
- quando `sync_api_token` nao esta configurado, o fluxo nao obriga `require_authorized_user(permission="sources.sync")`

Recomendacao objetiva:

- tornar auth do usuario e permissao `sources.sync` obrigatorias sempre
- tratar qualquer token adicional de sync apenas como camada extra, nunca como substituto de auth/RBAC

### 2.2 BLOQUEANTE: `web-react/` continua quebrando em build/startup limpo por import nao resolvido de `KanbanBoard`

Severidade: BLOQUEANTE

Area afetada:

- frontend
- boot do shell oficial
- build e startup limpo

Passos para reproduzir:

1. entrar em `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react`
2. rodar `npm run build`
3. reiniciar o Vite e abrir a pagina em sessao fresca

Resultado esperado:

- build fecha com sucesso
- Vite sobe limpo
- shell React abre de forma confiavel em ambiente fresco

Resultado atual:

- `npm run build` falha com `Could not resolve './pages/KanbanBoard' in src/App.jsx`
- o restart limpo do Vite exibe erro estrutural de import
- a abertura fresca do shell fica comprometida

Evidencias:

- [App.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L8)
- [src/pages](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages)

Impacto operacional:

- a rodada nao e reproduzivel de forma limpa
- o reteste de `401` e de sessao fresca fica contaminado por problema estrutural de frontend
- isso bloqueia continuidade segura da fatia

Hipotese da causa:

- `App.jsx` continua importando `./pages/KanbanBoard`
- o modulo esperado nao esta presente no worktree atual

Recomendacao objetiva:

- restaurar o modulo real esperado ou corrigir o import para o arquivo existente
- so considerar a rodada liberada quando `npm run build` e boot limpo passarem de novo

## 3. Testes executados

### 3.1 Leitura de contexto e codigo

Arquivos-base lidos nesta rodada:

1. [prompt_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/prompt_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md)
2. [handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md)
3. [relatorio_remediacao_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_remediacao_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md)
4. [handoff_implementation_ux_ui_engineer_web_react_proxima_camada_operacional_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/handoff_implementation_ux_ui_engineer_web_react_proxima_camada_operacional_2026-04-08.md)
5. [relatorio_ui_ux_web_react_proxima_camada_operacional_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_ui_ux_web_react_proxima_camada_operacional_2026-04-08.md)
6. [SPEC.json](/Users/sistemas2/Documents/Playground%202/saars.inplast/SPEC.json)
7. [BACKLOG.json](/Users/sistemas2/Documents/Playground%202/saars.inplast/BACKLOG.json)
8. [server.py](/Users/sistemas2/Documents/Playground%202/saars.inplast/server.py)
9. [App.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx)
10. [Cockpit.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/Cockpit.jsx)
11. [SourcesGovernance.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/SourcesGovernance.jsx)

### 3.2 Smoke HTTP real

Casos executados:

1. login de `manager_inplast`
2. login de `operator_inplast`
3. login de `manager_multi`
4. `GET /api/pcp/sources` com `manager_multi` sem empresa
5. `GET /api/pcp/overview` com `manager_multi` sem `company_code`
6. `POST /api/pcp/sources/sync` sem token
7. `POST /api/pcp/sources/sync` com `operator`

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
- o startup limpo revelou erro estrutural de import

## 4. Validacoes aprovadas

Apesar do `no-go`, estes comportamentos permaneceram corretos no reteste:

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
- bloqueio honesto sem CTA enganoso

### 4.3 `manager_multi` sem empresa

Passou conforme contrato:

- `Governanca` abre sem bloqueio artificial
- `Cockpit` exige empresa
- `Kanban` exige empresa

Evidencias auxiliares:

- [sources_multi.json](/tmp/sources_multi.json)
- [overview_multi.json](/tmp/overview_multi.json)

### 4.4 `Romaneios`

Passou na regressao curta.

Continuou deixando claro:

- o que e backend oficial
- o que e buffer local
- que nao existe mistura silenciosa entre as duas fontes

## 5. Riscos residuais

Os pontos abaixo continuam como risco residual ou limitacao desta rodada:

- a regressao limpa de `401` nao pode ser assinada nesta rodada porque o boot fresco do shell continua quebrando
- os modulos em transicao fora do foco deste reteste nao devem virar finding novo sem evidencia de regressao objetiva
- a direcao funcional de `Governanca` e `Cockpit` continua boa, mas isso nao compensa os dois bloqueios estruturais

## 6. Recomendacao final

Recomendacao: devolver para `CODE Reviewer`.

Ordem recomendada da proxima etapa:

1. corrigir o bypass de auth/RBAC em `POST /api/pcp/sources/sync`
2. restaurar integridade de build/startup limpo do `web-react`
3. devolver para reteste curto do QA

Conclusao:

- a rodada continua em `no-go`
- os dois `P0` ainda exigem remediacao tecnica
- a base visual pode ser preservada, mas a fundacao tecnica precisa ser fechada antes da proxima fase

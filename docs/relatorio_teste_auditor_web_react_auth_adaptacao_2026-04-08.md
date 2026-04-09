# Relatorio: TESTE Auditor do `web-react/` Pos-Adaptacao ao Contrato Autenticado

Data: 2026-04-08
Projeto: `saars.inplast`
Escopo desta rodada: reteste dirigido do `web-react/` como interface alvo oficial, com foco em auth, sessao, papel, multiempresa, estados obrigatorios de interface e honestidade operacional
Status geral: reteste concluido com 1 bloqueio real aberto
Recomendacao atual: nao devolver a rodada para nova implementacao frontend/fullstack antes de corrigir o acoplamento do `web-react/` ao backend autenticado correto

## 1. Objetivo da rodada

Validar se o `web-react/` realmente passou a operar como shell autenticado do produto, respeitando:

- login real via backend atual
- persistencia de sessao
- reset completo em `401`
- affordances corretas por papel
- multiempresa com exigencia de `company_code` quando aplicavel
- estados `loading`, `403`, `422`, `empty`, `stale_data` e `session_expired`
- honestidade operacional em `Cockpit`, `Kanban` e `Romaneios`

Direcao obrigatoria desta rodada:

- `web-react/` tratado como UI alvo
- `web/` usado apenas como referencia auxiliar de comportamento autenticado
- backend auth/RBAC nao deveria ser reaberto sem evidencia objetiva

## 2. Base lida antes do reteste

Arquivos principais utilizados nesta rodada:

1. [prompt_teste_auditor_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/prompt_teste_auditor_web_react_auth_adaptacao_2026-04-08.md)
2. [handoff_teste_auditor_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/handoff_teste_auditor_web_react_auth_adaptacao_2026-04-08.md)
3. [relatorio_ui_ux_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_ui_ux_web_react_auth_adaptacao_2026-04-08.md)
4. [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx)
5. [web-react/src/components/Topbar.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/Topbar.jsx)
6. [web-react/src/components/Sidebar.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/Sidebar.jsx)
7. [web-react/src/components/StatePanel.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/StatePanel.jsx)
8. [web-react/src/pages/Cockpit.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/Cockpit.jsx)
9. [web-react/src/pages/KanbanBoard.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/KanbanBoard.jsx)
10. [web-react/src/pages/RomaneiosInbox.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx)
11. [web-react/src/pages/ProductionTracking.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/ProductionTracking.jsx)
12. [web-react/vite.config.js](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/vite.config.js)

## 3. Ambiente e estrategia de execucao

### Ambiente usado

- backend mock autenticado:
  - `PCP_DATA_MODE=mock`
  - `PCP_AUTH_TOKEN_SECRET=qa-secret`
  - `PCP_PORT=8876`
- frontend React via Vite:
  - `http://127.0.0.1:5173`

### Estrategia adotada

Foram feitas duas camadas de validacao:

1. Reteste real do `web-react/` como o desenvolvedor sobe a aplicacao no dia a dia, sem shim local de API.
2. Reteste browser-level com Playwright roteando `/api` para o backend autenticado correto em `8876`, apenas para separar:
   - bug real de acoplamento/ambiente do frontend
   - comportamento interno real do shell React quando conversa com o contrato certo

Isso foi necessario porque a rodada pedia explicitamente para nao reabrir backend auth sem evidencia. O uso da segunda camada de teste permitiu provar que o problema novo nasce na integracao do `web-react/`, nao no backend ja validado.

## 4. Testes executados

### 4.1 Reteste real sem override de API

Caso executado:

- subir Vite em `5173`
- tentar login valido de `manager_inplast`

Resultado:

- o login falhou com mensagem `Route not found`

Conclusao:

- o frontend nao estava apontando para o backend autenticado da rodada

Evidencia:

- [web_react_real_proxy_login_failure.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_real_proxy_login_failure.png)

### 4.2 Reteste guiado do shell React com backend correto

Casos executados com Playwright:

- login valido `manager_inplast`
- login valido `root`
- login valido `operator_inplast`
- login invalido com senha errada
- persistencia de sessao apos reload
- logout
- reset completo em `401`
- `manager_multi` com selecao obrigatoria de empresa
- `operator` com `MRP` e `Sincronizar` desabilitados
- `operator` bloqueado no buffer local de romaneios
- `loading`, `403`, `422/company`, `empty`, `stale_data`
- placeholders em transicao controlada

Evidencias visuais:

- [web_react_manager_shell_authenticated.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_manager_shell_authenticated.png)
- [web_react_root_scope.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_root_scope.png)
- [web_react_operator_restrictions.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_operator_restrictions.png)
- [web_react_session_expired_401.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_session_expired_401.png)
- [web_react_multi_company_flow_fixed.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_multi_company_flow_fixed.png)
- [web_react_stale_state.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_stale_state.png)
- [web_react_placeholder_honest.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_placeholder_honest.png)

## 5. Resultado por bloco

### 5.1 Auth e sessao

Resultado:

- aprovado no shell React quando ligado ao backend autenticado correto
- reprovado no fluxo real de Vite atual

O que passou:

- login valido
- login invalido com feedback coerente
- persistencia de sessao em `pcp_app_session_v1`
- logout
- limpeza de sessao e retorno ao login em `401`

Pontos do codigo confirmados:

- chamada de login em [App.jsx:456](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L456)
- persistencia e aplicacao de sessao em [App.jsx:328](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L328)
- reset completo em [App.jsx:344](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L344)
- tratamento de `401` em [App.jsx:282](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L282)

### 5.2 Papel e permissoes visiveis

Resultado:

- aprovado

Validado:

- `root` com `MRP` e `Sincronizar` habilitados
- `manager` com `MRP` e `Sincronizar` habilitados
- `operator` com `MRP` e `Sincronizar` desabilitados
- `operator` sem ingestao local de romaneios
- navegacao filtrada pelo papel

Pontos do codigo confirmados:

- affordances no topo em [Topbar.jsx:70](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/Topbar.jsx#L70) e [Topbar.jsx:81](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/Topbar.jsx#L81)
- roteamento por permissao em [App.jsx:321](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L321)
- bloqueio de ingestao em [RomaneiosInbox.jsx:200](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx#L200) e [RomaneiosInbox.jsx:229](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx#L229)

### 5.3 Multiempresa

Resultado:

- aprovado no shell React quando ligado ao backend correto

Validado:

- banner exigindo empresa
- `Cockpit` bloqueado sem empresa
- `Kanban` bloqueado sem empresa
- `Romaneios` bloqueando escrita sem empresa
- liberacao do fluxo apos selecao de empresa

Pontos do codigo confirmados:

- deteccao de multiempresa em [App.jsx:320](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L320)
- mapeamento de `422 missing_company_code` em [App.jsx:396](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L396)
- banner de shell em [App.jsx:732](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L732)

### 5.4 Estados obrigatorios de interface

Resultado:

- aprovado

Validado:

- `loading`
- `permission`
- `company`
- `empty`
- `stale_data`
- `session_expired`

Observacao:

- a padronizacao via `StatePanel` e consistente e melhora a honestidade da interface

### 5.5 Honestidade operacional

Resultado:

- aprovado com ressalva residual conhecida em `ProductionTracking`

Validado:

- `Kanban` sem interacao fake e com comunicacao clara de leitura fiel em [KanbanBoard.jsx:127](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/KanbanBoard.jsx#L127) e [KanbanBoard.jsx:235](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/KanbanBoard.jsx#L235)
- `Romaneios` diferenciando backend oficial de buffer local em [RomaneiosInbox.jsx:209](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx#L209) e [RomaneiosInbox.jsx:244](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx#L244)
- placeholders honestos em [App.jsx:607](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L607)

Ressalva:

- `ProductionTracking` continua mais proximo de storyboard/roteiro visual do que de modulo integrado, mas o texto deixa isso claro nesta rodada em [ProductionTracking.jsx:384](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/ProductionTracking.jsx#L384) e [ProductionTracking.jsx:495](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/ProductionTracking.jsx#L495)

## 6. Finding priorizado

### Finding unico aberto

- Titulo: `web-react` sobe pelo Vite apontando para backend errado e falha login valido
- Severidade: P0
- Area afetada: integracao real do frontend oficial com a camada autenticada

Passos para reproduzir:

1. Subir backend autenticado da rodada em `8876`
2. Subir o `web-react/` via `npm run dev -- --host 127.0.0.1 --port 5173`
3. Abrir `http://127.0.0.1:5173`
4. Tentar login com `manager_inplast / m123`

Resultado esperado:

- o login deveria bater em `POST /api/pcp/auth/login` no backend autenticado da rodada e autenticar o usuario

Resultado atual:

- a UI recebe `Route not found`
- nenhuma sessao e persistida
- o shell nao entra

Evidencia tecnica:

- proxy hardcoded para `8765` em [vite.config.js:6](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/vite.config.js#L6) e [vite.config.js:8](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/vite.config.js#L8)
- login faz `fetch` relativo em [App.jsx:462](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L462)
- `http://127.0.0.1:8765/api/pcp/auth/login` devolveu `404 Route not found` no reteste
- `http://127.0.0.1:8876/api/pcp/auth/login` devolveu `200`

Impacto operacional:

- o `web-react/` ainda nao e utilizavel como interface oficial no fluxo real de desenvolvimento
- a rodada aparenta estar pronta pelo shell interno, mas falha antes de entrar no produto quando usada da forma normal

Hipotese da causa:

- a adaptacao da UI foi feita contra o contrato certo, mas o `vite.config.js` permaneceu amarrado a um backend legado em `8765`

Recomendacao objetiva:

- alinhar o proxy/base URL do frontend com o backend autenticado desta rodada
- de preferencia evitar novo hardcode se a direcao do projeto for manter portas variaveis por ambiente
- apos a correcao, revalidar login real sem override de rede

## 7. O que ficou confirmado como NAO regressao desta rodada

Os itens abaixo nao devem ser tratados como bug novo sem separar escopo:

- `ProductionTracking` ainda nao e integracao operacional final
- placeholders React ainda existem em modulos nao promovidos
- `web-react/` ainda nao cobre todos os modulos do `web/`

Esses pontos permaneceram honestos na UI e, por isso, nao foram marcados como regressao da rodada.

## 8. Conclusao

O reteste mostrou um quadro bem definido:

- o shell React em si amadureceu bastante
- auth, sessao, `401`, papel, multiempresa e estados de interface estao coerentes quando o frontend fala com o backend certo
- o bloqueio atual e de integracao do `web-react/` com o endpoint real usado no ambiente Vite

Portanto:

- a camada de UX e comportamento principal desta rodada esta majoritariamente boa
- mas a rodada continua `bloqueada` para a proxima fase ate a correcao do proxy/base URL

Recomendacao final:

1. corrigir o acoplamento do `web-react/` ao backend autenticado correto
2. validar login real sem shim
3. so entao devolver para nova rodada de implementacao frontend/fullstack

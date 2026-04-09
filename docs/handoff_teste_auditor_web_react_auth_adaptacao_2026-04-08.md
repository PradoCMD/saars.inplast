# Handoff: TESTE Auditor Pos-Adaptacao do `web-react/` ao Contrato Autenticado

Data: 2026-04-08
Projeto: `saars.inplast`
Responsavel anterior: UX/UI Design Engineer
Responsavel seguinte: TESTE Auditor
Status de entrada para teste: adaptacao do `web-react/` implementada e validada localmente por lint, build e smoke do contrato autenticado

## 1. Objetivo deste handoff

Passar para o `TESTE Auditor` o contexto necessario para validar a nova rodada do frontend React sem reabrir indevidamente a camada minima de auth ja estabilizada no backend.

O foco agora nao e testar `web/` como interface principal.
O foco agora e validar se o `web-react/` evoluiu de forma segura, honesta e operacional.

## 2. Leitura obrigatoria

Antes de testar, leia nesta ordem:

1. [SPEC.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json)
3. [handoff_backend_auth_minima.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_backend_auth_minima.md)
4. [handoff_qa_backend_auth_minima_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_qa_backend_auth_minima_2026-04-08.md)
5. [relatorio_remediacao_backend_auth_minima_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_remediacao_backend_auth_minima_2026-04-08.md)
6. [relatorio_teste_auditor_backend_auth_minima_pos_remediacao_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_backend_auth_minima_pos_remediacao_2026-04-08.md)
7. [handoff_ui_ux_design_engineer_backend_auth_minima_pos_teste_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_ui_ux_design_engineer_backend_auth_minima_pos_teste_2026-04-08.md)
8. [relatorio_ui_ux_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_ui_ux_web_react_auth_adaptacao_2026-04-08.md)
9. [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx)
10. [web-react/src/components/Topbar.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx)
11. [web-react/src/components/Sidebar.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Sidebar.jsx)
12. [web-react/src/components/StatePanel.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/StatePanel.jsx)
13. [web-react/src/pages/Cockpit.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx)
14. [web-react/src/pages/KanbanBoard.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx)
15. [web-react/src/pages/RomaneiosInbox.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx)
16. [web-react/src/pages/FactorySimulator.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/FactorySimulator.jsx)
17. [web-react/src/index.css](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/index.css)
18. [web/app.js](/Users/sistemas2/Documents/Playground 2/saars.inplast/web/app.js)

Importante:

- `web/` continua sendo apenas referencia auxiliar de comportamento autenticado
- o alvo principal do reteste agora e `web-react/`

## 3. O que mudou nesta rodada

### Shell e sessao

O `web-react/` agora possui:

- login real via `POST /api/pcp/auth/login`
- persistencia de sessao com `access_token` e `expires_at`
- limpeza de sessao e retorno ao estado nulo em `401`
- logout explicito

### Papel e permissao

A UI agora:

- limita navegacao e acoes conforme o papel autenticado
- nao exibe `MRP` como acao habilitada para `operator`
- nao exibe sincronizacao como acao habilitada quando a permissao nao existe
- nao libera ingestao local de romaneios para perfis sem permissao

### Multiempresa

A UI agora:

- mostra empresa ativa no shell
- permite selecao de empresa
- trava leituras agregadas quando o usuario tem multiempresa e a rota exige `company_code`
- trata `422 missing_company_code` como estado proprio da interface

### Modulos centrais

`Cockpit`:

- usa `overview` real
- usa contexto de snapshot
- trata stale/error/permission/company

`Kanban`:

- remove o foco em drag-and-drop fake
- mostra quadro read-only fiel ao backend
- trata leitura por empresa e por permissao

`Romaneios`:

- separa backend oficial de buffer local
- nao trata fila local como fonte oficial
- bloqueia upload/entrada manual quando o contexto nao permite

## 4. O que ja foi validado localmente

### Frontend

Executado com sucesso:

- `npm run lint`
- `npm run build`

### Smoke do contrato autenticado

Ambiente usado:

- `PCP_DATA_MODE=mock`
- `PCP_AUTH_TOKEN_SECRET=qa-secret`
- `PCP_PORT=8876`

Resultado local:

- `GET /api/pcp/overview` sem token retornou `401`
- login `root` com `root@123` retornou `access_token`
- `GET /api/pcp/overview` com token retornou `200` e payload coerente

Importante:

- isso nao substitui reteste browser-level do React
- apenas confirma que a camada nova aponta para o contrato certo

## 5. O que voce precisa testar agora

### Bloco A: auth e sessao do `web-react/`

1. Login valido
2. Login invalido
3. Persistencia de sessao
4. Logout
5. `401` forçado apos sessao autenticada

Confirmar especialmente:

- volta ao estado de login
- areas protegidas deixam de ficar acessiveis
- sessao some do `localStorage`
- nao sobra shell “parecendo autenticado”

### Bloco B: papel e acoes por perfil

Testar pelo menos:

- `root`
- `manager`
- `operator`

Confirmar:

- `manager` pode ver operacao e `MRP`, mas nao ganha affordance enganosa de admin React inexistente
- `operator` nao pode disparar `MRP`
- `operator` nao pode sincronizar fontes
- `operator` nao pode ingerir romaneios pelo fluxo local

### Bloco C: multiempresa

Objetivo:

- validar a UX quando o usuario precisa informar `company_code`

Confirmar:

- seletor de empresa visivel
- estado de bloqueio claro quando a empresa e obrigatoria
- ausencia de carga ambigua em `Cockpit` e `Kanban`

### Bloco D: estados obrigatorios da interface

Validar se o `web-react/` agora trata bem:

- `loading`
- `error`
- `empty`
- `permission_denied`
- `session_expired`
- `multi_company_selection_required`
- `stale_data`

### Bloco E: honestidade de produto

Esse bloco e importante.

Voce precisa verificar se a UI:

- parou de sugerir interacao fake onde ainda nao existe backend ligado
- diferencia backend oficial de buffer local
- evita comportamento de “prototipo visual com cara de pronto”

## 6. O que NAO deve ser marcado como bug novo sem criterio

Nao abrir como falha nova desta rodada, sem antes separar de gap conhecido:

- ausencia de modulo admin completo no `web-react/`
- falta de paridade completa com `web/`
- falta de mutacao real no `Kanban` React
- falta de governanca de fontes completa no React

Esses pontos podem ser registrados como gap residual, mas nao como regressao da rodada se a UI estiver honesta sobre isso.

## 7. Ambiente recomendado

Para reproduzir o comportamento mais proximo do validado:

- backend local com:
  - `PCP_DATA_MODE=mock`
  - `PCP_PORT=8876`
  - `PCP_AUTH_TOKEN_SECRET=qa-secret`
- frontend React com Vite

Se precisar usar o legado como oraculo auxiliar de comportamento:

- compare apenas o contrato de sessao e permissao
- nao trate o legado como produto final

## 8. Resultado esperado do seu trabalho

Seu resultado precisa responder:

1. O `web-react/` agora trata login, logout e `401` de forma correta?
2. A interface deixa claro o que cada papel pode ou nao pode fazer?
3. O multiempresa ficou claro e seguro na UX?
4. As telas centrais ficaram mais honestas e mais proximas de produto?
5. A rodada esta pronta para devolver o projeto para nova implementacao frontend/fullstack?

Formato esperado:

- findings primeiro
- depois testes executados
- depois validacoes aprovadas
- depois riscos residuais confirmados
- depois recomendacao final de go/no-go

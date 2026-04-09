# Relatorio: Adaptacao UX/UI do `web-react/` ao Contrato Autenticado

Data: 2026-04-08
Projeto: `saars.inplast`
Escopo desta etapa: evolucao da UI alvo do produto em `web-react/`, com foco em sessao autenticada, papel, escopo multiempresa e estados de interface confiaveis
Status atual: implementacao frontend aplicada e validada localmente por build, lint e smoke HTTP do contrato autenticado
Destino deste relatorio: orientar o `TESTE Auditor` na rodada seguinte de reteste do `web-react/`

## 1. Objetivo desta etapa

Esta rodada nao teve como objetivo redesenhar backend, reabrir auth ou mexer em RBAC.

O objetivo foi adaptar a interface React alvo do produto ao contrato que ja havia sido fechado e retestado no backend:

- login via `POST /api/pcp/auth/login`
- sessao via `Bearer token`
- reset completo em `401`
- leitura e acoes condicionadas por papel
- escopo multiempresa com exigencia de `company_code` quando necessario
- tratamento de `403`, `422`, `loading`, `empty`, `stale_data` e `session_expired`

Em paralelo, a etapa tambem precisou elevar a confianca visual da UI, reduzindo a sensacao de prototipo hardcoded em telas centrais como `Cockpit`, `Kanban` e `Romaneios`.

## 2. Base usada antes da implementacao

Arquivos e handoffs lidos como base:

1. `SPEC.json`
2. `BACKLOG.json`
3. `docs/handoff_backend_auth_minima.md`
4. `docs/handoff_qa_backend_auth_minima_2026-04-08.md`
5. `docs/relatorio_remediacao_backend_auth_minima_2026-04-08.md`
6. `docs/relatorio_teste_auditor_backend_auth_minima_pos_remediacao_2026-04-08.md`
7. `docs/handoff_ui_ux_design_engineer_backend_auth_minima_pos_teste_2026-04-08.md`
8. `docs/plans/2026-04-08-backend-auth-minima-design.md`
9. `server.py`
10. `web/app.js`
11. `web/index.html`
12. `web-react/src/App.jsx`
13. `web-react/src/pages/`
14. `web-react/src/components/`

Direcao de implementacao respeitada nesta rodada:

- `web-react/` tratado como UI alvo
- `web/` usado apenas como referencia auxiliar de comportamento autenticado
- nenhum ajuste em `SPEC.json`, `BACKLOG.json` ou backend para viabilizar a rodada

## 3. Diagnostico inicial confirmado

Antes da adaptacao, o `web-react/` ainda carregava varios sinais de UI prototipada:

### 3.1 Shell sem sessao real

- nao havia login funcional ligado ao backend
- nao havia persistencia de `access_token` e `expires_at`
- nao havia reset coerente de sessao em `401`
- a UI React ainda nao refletia claramente papel, empresa ativa ou expiracao de sessao

### 3.2 Papel e permissao pouco visiveis

- a interface nao tornava explicito o que `root`, `manager` e `operator` podiam ou nao executar
- acoes como `MRP` e sincronizacao nao estavam amarradas ao contrato de permissao do backend
- nao havia camada consistente de `permission_denied`

### 3.3 Multiempresa sem UX adequada

- o frontend nao tratava o caso de usuario multiempresa que precisa informar `company_code`
- faltava seletor visivel de empresa
- faltava estado claro para `422` do tipo `missing_company_code`

### 3.4 Sensacao de prototipo em modulos centrais

- `Cockpit` misturava leitura real com blocos e sinais hardcoded
- `Kanban` era visualmente forte, mas dependia de drag-and-drop ficticio sem backend real
- `Romaneios` misturava oficial e buffer local sem comunicar bem o que era apenas rascunho temporario

## 4. Direcao visual aplicada

Antes de consolidar o codigo, foi usado o Stitch para explorar a direcao do shell oficial.

Resultado util da exploracao:

- shell em linguagem de "control room" industrial
- contraste mais serio e operacional
- hierarquia mais forte para sessao, empresa e snapshot
- estados de sistema tratados como elementos de primeira classe, nao como mensagens perdidas no meio da tela

O objetivo nao foi copiar um layout gerado, e sim trazer para o codigo:

- contexto persistente
- atmosfera mais confiavel
- superfícies mais robustas
- leitura mais clara para cenarios de pressao operacional

## 5. O que foi implementado no `web-react/`

### 5.1 Shell autenticado de verdade

Arquivo principal:

- [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx)

O shell agora implementa:

- bootstrap de sessao por `localStorage`
- expiracao local via `expires_at`
- login real em `POST /api/pcp/auth/login`
- persistencia de `access_token`
- invalidacao completa em `401`
- recarga controlada dos recursos principais
- selecao de empresa ativa
- gating de navegacao e acoes por papel

Estados globais tratados:

- `anonymous`
- `authenticated`
- `expired`
- `loading`
- `permission`
- `company`
- `error`

### 5.2 Camada reutilizavel de estado

Novo componente criado:

- [web-react/src/components/StatePanel.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/StatePanel.jsx)

Esse componente passou a padronizar:

- `loading`
- `error`
- `empty`
- `permission`
- `session`
- `company`
- `stale`

Isso evita que cada tela invente sua propria linguagem de falha ou vazio.

### 5.3 Navegacao e topo alinhados ao contrato autenticado

Arquivos:

- [web-react/src/components/Sidebar.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Sidebar.jsx)
- [web-react/src/components/Topbar.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx)

Melhorias aplicadas:

- trilha visual de escopo ativo
- empresa ativa visivel
- usuario e papel visiveis
- freshness/snapshot em destaque
- `MRP` e `Sincronizar` condicionados a permissao
- logout explicito
- busca global com posicionamento consistente

### 5.4 Cockpit com dados reais e contexto de sistema

Arquivo:

- [web-react/src/pages/Cockpit.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx)

Mudancas principais:

- leitura do `overview` real
- leitura complementar do `romaneios-kanban`
- indicacao de escopo ativo
- indicacao de snapshot
- indicacao de dado stale
- cards metricos mais honestos
- radar de gargalos com base em `top_criticos`
- fallback explicito para `company_required`, `permission_denied`, `loading`, `error` e `empty`

### 5.5 Kanban sem mutacao fake

Arquivo:

- [web-react/src/pages/KanbanBoard.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx)

Mudancas principais:

- remocao do drag-and-drop local ficticio como comportamento principal
- agrupamento dos romaneios em colunas reais por previsao
- leitura de produtos criticos vindos do backend
- estado explicito de somente leitura quando nao ha mutacao ligada
- UX clara para multiempresa
- UX clara para falta de permissao

Decisao importante desta rodada:

- preferi uma tela confiavel e read-only a uma tela “interativa” que mentisse sobre a operacao real

### 5.6 Inbox de Romaneios com separacao entre oficial e buffer

Arquivos:

- [web-react/src/pages/RomaneiosInbox.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx)
- [web-react/src/pages/RomaneiosInbox.css](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.css)

Mudancas principais:

- romaneios do backend tratados como fonte oficial autenticada
- fila local tratada explicitamente como buffer temporario
- upload e entrada manual travados quando o papel nao pode ingerir
- bloqueio tambem quando falta empresa ativa no cenario multiempresa
- linguagem visual que diferencia “oficial” de “rascunho local”

Isso alinha a UI com a regra da SPEC:

- rascunho local pode existir como buffer temporario
- nunca como fonte oficial

### 5.7 Simuladores endurecidos para estados reais

Arquivo:

- [web-react/src/pages/FactorySimulator.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/FactorySimulator.jsx)

Melhorias:

- leitura do estado do recurso
- `loading`, `permission`, `error` e `empty`
- uso de memoizacao simples no lugar de `setState` desnecessario em efeito
- sem alterar a regra de negocio da simulacao horaria

### 5.8 Design system e shell visual

Arquivo principal:

- [web-react/src/index.css](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/index.css)

Consolidado nesta camada:

- novo sistema de cor e superficie
- hierarquia tipografica mais forte
- shell com cara de ambiente operacional
- responsividade desktop/mobile
- banners claros para stale, company selection e notices operacionais
- consistencia entre modulos centrais

## 6. O que deliberadamente nao foi feito

Para evitar reabrir escopo ou mascarar realidade:

- nao mexi em backend
- nao mexi em `SPEC.json` ou `BACKLOG.json`
- nao promovi admin de usuarios/integracoes para `web-react/` nesta rodada
- nao simulei mutacao de kanban sem contrato real ligado
- nao forcei paridade completa com `web/` em modulos ainda fora do foco

Ou seja:

- houve evolucao forte da UI oficial
- mas sem fingir que areas nao implementadas ja estao prontas

## 7. Validacoes executadas

### 7.1 Frontend

Executado em `web-react/`:

- `npm run lint`
- `npm run build`

Resultado:

- ambos aprovados

### 7.2 Smoke do contrato autenticado

Ambiente usado:

- `PCP_DATA_MODE=mock`
- `PCP_AUTH_TOKEN_SECRET=qa-secret`
- `PCP_PORT=8876`

Smoke validado:

- `401` em `GET /api/pcp/overview` sem token
- login `root` com `root@123`
- `GET /api/pcp/overview` autenticado com sucesso

Observacao:

- isso validou o alvo da integracao de sessao do frontend
- nao substitui reteste visual e funcional completo no browser

## 8. Gaps e riscos residuais que permanecem

Os itens abaixo continuam existindo, mas nao sao regressao desta rodada:

- `web-react/` ainda nao cobre todos os modulos do `web/`
- modulos administrativos (`users`, `integrations`) nao foram promovidos para React nesta fase
- o fluxo multiempresa no browser ainda precisa de reteste dedicado com usuario de escopo multiplo
- `Kanban` continua sem mutacao operacional real no React
- a governanca de fontes em React ainda nao foi fechada

## 9. O que o proximo TESTE Auditor precisa responder

O proximo teste precisa responder com objetividade:

1. O `web-react/` agora trata login, logout e `401` de forma coerente com o contrato autenticado?
2. A UI deixa claro o que `root`, `manager` e `operator` podem ou nao fazer?
3. O fluxo multiempresa fica claro quando `company_code` e obrigatorio?
4. As telas centrais pararam de parecer prototipo enganoso?
5. O `web-react/` esta mais proximo de substituir o `web/` como interface oficial?

## 10. Conclusao

Esta rodada entregou uma mudanca estrutural no frontend:

- o `web-react/` deixou de ser apenas uma casca visual desconectada do auth
- passou a operar com sessao, papel, empresa e estados obrigatorios de forma muito mais fiel ao backend atual
- tambem ganhou uma direcao visual mais robusta e menos prototipada

A recomendacao para a proxima etapa e:

1. reteste dirigido do `web-react/` por `TESTE Auditor`
2. se aprovado, seguir com nova rodada de implementacao frontend/fullstack para:
   - fechar mutacoes reais no React
   - expandir cobertura funcional dos modulos ainda em placeholder
   - aproximar definitivamente a UI React da substituicao do legado `web/`

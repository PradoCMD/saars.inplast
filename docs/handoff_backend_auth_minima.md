# Handoff: Backend Auth Minima

Data: 2026-04-08
Status da etapa: implementacao inicial concluida, revisada em segunda rodada, remediada apos QA e validada por checks de sintaxe, smoke e reteste funcional dirigido
Proxima etapa recomendada: reteste final de regressao sobre auth, RBAC, escopo multiempresa e legado `web/` antes de ampliar a camada para regras mais profundas ou partir para UI/UX

## Objetivo desta rodada

Fechar a primeira camada de seguranca do backend PCP sem redesenhar ainda o produto inteiro:

- autenticar via `Bearer token`
- proteger rotas criticas e administrativas
- aplicar RBAC minimo por papel
- introduzir `company_scope` no usuario
- registrar auditoria minima de login e acoes criticas
- manter o `web/` legado funcional para testes

## Atualizacao pos-QA desta rodada

O QA final abriu quatro findings principais. Nesta rodada de remediacao, os pontos abaixo foram corrigidos e retestados:

- `P0` provider `mock` agora aplica isolamento seguro em `overview` e `painel`; com isso, `romaneios-kanban` deixa de herdar produtos fora do escopo no fluxo validado
- `P1` respostas `401` no legado `web/` agora limpam sessao, reabrem a tela de login, travam o shell e reposicionam a UI em `#cockpit`
- `P1` o modulo `#usuarios` deixou de exibir fallback sintetico para perfis sem `users.read` e passa a mostrar estado explicito de acesso restrito
- `P2` eventos criticos de erro passaram a reaproveitar o ator autenticado resolvido na request, preservando `user_id`, `username`, `role` e `company_scope` no JSONL

Status pratico apos remediacao:

- findings `P0/P1` da rodada QA: corrigidos com validacao objetiva
- finding `P2` de auditoria: corrigido com validacao objetiva
- riscos restantes: estruturais, fora do recorte de alta confianca desta rodada

## Decisoes implementadas

- Papeis ativos: `root`, `manager`, `operator`
- `root` com acesso total
- `manager` com permissao operacional ampliada, sem admin de usuarios/integracoes
- `operator` com leitura operacional e apontamento
- token assinado pelo backend com:
  - `sub`
  - `role`
  - `company_scope`
  - `iat`
  - `exp`
- `company_scope` persistido:
  - no mock como campo do usuario
  - no Postgres dentro de `ops.app_user.meta_json`
- auditoria minima persistida em `data/security_audit.jsonl`

## Arquivos alterados

- `server.py`
- `backend/provider.py`
- `backend/queries.py`
- `backend/config.py`
- `web/app.js`
- `web/index.html`
- `docs/plans/2026-04-08-backend-auth-minima-design.md`

## O que foi implementado

### 1. Token e autenticacao

- `POST /api/pcp/auth/login` agora devolve:
  - `status`
  - `user`
  - `access_token`
  - `token_type`
  - `expires_at`
- token assinado com segredo vindo de:
  - `PCP_AUTH_TOKEN_SECRET`
  - fallback para `PCP_SYNC_API_TOKEN`
  - fallback final de desenvolvimento: `pcp-dev-auth-secret-change-me`
- TTL do token configuravel por `PCP_AUTH_TOKEN_TTL_SECONDS`

### 2. RBAC minimo no backend

Rotas agora protegidas com auth obrigatoria:

- leituras operacionais
- leituras administrativas
- mutacoes operacionais
- mutacoes administrativas

Rotas com protecao mais forte:

- `GET /api/pcp/users`
- `POST /api/pcp/users/save`
- `GET /api/pcp/integrations`
- `POST /api/pcp/integrations/save`
- `POST /api/pcp/runs/mrp`
- `POST /api/pcp/romaneios-kanban/update-date`
- `POST /api/pcp/romaneios/delete`
- `POST /api/pcp/romaneios-kanban/sync`
- `POST /api/pcp/romaneios/upload`
- `POST /api/pcp/romaneios/refresh`
- `POST /api/pcp/apontamento/save`
- `POST /api/pcp/apontamento/dispatch`
- `POST /api/pcp/structure-overrides`
- `POST /api/pcp/programming-entries`

### 3. Escopo multiempresa inicial

- `company_scope` passou a fazer parte do usuario normalizado
- `root` recebe `["*"]`
- o provider `mock` passou a aplicar filtro seguro em `overview` e `painel`, assumindo `INPLAST` como empresa padrao apenas quando o fixture nao traz metadado de empresa
- em leituras com suporte nativo:
  - `overview`
  - `painel`
  - `romaneios`
  - `romaneio detail`
  - `romaneios-kanban`
  o backend ja aplica o escopo ou exige `company_code` quando necessario

### 4. Auditoria minima

Eventos registrados em `data/security_audit.jsonl`:

- login com sucesso
- login negado
- tentativas negadas por auth/permissao/empresa
- acoes criticas com `success` ou `error`

Cada linha registra pelo menos:

- `recorded_at`
- `event_type`
- `status`
- `route`
- `method`
- `client_ip`
- `permission`
- `company_code`
- `user_id`
- `username`
- `role`
- `company_scope`

### 5. Ajuste tecnico no frontend legado `web/`

Foram feitos apenas ajustes de infraestrutura para teste:

- persistencia de `access_token` e `expires_at`
- envio automatico de `Authorization: Bearer ...`
- restauracao de sessao sem depender de `GET /users`
- limpeza automatica da sessao local em resposta `401`
- transicao visual completa para estado bloqueado/login apos `401`, com shell travado e volta para `#cockpit`
- pre-checagem cliente por rota/permissao para evitar chamadas sabidamente proibidas pelo papel autenticado
- modulo de usuarios alinhado ao backend:
  - apenas `root` administra usuarios
  - campo `company_scope` exposto no formulario
  - papel legado `planner` normalizado para `manager`
  - perfis sem `users.read` recebem estado vazio restrito, sem fallback local sintetico
- modulo de integracoes alinhado ao backend:
  - apenas `root` altera integracoes no legado

### 6. Endurecimento do contrato de usuarios

- `company_scope` passou a ser obrigatorio para usuarios nao root
- `root` passa a ser normalizado com escopo global `["*"]`
- aliases legados de papel agora sao normalizados:
  - `planner` -> `manager`
  - `apontamento` -> `operator`
- mutacao `POST /api/pcp/apontamento/sync-status` entrou no mapa de auditoria critica

Importante:

- `web-react/` nao foi adaptado nesta rodada
- o foco continuou sendo o backend

## Pontos ainda parciais

### Escopo multiempresa ainda parcial em algumas leituras

Nem todas as rotas de leitura hoje carregam `company_code` na estrutura de dados ou aceitam filtro por empresa no provider. Nesta rodada:

- onde o provider ja suportava, o escopo foi aplicado
- onde a resposta permitia filtro seguro no payload, o filtro foi aplicado
- onde isso ainda nao e confiavel, a rota ficou autenticada, mas ainda nao completamente isolada por empresa

### Escritas ainda nao exigem `company_code` em 100% dos contratos

Algumas mutacoes antigas ainda nao mandam empresa de forma padronizada. Nesta rodada:

- a permissao foi fechada
- o escopo de empresa e validado quando o payload informa empresa
- ainda falta padronizar `company_code` em todos os contratos de mutacao para chegar ao desenho final

### Visao consolidada multiempresa ainda nao esta completa em todos os GETs

- `romaneios` e detalhe ja respeitam escopo
- o vazamento reproduzido no QA para `overview`, `painel` e `romaneios-kanban` em modo `mock` foi corrigido nesta rodada
- ainda assim, `overview`, `painel` e `romaneios-kanban` seguem dependentes de suporte consistente por provider para consolidacao multiempresa mais profunda
- para alguns cenarios multiempresa, o tester deve verificar se ha necessidade de informar `company_code` explicitamente

### `MRP` segue sem serializacao definitiva

O endpoint agora exige autenticacao/permissao, mas:

- o lock/serializacao final do MRP nao foi fechado nesta rodada
- o comportamento por empresa ainda nao esta modelado ponta a ponta

### Auditoria ainda e minima e local

- o log esta persistido em arquivo local JSONL
- ainda nao existe servico unificado de auditoria no banco
- ainda nao ha consulta oficial de auditoria via API

## O que o proximo agente deve testar

### Autenticacao

1. Login valido de `root`, `manager` e `operator`
2. Login com senha invalida
3. Login com usuario inativo
4. Acesso sem token
5. Acesso com token malformado
6. Acesso com token expirado

### Permissao por papel

1. `root` acessa admin e operacao
2. `manager` nao acessa `GET/POST users` nem `GET/POST integrations`
3. `manager` consegue `runs.mrp`, `romaneios.write/delete`, `apontamento.dispatch`
4. `operator` nao consegue `runs.mrp`, admin, delete nem ingest
5. `operator` consegue leituras operacionais e `apontamento.save`
6. UI legado nao deve mais habilitar gestao de usuarios/integracoes para `manager`

### Escopo multiempresa

1. Usuario com uma empresa acessa `overview/painel` sem mandar `company_code`
2. Usuario com varias empresas recebe erro pedindo `company_code` em `overview/painel/romaneios-kanban`
3. Usuario fora do escopo recebe `403`
4. `romaneios` e `romaneio detail` nao devem vazar empresa fora do escopo
5. `users/save` deve falhar quando `manager/operator` forem salvos sem `company_scope`
6. `planner` legado salvo pela UI deve virar `manager` no backend

### Auditoria

1. Verificar linhas novas em `data/security_audit.jsonl`
2. Confirmar eventos de:
  - login sucesso
  - login falha
  - acesso negado
  - mutacao critica com sucesso
  - mutacao critica com erro
  - `apontamento.sync_status`

### Legado `web/`

1. Login continua funcionando
2. Sessao persiste no `localStorage`
3. Chamadas autenticadas enviam `Authorization`
4. `401` derruba a sessao local
5. Fluxos basicos do legado nao quebraram so por causa do token
6. Formulario de usuarios mostra e edita `company_scope`
7. `manager` nao deve conseguir editar usuarios nem integracoes pela UI
8. `carregarTudo` nao deve marcar carga parcial so porque a UI tentou chamar rotas administrativas proibidas para o papel atual

## Checks ja executados nesta etapa

- `PYTHONPYCACHEPREFIX=/tmp/pcp_pycache python3 -m py_compile server.py backend/provider.py backend/queries.py backend/config.py`
- smoke test de token:
  - emissao
  - roundtrip
  - permissao de papel
- smoke de usuario:
  - `root` normalizado com `["*"]`
  - `planner` normalizado para `manager`
- erro para usuario nao root sem `company_scope`
- `node --check web/app.js`
- `npm run build` em `web-react/`
- reteste HTTP em `mock` na porta `8876` com usuarios dedicados:
  - `qa_manager_recicla_fix` recebeu `overview` zerado, `painel` vazio e `romaneios-kanban` vazio
  - `qa_operator_inplast_fix` recebeu `403` em `POST /api/pcp/runs/mrp`
- reteste visual com Playwright no legado `web/`:
  - apos token invalido, a UI voltou para login, travou o shell, limpou `localStorage` e redirecionou para `#cockpit`
  - `manager` em `#usuarios` viu apenas estado de acesso restrito, sem card sintetico de `root`
- verificacao do `data/security_audit.jsonl`:
  - evento `mrp.run` com `status=error` preservou o ator autenticado no registro

## Riscos residuais que o proximo agente deve observar

- `web-react/` continua sem suporte ao novo fluxo de auth
- rotas antigas de leitura ainda nao estao todas completamente company-scoped
- algumas mutacoes aceitam empresa apenas quando o payload atual ja traz esse contexto
- a auditoria ainda nao esta centralizada no banco
- o `MRP` ainda nao tem lock/serializacao final

## Recomendacao para a proxima rodada depois dos testes

Se os testes passarem, a ordem recomendada e:

1. fechar `company_code` obrigatorio nas mutacoes restantes
2. ampliar o isolamento multiempresa nas leituras ainda parciais
3. adaptar `web-react/` ao token
4. evoluir auditoria para camada persistida oficial
5. fechar serializacao e contrato final do `MRP`

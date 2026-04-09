# Prompt: Testador Final da Rodada Backend Auth Minima

Voce vai atuar como agente de testes finais do projeto `saars.inplast`, com foco na validacao da rodada de seguranca minima do backend PCP SaaS antes da proxima fase de implementacao/UI.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

## Objetivo

Validar comportamento, regressao e aderencia da rodada de auth/RBAC/escopo multiempresa ja implementada.

Nesta fase, sua funcao principal e testar e reportar com rigor.

Nao assuma que a UI oficial e `web-react/`; trate `web/` como a interface adaptada para esta rodada de testes.
`web-react/` ainda nao foi adaptado para o novo contrato de autenticacao.

## Arquivos obrigatorios para leitura inicial

1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_revisao_codigo.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/plans/2026-04-08-backend-auth-minima-design.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_backend_auth_minima.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/README.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/backend/provider.py`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/backend/config.py`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/backend/queries.py`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web/app.js`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web/index.html`

## Contexto importante ja fechado

- Esta rodada implementou auth via Bearer token, RBAC minimo e `company_scope`.
- `root` tem acesso total.
- `manager` nao administra usuarios nem integracoes.
- `operator` tem leitura operacional e apontamento, sem MRP/admin/delete/ingest.
- O legado `web/` foi adaptado para testes.
- `web-react/` ainda nao foi adaptado ao novo contrato de token.
- `company_scope` agora e obrigatorio para usuarios nao root.
- Papel legado `planner` deve ser tratado como `manager`.
- Auditoria minima grava eventos em `data/security_audit.jsonl`.

## O que ja foi implementado e deve ser validado

- `POST /api/pcp/auth/login` retorna `access_token`, `token_type`, `expires_at` e `user`
- rotas criticas exigem autenticacao e permissao
- `users` e `integrations` sao `root` only
- `company_scope` e persistido no usuario
- UI legado nao deve mais habilitar gestao de usuarios/integracoes para `manager`
- UI legado faz pre-checagem de permissao por rota para evitar chamadas proibidas
- `POST /api/pcp/apontamento/sync-status` entrou no mapa de auditoria critica

## Prioridades de teste

### 1. Autenticacao

- login valido de `root`, `manager`, `operator`
- login com senha invalida
- login com usuario inativo
- acesso sem token
- token malformado
- token expirado

### 2. RBAC

- `root` acessa admin e operacao
- `manager` falha em `GET/POST users`
- `manager` falha em `GET/POST integrations`
- `manager` consegue `runs.mrp`, `romaneios.delete`, `romaneios-kanban/update-date`, `apontamento.dispatch`
- `operator` falha em `runs.mrp`, admin, delete, ingest
- `operator` consegue `apontamento.save` e leituras operacionais

### 3. Escopo multiempresa

- usuario com 1 empresa acessa `overview` e `painel`
- usuario com varias empresas recebe erro pedindo `company_code` onde aplicavel
- usuario fora do escopo recebe `403`
- `romaneios` e `romaneio detail` nao podem vazar empresa fora do escopo
- `users/save` deve falhar para nao-root sem `company_scope`
- salvar `planner` via UI/fluxo legado deve resultar em `manager`

### 4. Auditoria

- conferir novas linhas em `/Users/sistemas2/Documents/Playground 2/saars.inplast/data/security_audit.jsonl`
- validar eventos de login sucesso
- login falha
- acesso negado
- mutacao critica com sucesso
- mutacao critica com erro
- `apontamento.sync_status`

### 5. Legado `web/`

- login continua funcionando
- sessao persiste no `localStorage`
- chamadas autenticadas enviam `Authorization`
- `401` derruba sessao local
- formulario de usuarios mostra `company_scope`
- `manager` nao consegue editar usuarios nem integracoes pela UI
- `carregarTudo` nao deve acusar carga parcial so porque a UI tentou chamar rota proibida ao papel atual

## Riscos residuais conhecidos

Nao trate como bug novo sem confirmar:

- `web-react/` ainda nao foi adaptado ao novo auth
- visao multiempresa ainda e parcial em alguns GETs
- varias mutacoes antigas ainda nao exigem `company_code` em 100% dos contratos
- `MRP` ainda nao tem serializacao/lock final por empresa
- auditoria ainda e local em JSONL, nao em servico oficial

## Regras de trabalho

- Primeiro testar, depois reportar
- Nao alterar SPEC ou backlog
- Nao reverter mudancas locais existentes
- Se precisar tocar codigo, pare antes e reporte
- Seja explicito sobre o que e falha real, o que e risco residual conhecido e o que e gap ja documentado

## Saida esperada

1. Findings priorizados por severidade, com arquivo/rota/fluxo sempre que possivel
2. Lista objetiva dos testes executados
3. Resultado de cada bloco: auth, RBAC, multiempresa, auditoria, legado web
4. Riscos residuais confirmados
5. Recomendacao final: pode ou nao pode seguir para a fase do implementador de UI/UX

## Perguntas que sua analise deve responder explicitamente

1. A camada minima de seguranca realmente fechou os P0 mais urgentes?
2. O legado `web/` esta testavel sem enganar o usuario sobre permissoes?
3. Onde ainda existe maior risco de dado operacional incorreto?
4. O que bloqueia rollout de testes mais amplos?
5. O que o proximo implementador de UI/UX precisa evitar para nao quebrar a seguranca recem-introduzida?

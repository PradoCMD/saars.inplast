# Design: Seguranca Minima do Backend PCP

Data: 2026-04-08
Escopo: primeira rodada de autenticacao e autorizacao do backend do modulo PCP

## Objetivo

Sair do estado atual de API aberta e levar o backend para um estado controlado e previsivel, com autenticacao obrigatoria, autorizacao minima por papel, escopo multiempresa e respostas HTTP consistentes, sem redesenhar ainda o modelo estrutural do produto.

## Decisoes validadas

- A rodada inicial cobre o backend primeiro.
- Os papeis iniciais sao `root`, `manager` e `operator`.
- `root` enxerga tudo e pode operar tudo.
- `manager` e `operator` ficam restritos a uma ou mais empresas vinculadas ao usuario.
- O login devolve `Bearer token` assinado pelo backend.
- O token carrega apenas `user_id`, `role` e `company_scope`.
- Leitura pode ser consolidada dentro do escopo autorizado.
- Toda escrita ou acao operacional exige `company_code` explicito e permitido.
- O modo `mock` deve seguir as mesmas regras do modo `postgres`.

## Contrato proposto

### Autenticacao

- `POST /api/pcp/auth/login` autentica usuario e senha e devolve:
  - `status`
  - `user`
  - `access_token`
  - `token_type`
  - `expires_at`
- O token deve ser assinado pelo backend e ter expiracao curta.
- Rotas operacionais e administrativas passam a exigir `Authorization: Bearer <token>`.

### Autorizacao

- A autorizacao sera centralizada no `server.py`.
- Helpers previstos:
  - `issue_access_token`
  - `decode_access_token`
  - `require_auth`
  - `require_permission`
  - `require_company_access`
- A matriz inicial de permissao sera fixa por papel.

### Escopo multiempresa

- Usuarios terao `company_scope` persistido no cadastro.
- `root` usa `["*"]`.
- `manager` e `operator` usam lista explicita de empresas autorizadas.
- Leitura sem `company_code` devolve visao consolidada apenas dentro do escopo do usuario.
- Escrita sem `company_code` devolve `422`.
- Escrita com `company_code` fora do escopo devolve `403`.

## Matriz minima de permissao

### root

- todas as leituras
- todas as mutacoes
- `runs.mrp`
- administracao de usuarios e integracoes

### manager

- leituras operacionais e administrativas dentro do escopo
- `runs.mrp`
- `romaneios.write`
- `romaneios.delete`
- `apontamento.dispatch`
- `structure_override`
- `programming_entry`
- `stock_movement.write`

### operator

- leituras operacionais dentro do escopo
- `apontamento.save`
- opcionalmente `romaneios.ingest` se a operacao local precisar disso na rodada
- sem `runs.mrp`
- sem administracao
- sem delete

## Rotas prioritarias da rodada

### Proteger primeiro

- `POST /api/pcp/runs/mrp`
- `POST /api/pcp/users/save`
- `POST /api/pcp/integrations/save`
- `POST /api/pcp/stock-movements/save`
- `POST /api/pcp/structure-overrides`
- `POST /api/pcp/programming-entries`
- `POST /api/pcp/romaneios-kanban/update-date`
- `POST /api/pcp/romaneios/delete`
- `POST /api/pcp/romaneios/upload`
- `POST /api/pcp/romaneios/refresh`
- `POST /api/pcp/apontamento/save`
- `POST /api/pcp/apontamento/dispatch`
- `GET /api/pcp/users`
- `GET /api/pcp/integrations`

### Ajustar em seguida para escopo

- `GET /api/pcp/overview`
- `GET /api/pcp/painel`
- `GET /api/pcp/romaneios`
- `GET /api/pcp/romaneios/{romaneioCode}`
- `GET /api/pcp/romaneios-kanban`
- `GET /api/pcp/apontamento/logs`
- `GET /api/pcp/apontamento/export`

## Persistencia minima

- Estender usuario para carregar `company_scope`.
- Manter compatibilidade com os usuarios existentes.
- Normalizar `company_scope` para lista de strings em maiusculo.

## HTTP e erros

- `401` para token ausente, invalido ou expirado.
- `403` para papel sem permissao ou empresa fora do escopo.
- `422` para mutacao sem `company_code` ou payload invalido.
- `200` apenas quando a acao foi autorizada e processada.

## Auditoria minima

- Registrar login bem-sucedido e login negado.
- Registrar acoes criticas:
  - disparo de MRP
  - save/delete de romaneio
  - dispatch de apontamento
  - alteracoes administrativas de usuarios e integracoes
- Cada evento deve carregar pelo menos:
  - usuario
  - papel
  - empresa
  - rota
  - timestamp
  - resultado

## Fora desta rodada

- Matriz RBAC dinamica por permissao arbitraria
- refresh token
- sessao completa de frontend
- correcoes estruturais profundas de multiempresa no banco
- lock transacional completo do MRP
- trilha unificada final de auditoria de produto

## Ordem recomendada de implementacao

1. Implementar token assinado e verificacao no `server.py`.
2. Estender modelo de usuario com `company_scope`.
3. Criar matriz fixa de permissao por papel.
4. Proteger rotas criticas com `401/403`.
5. Exigir `company_code` explicito nas mutacoes.
6. Adaptar leituras para respeitar escopo quando houver suporte no provider.
7. Adicionar auditoria minima de login e acoes criticas.
8. Validar com testes de autenticacao, permissao e escopo.

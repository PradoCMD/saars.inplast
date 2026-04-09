# Relatorio: Remediacao da Rodada Backend Auth Minima

Data: 2026-04-08
Projeto: `saars.inplast`
Escopo desta etapa: remediacao tecnica dos findings abertos pelo QA final da rodada de auth minima
Status atual: correcoes de alta confianca aplicadas e retestadas
Destino deste relatorio: orientar o TESTE Auditor no reteste final antes de liberar a proxima fase

## 1. Objetivo deste relatorio

Este documento consolida o que foi corrigido apos o QA final da rodada de backend auth minima, como cada correcao foi validada e quais riscos continuam abertos por estarem fora do recorte seguro desta etapa.

Ele nao altera SPEC nem BACKLOG.
Ele tambem nao substitui o handoff do QA original.

Use este relatorio como referencia tecnica detalhada para entender:

- quais findings do QA original foram realmente confirmados
- o que foi corrigido no codigo
- como essas correcoes foram retestadas
- o que ainda precisa de verificacao ampla de regressao

## 2. Base usada nesta remediacao

Arquivos de contexto lidos antes da remediacao:

1. `SPEC.json`
2. `BACKLOG.json`
3. `docs/handoff_backend_auth_minima.md`
4. `docs/handoff_qa_backend_auth_minima_2026-04-08.md`
5. `docs/handoff_revisao_codigo.md`
6. `README.md`
7. `server.py`
8. `backend/provider.py`
9. `backend/config.py`
10. `backend/queries.py`
11. `web/app.js`
12. `web/index.html`

## 3. Findings do QA original e status apos remediacao

### Finding 1

- Titulo: vazamento multiempresa em `overview`, `painel` e `romaneios-kanban` no provider `mock`
- Severidade original: `P0`
- Status apos remediacao: corrigido e retestado

Causa confirmada:

- o provider `mock` nao aplicava filtragem segura por empresa ao montar `overview` e `painel`
- como o fluxo de `romaneios-kanban` depende desses agregados no caminho validado, o efeito pratico era expor volume consolidado fora do escopo

Pontos corrigidos:

- helper de extracao de empresa padrao para fixtures `mock`
- helper de comparacao segura por empresa
- retorno de `overview` zerado quando o escopo solicitado nao bate com a empresa disponivel no fixture
- filtro de `painel` por empresa antes da montagem da resposta

Arquivos-chave:

- [backend/provider.py:745](/Users/sistemas2/Documents/Playground 2/saars.inplast/backend/provider.py#L745)
- [backend/provider.py:792](/Users/sistemas2/Documents/Playground 2/saars.inplast/backend/provider.py#L792)
- [backend/provider.py:808](/Users/sistemas2/Documents/Playground 2/saars.inplast/backend/provider.py#L808)

Resultado do reteste:

- usuario `qa_manager_recicla_fix` recebeu `overview` com totais zerados
- `painel` respondeu com `items = 0`
- `romaneios-kanban` respondeu com `products = 0` e `romaneios = 0`

### Finding 2

- Titulo: `401` limpava a sessao local, mas nao recolocava a UI em estado bloqueado/login
- Severidade original: `P1`
- Status apos remediacao: corrigido e retestado

Causa confirmada:

- os wrappers HTTP limpavam a sessao local, mas a UI nao executava a transicao completa de volta para o estado sem autenticacao

Pontos corrigidos:

- criacao de handler unico para sessao invalida
- limpeza da sessao e do modo operador
- rerender de autenticacao e shell
- volta automatica para `#cockpit`
- mensagem explicita no `login-status`

Arquivos-chave:

- [web/app.js:2622](/Users/sistemas2/Documents/Playground 2/saars.inplast/web/app.js#L2622)
- [web/app.js:3399](/Users/sistemas2/Documents/Playground 2/saars.inplast/web/app.js#L3399)
- [web/app.js:3438](/Users/sistemas2/Documents/Playground 2/saars.inplast/web/app.js#L3438)

Resultado do reteste:

- apos invalidar o token e forcar uma chamada autenticada, a UI:
  - exibiu novamente a tela de login
  - travou o shell
  - apagou a sessao persistida
  - desabilitou o botao de logout
  - reposicionou a navegação para `#cockpit`

### Finding 3

- Titulo: modulo legado de usuarios exibia fallback sintetico para perfil sem permissao real
- Severidade original: `P1`
- Status apos remediacao: corrigido e retestado

Causa confirmada:

- o fluxo do modulo de usuarios reutilizava fallback local e storage sintetico mesmo para perfis sem `users.read`

Pontos corrigidos:

- retorno antecipado no carregamento de usuarios quando o papel nao tem `users.read`
- renderizacao restrita no modulo `#usuarios`
- remocao do fallback sintético no `carregarTudo` para perfis sem permissao

Arquivos-chave:

- [web/app.js:2559](/Users/sistemas2/Documents/Playground 2/saars.inplast/web/app.js#L2559)
- [web/app.js:3195](/Users/sistemas2/Documents/Playground 2/saars.inplast/web/app.js#L3195)
- [web/app.js:7859](/Users/sistemas2/Documents/Playground 2/saars.inplast/web/app.js#L7859)

Resultado do reteste:

- usuario `manager` em `#usuarios` passou a ver:
  - resumo com `Acesso restrito`
  - lista vazia com mensagem explicita
  - formulario desabilitado
  - nenhum card sintetico de `root`

### Finding 4

- Titulo: auditoria perdia o ator em parte dos eventos criticos de erro
- Severidade original: `P2`
- Status apos remediacao: corrigido e retestado

Causa confirmada:

- o fluxo de erro de rotas criticas nem sempre reaproveitava o usuario autenticado ja resolvido antes da excecao

Pontos corrigidos:

- armazenamento do ator autenticado na request corrente
- reaproveitamento desse ator no `record_critical_action`
- reset explicito do contexto de auditoria a cada `POST`

Arquivos-chave:

- [server.py:1046](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1046)
- [server.py:1134](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1134)
- [server.py:1158](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1158)

Resultado do reteste:

- o evento `mrp.run` com `status=error`, disparado por um `operator` sem permissao, ficou registrado com:
  - `user_id`
  - `username`
  - `role`
  - `company_scope`

## 4. Correcoes aplicadas no codigo

### Backend

No `mock provider`, a resposta agregada passou a respeitar o escopo testado de multiempresa, evitando vazar snapshot operacional fora do contexto autorizado.

No servidor HTTP, a trilha de auditoria passou a carregar o ator autenticado mesmo quando a acao critica falha depois da etapa de autorizacao.

### Frontend legado `web/`

O legado usado para teste agora reage corretamente a `401` e nao finge mais disponibilidade do modulo de usuarios para perfis que nao possuem permissao real de leitura.

Essas mudancas sao deliberadamente conservadoras:

- nao mudam a regra de negocio da SPEC
- nao tentam promover o `web/` a UI oficial
- nao encostam em `web-react/`

## 5. Validacoes executadas nesta remediacao

### Checks de sintaxe e consistencia local

- `PYTHONPYCACHEPREFIX=/tmp/pcp_pycache python3 -m py_compile server.py backend/provider.py backend/config.py backend/queries.py`
- `node --check web/app.js`

### Reteste HTTP dirigido

Ambiente usado:

- `PCP_DATA_MODE=mock`
- `PCP_PORT=8876`
- `PCP_AUTH_TOKEN_SECRET=qa-secret`

Casos validados:

- login `root`
- criacao de usuarios de teste com escopos distintos
- `overview/painel/romaneios-kanban` para `qa_manager_recicla_fix`
- `POST /api/pcp/runs/mrp` como `qa_operator_inplast_fix`

Resultado observado:

- `overview` fora do escopo retornou zerado
- `painel` fora do escopo retornou vazio
- `romaneios-kanban` fora do escopo retornou vazio
- `operator` recebeu `403` coerente em `mrp.run`

### Reteste visual com Playwright

Casos validados:

- estado da UI apos `401`
- estado do modulo `#usuarios` para `manager`

Artefatos gerados:

- [auth_401_reset.png](/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/auth_401_reset.png)
- [users_manager_restricted.png](/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/users_manager_restricted.png)

Resultado observado:

- `401` reabriu a tela de login e bloqueou o shell
- `manager` nao viu fallback sintetico no modulo de usuarios

### Verificacao de auditoria

Arquivo verificado:

- [security_audit.jsonl](/Users/sistemas2/Documents/Playground 2/saars.inplast/data/security_audit.jsonl)

Resultado observado:

- evento critico de erro passou a carregar o ator autenticado

## 6. O que ainda nao foi fechado

Os itens abaixo continuam como risco residual, mas nao foram alterados por estarem fora do recorte seguro desta remediacao:

- serializacao e lock final do `MRP` por empresa
- endurecimento estrutural multiempresa no banco e nos providers nao `mock`
- padronizacao de `company_code` em 100% das mutacoes antigas
- adaptacao do `web-react/` ao novo contrato de autenticacao
- centralizacao de auditoria em banco ou servico oficial

## 7. Recomendacao para o TESTE Auditor

O TESTE Auditor nao deve repetir o QA como se nada tivesse sido corrigido.

O proximo passo recomendado e um reteste de confirmacao com foco em:

1. confirmar que os quatro findings desta remediacao continuam fechados
2. rodar regressao dirigida sobre auth, RBAC e multiempresa
3. separar claramente o que e falha nova, o que e risco residual conhecido e o que ja foi resolvido
4. dizer explicitamente se a etapa esta pronta para liberar o proximo agente de UI/UX

## 8. Conclusao

Esta rodada de remediacao fechou os findings `P0` e `P1` que bloqueavam a confianca minima da entrega anterior e ainda aproveitou para fechar o `P2` de auditoria.

O sistema ainda nao esta em estado de rollout amplo, mas agora esta em estado adequado para um reteste final serio, com menos ruído e com os principais falsos positivos da rodada anterior removidos.

# Relatorio: TESTE Auditor Pos-Remediacao Backend Auth Minima

Data: 2026-04-08
Projeto: `saars.inplast`
Escopo desta etapa: reteste final da rodada minima de auth, RBAC, `company_scope`, auditoria e legado `web/` apos remediacao tecnica
Status final da etapa: reteste concluido sem reabertura dos findings remediados
Destino deste relatorio: formalizar a liberacao tecnica para a proxima fase de implementacao de UI/UX

## 1. Objetivo deste relatorio

Este relatorio consolida o reteste final executado apos a remediacao tecnica dos findings identificados no QA anterior da rodada de backend auth minima.

O objetivo desta etapa foi responder com evidencias a tres perguntas:

1. Os findings `P0/P1` remediados realmente ficaram fechados?
2. A remediacao introduziu alguma regressao relevante em auth, RBAC, multiempresa, auditoria ou legado `web/`?
3. O projeto agora pode seguir para a proxima fase do implementador de UI/UX sem reabrir a camada minima de seguranca?

Este documento nao altera SPEC nem BACKLOG.
Ele registra a evidência de liberacao tecnica para a proxima fase.

## 2. Base usada no reteste

Arquivos lidos antes da execucao:

1. `SPEC.json`
2. `BACKLOG.json`
3. `docs/handoff_revisao_codigo.md`
4. `docs/plans/2026-04-08-backend-auth-minima-design.md`
5. `docs/handoff_qa_backend_auth_minima_2026-04-08.md`
6. `docs/relatorio_remediacao_backend_auth_minima_2026-04-08.md`
7. `docs/handoff_teste_auditor_backend_auth_minima_pos_remediacao_2026-04-08.md`
8. `docs/handoff_backend_auth_minima.md`
9. `server.py`
10. `backend/provider.py`
11. `backend/config.py`
12. `backend/queries.py`
13. `web/app.js`
14. `web/index.html`

## 3. Ambiente e estrategia de teste

### Ambiente reproduzido

- `PCP_DATA_MODE=mock`
- `PCP_PORT=8876`
- `PCP_AUTH_TOKEN_SECRET=qa-secret`

### Apoios de execucao

- backend local servido por `server.py`
- webhook local auxiliar na porta `8877` para validar `apontamento.dispatch`
- navegador automatizado com Playwright para o legado `web/`

### Tipos de teste executados

- reteste dirigido dos findings remediados
- regressao essencial da camada minima
- leitura direta da trilha de auditoria em `data/security_audit.jsonl`

## 4. Findings remediados e resultado do reteste

### Finding 1

- Titulo: vazamento multiempresa em `overview`, `painel` e `romaneios-kanban` no provider `mock`
- Severidade original: `P0`
- Status no reteste final: fechado

O que foi retestado:

- login com `manager_recicla`
- leitura de `GET /api/pcp/overview`
- leitura de `GET /api/pcp/painel`
- leitura de `GET /api/pcp/romaneios-kanban`

Resultado observado:

- `overview` retornou `200` com totais zerados
- `painel` retornou `200` com `items = 0`
- `romaneios-kanban` retornou `200` com `products = 0` e `romaneios = 0`

Leitura de codigo coerente com o resultado:

- [backend/provider.py:792](/Users/sistemas2/Documents/Playground%202/saars.inplast/backend/provider.py#L792)
- [backend/provider.py:801](/Users/sistemas2/Documents/Playground%202/saars.inplast/backend/provider.py#L801)
- [backend/provider.py:836](/Users/sistemas2/Documents/Playground%202/saars.inplast/backend/provider.py#L836)

Conclusao:

- o vazamento observado no QA anterior nao se repetiu
- o finding permanece fechado dentro do recorte validado desta rodada

### Finding 2

- Titulo: apos `401`, o legado `web/` nao recolocava a UI em estado bloqueado/login
- Severidade original: `P1`
- Status no reteste final: fechado

O que foi retestado:

- login como `manager`
- invalidacao simulada de request autenticado com resposta `401`
- observacao do estado visual completo da tela

Resultado observado:

- tela de login voltou
- shell ficou travado
- sessao saiu do `localStorage`
- botao de logout ficou desabilitado
- hash voltou para `#cockpit`
- a UI mostrou mensagem explicita de sessao invalida

Artefato visual:

- [retest_auth_401_reset.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/retest_auth_401_reset.png)

Leitura de codigo coerente com o resultado:

- [web/app.js:2622](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L2622)
- [web/app.js:3399](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L3399)
- [web/app.js:3438](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L3438)

Conclusao:

- o finding nao reabriu
- o legado `web/` agora reage corretamente a `401` dentro do fluxo testado

### Finding 3

- Titulo: modulo `#usuarios` mostrava fallback sintetico para perfil sem permissao real
- Severidade original: `P1`
- Status no reteste final: fechado

O que foi retestado:

- login como `manager`
- navegacao para `#usuarios`
- verificacao de resumo, lista, formulario e eventuais cards sinteticos

Resultado observado:

- resumo exibiu `Acesso restrito`
- lista exibiu mensagem explicita de falta de permissao
- formulario permaneceu desabilitado
- nenhum card sintetico de `root` apareceu

Artefato visual:

- [retest_users_manager_restricted.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/retest_users_manager_restricted.png)

Leitura de codigo coerente com o resultado:

- [web/app.js:2559](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L2559)
- [web/app.js:3195](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L3195)
- [web/app.js:7859](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L7859)

Conclusao:

- o estado enganoso do modulo de usuarios nao se repetiu

### Finding 4

- Titulo: auditoria perdia o ator em parte dos eventos criticos de erro
- Severidade original: `P2`
- Status no reteste final: fechado

O que foi retestado:

- erro critico autenticado em `POST /api/pcp/runs/mrp` com `operator`
- leitura do delta novo em `data/security_audit.jsonl`

Resultado observado:

- o evento `mrp.run` com `status=error` carregou `user_id`, `username`, `role` e `company_scope`
- nenhum erro critico novo apareceu com ator vazio no delta do reteste

Evidencias:

- [security_audit.jsonl#L90](/Users/sistemas2/Documents/Playground%202/saars.inplast/data/security_audit.jsonl#L90)
- [security_audit.jsonl#L102](/Users/sistemas2/Documents/Playground%202/saars.inplast/data/security_audit.jsonl#L102)
- [security_audit.jsonl#L105](/Users/sistemas2/Documents/Playground%202/saars.inplast/data/security_audit.jsonl#L105)
- [security_audit.jsonl#L114](/Users/sistemas2/Documents/Playground%202/saars.inplast/data/security_audit.jsonl#L114)
- [security_audit.jsonl#L116](/Users/sistemas2/Documents/Playground%202/saars.inplast/data/security_audit.jsonl#L116)

Leitura de codigo coerente com o resultado:

- [server.py:1046](/Users/sistemas2/Documents/Playground%202/saars.inplast/server.py#L1046)
- [server.py:1134](/Users/sistemas2/Documents/Playground%202/saars.inplast/server.py#L1134)
- [server.py:1158](/Users/sistemas2/Documents/Playground%202/saars.inplast/server.py#L1158)

Conclusao:

- o finding de trilha sem ator nao reabriu

## 5. Regressao essencial executada

### Auth

Casos validados:

- login valido de `root`
- login valido de `manager`
- login valido de `operator`
- login com senha invalida
- login com usuario inativo
- acesso sem token
- token malformado
- token expirado

Resultado:

- bloco aprovado

### RBAC

Casos validados:

- `root` acessando `users`, `integrations` e `runs.mrp`
- `manager` negado em `GET/POST users`
- `manager` negado em `GET/POST integrations`
- `manager` autorizado em `runs.mrp`
- `manager` autorizado em `romaneios.delete`
- `manager` autorizado em `romaneios-kanban/update-date`
- `manager` autorizado em `apontamento.dispatch`
- `manager` autorizado em `apontamento.sync-status`
- `operator` negado em `runs.mrp`
- `operator` negado em admin, delete e ingest
- `operator` autorizado em `apontamento.save`

Resultado:

- bloco aprovado

### Multiempresa

Casos validados:

- usuario com uma empresa acessando `overview` e `painel`
- usuario multiempresa recebendo `422` sem `company_code`
- usuario fora do escopo recebendo `403`
- `romaneios` sem vazamento
- detalhe de `romaneio` sem vazamento
- `users.save` exigindo `company_scope` para nao root
- alias `planner -> manager`

Resultado:

- bloco aprovado dentro do recorte validado desta rodada

### Auditoria

Casos validados:

- login sucesso
- login falha
- access denied
- company denied
- mutacao critica com sucesso
- mutacao critica com erro
- `apontamento.sync_status`

Resultado:

- bloco aprovado

Observacao objetiva:

- o arquivo passou de `83` para `126` linhas durante o reteste
- os eventos novos ficaram coerentes com os fluxos exercitados

### Legado `web/`

Casos validados:

- login funcionando
- sessao persistindo no `localStorage`
- chamadas autenticadas enviando `Authorization`
- `401` derrubando sessao e recolocando a UI no estado correto
- formulario de usuarios mostrando `company_scope`
- `manager` sem editar usuarios
- `manager` sem editar integracoes
- `carregarTudo` sem falso positivo de `Carga parcial` por rotas proibidas

Resultado:

- bloco aprovado

## 6. Resultado consolidado da bateria

### Bateria HTTP

- total de checks: `52`
- aprovados: `52`
- falhas: `0`

### Reteste visual no `web/`

Resultado consolidado:

- `root_login_works`: confirmado
- `session_persisted_localstorage`: confirmado
- `authorization_sent_on_api_calls`: confirmado
- `user_form_shows_company_scope`: confirmado
- `manager_no_false_partial_load`: confirmado
- `manager_users_ui_disabled`: confirmado
- `manager_users_root_cards`: `0`
- `manager_integrations_ui_disabled`: confirmado
- `auth_screen_reopened_on_401`: confirmado
- `app_locked_on_401`: confirmado
- `session_cleared_on_401`: confirmado
- `logout_disabled_on_401`: confirmado
- `hash_reset_on_401`: `#cockpit`

## 7. Riscos residuais confirmados

Os itens abaixo continuam existindo, mas nao foram tratados como bug novo porque estao fora do recorte da rodada ou ja estavam explicitamente aceitos:

- `web-react/` ainda nao foi adaptado ao novo contrato de autenticacao
- o multiempresa estrutural fora do `mock` continua sendo risco maior do produto
- `MRP` ainda nao tem lock/serializacao final por empresa
- nem toda mutacao antiga exige `company_code` em contrato totalmente padronizado
- a auditoria continua local em JSONL

## 8. Respostas objetivas desta etapa

### 1. Os findings `P0/P1` remediados ficaram realmente fechados?

Sim.
Todos os findings remediados permaneceram fechados no reteste final.

### 2. Existe regressao relevante introduzida pela remediacao?

Nao.
Nenhuma regressao relevante apareceu na regressao essencial executada.

### 3. O legado `web/` segue testavel sem enganar o usuario?

Sim, dentro do recorte validado desta rodada.
O `401` agora derruba corretamente a interface e o modulo de usuarios nao exibe mais estado administrativo falso para `manager`.

### 4. O maior risco operacional agora continua sendo estrutural ou ainda ha bug bloqueador nesta rodada?

Continua sendo estrutural e residual.
Nao encontrei bug bloqueador novo ou finding remediado reaberto nesta etapa.

### 5. O projeto pode seguir para a proxima fase?

Sim.
O projeto pode seguir para a fase do implementador de UI/UX, desde que essa fase preserve o contrato de auth, RBAC e escopo que acabou de ser estabilizado.

## 9. Conclusao final

O reteste final confirma que a rodada minima de seguranca atingiu o nivel necessario para destravar a proxima fase de interface.

Isso nao significa que o produto inteiro esteja pronto para rollout amplo.
Significa, sim, que:

- a camada minima de auth/RBAC/escopo validada nesta rodada esta estável no recorte testado
- os findings bloqueadores anteriores nao reabriram
- o legado `web/` cumpre seu papel de referencia auxiliar sem enganar o usuario nos fluxos mais sensiveis

Com isso, a recomendacao tecnica desta auditoria e:

- liberar o proximo agente de UX/UI
- orientar explicitamente esse agente para nao reabrir auth, permissao, escopo e tratamento de `401/403/422`
- tratar `web-react/` como a UI alvo do produto e `web/` apenas como referencia auxiliar de comportamento

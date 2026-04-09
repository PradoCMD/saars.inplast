# Handoff: QA Final da Rodada Backend Auth Minima

Data: 2026-04-08
Projeto: `saars.inplast`
Escopo validado: rodada minima de auth, RBAC, `company_scope`, auditoria minima e adaptacao do legado `web/` para testes
Status da rodada: validacao concluida com bloqueios reais antes da proxima fase de implementacao/UI
Recomendacao atual: nao avancar para a proxima fase de UI/UX sem corrigir os findings P0/P1 desta rodada

## Objetivo deste handoff

Entregar para o agente CODE Reviewer um relatorio objetivo e acionavel do que foi testado, do que passou, do que falhou e do que precisa ser corrigido com prioridade.

Este documento nao redefine SPEC nem backlog.
O foco aqui e remediacao tecnica segura da rodada ja implementada.

## Resumo executivo

A rodada minima de seguranca fechou uma parte importante dos P0 de autenticacao e permissao:

- login com token Bearer esta funcionando
- RBAC minimo de `root`, `manager` e `operator` esta majoritariamente coerente
- `users` e `integrations` estao protegidos como `root` only
- `company_scope` foi introduzido e passou a fazer parte do usuario
- o legado `web/` passou a enviar `Authorization` e a evitar algumas chamadas proibidas por papel
- a auditoria minima em `data/security_audit.jsonl` esta sendo gravada

Mas a rodada ainda nao pode ser considerada pronta para liberar a proxima fase sem correcoes, porque foram encontrados problemas reais em tres areas sensiveis:

1. Vazamento multiempresa nas leituras agregadas em modo `mock`
2. UX enganosa no `web/` quando a sessao recebe `401`
3. Fallback local do modulo de usuarios no `web/` exibindo dados sinteticos para perfis sem permissao

Adicionalmente, a auditoria grava os eventos criticos de erro, mas perde o ator em parte desses registros.

## Ambiente e estrategia de teste

### Base utilizada

Arquivos lidos antes da execucao:

1. `SPEC.json`
2. `BACKLOG.json`
3. `docs/handoff_revisao_codigo.md`
4. `docs/plans/2026-04-08-backend-auth-minima-design.md`
5. `docs/handoff_backend_auth_minima.md`
6. `README.md`
7. `server.py`
8. `backend/provider.py`
9. `backend/config.py`
10. `backend/queries.py`
11. `web/app.js`
12. `web/index.html`

### Ambiente de execucao

- Backend local iniciado em modo `mock`
- Porta usada: `8876`
- Segredo de token de teste: `qa-secret`
- Webhook local de teste iniciado em `8877` para validar `apontamento.dispatch`

### Tipos de teste executados

- testes HTTP diretos contra a API
- testes de sessao e UX no legado `web/` com Playwright
- verificacao direta do arquivo `data/security_audit.jsonl`

## O que foi validado

### 1. Autenticacao

Casos executados:

- login valido de `root`
- login valido de `manager`
- login valido de `operator`
- login com senha invalida
- login com usuario inativo
- acesso sem token
- acesso com token malformado
- acesso com token expirado

Resultado:

- bloco aprovado

Observacao:

- a camada minima de autenticacao esta funcional e responde com status coerente nos cenarios basicos e negativos mais importantes

### 2. RBAC

Casos executados:

- `root` acessando rotas administrativas e operacionais
- `manager` falhando em `GET/POST users`
- `manager` falhando em `GET/POST integrations`
- `manager` conseguindo `POST /api/pcp/runs/mrp`
- `manager` conseguindo `POST /api/pcp/romaneios/delete`
- `manager` conseguindo `POST /api/pcp/romaneios-kanban/update-date`
- `manager` conseguindo `POST /api/pcp/apontamento/dispatch`
- `operator` falhando em admin, MRP, delete e ingest
- `operator` conseguindo `POST /api/pcp/apontamento/save`
- `operator` conseguindo leituras operacionais

Resultado:

- bloco aprovado no backend

Observacao importante:

- o primeiro teste de `apontamento.dispatch` para `manager` falhou com erro de integracao ausente, mas isso nao era falha de permissao
- apos cadastrar integracao ativa local e criar item pendente, o dispatch funcionou com `200`

### 3. Escopo multiempresa

Casos executados:

- usuario com uma empresa acessando `overview` e `painel`
- usuario multiempresa recebendo erro ao omitir `company_code` onde aplicavel
- usuario fora do escopo recebendo `403`
- tentativa de leitura de `romaneios` fora do escopo
- tentativa de leitura de detalhe de `romaneio` fora do escopo
- tentativa de salvar usuario nao root sem `company_scope`
- teste de alias legado `planner -> manager`

Resultado:

- bloco reprovado

Motivo:

- `romaneios` e `romaneio detail` respeitaram escopo
- `overview`, `painel` e produtos de `romaneios-kanban` vazaram dados em modo `mock` para usuario fora do escopo real

### 4. Auditoria

Casos executados:

- verificacao de criacao e crescimento de `data/security_audit.jsonl`
- login com sucesso
- login com falha
- acesso negado
- mutacao critica com sucesso
- mutacao critica com erro
- `POST /api/pcp/apontamento/sync-status`

Resultado:

- bloco aprovado com ressalvas

Resumo observado ao final:

- total de linhas no arquivo: `56`
- eventos de login com sucesso presentes
- eventos de login falho presentes
- eventos de acesso negado presentes
- eventos de mutacao critica com sucesso presentes
- eventos de mutacao critica com erro presentes
- evento `apontamento.sync_status` presente

Problema remanescente:

- parte dos eventos criticos de erro ficou sem identificacao do ator no proprio registro

### 5. Legado `web/`

Casos executados:

- login funcionando
- sessao persistindo no `localStorage`
- chamadas autenticadas enviando `Authorization`
- `401` limpando sessao local
- formulario de usuarios mostrando `company_scope`
- `manager` sem conseguir editar usuarios pela UI
- `manager` sem conseguir editar integracoes pela UI
- `carregarTudo` sem acusar carga parcial so por rotas proibidas ao papel atual
- fluxo legado `planner` normalizando para `manager`

Resultado:

- bloco aprovado com ressalvas

Problemas encontrados:

- a UI nao volta visualmente ao login apos `401`
- o app shell nao volta para estado travado apos `401`
- o modulo de usuarios mostra fallback local sintetico, inclusive um card de `root`, mesmo para perfil sem permissao de leitura real

## Findings priorizados

### Finding 1

- Titulo: vazamento multiempresa em leituras agregadas no provider `mock`
- Severidade: P0
- Area afetada: isolamento de dados entre empresas

Passos para reproduzir:

1. Fazer login com um usuario `manager` com `company_scope = ["RECICLA"]`
2. Chamar `GET /api/pcp/overview` sem `company_code`
3. Chamar `GET /api/pcp/painel` sem `company_code`
4. Chamar `GET /api/pcp/romaneios-kanban` sem `company_code`

Resultado esperado:

- o backend deveria devolver apenas dados do escopo autorizado
- se o dado nao pudesse ser resolvido de forma segura, deveria exigir `company_code` ou devolver payload vazio/negado

Resultado atual:

- `overview` respondeu `200` com totais nao vazios
- `painel` respondeu `200` com `items = 6`
- `romaneios-kanban` respondeu `200` com `products = 6`

Evidencia tecnica:

- o provider `mock` ignora `company_code` em [backend/provider.py:752](/Users/sistemas2/Documents/Playground%202/saars.inplast/backend/provider.py#L752)
- o provider `mock` ignora `company_code` em [backend/provider.py:755](/Users/sistemas2/Documents/Playground%202/saars.inplast/backend/provider.py#L755)
- o provider `mock` monta `products` de `painel.json` sem escopo em [backend/provider.py:790](/Users/sistemas2/Documents/Playground%202/saars.inplast/backend/provider.py#L790)

Impacto operacional:

- um usuario pode tomar decisao com dados agregados de empresa fora do seu escopo
- isso invalida o principal objetivo da rodada minima de multiempresa

Hipotese da causa:

- o backend principal resolve escopo, mas o provider `mock` nao aplica filtragem equivalente nem exige empresa explicitamente quando necessario

Recomendacao objetiva:

- endurecer o provider `mock` para obedecer ao mesmo contrato de escopo do backend
- se o provider `mock` nao conseguir resolver consolidacao segura, preferir erro explicito ou payload vazio a vazar dado agregado
- validar novamente `overview`, `painel` e `romaneios-kanban` com usuarios de escopos distintos

### Finding 2

- Titulo: `401` derruba sessao local, mas nao recoloca a UI em estado autenticado nulo
- Severidade: P1
- Area afetada: experiencia do usuario e seguranca percebida no legado `web/`

Passos para reproduzir:

1. Fazer login no `web/`
2. Invalidar o token em memoria/localStorage ou forcar uma chamada que responda `401`
3. Observar o estado visual da aplicacao

Resultado esperado:

- ao receber `401`, a UI deveria limpar a sessao, reabrir a tela de login e travar o shell

Resultado atual:

- a sessao local e removida
- a tela nao volta para login
- o shell continua visualmente aberto

Evidencia tecnica:

- o `401` limpa sessao em [web/app.js:3344](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L3344) e [web/app.js:3383](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L3383)
- o estado visual depende de `renderAuthState()` em [web/app.js:3140](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L3140), mas essa atualizacao nao e disparada nesses dois caminhos

Impacto operacional:

- o usuario fica com impressao de sessao valida quando ela ja caiu
- aumenta risco de confusao, recarga manual improvisada e operacao interrompida sem feedback claro

Hipotese da causa:

- a logica de limpeza de sessao ficou desacoplada da logica de re-renderizacao do shell autenticado

Recomendacao objetiva:

- centralizar tratamento de `401` para limpar sessao e atualizar UI no mesmo fluxo
- revalidar o comportamento tanto em `GET` quanto em `POST`

### Finding 3

- Titulo: modulo legado de usuarios exibe fallback sintetico para perfil sem permissao real
- Severidade: P1
- Area afetada: UX, administracao de acessos e confianca do operador/gestor

Passos para reproduzir:

1. Fazer login no `web/` como `manager`
2. Navegar para `#usuarios`
3. Observar os cards exibidos

Resultado esperado:

- a UI deveria mostrar estado coerente com falta de permissao ou lista vazia bloqueada
- nao deveria exibir usuarios sinteticos que parecam reais

Resultado atual:

- a tela mostra um card local de `root`
- o rodape avisa que apenas `root` pode alterar usuarios, mas a lista exibida continua parecendo um estado real

Evidencia tecnica:

- fallback local e injecao de `root` em [web/app.js:2452](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L2452)
- renderizacao do modulo em [web/app.js:3176](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L3176)
- `carregarTudo()` usa fallback local para `GET /api/pcp/users` em [web/app.js:7768](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L7768)

Impacto operacional:

- a UI pode induzir interpretacao errada sobre quem existe no sistema ou qual e o estado atual dos acessos
- para uma rodada de seguranca, isso e especialmente perigoso

Hipotese da causa:

- a estrategia de bootstrap local do legado foi mantida para o modulo funcionar em modo demo, mas nao foi endurecida para o novo regime de permissao

Recomendacao objetiva:

- quando o usuario nao tiver permissao de leitura de usuarios, a UI deve esconder a listagem real e nao usar fallback sintetico
- se precisar manter bootstrap local para root/dev, limitar isso a perfis autorizados ou a um modo explicitamente de desenvolvimento

### Finding 4

- Titulo: auditoria perde o ator em parte dos eventos criticos de erro
- Severidade: P2
- Area afetada: rastreabilidade e investigacao posterior

Passos para reproduzir:

1. Executar uma mutacao critica com usuario autenticado, mas sem permissao suficiente
2. Verificar o `auth.access_denied`
3. Verificar o evento critico correspondente com `status = error`

Resultado esperado:

- tanto o evento de negacao quanto o evento critico de erro deveriam preservar o ator

Resultado atual:

- `auth.access_denied` guarda o usuario
- o evento critico `error` correspondente pode ficar com `user_id`, `username` e `role` vazios

Evidencia tecnica:

- resolucao e negacao do usuario em [server.py:1060](/Users/sistemas2/Documents/Playground%202/saars.inplast/server.py#L1060)
- gravacao do evento critico de erro com `audit_user` possivelmente nulo em [server.py:1418](/Users/sistemas2/Documents/Playground%202/saars.inplast/server.py#L1418)

Impacto operacional:

- dificulta correlacao de tentativa negada com mutacao critica correspondente
- reduz utilidade do log em auditoria e suporte

Hipotese da causa:

- o fluxo grava o denied cedo com usuario, mas o handler externo registra o erro critico usando uma variavel ainda nao preenchida

Recomendacao objetiva:

- preservar o ator autenticado no `record_critical_action(... status="error")` sempre que a identidade ja tiver sido resolvida
- revalidar erros em `mrp.run`, `romaneio.delete`, `romaneio.refresh`, `users.save` e `integrations.save`

## Arquivos e pontos mais provaveis de correcao

- [backend/provider.py](/Users/sistemas2/Documents/Playground%202/saars.inplast/backend/provider.py)
- [server.py](/Users/sistemas2/Documents/Playground%202/saars.inplast/server.py)
- [web/app.js](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js)

## Itens explicitamente validados como corretos

- `POST /api/pcp/auth/login` devolvendo `access_token`, `token_type`, `expires_at` e `user`
- `root` com acesso a admin e operacao
- `manager` sem acesso a `users` e `integrations`
- `manager` com acesso a `runs.mrp`, `romaneios.delete`, `romaneios-kanban/update-date` e `apontamento.dispatch`
- `operator` sem acesso a admin, MRP, delete e ingest
- `operator` com acesso a leitura operacional e `apontamento.save`
- `company_scope` obrigatorio para usuarios nao root
- alias legado `planner` normalizando para `manager`
- `POST /api/pcp/apontamento/sync-status` entrando no mapa de auditoria critica
- `carregarTudo` nao marcando carga parcial so porque o cliente evitou chamar rota proibida ao papel atual

## Riscos residuais confirmados e que nao devem virar bug novo sem criterio

- `web-react/` ainda nao foi adaptado ao novo contrato de autenticacao
- a visao multiempresa ainda e parcial em alguns GETs fora do que foi corrigido nesta rodada
- varias mutacoes antigas ainda nao exigem `company_code` em 100 por cento dos contratos
- `MRP` ainda nao possui serializacao/lock final por empresa
- a auditoria ainda e local em JSONL e nao em servico oficial

## Respostas objetivas para as perguntas desta rodada

### 1. A camada minima de seguranca realmente fechou os P0 mais urgentes?

Parcialmente.
Ela fechou autenticacao e boa parte do RBAC minimo, mas nao fechou o isolamento multiempresa nas leituras agregadas em modo `mock`.

### 2. O legado `web/` esta testavel sem enganar o usuario sobre permissoes?

Ainda nao completamente.
Ele esta testavel como ferramenta de QA, mas ainda engana em dois pontos:

- apos `401`, a interface parece continuar autenticada
- o modulo de usuarios mostra fallback sintetico para quem nao pode ler a rota real

### 3. Onde ainda existe maior risco de dado operacional incorreto?

No escopo multiempresa das leituras agregadas `overview`, `painel` e `romaneios-kanban` em modo `mock`.

### 4. O que bloqueia rollout de testes mais amplos?

- vazamento de escopo entre empresas
- UX incorreta apos `401`
- fallback sintetico enganoso no modulo de usuarios

### 5. O que o proximo implementador de UI/UX precisa evitar para nao quebrar a seguranca recem-introduzida?

- nao confiar em fallback local para dados administrativos
- nao tratar a UI como autenticada so porque o shell continua aberto
- nao consumir leituras agregadas sem obedecer `company_scope`
- nao mascarar `401`, `403` e `422` com estados visuais ambiguos

## Escopo recomendado para o CODE Reviewer

### Correcao imediata

1. Corrigir o vazamento multiempresa no provider `mock`
2. Corrigir o fluxo visual de logout/lock apos `401` no `web/`
3. Remover ou endurecer o fallback sintetico do modulo de usuarios para perfis sem permissao

### Correcao logo em seguida

4. Preservar ator nos eventos criticos de erro da auditoria

### Validacoes minimas apos a correcao

1. Reexecutar os testes de `manager_recicla` em `overview`, `painel` e `romaneios-kanban`
2. Reexecutar Playwright para `401` em `GET` e `POST`
3. Reexecutar Playwright no modulo `#usuarios` com `manager`
4. Reexecutar verificacao de `security_audit.jsonl` em erros criticos negados

## Recomendacao final desta auditoria

Nao liberar a proxima fase de implementacao/UI como se a rodada estivesse fechada.

Liberar apenas apos corrigir e revalidar:

- P0: vazamento multiempresa em leituras agregadas
- P1: estado visual incorreto apos `401`
- P1: fallback sintetico enganoso no modulo de usuarios

O finding de auditoria pode entrar na mesma leva se o agente tiver contexto do fluxo, porque a mudanca parece de baixo risco e alta confianca.

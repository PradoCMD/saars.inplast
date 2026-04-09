# Handoff: UX/UI Design Engineer Pos-Reteste Backend Auth Minima

Data: 2026-04-08
Projeto: `saars.inplast`
Responsavel anterior: TESTE Auditor
Responsavel seguinte: UX/UI Design Engineer
Status de entrada para design/implementacao: liberado para seguir, com a camada minima de auth/RBAC/escopo validada no recorte desta rodada

## 1. Objetivo deste handoff

Passar para o agente de UX/UI o contexto tecnico necessario para continuar a evolucao da interface sem reabrir os problemas de seguranca minima que acabaram de ser fechados.

O foco agora nao e redesenhar backend.
O foco agora e evoluir a UI alvo do produto de forma clara, segura e coerente com o contrato autenticado atual.

## 2. Estado atual confirmado antes da sua entrada

A rodada minima de seguranca passou por:

1. implementacao inicial
2. QA final
3. remediacao tecnica
4. reteste final

Resultado consolidado:

- auth via Bearer token funcionando
- RBAC minimo funcionando para `root`, `manager` e `operator`
- `company_scope` ativo e validado no recorte testado
- auditoria minima gravando eventos coerentes
- legado `web/` funcionando como interface auxiliar de teste
- findings `P0/P1` anteriores fechados e confirmados no reteste

Relatorio que confirma esta liberacao:

- [relatorio_teste_auditor_backend_auth_minima_pos_remediacao_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_teste_auditor_backend_auth_minima_pos_remediacao_2026-04-08.md)

## 3. Decisao importante para a sua fase

### UI alvo

- `web-react/` deve ser tratado como a UI alvo do produto

### UI auxiliar

- `web/` deve ser tratado apenas como referencia auxiliar de comportamento para esta rodada
- nao invista em expandir o `web/` como se ele fosse a interface oficial

### O que isso significa na pratica

- use o `web/` para confirmar como certos fluxos autenticados se comportam hoje
- implemente a evolucao principal em `web-react/`
- preserve o contrato de seguranca já validado

## 4. Leitura obrigatoria recomendada

Antes de desenhar ou implementar, leia nesta ordem:

1. [SPEC.json](/Users/sistemas2/Documents/Playground%202/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground%202/saars.inplast/BACKLOG.json)
3. [handoff_backend_auth_minima.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/handoff_backend_auth_minima.md)
4. [handoff_qa_backend_auth_minima_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/handoff_qa_backend_auth_minima_2026-04-08.md)
5. [relatorio_remediacao_backend_auth_minima_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_remediacao_backend_auth_minima_2026-04-08.md)
6. [relatorio_teste_auditor_backend_auth_minima_pos_remediacao_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_teste_auditor_backend_auth_minima_pos_remediacao_2026-04-08.md)
7. [docs/plans/2026-04-08-backend-auth-minima-design.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/plans/2026-04-08-backend-auth-minima-design.md)
8. [server.py](/Users/sistemas2/Documents/Playground%202/saars.inplast/server.py)
9. [web/app.js](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js)
10. [web/index.html](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/index.html)
11. `web-react/src/App.jsx`
12. `web-react/src/pages/`
13. `web-react/src/components/`

## 5. O que esta tecnicamente estavel e voce pode assumir

Voce pode assumir, no recorte desta rodada:

- `POST /api/pcp/auth/login` devolve `access_token`, `token_type`, `expires_at` e `user`
- rotas criticas exigem autenticacao
- `users` e `integrations` sao `root` only
- `manager` nao administra usuarios nem integracoes
- `operator` nao roda MRP, nao faz admin, nao faz delete e nao faz ingest
- `operator` pode operar leituras operacionais e `apontamento.save`
- `company_scope` existe no usuario autenticado
- `planner` legado deve ser tratado como `manager`
- `401`, `403` e `422` precisam de tratamento de UI claro

## 6. O que voce nao deve reabrir

### Nao reabra o contrato de auth

Nao tente reinventar:

- formato do token
- bootstrap de sessao no backend
- matriz minima de papeis

### Nao esconda falhas de permissao

Nao transforme:

- `401` em simples toast ignoravel
- `403` em vazio silencioso
- `422` em falha generica sem contexto

### Nao replique os erros que acabaram de ser fechados

Evite explicitamente:

- deixar a UI parecer autenticada apos `401`
- exibir fallback administrativo sintetico para perfis sem permissao real
- chamar rotas proibidas quando a UI ja sabe que o papel nao pode executar
- deixar a interface sugerir consolidado multiempresa sem `company_code` quando ele for obrigatorio

## 7. Regras de UX e comportamento que sua implementacao deve respeitar

### Autenticacao

- a UI oficial deve ter fluxo explicito de login
- a sessao deve persistir com seguranca no cliente conforme o contrato atual
- ao receber `401`, a interface deve:
  - limpar sessao
  - voltar ao estado autenticado nulo
  - travar areas protegidas
  - redirecionar para a tela/estado correto de login

### Permissao por papel

- `root` pode ver e operar tudo
- `manager` nao deve ver a UI como se pudesse administrar usuarios ou integracoes
- `operator` nao deve ver controles acionaveis de MRP, delete, ingest ou admin

### Multiempresa

- se o usuario tiver uma unica empresa, a UI pode trabalhar com ela como contexto implicito
- se o usuario tiver multiplas empresas e a rota exigir `company_code`, a UI deve pedir a selecao explicitamente
- nao apresente consolidado como se fosse global quando ele for apenas recorte de empresa

### Estados de interface obrigatorios

Para as telas novas ou adaptadas, trate de forma clara:

- `loading`
- `error`
- `empty`
- `permission_denied`
- `session_expired`
- `multi_company_selection_required`

## 8. Prioridades recomendadas para a sua fase

### Prioridade 1

Adaptar `web-react/` ao fluxo real de autenticacao:

- login
- persistencia de sessao
- bootstrap de usuario autenticado
- logout
- reset em `401`

### Prioridade 2

Aplicar UI baseada em permissao:

- navegacao
- exibicao condicional de modulos
- botoes de acao
- paginas administrativas

### Prioridade 3

Aplicar UX clara para escopo multiempresa:

- selector de empresa quando necessario
- mensagens claras para `422` por `company_code` ausente
- contexto visual da empresa ativa

### Prioridade 4

Fechar estados de erro e vazio de forma intencional, sem “parecer pronto” quando a operacao nao esta autorizada ou nao carregou

## 9. Evidencias uteis para sua referencia

Artefatos do reteste:

- [retest_auth_401_reset.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/retest_auth_401_reset.png)
- [retest_users_manager_restricted.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/retest_users_manager_restricted.png)

Trechos de codigo particularmente relevantes:

- tratamento de sessao invalida em [web/app.js:2622](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L2622)
- GET autenticado em [web/app.js:3399](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L3399)
- POST autenticado em [web/app.js:3438](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L3438)
- estado restrito de usuarios em [web/app.js:3195](/Users/sistemas2/Documents/Playground%202/saars.inplast/web/app.js#L3195)
- exigencia de `company_code` multiempresa em [server.py:1089](/Users/sistemas2/Documents/Playground%202/saars.inplast/server.py#L1089)

## 10. Riscos residuais que continuam existindo

Esses pontos continuam fora do seu escopo imediato e nao devem ser tratados como “falta da sua UI”:

- `web-react/` ainda nao adaptado ao auth atual
- multiempresa estrutural fora do `mock`
- lock/serializacao final do `MRP`
- padronizacao completa de `company_code` em todas as mutacoes antigas
- auditoria ainda local em JSONL

## 11. O que esperamos de voce

Sua entrega deve buscar duas coisas ao mesmo tempo:

1. elevar a qualidade da UI alvo
2. preservar rigorosamente a camada minima de seguranca acabada de validar

Em especial:

- nao use a UI para mascarar restricao de permissao
- nao use fallback local administrativo como se fosse dado real
- nao trate `web/` como produto final
- nao force atalhos que burlem a nova camada de auth

## 12. Recomendacao final para sua entrada

Pode seguir para a fase de UX/UI.

Recomendacao de postura:

- tratar esta etapa como adaptacao intencional do `web-react/` ao backend autenticado
- usar `web/` como oracle auxiliar de comportamento apenas quando ajudar
- priorizar seguranca percebida e clareza operacional antes de polish visual

Se surgirem duvidas, prefira preservar o contrato autenticado e pedir esclarecimento antes de “inventar” comportamento na UI.

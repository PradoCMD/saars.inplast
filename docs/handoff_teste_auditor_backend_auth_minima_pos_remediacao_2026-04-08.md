# Handoff: TESTE Auditor Pos-Remediacao Backend Auth Minima

Data: 2026-04-08
Projeto: `saars.inplast`
Responsavel anterior: CODE Reviewer / remediacao tecnica
Responsavel seguinte: TESTE Auditor
Status de entrada para teste: correcoes de alta confianca aplicadas e validadas localmente

## 1. Leitura obrigatoria

Antes de iniciar os testes, leia nesta ordem:

1. [SPEC.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json)
3. [handoff_revisao_codigo.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_revisao_codigo.md)
4. [2026-04-08-backend-auth-minima-design.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/plans/2026-04-08-backend-auth-minima-design.md)
5. [handoff_qa_backend_auth_minima_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_qa_backend_auth_minima_2026-04-08.md)
6. [relatorio_remediacao_backend_auth_minima_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_remediacao_backend_auth_minima_2026-04-08.md)
7. [handoff_backend_auth_minima.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_backend_auth_minima.md)
8. [server.py](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py)
9. [backend/provider.py](/Users/sistemas2/Documents/Playground 2/saars.inplast/backend/provider.py)
10. [backend/config.py](/Users/sistemas2/Documents/Playground 2/saars.inplast/backend/config.py)
11. [backend/queries.py](/Users/sistemas2/Documents/Playground 2/saars.inplast/backend/queries.py)
12. [web/app.js](/Users/sistemas2/Documents/Playground 2/saars.inplast/web/app.js)
13. [web/index.html](/Users/sistemas2/Documents/Playground 2/saars.inplast/web/index.html)

## 2. O que mudou desde o QA anterior

Os findings abaixo, que estavam abertos no QA final, foram remediados e precisam ser retestados:

- `P0` vazamento multiempresa em `overview`, `painel` e `romaneios-kanban` em modo `mock`
- `P1` UI do legado `web/` nao voltava ao estado bloqueado apos `401`
- `P1` modulo `#usuarios` mostrava fallback sintetico sem permissao real
- `P2` trilha de auditoria perdia o ator em parte dos erros criticos

## 3. O que ja foi validado localmente

### Backend / API

- `qa_manager_recicla_fix` recebeu:
  - `overview` zerado
  - `painel` vazio
  - `romaneios-kanban` vazio
- `qa_operator_inplast_fix` recebeu `403` coerente em `POST /api/pcp/runs/mrp`

### Frontend legado `web/`

- apos token invalido e nova chamada autenticada:
  - a tela de login voltou
  - o shell foi travado
  - a sessao saiu do `localStorage`
  - a hash foi para `#cockpit`
- `manager` em `#usuarios` viu apenas estado de acesso restrito, sem fallback sintetico

### Auditoria

- `mrp.run` com `status=error` ficou registrado com ator autenticado no JSONL

## 4. O que voce precisa testar agora

### Bloco A: confirmar fechamento dos findings remediados

1. Reproduzir o antigo caso `RECICLA` fora do escopo e confirmar que nao ha mais vazamento
2. Forcar `401` no legado `web/` e confirmar a transicao visual completa para login
3. Entrar como `manager` e validar `#usuarios` sem fallback sintetico
4. Gerar um erro critico autenticado e confirmar ator presente em `data/security_audit.jsonl`

### Bloco B: regressao da camada minima

1. Auth
2. RBAC
3. Multiempresa
4. Auditoria
5. Legado `web/`

Objetivo:

- garantir que a remediacao nao quebrou a rodada anterior
- separar regressao real de risco residual conhecido

## 5. Ambiente recomendado de teste

Ambiente minimo para reproduzir o que foi validado na remediacao:

- `PCP_DATA_MODE=mock`
- `PCP_PORT=8876`
- `PCP_AUTH_TOKEN_SECRET=qa-secret`

Se voce abrir navegador automatizado, pode reutilizar o legado servido por `server.py`.

## 6. Artefatos uteis

- evidencias visuais:
  - [auth_401_reset.png](/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/auth_401_reset.png)
  - [users_manager_restricted.png](/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/users_manager_restricted.png)
- trilha de auditoria:
  - [security_audit.jsonl](/Users/sistemas2/Documents/Playground 2/saars.inplast/data/security_audit.jsonl)

## 7. Riscos residuais conhecidos

Nao marque como bug novo sem antes diferenciar de risco residual ja aceito nesta rodada:

- `web-react/` ainda nao foi adaptado ao novo fluxo de auth
- o multiempresa estrutural fora do `mock` continua sendo risco maior do produto
- `MRP` ainda nao tem lock/serializacao final por empresa
- nem toda mutacao antiga exige `company_code` em contrato padronizado
- a auditoria continua local em JSONL

## 8. Resultado esperado do seu trabalho

Seu resultado precisa responder com clareza:

1. Os `P0/P1` remediados realmente ficaram fechados?
2. Houve regressao em auth, RBAC, multiempresa, auditoria ou legado `web/`?
3. O sistema pode seguir para a proxima fase de implementacao/UI?

Formato esperado:

- findings primeiro
- depois testes executados
- depois validacoes aprovadas
- depois riscos residuais confirmados
- depois recomendacao final de go/no-go

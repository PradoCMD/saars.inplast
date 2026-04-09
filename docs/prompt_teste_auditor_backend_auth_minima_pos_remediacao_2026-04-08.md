# Prompt: TESTE Auditor Pos-Remediacao Backend Auth Minima

```text
Voce vai atuar como TESTE Auditor do projeto `saars.inplast`, com foco no reteste final da rodada de backend auth minima apos a remediacao tecnica dos findings abertos no QA anterior.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Validar se os findings criticados no QA anterior foram realmente fechados, rodar a regressao essencial da camada minima de seguranca e emitir uma recomendacao final objetiva de go/no-go para a proxima fase.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_revisao_codigo.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/plans/2026-04-08-backend-auth-minima-design.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_qa_backend_auth_minima_2026-04-08.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_remediacao_backend_auth_minima_2026-04-08.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_backend_auth_minima_pos_remediacao_2026-04-08.md`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_backend_auth_minima.md`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/backend/provider.py`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/backend/config.py`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/backend/queries.py`
13. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web/app.js`
14. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web/index.html`

Contexto ja fechado:
- a rodada minima implementou auth via Bearer token, RBAC minimo e `company_scope`
- `root` tem acesso total
- `manager` nao administra usuarios nem integracoes
- `operator` tem leitura operacional e apontamento, sem MRP/admin/delete/ingest
- `web/` e a interface auxiliar de teste desta fase
- `web-react/` ainda nao foi adaptado ao novo contrato de auth
- `company_scope` e obrigatorio para usuarios nao root
- `planner` deve ser tratado como `manager`

Findings do QA anterior que foram declarados como remediados e precisam de reteste:
1. `P0`: vazamento multiempresa em `overview`, `painel` e `romaneios-kanban` no `mock`
2. `P1`: apos `401`, o legado `web/` nao recolocava a UI em estado bloqueado/login
3. `P1`: modulo `#usuarios` mostrava fallback sintetico para perfil sem permissao real
4. `P2`: auditoria perdia o ator em parte dos eventos criticos de erro

O que voce deve testar primeiro:
1. reproduzir os quatro findings acima e confirmar se realmente ficaram fechados
2. depois rodar regressao essencial de auth, RBAC, multiempresa, auditoria e legado `web/`

Ambiente recomendado para reproduzir o reteste:
- `PCP_DATA_MODE=mock`
- `PCP_PORT=8876`
- `PCP_AUTH_TOKEN_SECRET=qa-secret`

Artefatos uteis ja existentes:
- `/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/auth_401_reset.png`
- `/Users/sistemas2/Documents/Playground 2/saars.inplast/output/playwright/users_manager_restricted.png`
- `/Users/sistemas2/Documents/Playground 2/saars.inplast/data/security_audit.jsonl`

Regras de trabalho:
- primeiro testar, depois reportar
- nao alterar SPEC nem BACKLOG
- nao reverter mudancas locais existentes
- se precisar tocar codigo, pare e reporte antes
- diferencie claramente:
  - falha nova
  - regressao real
  - risco residual conhecido
  - finding ja remediado e confirmado

Saida esperada:
1. findings priorizados por severidade, com arquivo/rota/fluxo sempre que possivel
2. lista objetiva dos testes executados
3. resultado dos quatro findings remediados: fechado ou reaberto
4. resultado dos blocos de regressao: auth, RBAC, multiempresa, auditoria, legado `web/`
5. riscos residuais confirmados
6. recomendacao final objetiva: pode ou nao pode seguir para a fase do implementador de UI/UX

Perguntas que sua resposta deve responder explicitamente:
1. Os findings `P0/P1` remediados ficaram realmente fechados?
2. Existe regressao relevante introduzida pela remediacao?
3. O legado `web/` segue testavel sem enganar o usuario?
4. O maior risco operacional agora continua sendo estrutural ou ainda ha bug bloqueador nesta rodada?
5. O projeto pode seguir para a proxima fase ou precisa de nova rodada de correcao antes disso?
```

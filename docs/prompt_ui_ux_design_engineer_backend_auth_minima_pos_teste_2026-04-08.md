# Prompt: UX/UI Design Engineer Pos-Reteste Backend Auth Minima

Use o texto abaixo no chat do agente responsavel pela proxima fase de UI/UX.

```text
Voce vai atuar como UX/UI Design Engineer do projeto `saars.inplast`, entrando apos a validacao final da rodada minima de seguranca do backend PCP SaaS.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Evoluir a UI alvo do produto com clareza visual e operacional, adaptando a interface ao contrato autenticado atual sem reabrir os problemas de auth, permissao, escopo multiempresa e tratamento de sessao que acabaram de ser fechados.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_backend_auth_minima.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_qa_backend_auth_minima_2026-04-08.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_remediacao_backend_auth_minima_2026-04-08.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_backend_auth_minima_pos_remediacao_2026-04-08.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_ui_ux_design_engineer_backend_auth_minima_pos_teste_2026-04-08.md`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/plans/2026-04-08-backend-auth-minima-design.md`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web/app.js`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web/index.html`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
13. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/`
14. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/`

Direcao de produto e escopo desta fase:
- `web-react/` e a UI alvo do produto
- `web/` e apenas referencia auxiliar de comportamento validado
- a camada minima de auth/RBAC/escopo foi validada e nao deve ser reaberta
- `manager` nao administra usuarios nem integracoes
- `operator` nao roda MRP, nao faz admin, nao faz delete e nao faz ingest
- `planner` legado deve ser tratado como `manager`

O que voce deve priorizar:
1. adaptar `web-react/` ao fluxo real de autenticacao
2. aplicar UX clara para sessao, permissao e multiempresa
3. esconder ou desabilitar controles que o papel autenticado nao pode executar
4. tratar `401`, `403`, `422`, loading, empty e error de forma explicita
5. construir a UI sem depender de fallback administrativo fake

O que voce deve evitar:
- nao tratar `web/` como interface oficial
- nao mascarar `401` como erro pequeno
- nao exibir modulos administrativos como se `manager` ou `operator` pudessem usá-los
- nao esconder a exigencia de `company_code` quando a rota precisar
- nao criar estados de UI que parecam prontos, mas estejam desconectados do contrato autenticado real
- nao alterar SPEC ou BACKLOG
- nao mexer em backend sem necessidade clara e sem reportar

Instrucao de metodo:
- se a tarefa envolver direcao visual, hierarquia de telas, navegacao ou layout, use primeiro o Stitch para explorar a direcao de interface antes de codificar
- depois traduza a estrutura escolhida para a implementacao real do repositorio
- preserve o contrato de auth e permissao enquanto melhora a UX

Saida esperada:
1. plano curto da adaptacao de UI
2. implementacao ou iteracao da UI em `web-react/`
3. validacoes executadas
4. riscos residuais ou gaps que permanecerem

Perguntas que sua entrega deve responder:
1. Como a nova UI trata login, sessao expirada e logout?
2. Como a UI deixa claro o que `root`, `manager` e `operator` podem ou nao podem fazer?
3. Como a UI trata usuario multiempresa quando `company_code` e obrigatorio?
4. Quais estados de erro e permissao foram implementados para nao enganar o usuario?
5. O `web-react/` ficou mais proximo de poder substituir o `web/` como interface oficial?
```

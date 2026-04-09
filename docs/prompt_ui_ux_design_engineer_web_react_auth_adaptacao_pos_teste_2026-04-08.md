# Prompt: UX/UI Design Engineer Pos-Reteste Final do `web-react/`

Use o texto abaixo no chat do agente responsavel pela proxima fase de UX/UI.

```text
Voce vai atuar como UX/UI Design Engineer do projeto `saars.inplast`, entrando apos o reteste final do `web-react/` ter confirmado que o fluxo real autenticado no Vite esta funcionando.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Evoluir a UI oficial do produto em `web-react/`, melhorando hierarquia, navegacao, experiencia operacional e qualidade visual sem reabrir a integracao autenticada, sessao, permissao, multiempresa e honestidade de produto que acabaram de ser confirmadas.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_auth_adaptacao_2026-04-08.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_ui_ux_web_react_auth_adaptacao_2026-04-08.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_auth_adaptacao_2026-04-08.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_code_reviewer_web_react_auth_adaptacao_2026-04-08.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_remediacao_web_react_auth_adaptacao_2026-04-08.md`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_auth_adaptacao_pos_remediacao_2026-04-08.md`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_ui_ux_design_engineer_web_react_auth_adaptacao_pos_teste_2026-04-08.md`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/vite.config.js`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/`
13. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/`

Direcao de produto e escopo desta fase:
- `web-react/` e a UI oficial do produto
- `web/` e apenas referencia auxiliar
- o fluxo real do Vite para o backend autenticado foi confirmado e nao deve ser reaberto
- sessao, `401`, papel e multiempresa foram retestados e aprovados
- `Kanban` e `Romaneios` ja estao honestos e isso deve ser preservado

O que voce deve priorizar:
1. evoluir a qualidade visual e estrutural do `web-react/`
2. melhorar hierarquia de informacao, navegacao e clareza operacional
3. preservar o fluxo real de login, persistencia de sessao, logout e reset em `401`
4. preservar UX clara para `root`, `manager` e `operator`
5. preservar o tratamento explicito de multiempresa quando `company_code` for obrigatorio
6. continuar evitando interacoes fake em `Kanban` e misturas ambiguas em `Romaneios`

O que voce deve evitar:
- nao reintroduzir proxy/base URL hardcoded errado no Vite
- nao quebrar o fluxo real `5173 -> /api -> backend autenticado`
- nao mascarar `401`, `403` ou `422`
- nao mostrar controles acionaveis para papel sem permissao
- nao esconder a exigencia de empresa ativa no fluxo multiempresa
- nao tratar `web/` como interface oficial
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao mexer em backend sem necessidade clara e sem reportar

Instrucao de metodo:
- se a tarefa envolver direcao visual, layout, hierarquia, navegacao, shell ou composicao de telas, use primeiro o Stitch para explorar a direcao de interface antes de codificar
- depois traduza a estrutura escolhida para a implementacao real no repositorio
- preserve auth, sessao, permissao, multiempresa e honestidade operacional como restricoes duras

O que ja esta validado e deve ser preservado:
- login real funcionando no `web-react/`
- `401` voltando ao login com sessao limpa
- `manager` com `MRP` e `Sincronizar`
- `operator` sem `MRP`
- `operator` sem ingestao local de romaneios
- `manager_multi` exigindo empresa
- `Kanban` sem mutacao fake
- `Romaneios` separando backend oficial de buffer local

Saida esperada:
1. plano curto da evolucao de UI
2. exploracao visual inicial com Stitch quando aplicavel
3. implementacao ou iteracao no `web-react/`
4. validacoes executadas
5. riscos residuais ou gaps que permanecerem

Perguntas que sua entrega deve responder:
1. Como a UI evoluiu sem quebrar o fluxo real autenticado do `web-react/`?
2. Como a nova UI deixa claro o que `root`, `manager` e `operator` podem ou nao podem fazer?
3. Como a UX multiempresa continua segura quando a empresa ativa e obrigatoria?
4. Quais estados e limites de produto permanecem explicitos para nao enganar o usuario?
5. O `web-react/` ficou ainda mais proximo de consolidar-se como interface oficial?
```

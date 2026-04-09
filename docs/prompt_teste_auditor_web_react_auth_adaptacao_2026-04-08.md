# Prompt: TESTE Auditor Pos-Adaptacao do `web-react/`

Use o texto abaixo no chat do agente `TESTE Auditor`.

```text
Voce vai atuar como TESTE Auditor do projeto `saars.inplast`, entrando apos a rodada de adaptacao do `web-react/` ao contrato autenticado atual.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Executar um reteste dirigido do `web-react/` para validar se a UI oficial candidata agora respeita corretamente sessao autenticada, papel, multiempresa e estados obrigatorios de interface, sem reabrir indevidamente a camada minima de backend auth que ja foi fechada.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_backend_auth_minima.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_qa_backend_auth_minima_2026-04-08.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_remediacao_backend_auth_minima_2026-04-08.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_backend_auth_minima_pos_remediacao_2026-04-08.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_ui_ux_design_engineer_backend_auth_minima_pos_teste_2026-04-08.md`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_ui_ux_web_react_auth_adaptacao_2026-04-08.md`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_auth_adaptacao_2026-04-08.md`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/`
13. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web/app.js`

Direcao desta rodada:
- `web-react/` e a UI alvo que deve ser retestada agora
- `web/` e apenas referencia auxiliar de comportamento autenticado
- nao trate o legado como produto final
- nao reabra backend auth, RBAC ou company scope sem evidencia objetiva de regressao

O que voce deve priorizar:
1. login, persistencia de sessao e logout no `web-react/`
2. reset completo em `401`
3. clareza de `403`, `422`, `loading`, `empty`, `stale_data` e `session_expired`
4. comportamento por papel para `root`, `manager` e `operator`
5. UX multiempresa quando `company_code` e obrigatorio
6. honestidade da interface em `Cockpit`, `Kanban` e `Romaneios`

O que voce deve validar explicitamente:
- se a UI deixa de parecer autenticada apos `401`
- se `operator` nao consegue acionar `MRP`
- se `operator` nao consegue usar ingestao local de romaneios
- se o seletor de empresa e exigido quando necessario
- se `Kanban` deixou de depender de interacao fake
- se `Romaneios` diferencia backend oficial de buffer local
- se os placeholders restantes estao honestos e nao fingem fluxo pronto

O que voce deve evitar:
- nao abrir bug novo so porque o `web-react/` ainda nao cobre todos os modulos do `web/`
- nao tratar falta de admin completo no React como regressao desta rodada sem contexto
- nao confundir gap residual conhecido com bug novo

Ambiente recomendado:
- backend local:
  - `PCP_DATA_MODE=mock`
  - `PCP_PORT=8876`
  - `PCP_AUTH_TOKEN_SECRET=qa-secret`
- frontend React via Vite

Saida esperada:
1. findings primeiro
2. testes executados
3. validacoes aprovadas
4. riscos residuais confirmados
5. recomendacao final de go/no-go para a proxima fase

Perguntas que sua entrega deve responder:
1. O `web-react/` agora trata login, logout e `401` corretamente?
2. A interface deixa claro o que cada papel pode ou nao pode fazer?
3. O fluxo multiempresa ficou claro e seguro?
4. As telas centrais ficaram mais proximas de produto e menos de prototipo enganoso?
5. O projeto pode voltar para uma nova rodada de implementacao frontend/fullstack?
```

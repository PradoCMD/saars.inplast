# Prompt: TESTE Auditor apos trilhos acionaveis e continuidade operacional no `web-react`

Use o texto abaixo no chat do agente `TESTE Auditor`.

```text
Voce vai atuar como TESTE Auditor do projeto `saars.inplast`, entrando depois de uma rodada de aprofundamento funcional no `web-react/`.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Executar um reteste independente do `web-react/` para confirmar que:

- `Governanca` e `Cockpit` ficaram mais acionaveis sem perder complementaridade
- `Kanban` e `Romaneios` ganharam continuidade funcional real
- os novos trilhos de navegacao respeitam papel, empresa e fonte de verdade
- auth, sessao, `401`, papel e multiempresa continuam intactos

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_consolidacao_semantica_operacional_2026-04-09.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_ux_ui_engineer_web_react_consolidacao_semantica_operacional_pos_teste_2026-04-09.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_implementation_ux_ui_engineer_web_react_trilhos_acionaveis_continuidade_operacional_2026-04-09.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_trilhos_acionaveis_continuidade_operacional_2026-04-09.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/CommandDeck.jsx`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx`
13. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/index.css`

Contexto desta entrada:
- `web-react/` continua sendo a interface oficial
- backend, `SPEC.json` e `BACKLOG.json` nao foram alterados nesta rodada
- `npm run lint` e `npm run build` ja passaram localmente
- a fundacao autenticada continua congelada
- esta rodada foi de trilhos acionaveis e continuidade operacional, nao de remediacao tecnica

Priorize verificar primeiro:
1. CTA de `Governanca` para `Cockpit`, `Kanban` e `Romaneios`
2. CTA e direcionamento de `Cockpit` para `Governanca`, `Kanban` ou `Romaneios`
3. `Kanban` abrindo `Romaneios` com detalhe oficial coerente
4. `manager_multi` em `Governanca` sem empresa
5. `manager_multi` em `Cockpit` e `Kanban` sem empresa
6. regressao curta de auth, sessao, `401`, papel e multiempresa

O que voce deve preservar e retestar explicitamente:
- login real no `web-react/`
- persistencia de sessao
- reset em `401`
- `manager_multi` sem empresa em `Governanca`
- empresa obrigatoria em `Cockpit`
- empresa obrigatoria em `Kanban`
- `Kanban` sem drag e sem mutacao fake
- `Romaneios` com backend oficial separado do buffer local
- ausencia de badge documental inventado em `Romaneios`

O que voce deve evitar:
- nao reabrir auth, sessao, `401`, proxy do Vite ou multiempresa sem evidencia objetiva
- nao tratar como bug o fato de `Governanca` ser transversal e nao exigir empresa ativa
- nao tratar como bug o fato de CTA apontar para modulo que continua exigindo empresa no shell
- nao tratar como bug a ausencia de mutacao no `Kanban`
- nao marcar como bug a ausencia de badge documental especifico em `Romaneios` se o payload oficial nao sustenta isso
- nao tocar codigo sem reportar antes
- nao alterar `SPEC.json` nem `BACKLOG.json`

Ambiente recomendado:
- backend:
  - `PCP_DATA_MODE=mock`
  - `PCP_AUTH_TOKEN_SECRET=qa-secret`
  - `PCP_PORT=8876`
- frontend:
  - `npm run dev -- --host 127.0.0.1 --port 5173`

Saida esperada:
1. findings primeiro
2. testes executados
3. validacoes aprovadas
4. riscos residuais
5. recomendacao final de go/no-go

Perguntas que sua entrega deve responder:
1. `Governanca` e `Cockpit` ficaram mais acionaveis sem perder complementaridade?
2. Os trilhos de navegacao entre modulos respeitam o contrato operacional do shell?
3. `Kanban` e `Romaneios` agora tem continuidade funcional real sem perder honestidade?
4. Auth, sessao, `401`, papel, multiempresa, `Kanban` e `Romaneios` continuam intactos?
5. O `web-react/` pode seguir para a proxima camada de backlog sem nova remediacao imediata?
```

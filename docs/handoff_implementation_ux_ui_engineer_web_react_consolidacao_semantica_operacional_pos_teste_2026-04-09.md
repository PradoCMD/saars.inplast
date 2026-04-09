# Handoff: Implementation UX/UI Engineer apos QA aprovado da consolidacao semantica operacional

Data: 2026-04-09
Projeto: `saars.inplast`
Responsavel anterior: TESTE Auditor
Responsavel seguinte: Implementation UX/UI Engineer
Status de entrada para implementacao: consolidacao semantica aprovada, fundacao autenticada preservada, sem findings reabertos

## 1. Objetivo deste handoff

Passar a proxima fase de implementacao do `web-react/` depois de um reteste independente aprovado.

Traducao pratica:

- esta fase nao e de remediacao
- esta fase nao e de reconstrucao do shell
- esta fase e de avancar a proxima camada funcional do produto sobre uma base que ficou estavel

## 2. O que esta confirmado antes da sua entrada

Pontos aprovados e congelados:

- login real funciona
- sessao persiste
- reset em `401` funciona
- gating por papel funciona
- gating multiempresa funciona
- `manager_multi` abre `Governanca` sem empresa
- `Cockpit` exige empresa
- `Kanban` exige empresa
- `Kanban` continua read-only e sem mutacao fake
- `Romaneios` continua separando backend oficial e buffer local
- `Governanca` e `Cockpit` ficaram complementares
- `Kanban` e `Romaneios` passaram a compartilhar a mesma lingua operacional

Base desta leitura:

- `docs/relatorio_teste_auditor_web_react_consolidacao_semantica_operacional_2026-04-09.md`
- `docs/relatorio_implementation_ux_ui_engineer_web_react_consolidacao_semantica_operacional_2026-04-09.md`

## 3. Leitura correta do estado atual

No worktree atual:

- `Governanca` ja virou uma superficie transversal de impacto nos modulos
- `Cockpit` ja virou uma superficie contextual por empresa
- `Kanban` ja fala de excecao, origem da previsao e fila oficial
- `Romaneios` ja reforca source of truth e subordina o buffer local

Isso significa:

- seu trabalho agora e aprofundar a camada operacional
- nao repetir semantica que ja esta resolvida
- nao redesenhar o shell como se ainda estivesssemos em modo placeholder

## 4. Prioridade recomendada

### Prioridade 1

Aprofundar a proxima camada operacional de `Cockpit` e `Governanca`.

Direcao:

- transformar a semantica aprovada em sinais mais acionaveis
- reforcar drilldown, trilhos de decisao e leitura de excecao sem virar duplicacao

### Prioridade 2

Continuar a aproximacao entre `Kanban` e `Romaneios` com foco em continuidade funcional.

Direcao:

- manter a mesma lingua operacional
- aprofundar o que o usuario consegue entender ao migrar de fila para detalhe
- nao inventar edicao nem contrato documental que o backend nao fornece

## 5. O que deve permanecer congelado

- login real no `web-react/`
- sessao em `pcp_app_session_v1`
- reset em `401`
- gating por papel
- gating multiempresa
- `manager_multi` sem empresa em `Governanca`
- empresa obrigatoria em `Cockpit`
- empresa obrigatoria em `Kanban`
- `Kanban` sem drag e sem mutacao fake
- `Romaneios` com backend oficial separado do buffer local
- ausencia de badge documental inventado em `Romaneios`

Se qualquer implementacao ameacar um item acima, pare e reporte.

## 6. Leituras obrigatorias

Leia nesta ordem:

1. `SPEC.json`
2. `BACKLOG.json`
3. `docs/relatorio_teste_auditor_web_react_consolidacao_semantica_operacional_2026-04-09.md`
4. `docs/relatorio_implementation_ux_ui_engineer_web_react_consolidacao_semantica_operacional_2026-04-09.md`
5. `web-react/src/App.jsx`
6. `web-react/src/components/CommandDeck.jsx`
7. `web-react/src/lib/operationalLanguage.js`
8. `web-react/src/pages/SourcesGovernance.jsx`
9. `web-react/src/pages/Cockpit.jsx`
10. `web-react/src/pages/KanbanBoard.jsx`
11. `web-react/src/pages/RomaneiosInbox.jsx`
12. `web-react/src/index.css`

## 7. Resultado esperado da sua entrega

Sua devolutiva deve trazer:

1. o que foi implementado e por que veio primeiro
2. arquivos alterados
3. validacoes executadas
4. o que foi preservado
5. riscos residuais

## 8. Perguntas que sua entrega deve responder

1. Qual foi a proxima fatia funcional implementada sobre a semantica ja aprovada?
2. Como a nova camada aprofunda o uso operacional sem reabrir contratos congelados?
3. O que ficou mais acionavel em `Governanca`, `Cockpit`, `Kanban` ou `Romaneios`?
4. O que permaneceu rigidamente preservado?

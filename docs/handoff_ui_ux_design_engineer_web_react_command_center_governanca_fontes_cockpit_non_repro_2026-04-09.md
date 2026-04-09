# Handoff: UX/UI Design Engineer apos confirmacao de `non-repro` em `Governanca de Fontes` e `Cockpit`

Data: 2026-04-09
Projeto: `saars.inplast`
Responsavel anterior: TESTE Auditor
Responsavel seguinte: UX/UI Design Engineer
Status de entrada para design: shell oficial `web-react/` liberado no worktree atual, com `P0` nao reproduzidos e regressao curta aprovada

## 1. Objetivo deste handoff

Passar para o agente de UX/UI o estado consolidado do `web-react/` depois do reteste `non-repro`.

O foco agora nao e remediacao tecnica.
O foco agora e evolucao de produto, hierarquia e linguagem operacional.

Sua funcao e levar a proxima camada de UX/UI adiante sem reabrir:

- auth
- sessao
- `401`
- papel
- multiempresa
- `Kanban` honesto
- `Romaneios` com separacao oficial vs buffer

## 2. Estado atual confirmado antes da sua entrada

Pontos congelados e aprovados:

- `POST /api/pcp/sources/sync` sustenta `401 / 403 / 200`
- `npm run build` passou
- Vite sobe limpo
- login real funciona
- sessao persiste
- reset em `401` funciona
- `manager_multi` abre `Governanca` sem empresa
- `Cockpit` exige empresa
- `Kanban` exige empresa
- `Romaneios` continua distinguindo backend oficial e buffer local

Relatorio-base desta liberacao:

- [relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_non_repro_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_non_repro_2026-04-09.md)

## 3. Como sua trilha deve entrar agora

O shell autenticado esta estavel o bastante para sua trilha voltar a olhar para experiencia de produto.

Traduzindo:

- nao e hora de rediscutir o contrato de auth
- nao e hora de redesenhar o shell do zero
- e hora de aprofundar a camada operacional com direcao visual e estrutural forte

## 4. Escopo recomendado para a sua fase

### Prioridade 1

Consolidar a relacao entre `Governanca de Fontes` e `Cockpit`.

Perguntas que a UX precisa responder melhor:

- o que e saude transversal de fontes
- o que e alerta operacional do contexto atual
- quando a operacao deve agir no modulo transversal versus no cockpit por empresa

### Prioridade 2

Fortalecer a leitura de decisao em `Cockpit`.

Perguntas que a tela deve responder melhor:

- qual sinal pede acao imediata
- o que e stale mas ainda utilizavel
- o que esta bloqueado por falta de empresa versus por ausencia real de dados

### Prioridade 3

Refinar a linguagem operacional de `Kanban` e `Romaneios`.

Pontos importantes:

- `Kanban` continua read-only e nao pode prometer mutacao
- `Romaneios` precisa continuar deixando visivel a separacao entre backend oficial e buffer local
- a hierarquia entre leitura agregada, fila e detalhe operacional pode ficar mais clara

## 5. O que esta congelado e nao deve ser quebrado

Considere como restricao dura:

- login real do `web-react/`
- persistencia de sessao em `pcp_app_session_v1`
- reset em `401`
- gating por papel
- gating multiempresa
- `manager_multi` sem empresa em `Governanca`
- `manager_multi` com empresa obrigatoria em `Cockpit`
- `manager_multi` com empresa obrigatoria em `Kanban`
- `Kanban` sem drag e sem mutacao fake
- `Romaneios` com separacao clara entre backend oficial e buffer local

Se qualquer proposta visual pedir romper um item acima, pare e reporte antes.

## 6. Leitura obrigatoria recomendada

Leia nesta ordem:

1. [SPEC.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json)
3. [relatorio_non_repro_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_non_repro_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md)
4. [relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_non_repro_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_non_repro_2026-04-09.md)
5. [handoff_implementation_ux_ui_engineer_web_react_proxima_camada_operacional_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_ux_ui_engineer_web_react_proxima_camada_operacional_2026-04-08.md)
6. [relatorio_ui_ux_web_react_proxima_camada_operacional_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_ui_ux_web_react_proxima_camada_operacional_2026-04-08.md)
7. [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx)
8. [web-react/src/components/CommandDeck.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/CommandDeck.jsx)
9. [web-react/src/components/Topbar.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx)
10. [web-react/src/components/Sidebar.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Sidebar.jsx)
11. [web-react/src/pages/Cockpit.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx)
12. [web-react/src/pages/SourcesGovernance.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx)
13. [web-react/src/pages/KanbanBoard.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx)
14. [web-react/src/pages/RomaneiosInbox.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx)

## 7. Metodo recomendado para a sua fase

Use Stitch primeiro quando estiver definindo:

- estrutura de tela
- hierarquia de informacao
- alternativas de fluxo
- agrupamento de estados
- ritmo visual das superficies operacionais

Depois traga isso para uma saida implementavel:

- direcao escolhida
- racional de UX orientado por operacao industrial
- estados obrigatorios por modulo
- guardrails que o implementador nao pode quebrar

## 8. O que voce deve evitar

- nao mexer no backend
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao redesenhar o shell autenticado do zero
- nao esconder `401`, `403`, `422`, `empty`, `loading` ou `stale_data`
- nao sugerir interacao que o backend ainda nao sustenta
- nao enfraquecer a diferenca entre dado oficial e buffer local

## 9. O que eu espero da sua devolutiva

Sua entrega deve trazer:

1. direcao clara para a proxima camada de UX/UI
2. justificativa de experiencia para uso industrial
3. estados e hierarquia por modulo
4. recomendacao clara do que o implementador deve construir primeiro
5. o que precisa continuar congelado para nao reabrir a base autenticada

## 10. Recomendacao final

Pode seguir.

O melhor uso da sua trilha agora e preparar a proxima evolucao de `Governanca`, `Cockpit`, `Kanban` e `Romaneios` com mais clareza, densidade operacional e continuidade visual, sem mexer na fundacao autenticada que acabou de passar no reteste.

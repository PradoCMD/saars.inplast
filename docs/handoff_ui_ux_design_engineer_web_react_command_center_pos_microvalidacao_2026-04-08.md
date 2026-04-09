# Handoff: UX/UI Design Engineer Pos-Microvalidacao do `web-react` Command Center

Data: 2026-04-08
Projeto: `saars.inplast`
Responsavel anterior: TESTE Auditor
Responsavel seguinte: UX/UI Design Engineer
Status de entrada para design: shell oficial `web-react/` estabilizado e liberado, com base autenticada validada e 3 ajustes de UX confirmados em reteste independente

## 1. Objetivo deste handoff

Passar para o agente de UX/UI o estado consolidado do `web-react/` depois da rodada de microvalidacao e do reteste independente.

O foco agora nao e corrigir bug de auth nem reabrir shell.
O foco agora e trabalhar um passo a frente na experiencia do produto:

- consolidar linguagem visual das proximas superficies operacionais
- melhorar hierarquia e fluxos de modulos ainda em transicao
- produzir direcao clara para o agente de implementacao seguir depois

## 2. Estado atual confirmado antes da sua entrada

Pontos congelados e aprovados:

- fluxo real `5173 -> /api -> 8876` funcionando
- login, logout e persistencia de sessao funcionando
- reset em `401` funcionando
- comportamento por papel funcionando
- gating multiempresa funcionando
- topo desktop melhorado
- bloqueios visuais honestos para `operator`
- navegacao compacta em tablet/mobile melhorada
- `Kanban` honesto, sem mutacao fake
- `Romaneios` separando backend oficial de buffer local

Relatorio-base desta liberacao:

- [relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md)

## 3. Como sua trilha deve se encaixar sem colidir com a implementacao

O agente de implementacao pode seguir em paralelo, mas a sua trilha precisa ficar um passo a frente.

Traduzindo:

- voce nao precisa disputar os mesmos arquivos centrais do shell
- voce deve produzir direcao de produto para as proximas superficies
- sua saida ideal e um pacote claro de decisao para o `web-react/`

## 4. Escopo recomendado para a sua fase

### Prioridade 1

Definir direcao de UX para `Governanca de Fontes`.

Perguntas que a tela deve responder melhor:

- qual fonte esta `healthy`, `stale`, `partial` ou `error`
- quando a UI esta usando ultimo snapshot valido
- como empresa ativa ou consolidado aparecem sem ambiguidade

Relacionamento com backlog:

- `S2-T2`

### Prioridade 2

Definir direcao de produto para estados centrais de `Cockpit`.

Perguntas que o `Cockpit` deve responder melhor:

- o que esta puxando acao imediata
- o que e stale mas ainda utilizavel
- o que esta vazio por contexto versus vazio real de operacao

Relacionamento com backlog:

- `S2-T3`

### Prioridade 3

Definir linguagem e estrutura para o detalhamento operacional de `Romaneios` e `Kanban`.

Pontos importantes:

- detalhe consolidado do romaneio
- explicacao da origem do consolidado
- indicacao visual de previsao automatica, manual e sem previsao
- leitura de fila sem criar promessa de mutacao ainda inexistente

Relacionamento com backlog:

- `S3-T3`
- `S3-T4`

## 5. O que esta congelado e nao deve ser redesenhado sem evidencia

Considere como restricao dura:

- login real do `web-react/`
- persistencia de sessao em `pcp_app_session_v1`
- reset em `401`
- gating por papel
- gating multiempresa
- `Kanban` sem mutacao fake
- `Romaneios` com buffer local explicitamente separado da fonte oficial

Se alguma proposta visual pedir romper qualquer item acima, pare e reporte antes.

## 6. Leitura obrigatoria recomendada

Leia nesta ordem:

1. [SPEC.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json)
3. [relatorio_ui_ux_web_react_command_center_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_ui_ux_web_react_command_center_2026-04-08.md)
4. [handoff_implementation_ux_ui_engineer_web_react_command_center_pos_teste_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_ux_ui_engineer_web_react_command_center_pos_teste_2026-04-08.md)
5. [handoff_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md)
6. [relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md)
7. [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx)
8. [web-react/src/components/CommandDeck.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/CommandDeck.jsx)
9. [web-react/src/components/Topbar.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx)
10. [web-react/src/components/Sidebar.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Sidebar.jsx)
11. [web-react/src/pages/KanbanBoard.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx)
12. [web-react/src/pages/RomaneiosInbox.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx)

## 7. Metodo recomendado para a sua fase

Use Stitch primeiro quando estiver definindo:

- estrutura de tela
- hierarquia de informacao
- ritmo visual
- alternativas de fluxo

Depois transforme isso em uma entrega objetiva para implementacao:

- direcao escolhida
- racional de produto
- estados obrigatorios
- guardrails de auth e honestidade operacional

## 8. O que voce deve evitar

- nao mexer no backend
- nao alterar `SPEC.json` ou `BACKLOG.json`
- nao redesenhar o shell autenticado do zero
- nao introduzir interacao ficticia onde o backend ainda nao entrega acao real
- nao esconder `401`, `403`, `422`, `stale_data`, `empty` ou modulo em transicao
- nao enfraquecer o contraste entre fonte oficial e rascunho local

## 9. O que eu espero da sua devolutiva

Sua entrega deve trazer:

1. proposta de direcao para as proximas superficies
2. justificativa de UX orientada por operacao industrial
3. sugestoes de hierarquia e estados
4. quais modulos devem ser atacados primeiro pelo implementador
5. o que precisa continuar congelado para nao reabrir a camada autenticada

## 10. Recomendacao final

Pode seguir.

Sua melhor contribuicao agora nao e refazer o shell.
Sua melhor contribuicao e preparar a proxima fatia de produto com direcao forte, clara e implementavel.

# Handoff: Implementation UX/UI Engineer Pos-Microvalidacao do `web-react` Command Center

Data: 2026-04-08
Projeto: `saars.inplast`
Responsavel anterior: TESTE Auditor
Responsavel seguinte: Implementation UX/UI Engineer
Status de entrada para implementacao: liberado para seguir no `web-react/`, com shell autenticado estabilizado e reteste independente aprovado

## 1. Objetivo deste handoff

Passar para o agente de implementacao o contexto consolidado depois do reteste pos-microvalidacao.

O foco agora nao e mais corrigir topo, bloqueio visual ou navegacao compacta.
Esses 3 pontos ficaram fechados.

O foco agora e seguir no `web-react/` com as proximas etapas do produto, aproveitando que a base autenticada e o shell principal estao estaveis.

## 2. Estado atual confirmado antes da sua entrada

Pontos aprovados e congelados:

- proxy real do Vite funcionando
- login, logout e persistencia de sessao funcionando
- reset em `401` funcionando
- `manager`, `operator` e `manager_multi` corretos
- topo desktop melhorado
- bloqueios visuais honestos
- navegacao compacta com texto preservado
- `Kanban` honesto, sem mutacao fake
- `Romaneios` com separacao clara entre backend oficial e buffer local

Relatorio-base desta liberacao:

- [relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md)

## 3. Recomendacao de trabalho para a sua fase

Agora faz sentido voce seguir com outras etapas do produto.

Minha recomendacao e atacar primeiro as proximas fatias com melhor relacao entre valor operacional e risco:

### Faixa A

Fechar estados de `Cockpit` e `Governanca de Fontes`.

Porque:

- sao telas centrais para leitura operacional
- ainda existem gaps de `loading`, `empty`, `stale_data`, `error` e visibilidade por empresa
- isso conversa direto com o backlog ja priorizado

Relacionamento com backlog:

- `S2-T2`
- `S2-T3`

### Faixa B

Fechar a camada oficial de entrega de `Romaneios` e `Kanban`.

Porque:

- o shell ja esta honesto e pronto para ganhar profundidade
- o backlog pede filtros, detalhe consolidado, estados claros e fila oficial mais forte

Relacionamento com backlog:

- `S3-T3`
- `S3-T4`

## 4. Como rodar em paralelo com UX sem colidir

Se o agente de UX/UI tambem for acionado, a divisao recomendada e:

- UX/UI Design Engineer: trabalha direcao, hierarquia e estados das proximas superficies
- voce: implementa no `web-react/` as fatias com escopo tecnico ja razoavelmente definido

Regra pratica:

- nao reabra o shell validado por cosmetica
- nao espere refinamento infinito para avancar no backlog
- puxe da trilha de UX apenas o que realmente reduzir risco ou retrabalho

## 5. O que esta congelado e nao deve ser quebrado

Considere como restricoes duras:

- login real no `web-react/`
- persistencia de sessao em `pcp_app_session_v1`
- reset em `401`
- gating por papel
- gating multiempresa
- `operator` sem `MRP`
- `operator` sem ingestao local
- `Kanban` sem mutacao fake
- `Romaneios` com backend oficial separado do buffer local

Se qualquer implementacao ameacar esses pontos, pare e reporte antes.

## 6. Leitura obrigatoria recomendada

Leia nesta ordem:

1. [SPEC.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json)
3. [relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md)
4. [relatorio_ui_ux_web_react_command_center_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_ui_ux_web_react_command_center_2026-04-08.md)
5. [handoff_implementation_ux_ui_engineer_web_react_command_center_pos_teste_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_ux_ui_engineer_web_react_command_center_pos_teste_2026-04-08.md)
6. [handoff_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md)
7. [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx)
8. [web-react/src/components/CommandDeck.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/CommandDeck.jsx)
9. [web-react/src/components/Topbar.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx)
10. [web-react/src/components/Sidebar.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Sidebar.jsx)
11. [web-react/src/pages/KanbanBoard.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx)
12. [web-react/src/pages/RomaneiosInbox.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx)
13. [web-react/src/index.css](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/index.css)

## 7. O que eu recomendaria implementar primeiro

### Opcao recomendada

Comecar por `Governanca de Fontes` e estados centrais de `Cockpit`.

Motivo:

- reforca confiabilidade de leitura
- conversa direto com stale data, erro e empty state
- tem alto valor operacional sem exigir inventar novo paradigma de interacao

### Segunda frente

Evoluir `Romaneios` e `Kanban` para aderir mais ao backlog oficial:

- filtros por empresa, criticidade e busca
- detalhe consolidado de romaneio
- estados claros de loading, empty e error
- fila mais forte no kanban sem abrir interacao fake

## 8. Quando usar Stitch nesta fase

Como sua fase e de implementacao, voce pode seguir direto no repositorio quando o caminho estiver claro.

Use Stitch apenas se precisar comparar rapidamente:

- estrutura de nova tela
- organizacao de bloco operacional
- hierarquia de informacao antes de codar

## 9. O que voce deve evitar explicitamente

- nao mexer no backend sem necessidade clara
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao tocar proxy/base URL sem evidencia objetiva
- nao reabrir o shell autenticado por refatoracao cosmetica
- nao mascarar `401`, `403`, `422`, `empty`, `loading`, `error` ou `stale_data`
- nao introduzir acao ficticia em `Kanban` ou `Romaneios`

## 10. O que eu espero da sua devolutiva

Sua entrega deve trazer:

1. plano curto da etapa escolhida
2. backlog slice atacado
3. alteracoes aplicadas no `web-react/`
4. validacoes executadas
5. confirmacao explicita do que foi preservado
6. riscos residuais, se sobrarem

## 11. Recomendacao final

Pode seguir.

Voce agora esta numa boa janela para tocar a proxima etapa real do produto.
O ideal e usar a estabilidade do shell autenticado como fundacao, nao como algo a ser rediscutido.

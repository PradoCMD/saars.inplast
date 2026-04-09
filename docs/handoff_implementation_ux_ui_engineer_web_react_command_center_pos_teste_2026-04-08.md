# Handoff: Implementation UX/UI Engineer Pos-Reteste do `web-react` Command Center

Data: 2026-04-08
Projeto: `saars.inplast`
Responsavel anterior: TESTE Auditor
Responsavel seguinte: Implementation UX/UI Engineer
Status de entrada para implementacao: liberado para seguir no `web-react/`, com auth/sessao/papel/multiempresa preservados e 3 ajustes de UX priorizados

## 1. Objetivo deste handoff

Passar para o agente de implementacao UX/UI o contexto consolidado depois do reteste do `command center` no `web-react/`.

O foco da sua fase nao e redesenhar a estrategia do produto do zero.
O foco agora e implementar melhorias claras e objetivas no shell oficial, preservando tudo o que ja foi validado na camada autenticada.

## 2. Estado atual confirmado antes da sua entrada

O que ficou aprovado no reteste:

- o fluxo real `5173 -> /api -> 8876` continua funcionando
- login real continua funcionando
- logout continua funcionando
- `401` continua limpando sessao e voltando ao login
- `manager` continua com `MRP` e `Sincronizar`
- `operator` continua sem `MRP`
- `operator` continua sem ingestao local de romaneios
- `manager_multi` continua exigindo empresa quando necessario
- `Kanban` continua honesto e read-only
- `Romaneios` continua separando backend oficial de buffer local

Relatorio-base desta liberacao:

- [relatorio_teste_auditor_web_react_command_center_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_2026-04-08.md)

## 3. Decisao importante para a sua fase

### UI oficial

- `web-react/` e a interface oficial

### Referencia auxiliar

- `web/` continua apenas como oracle auxiliar, nao como alvo de implementacao

### Implicacao pratica

- implemente diretamente no `web-react/`
- nao reabra backend auth
- nao reabra proxy/base URL do Vite
- nao altere `SPEC.json` nem `BACKLOG.json`

## 4. Os 3 findings que voce deve atacar primeiro

### Prioridade 1

Melhorar a escaneabilidade do topo no desktop.

Problema confirmado:

- o topo esta denso demais
- papel, empresa e estado competem com busca, controles e sessao
- a leitura acima da dobra ainda e pior do que o restante da tela

Pontos sensiveis:

- [Topbar.jsx:37](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/Topbar.jsx#L37)
- [Topbar.jsx:57](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/Topbar.jsx#L57)
- [index.css:329](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/index.css#L329)
- [index.css:400](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/index.css#L400)

Objetivo:

- reorganizar prioridade visual do topo
- reduzir competicao entre chips, texto de contexto, busca, acoes e sessao
- manter papel, empresa e estado claramente legiveis

### Prioridade 2

Tornar controles bloqueados visualmente honestos.

Problema confirmado:

- o estado bloqueado esta correto no DOM
- mas varios CTAs indisponiveis ainda parecem acao primaria

Pontos sensiveis:

- [Topbar.jsx:105](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/Topbar.jsx#L105)
- [RomaneiosInbox.jsx:303](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx#L303)
- [RomaneiosInbox.jsx:404](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx#L404)
- [index.css:575](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/index.css#L575)
- [index.css:1263](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/index.css#L1263)

Objetivo:

- deixar claro quando a acao esta bloqueada por papel ou contexto
- reduzir atracao visual em controles indisponiveis
- manter a regra de negocio honesta na interface

### Prioridade 3

Melhorar a navegacao em viewport menor.

Problema confirmado:

- em tablet/mobile a navegacao perde texto demais
- a orientacao passa a depender de memoria de icones

Pontos sensiveis:

- [Sidebar.jsx:27](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/Sidebar.jsx#L27)
- [Sidebar.jsx:56](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/Sidebar.jsx#L56)
- [index.css:1475](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/index.css#L1475)
- [index.css:1521](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/index.css#L1521)

Objetivo:

- preservar simplicidade sem perder significado
- manter algum reforco de contexto em tela menor
- evitar navegacao puramente iconica em fluxo operacional

## 5. O que esta congelado e nao deve ser quebrado

Considere como restricoes duras:

- login real no `web-react/`
- persistencia de sessao em `pcp_app_session_v1`
- reset em `401`
- gating multiempresa
- `operator` sem `MRP`
- `operator` sem ingestao local
- `Kanban` sem mutacao fake
- `Romaneios` com backend oficial separado do buffer local

Se uma ideia de UI pedir romper qualquer item acima, pare e reporte antes de seguir.

## 6. Leitura obrigatoria recomendada

Leia nesta ordem:

1. [SPEC.json](/Users/sistemas2/Documents/Playground%202/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground%202/saars.inplast/BACKLOG.json)
3. [handoff_teste_auditor_web_react_command_center_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_2026-04-08.md)
4. [relatorio_ui_ux_web_react_command_center_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_ui_ux_web_react_command_center_2026-04-08.md)
5. [relatorio_teste_auditor_web_react_command_center_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_2026-04-08.md)
6. [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx)
7. [web-react/src/components/CommandDeck.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/CommandDeck.jsx)
8. [web-react/src/components/Topbar.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/Topbar.jsx)
9. [web-react/src/components/Sidebar.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/Sidebar.jsx)
10. [web-react/src/pages/KanbanBoard.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/KanbanBoard.jsx)
11. [web-react/src/pages/RomaneiosInbox.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx)
12. [web-react/src/index.css](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/index.css)

## 7. Como eu recomendaria atacar esta fase

### Etapa 1

Refatorar o topo para uma hierarquia mais limpa.

### Etapa 2

Revisar estados visuais de botoes e CTA bloqueados.

### Etapa 3

Revisar a sidebar responsiva para nao apagar contexto demais.

### Etapa 4

Rodar validacao rapida em:

- desktop
- tablet
- mobile
- `manager`
- `operator`
- `manager_multi`

## 8. Quando usar Stitch nesta fase

Como este agente agora e de implementacao, voce nao precisa abrir uma exploracao visual ampla se ja houver uma direcao clara.

Use Stitch apenas se precisar comparar rapidamente:

- nova hierarquia do topo
- alternativa de shell
- nova organizacao da navegacao em viewport menor

Se a direcao estiver clara, implemente direto no repositorio.

## 9. O que voce deve evitar explicitamente

- nao mexer no backend sem necessidade clara
- nao tocar proxy/base URL do Vite sem evidencia objetiva
- nao mascarar `401`, `403` ou `422`
- nao transformar bloqueio de permissao em vazio silencioso
- nao deixar CTA bloqueado com cara de CTA liberado
- nao trocar clareza operacional por cosmetica

## 10. Evidencias uteis

Artefatos que ajudam a enxergar exatamente o que o QA encontrou:

- [web_react_command_center_manager_desktop_1440.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_command_center_manager_desktop_1440.png)
- [web_react_command_center_kanban_actual.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_command_center_kanban_actual.png)
- [web_react_command_center_operator_romaneios_full.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_command_center_operator_romaneios_full.png)
- [web_react_command_center_manager_multi.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_command_center_manager_multi.png)
- [web_react_command_center_manager_multi_selected.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_command_center_manager_multi_selected.png)
- [web_react_command_center_tablet_760.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_command_center_tablet_760.png)
- [web_react_command_center_mobile_390.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_command_center_mobile_390.png)

## 11. O que espero da sua devolutiva

Sua entrega deve trazer:

1. plano curto de implementacao
2. mudancas aplicadas no `web-react/`
3. validacoes executadas
4. pontos preservados do contrato autenticado
5. riscos residuais, se sobrarem

## 12. Recomendacao final

Pode seguir.

Mas siga com esta disciplina:

- trate a camada autenticada como congelada
- trate estes 3 findings como prioridade real
- implemente com foco em clareza operacional, nao em enfeite visual

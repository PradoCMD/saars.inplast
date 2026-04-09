# Handoff: UX/UI Design Engineer Pos-Reteste Final do `web-react/`

Data: 2026-04-08
Projeto: `saars.inplast`
Responsavel anterior: TESTE Auditor
Responsavel seguinte: UX/UI Design Engineer
Status de entrada para design/implementacao: liberado para seguir no `web-react/`, com o fluxo real autenticado confirmado

## 1. Objetivo deste handoff

Passar para o agente de UX/UI o contexto tecnico mais atualizado do frontend oficial, depois da confirmacao final de que:

- o `web-react/` autentica no fluxo real do Vite
- sessao, `401`, papel e multiempresa continuam corretos
- `Kanban` e `Romaneios` permanecem honestos

O foco agora nao e reabrir a investigacao de auth.
O foco agora e continuar a evolucao da UI oficial do produto sem quebrar a camada autenticada que acabou de ser confirmada.

## 2. Estado atual confirmado antes da sua entrada

A trilha consolidada desta area passou por:

1. adaptacao inicial do `web-react/` ao contrato autenticado
2. reteste do TESTE Auditor, que encontrou um `P0` de integracao real no Vite
3. remediacao tecnica do proxy/base URL
4. reteste final no fluxo real, sem override de rede

Resultado consolidado:

- o `P0` do fluxo real do Vite foi fechado
- login real funciona no `web-react/`
- logout funciona
- `401` limpa sessao e volta ao login
- `manager` continua com `MRP` e `Sincronizar`
- `operator` continua sem `MRP` e sem ingestao local de romaneios
- multiempresa continua exigindo empresa ativa quando necessario
- `Kanban` continua sem mutacao fake
- `Romaneios` continua separando backend oficial de buffer local

Relatorio que confirma esta liberacao:

- [relatorio_teste_auditor_web_react_auth_adaptacao_pos_remediacao_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_teste_auditor_web_react_auth_adaptacao_pos_remediacao_2026-04-08.md)

## 3. Decisao importante para a sua fase

### UI alvo

- `web-react/` deve ser tratado como a interface oficial e o alvo principal de evolucao

### Referencia auxiliar

- `web/` segue apenas como oracle auxiliar de comportamento em casos pontuais
- nao invista em promover o legado `web/` como produto final

### Implicacao pratica

- toda evolucao visual, estrutural e de navegacao deve acontecer prioritariamente em `web-react/`
- preserve o caminho real autenticado confirmado no Vite

## 4. Leitura obrigatoria recomendada

Leia nesta ordem:

1. [SPEC.json](/Users/sistemas2/Documents/Playground%202/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground%202/saars.inplast/BACKLOG.json)
3. [handoff_teste_auditor_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/handoff_teste_auditor_web_react_auth_adaptacao_2026-04-08.md)
4. [relatorio_ui_ux_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_ui_ux_web_react_auth_adaptacao_2026-04-08.md)
5. [relatorio_teste_auditor_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_teste_auditor_web_react_auth_adaptacao_2026-04-08.md)
6. [handoff_code_reviewer_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/handoff_code_reviewer_web_react_auth_adaptacao_2026-04-08.md)
7. [relatorio_remediacao_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_remediacao_web_react_auth_adaptacao_2026-04-08.md)
8. [relatorio_teste_auditor_web_react_auth_adaptacao_pos_remediacao_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_teste_auditor_web_react_auth_adaptacao_pos_remediacao_2026-04-08.md)
9. [web-react/vite.config.js](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/vite.config.js)
10. [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx)
11. [web-react/src/components/Topbar.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/Topbar.jsx)
12. [web-react/src/pages/KanbanBoard.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/KanbanBoard.jsx)
13. [web-react/src/pages/RomaneiosInbox.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx)

## 5. O que esta tecnicamente estavel e voce pode assumir

No recorte desta rodada, voce pode assumir:

- `POST /api/pcp/auth/login` funciona no fluxo real do `web-react/`
- o proxy do Vite ja esta alinhado ao backend autenticado da rodada
- sessao persistida em `pcp_app_session_v1`
- logout limpo
- `401` volta para login e limpa sessao
- `manager` pode `MRP` e `Sincronizar`
- `operator` nao pode `MRP`
- `operator` nao pode ingestao local de romaneios
- multiempresa exige empresa ativa quando o recorte demanda `company_code`
- `Kanban` e `Romaneios` ja usam uma linguagem mais honesta

## 6. O que voce nao deve reabrir

### Nao reabra a integracao real do Vite

Nao volte a:

- hardcodar o frontend para uma porta legada errada
- depender de override manual para o login funcionar
- presumir que o ambiente local sempre sera `8765`

### Nao reabra o contrato de sessao

Nao quebre:

- persistencia de sessao
- retorno ao login em `401`
- limpeza de `localStorage`

### Nao esconda permissao e escopo

Evite explicitamente:

- transformar `403` em vazio silencioso
- transformar `422` de empresa ausente em mensagem generica
- mostrar affordance ativa para `operator` em fluxos que ele nao pode executar
- sugerir consolidado onde a UI precisa de empresa ativa

## 7. Regras de UX e comportamento para a sua fase

### Autenticacao e sessao

- preserve login real no `web-react/`
- preserve logout limpo
- preserve reset total em `401`
- nao deixe o shell parecer autenticado apos sessao invalida

### Permissao por papel

- `root` pode operar tudo
- `manager` pode operar os fluxos ja aprovados, mas nao deve ganhar UI de admin fora de escopo
- `operator` nao deve ver controles acionaveis de `MRP`, admin ou ingestao local

### Multiempresa

- se o usuario tiver multiplas empresas, a UI deve continuar pedindo a selecao quando a rota exigir
- continue deixando empresa ativa visivel na interface
- nao esconda o bloqueio de contexto

### Honestidade operacional

- `Kanban` deve continuar sem vender mutacao que nao existe
- `Romaneios` deve continuar separando backend oficial de buffer local
- modulos em transicao devem continuar honestos, sem fingir fluxo pronto

## 8. Prioridades recomendadas para a sua fase

### Prioridade 1

Usar o `web-react/` agora que o fluxo real esta validado como base definitiva da evolucao visual e estrutural.

### Prioridade 2

Melhorar hierarquia visual, navegacao, consistencia e clareza operacional sem reabrir:

- auth
- sessao
- papel
- multiempresa

### Prioridade 3

Avancar modulos e superfícies ainda em transicao, mas sempre com UX honesta e respeitando o contrato autenticado.

## 9. Evidencias uteis para sua referencia

Artefatos do reteste final:

- [web_react_pos_remediacao_manager_real_proxy.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_pos_remediacao_manager_real_proxy.png)
- [web_react_pos_remediacao_session_expired.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_pos_remediacao_session_expired.png)
- [web_react_pos_remediacao_operator_restrictions.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_pos_remediacao_operator_restrictions.png)
- [web_react_pos_remediacao_manager_multi.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_pos_remediacao_manager_multi.png)

Pontos de codigo especialmente sensiveis:

- proxy/base URL em [vite.config.js:5](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/vite.config.js#L5)
- login e sessao em [App.jsx:328](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L328) e [App.jsx:456](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L456)
- reset em `401` em [App.jsx:344](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L344)
- gating multiempresa em [App.jsx:320](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L320)
- affordances de topo em [Topbar.jsx:70](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/Topbar.jsx#L70)
- `Kanban` honesto em [KanbanBoard.jsx:127](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/KanbanBoard.jsx#L127)
- `Romaneios` oficial vs buffer em [RomaneiosInbox.jsx:209](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx#L209)

## 10. Riscos residuais que continuam existindo

Esses itens continuam fora do seu escopo imediato e nao devem ser tratados como falha da sua UI:

- `ProductionTracking` ainda nao e modulo operacional final
- `web-react/` ainda nao cobre todos os modulos do `web/`
- referencias antigas a `8765` podem existir em parte da documentacao

## 11. O que esperamos de voce

Sua entrega deve fazer duas coisas ao mesmo tempo:

1. elevar a qualidade da UI oficial
2. preservar rigorosamente a integracao autenticada e os comportamentos aprovados

Em especial:

- nao use o design para mascarar restricoes reais
- nao esconda `401`, `403` ou `422`
- nao reintroduza acoplamento errado no Vite
- nao promova interacoes fake como se ja fossem produto ligado ao backend

## 12. Recomendacao final para sua entrada

Pode seguir para a fase de UX/UI.

Recomendacao de postura:

- tratar esta etapa como evolucao segura do `web-react/` oficial
- usar Stitch primeiro quando for definir direcao visual, hierarquia ou layout
- preservar a integracao real autenticada e a honestidade operacional como restricoes de produto

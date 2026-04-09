# Handoff: TESTE Auditor apos implementacao de `Governanca de Fontes` e estados centrais de `Cockpit` no `web-react`

Data: 2026-04-08
Projeto: `saars.inplast`
Responsavel anterior: Implementation UX/UI Engineer
Responsavel seguinte: TESTE Auditor
Status de entrada para teste: nova fatia do backlog aplicada no `web-react/` com validacoes estaticas aprovadas

## 1. Objetivo deste handoff

Passar para o `TESTE Auditor` o contexto consolidado depois da rodada de implementacao que promoveu:

- `Governanca de Fontes`
- estados centrais de `Cockpit`

O foco agora nao e redesenhar o produto.
O foco e confirmar de forma independente que a nova fatia:

- funciona no shell oficial
- preserva o contrato autenticado
- nao mascara estados de erro, permissao, vazio ou stale

## 2. Leitura obrigatoria

Leia nesta ordem:

1. [SPEC.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json)
3. [relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md)
4. [relatorio_implementation_ux_ui_engineer_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_implementation_ux_ui_engineer_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md)
5. [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx)
6. [web-react/src/pages/Cockpit.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx)
7. [web-react/src/pages/SourcesGovernance.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx)
8. [web-react/src/components/Topbar.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx)
9. [web-react/src/components/Sidebar.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Sidebar.jsx)
10. [web-react/src/pages/RomaneiosInbox.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx)
11. [web-react/src/pages/KanbanBoard.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx)
12. [web-react/src/index.css](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/index.css)

## 3. O que foi implementado nesta rodada

### `Governanca de Fontes`

Mudancas centrais:

- a rota `fontes` deixou de ser placeholder
- o shell passou a carregar `sources` e `alerts`
- existe uma nova tela dedicada com:
  - resumo de saude
  - ultimo sucesso valido
  - lista por fonte
  - alertas centrais
  - sync global e por fonte, quando permitido

### `Cockpit`

Mudancas centrais:

- o cockpit agora mostra:
  - painel de saude das fontes
  - painel de alertas centrais
- esses blocos respeitam:
  - `loading`
  - `permission`
  - `error`
  - `empty`

### Honestidade de contexto multiempresa

Mudanca importante:

- empresa obrigatoria continua para `Cockpit` e `Kanban`
- `Governanca de Fontes` nao deve exigir selecao de empresa para abrir, porque ela e transversal a integracoes e nao ao recorte agregado do overview

## 4. O que foi validado localmente antes do handoff

Executado com sucesso em `web-react/`:

- `npm run lint`
- `npm run build`

Importante:

- esta rodada ainda nao teve reteste browser independente depois do patch
- seu reteste agora e obrigatorio para confirmar a integracao ponta a ponta

## 5. O que deve ser priorizado no reteste

### Bloco A: `Governanca de Fontes`

Confirmar em especial:

1. `manager` abre a tela e ve:
   - resumo de fontes
   - alertas centrais
   - sync global
   - sync por fonte
2. `operator` abre a tela e ve:
   - leitura da saude e alertas
   - sem affordance enganosa de sync liberado
3. `manager_multi` consegue abrir a tela mesmo sem escolher empresa
4. a busca global filtra fontes e alertas

### Bloco B: `Cockpit`

Confirmar:

1. os novos paineis de fontes e alertas aparecem
2. estados `loading`, `error`, `permission`, `empty` seguem honestos
3. a tela continua exigindo empresa quando o usuario multiempresa entra sem recorte

### Bloco C: contratos congelados

Retestar pelo menos:

1. login valido
2. persistencia de sessao
3. logout
4. reset em `401`
5. `manager`
6. `operator`
7. `manager_multi`
8. regressao rapida em `Kanban`
9. regressao rapida em `Romaneios`

## 6. O que deve permanecer como restricao dura

Nao aceite quebrar ou afrouxar:

- login real no `web-react/`
- sessao em `pcp_app_session_v1`
- reset em `401`
- gating por papel
- gating multiempresa
- proxy do Vite
- `manager` com `MRP` e `Sincronizar`
- `operator` sem `MRP`
- `operator` sem ingestao local
- `Kanban` sem mutacao fake
- `Romaneios` com backend oficial separado do buffer local

## 7. O que NAO deve virar finding automaticamente

Nao reabra como bug sem evidencia objetiva:

- modulo em transicao honesto
- fato de `Governanca` ser transversal e nao depender de empresa ativa
- ausencia de automacao de browser nesta propria rodada de implementacao

## 8. Ambiente recomendado

Para reproduzir:

- backend:
  - `PCP_DATA_MODE=mock`
  - `PCP_AUTH_TOKEN_SECRET=qa-secret`
  - `PCP_PORT=8876`
- frontend:
  - `npm run dev -- --host 127.0.0.1 --port 5173`

## 9. Resultado esperado da devolutiva

A entrega do auditor deve trazer:

1. findings primeiro
2. testes executados
3. validacoes aprovadas
4. riscos residuais
5. recomendacao final de go/no-go

## 10. Perguntas que a auditoria deve responder

1. `Governanca de Fontes` virou uma tela operacional real no `web-react/`?
2. O `Cockpit` agora comunica melhor a confiabilidade das entradas?
3. `manager_multi` continua exigindo empresa apenas onde isso e realmente necessario?
4. Auth, sessao, `401`, papel, multiempresa, `Kanban` e `Romaneios` continuam intactos?
5. O frontend oficial pode seguir para a proxima fatia de backlog sem retrabalho imediato?

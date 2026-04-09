# Relatorio: Implementation UX/UI Engineer do `web-react` em Governanca de Fontes e estados centrais de `Cockpit`

Data: 2026-04-08
Projeto: `saars.inplast`
Escopo desta etapa: transformar a proxima fatia real do backlog do `web-react/` em entrega concreta, priorizando `Governanca de Fontes` e estados centrais do `Cockpit`
Status atual da rodada: implementacao aplicada e validacoes estaticas aprovadas

## 1. Objetivo da rodada

Esta fase entrou depois de:

- auth, sessao, `401`, papel e multiempresa estarem estabilizados no shell oficial
- o reteste independente ter confirmado a microvalidacao do command center

O objetivo agora nao era redesenhar o shell.
O objetivo era entregar a proxima fatia real de produto no `web-react/`, com foco em:

- `S2-T2`: `Governanca de Fontes`
- `S2-T3`: estados centrais de `Cockpit`

Sem reabrir:

- login real
- `pcp_app_session_v1`
- reset em `401`
- gating por papel
- gating multiempresa
- proxy do Vite
- `Kanban` sem mutacao fake
- `Romaneios` com separacao clara entre backend oficial e buffer local

## 2. Base lida antes da implementacao

Leituras usadas como base:

1. `SPEC.json`
2. `BACKLOG.json`
3. `docs/relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md`
4. `docs/relatorio_ui_ux_web_react_command_center_2026-04-08.md`
5. `docs/handoff_implementation_ux_ui_engineer_web_react_command_center_pos_teste_2026-04-08.md`
6. `docs/handoff_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md`
7. `docs/handoff_implementation_ux_ui_engineer_web_react_command_center_pos_microvalidacao_2026-04-08.md`
8. `web-react/src/App.jsx`
9. `web-react/src/pages/Cockpit.jsx`
10. `web-react/src/components/CommandDeck.jsx`
11. `web-react/src/index.css`

Leitura auxiliar para contrato de dados:

- `data/sources.json`
- `data/alerts.json`
- `backend/provider.py`
- `backend/source_sync.py`

## 3. Decisao de implementacao

A ordem escolhida foi:

1. promover `Governanca de Fontes` de placeholder para tela real
2. ligar `sources` e `alerts` no ciclo oficial de recursos do shell
3. puxar `Cockpit` para uma leitura mais honesta do estado das fontes e alertas
4. ajustar o shell apenas no necessario para nao marcar empresa como obrigatoria em modulo transversal

Essa ordem veio primeiro porque:

- entrega valor operacional imediato
- fecha uma area do backlog com contrato de dados ja existente
- evita inventar interacao que o backend nao sustenta
- reduz risco antes de aprofundar `Romaneios` e `Kanban`

## 4. O que foi implementado

### 4.1 Rota real de `Governanca de Fontes`

Arquivos:

- [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx)
- [web-react/src/pages/SourcesGovernance.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx)

Mudancas aplicadas:

- a rota `fontes` passou de `implemented: false` para `implemented: true`
- `sources` e `alerts` entraram em `createDefaultResources()`
- `GET /api/pcp/sources` e `GET /api/pcp/alerts` entraram no carregamento oficial do shell
- a nova tela passou a exibir:
  - resumo de fontes saudaveis, em atencao e bloqueadas
  - ultimo sucesso valido
  - alertas centrais
  - lista por fonte com area, codigo e frescor
  - sync global e sync por fonte quando o papel possui permissao real

Importante:

- o sync por fonte usa o backend ja existente via `source_codes`
- nao houve alteracao no backend

### 4.2 `Cockpit` com governanca e alertas centrais

Arquivo:

- [web-react/src/pages/Cockpit.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx)

Mudancas aplicadas:

- o cockpit passou a consumir `sourcesState` e `alertsState`
- foram adicionados paineis centrais para:
  - saude das fontes
  - alertas centrais
- esses paineis respeitam:
  - `loading`
  - `permission`
  - `error`
  - `empty`
- a busca global agora tambem filtra fontes e alertas

Resultado:

- o cockpit fica mais perto do produto real porque deixa de depender apenas de numeros agregados e passa a explicitar a confiabilidade das entradas

### 4.3 Sinal rapido do modulo e honestidade de contexto

Arquivo:

- [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx)

Mudancas aplicadas:

- o `CommandDeck` passou a refletir o estado real da `Governanca`
- o sinal rapido do modulo agora diferencia:
  - atualizando
  - leitura restrita
  - falha de leitura
  - fontes sob controle
  - fontes atrasadas
  - bloqueios de integracao

### 4.4 Empresa obrigatoria apenas onde faz sentido

Arquivo:

- [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx)

Mudanca aplicada:

- o banner e o destaque visual de empresa obrigatoria foram restringidos a `Cockpit` e `Kanban`
- `Governanca de Fontes` segue visivel mesmo para `manager_multi` sem selecao, porque ela e transversal ao shell e nao depende do recorte agregado por empresa

Isso melhora honestidade operacional.
Nao havia motivo para bloquear visualmente uma tela que nao exige esse contexto.

### 4.5 Estilo da nova superficie

Arquivo:

- [web-react/src/index.css](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/index.css)

Mudancas aplicadas:

- novos estilos para:
  - `sources-page`
  - `sources-hero`
  - `sources-grid`
  - `source-card`
  - `alert-card`
  - `sources-contract-list`
- reaproveitamento da linguagem visual do command center existente, sem redesenhar shell, topo ou sidebar

## 5. Validacoes executadas

Executado com sucesso em `web-react/`:

- `npm run lint`
- `npm run build`

Leitura:

- a fatia aplicada fecha limpa em validacao estatica
- a rodada nao introduziu erro de build

## 6. O que foi preservado

Itens mantidos intactos nesta rodada:

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
- `Romaneios` com separacao entre backend oficial e buffer local

Tambem nao houve alteracao em:

- `SPEC.json`
- `BACKLOG.json`
- backend

## 7. Riscos residuais

O principal risco residual desta fase e de verificacao, nao de desenho:

- ainda falta reteste browser independente da nova `Governanca`
- ainda falta smoke operacional da integracao desta nova fatia no fluxo autenticado completo

Pontos que seguem para proxima rodada:

- aprofundamento de `Romaneios`
- aprofundamento de `Kanban`
- cobertura mais ampla das areas em transicao

## 8. Recomendacao de proximo passo

Encaminhar agora para `TESTE Auditor`.

Foco recomendado do reteste:

1. `Governanca de Fontes` para `manager`, `operator` e `manager_multi`
2. `Cockpit` com novos paineis de fontes e alertas
3. confirmacao de que empresa obrigatoria ficou restrita aos modulos certos
4. regressao rapida de auth, sessao, `401`, papel, multiempresa, `Kanban` e `Romaneios`

## 9. Perguntas que esta rodada responde

1. Qual proxima fatia do backlog foi implementada e por que ela veio primeiro?

`S2-T2` e a parte central de `S2-T3`, porque entregam valor real com baixo risco e com backend ja sustentando o contrato.

2. Como a entrega aumentou valor operacional no `web-react/`?

O shell oficial agora mostra saude das fontes e alertas centrais dentro do proprio produto, em vez de depender de leitura implícita ou tela placeholder.

3. O que foi mantido intacto para nao reabrir a camada autenticada?

Auth, sessao, `401`, papel, multiempresa, proxy do Vite, `Kanban` honesto e `Romaneios` com separacao oficial vs buffer.

4. O que ainda fica para a proxima rodada?

Rteste independente desta fase e depois aprofundamento de `Romaneios` e `Kanban`.

5. O frontend oficial ficou mais perto do fluxo real de produto?

Sim. `Governanca de Fontes` deixou de ser placeholder e o `Cockpit` passou a explicitar a confiabilidade operacional das entradas.

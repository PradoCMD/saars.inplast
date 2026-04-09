# Handoff: Implementation UX/UI Engineer para a Proxima Camada Operacional do `web-react`

Data: 2026-04-08
Projeto: `saars.inplast`
Responsavel anterior: UX/UI Design Engineer
Responsavel seguinte: Implementation UX/UI Engineer
Status de entrada para implementacao: shell autenticado congelado e direcao UX/UI definida para `Governanca`, `Cockpit`, `Romaneios` e `Kanban`

## 1. Objetivo deste handoff

Passar para implementacao a proxima fatia clara do `web-react/` sem reabrir a base autenticada ja validada.

Seu foco nao e redesenhar o produto do zero.
Seu foco e transformar a direcao abaixo em entrega real de frontend, com prioridade operacional e baixo risco de regressao.

## 2. O que esta confirmado antes da sua entrada

Pontos aprovados e congelados:

- `web-react/` e a interface oficial
- login real, logout e persistencia de sessao funcionando
- reset em `401` funcionando
- gating por papel funcionando
- gating multiempresa funcionando
- `Kanban` segue honesto e read-only
- `Romaneios` segue separando backend oficial de buffer local
- shell principal, topo e navegacao compacta ja passaram em reteste independente

Base desta direcao:

- `docs/relatorio_ui_ux_web_react_proxima_camada_operacional_2026-04-08.md`
- `docs/relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md`

## 3. Prioridade de implementacao recomendada

### Prioridade 1

`Governanca de Fontes`

Tickets:

- `S2-T2`

Porque vem primeiro:

- fecha a camada de confianca da operacao
- tem alto ganho visual e funcional sem tocar contrato sensivel
- prepara melhor leitura para o `Cockpit`

### Prioridade 2

`Cockpit`

Tickets:

- `S2-T3`

Porque vem logo depois:

- usa a mesma camada de frescor, integridade e alerta
- hoje ja tem boa base, mas ainda precisa conduzir melhor a decisao

### Prioridade 3

`Romaneios`

Tickets:

- `S3-T3`

Porque vem antes do refinamento final de `Kanban`:

- hoje o gargalo principal e ausencia de detalhe consolidado
- isso aproxima mais o modulo de produto real do que mais cosmetica no quadro

### Prioridade 4

`Kanban`

Tickets:

- `S3-T4`

Porque fica por ultimo nesta rodada:

- a tela ja esta honesta
- o ganho agora e tornar a leitura de origem e status mais explicita

## 4. O que construir em cada modulo

### 4.1 `Governanca de Fontes`

Arquivos mais provaveis:

- `web-react/src/pages/SourcesGovernance.jsx`
- `web-react/src/index.css`
- opcionalmente um componente compartilhado em `web-react/src/components/`

Objetivo:

- promover a tela de uma lista tecnicamente correta para uma superficie de integridade operacional

Implementar:

1. painel de `snapshot integrity`
   - ultimo snapshot valido
   - leitura atual ou fallback
   - resumo do que esta seguro vs degradado
2. agrupamento visual de fontes
   - `bloqueadas`
   - `atencao`
   - `saudaveis`
3. linguagem mais forte para `partial`, `stale`, `missing` e `error`
4. nota mais clara sobre `escopo ativo` versus `saude transversal`

Estados obrigatorios:

- `loading`
- `error`
- `permission_denied`
- `empty`
- `stale_data`
- `partial`

### 4.2 `Cockpit`

Arquivos mais provaveis:

- `web-react/src/pages/Cockpit.jsx`
- `web-react/src/index.css`

Objetivo:

- transformar a primeira dobra em um trilho de decisao, nao apenas em um resumo informativo

Implementar:

1. `alert strip` superior
   - frescor
   - risco de integracao
   - empresa obrigatoria quando aplicavel
2. hero de pressao operacional
   - frase curta de acao imediata
   - destaque para risco principal
3. reforco de `stale but usable`
   - deixando claro quando a tela usa ultimo snapshot valido
4. hierarquia mais forte entre:
   - indicadores
   - gargalos
   - fila observada
   - integridade
   - alertas

Estados obrigatorios:

- `loading`
- `company_required`
- `permission_denied`
- `error`
- `empty por filtro`
- `empty operacional`
- `stale_data`

### 4.3 `Romaneios`

Arquivos mais provaveis:

- `web-react/src/pages/RomaneiosInbox.jsx`
- `web-react/src/pages/RomaneiosInbox.css`
- `web-react/src/index.css`

Objetivo:

- promover a tela para `lista oficial + detalhe consolidado`, mantendo o buffer local como apoio operacional

Implementar:

1. selecao de romaneio oficial
2. painel de detalhe consolidado
   - cabecalho com romaneio, empresa, prioridade, previsao, status
   - badges de composicao documental
   - itens consolidados
   - origem documental e eventos relevantes
   - painel `source of truth`
3. empty state honesto quando nenhum romaneio oficial estiver selecionado
4. persistir contraste entre:
   - `Romaneios oficiais`
   - `Buffer local`

Referencia auxiliar:

- `web/app.js`
  - `renderRomaneioDetail`
  - `renderLocalRomaneioDetail`

Estados obrigatorios:

- `loading da lista`
- `error da lista`
- `empty da lista`
- `loading do detalhe`
- `error do detalhe`
- `empty sem selecao`
- `stale_data`
- `permission` ou `company_required` para escrita local

### 4.4 `Kanban`

Arquivos mais provaveis:

- `web-react/src/pages/KanbanBoard.jsx`
- `web-react/src/index.css`

Objetivo:

- aprofundar a leitura da fila oficial sem reintroduzir mutacao fake

Implementar:

1. badge de origem da previsao nos cards
   - `automatica`
   - `manual`
   - `sem previsao`
2. legenda operacional mais forte
3. painel lateral mais objetivo para:
   - `read-only protocol`
   - `produtos sob pressao`
4. filtros ou agrupamentos simples por criticidade e texto se o payload atual sustentar

Estados obrigatorios:

- `loading`
- `company_required`
- `permission_denied`
- `error`
- `empty`
- `stale_data`

## 5. Stitch que voce pode consultar

Projeto:

- `projects/6162515088644226406`

Design system:

- `Ironforge Industrial`
- `assets/9d18fa2777404aeead1dc40090d48b24`

Screens uteis:

- `Governanca de Fontes - Command Center`
  - `projects/6162515088644226406/screens/0ab9c591089946fcad2174050c4c9fc5`
- `Romaneio Consolidado Detail View`
  - `projects/6162515088644226406/screens/a82d99d5f94e4f82a548106692eb6ab3`
- `Kanban Logistico - Command Center`
  - `projects/6162515088644226406/screens/79677434b2e84e2c9cb686a38f9b8e67`

Uso recomendado:

- nao replique cegamente
- use para hierarquia, ritmo visual e estados
- traduza para o codigo existente do `web-react/`

## 6. O que deve permanecer congelado

- login real no `web-react/`
- sessao em `pcp_app_session_v1`
- reset em `401`
- proxy real do Vite para `/api`
- gating por papel
- gating multiempresa
- `operator` sem `MRP`
- `operator` sem ingestao local
- `Kanban` sem drag ou mutacao fake
- `Romaneios` com backend oficial separado do buffer local

Se uma implementacao ameacar qualquer item acima, pare e reporte antes.

## 7. Como eu recomendaria executar

### Fase A

Fechar `Governanca` e `Cockpit` na mesma rodada se possivel.

Razao:

- compartilham semantica de frescor, alerta e integridade
- podem reutilizar linguagem visual e pequenos componentes

### Fase B

Fechar `Romaneios` com detalhe consolidado.

Razao:

- entrega salto real de produto
- aumenta valor sem tocar backend

### Fase C

Refinar `Kanban`.

Razao:

- modulo ja esta seguro
- pode ser elevado depois sem risco alto

## 8. Validacoes esperadas

Depois de editar:

- `npm run lint` em `web-react/`
- `npm run build` em `web-react/`
- smoke visual minimo em:
  - `manager_inplast`
  - `operator_inplast`
  - `manager_multi`
- verificacao de:
  - `401`
  - empresa obrigatoria
  - papel bloqueado
  - empty / error / stale

## 9. O que eu espero da sua devolutiva

Sua entrega deve trazer:

1. findings curtos ou gaps remanescentes
2. backlog slice realmente implementado
3. arquivos alterados
4. validacoes executadas
5. o que foi preservado da camada autenticada
6. riscos residuais

## 10. Recomendacao final

Pode seguir.

O proximo ganho real do produto agora vem de modulo e estado, nao de shell.
Implemente com criterio de operacao industrial: menos "dashboard bonito", mais confianca de leitura e decisao.

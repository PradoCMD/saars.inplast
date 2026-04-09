# Handoff: Implementation UX/UI Engineer apos `non-repro` e consolidacao da proxima camada operacional

Data: 2026-04-09
Projeto: `saars.inplast`
Responsavel anterior: UX/UI Design Engineer
Responsavel seguinte: Implementation UX/UI Engineer
Status de entrada para implementacao: shell autenticado congelado, `P0` como `non-repro`, e direcao UX/UI atualizada sobre o estado real do worktree

## 1. Objetivo deste handoff

Passar para implementacao a proxima etapa do `web-react/` considerando um fato importante:

- boa parte da direcao de 2026-04-08 ja entrou no codigo

Por isso, sua fase agora nao e repetir a rodada anterior.
Sua fase e consolidar coerencia semantica e continuidade operacional entre modulos que ja amadureceram.

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
- os `P0` recentes ficaram como `non-repro` no worktree atual em 2026-04-09

Base desta direcao:

- `docs/relatorio_ui_ux_web_react_proxima_camada_operacional_non_repro_2026-04-09.md`
- `docs/relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_non_repro_2026-04-09.md`

## 3. Leitura correta do estado atual

Nao parta do pressuposto de que `Governanca`, `Cockpit`, `Kanban` e `Romaneios` continuam atrasados como na rodada anterior.

No worktree atual:

- `SourcesGovernance.jsx` ja ganhou `integrity strip`, grupos por estado e fallback mais explicito
- `Cockpit.jsx` ja ganhou `alert strip`, `stale but usable` e maior orientacao de decisao
- `KanbanBoard.jsx` ja ganhou origem de previsao mais clara
- `RomaneiosInbox.jsx` ja ganhou detalhe consolidado oficial

Traducao pratica:

- seu trabalho agora e consolidar e refinar
- nao recomeçar

## 4. Prioridade de implementacao recomendada

### Prioridade 1

Consolidar `Governanca` e `Cockpit` como superficies irmas, mas nao redundantes.

Objetivo:

- `Governanca` como camada transversal de integridade
- `Cockpit` como camada contextual de decisao

Porque vem primeiro:

- hoje esse e o principal ganho de produto restante nessas duas superfícies
- o risco maior nao e falta de informacao, e sim duplicacao semantica

### Prioridade 2

Alinhar `Kanban` e `Romaneios` no mesmo vocabulario visual de previsao, excecao e fonte de verdade.

Porque vem logo depois:

- ambos os modulos ja cresceram
- agora precisam parecer partes do mesmo produto

## 5. O que construir em cada modulo

### 5.1 `Governanca de Fontes`

Arquivos-alvo provaveis:

- `web-react/src/pages/SourcesGovernance.jsx`
- `web-react/src/index.css`

O que construir:

1. evoluir a lateral de `Governanca` para `impacto nos modulos`
   - `impacta cockpit`
   - `impacta kanban`
   - `impacta romaneios`
2. reduzir qualquer resquicio de cara de "pagina tecnica"
3. reforcar a diferenca entre:
   - saude transversal
   - contexto de empresa do shell

Evite:

- retransformar `Governanca` em um segundo `Cockpit`

### 5.2 `Cockpit`

Arquivos-alvo provaveis:

- `web-react/src/pages/Cockpit.jsx`
- `web-react/src/index.css`

O que construir:

1. compactar o bloco de fontes para falar mais em impacto do que em inventario
2. reforcar a leitura:
   - `o que esta seguro`
   - `o que esta degradado`
   - `qual decisao fica em cautela`
3. manter o foco em empresa ativa e acao imediata

Evite:

- espelhar `Governanca` em miniatura

### 5.3 `Kanban`

Arquivos-alvo provaveis:

- `web-react/src/pages/KanbanBoard.jsx`
- `web-react/src/index.css`

O que construir:

1. consolidar `forecast origin` como linguagem de produto
2. transformar a area lateral em `painel de excecoes`
3. reforcar visualmente:
   - `sem previsao`
   - `manual`
   - `automatico`

Evite:

- qualquer affordance que pareca edicao no quadro

### 5.4 `Romaneios`

Arquivos-alvo provaveis:

- `web-react/src/pages/RomaneiosInbox.jsx`
- `web-react/src/pages/RomaneiosInbox.css`
- `web-react/src/index.css`

O que construir:

1. aumentar dominancia do detalhe oficial quando um romaneio estiver selecionado
2. aproximar o set de badges e estados da linguagem do `Kanban`
3. reduzir competicao visual do buffer local com o detalhe oficial
4. usar o painel `source of truth` para explicar limites do payload atual

Observacao importante:

- o contrato atual do detalhe nao explicita fortemente a composicao documental do consolidado
- nao invente badge de `1 documento` ou `2 documentos` sem campo confiavel da API

## 6. Primitive set compartilhado recomendado

Se fizer sentido, implemente como pequenos componentes reutilizaveis:

1. `Snapshot Integrity Rail`
2. `Operational Impact Panel`
3. `Forecast Origin Badge Set`
4. `Source of Truth Panel`
5. `Read-only Protocol Panel`

Esses blocos ajudam a unificar:

- `Governanca` e `Cockpit`
- `Kanban` e `Romaneios`

## 7. Stitch que voce pode consultar

Projeto:

- `projects/6162515088644226406`

Design system:

- `Ironforge Industrial`
- `assets/9d18fa2777404aeead1dc40090d48b24`

Screens uteis:

- `Governanca de Fontes - Command Center`
  - `projects/6162515088644226406/screens/0ab9c591089946fcad2174050c4c9fc5`
- `Kanban Logistico - Command Center`
  - `projects/6162515088644226406/screens/79677434b2e84e2c9cb686a38f9b8e67`
- `Romaneio Consolidado Detail View`
  - `projects/6162515088644226406/screens/a82d99d5f94e4f82a548106692eb6ab3`

Observacao:

- nesta rodada o `generate_screen_from_text` falhou com `invalid argument`
- use os screens existentes como referencia de hierarquia e ritmo

## 8. O que deve permanecer congelado

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

Se qualquer implementacao ameacar um item acima, pare e reporte.

## 9. Validacoes esperadas

Depois de editar:

- `npm run lint` em `web-react/`
- `npm run build` em `web-react/`
- smoke visual minimo em:
  - `manager_multi` em `Governanca`
  - `manager_multi` em `Cockpit`
  - `manager_multi` em `Kanban`
  - `Romaneios` com detalhe oficial selecionado
- confirmacao de que:
  - `401` continua resetando sessao
  - `Governanca` continua abrindo sem empresa
  - `Cockpit` e `Kanban` continuam exigindo empresa

## 10. O que eu espero da sua devolutiva

Sua entrega deve trazer:

1. findings curtos e priorizados
2. slice implementado de forma objetiva
3. arquivos alterados
4. validacoes executadas
5. confirmacao explicita do que foi preservado
6. riscos residuais

## 11. Recomendacao final

Pode seguir.

O ponto central desta rodada nao e "fazer mais UI".
E fazer com que o produto pareca um sistema unico:

- `Governanca` informa a integridade transversal
- `Cockpit` traduz isso em decisao contextual
- `Kanban` e `Romaneios` usam a mesma lingua operacional para fila, previsao, excecao e fonte de verdade

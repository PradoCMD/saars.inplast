# Relatorio: Direcao UX/UI da Proxima Camada Operacional do `web-react`

Data: 2026-04-08
Projeto: `saars.inplast`
Responsavel pela fase: UX/UI Design Engineer
Escopo desta entrega: definir direcao implementavel para `Governanca de Fontes`, `Cockpit`, `Kanban` e `Romaneios` sem reabrir o shell autenticado ja validado

## 1. Resumo executivo

O `web-react/` ja deixou de ser um shell promissor e passou a ser uma base oficial confiavel.
Nesta fase, a melhor alavanca nao e refazer auth, topo ou navegacao.
A melhor alavanca e elevar a leitura operacional das superficies centrais que ja existem ou ja estao perto de existir.

Minha conclusao e:

- `Governanca de Fontes` ja tem corpo suficiente para ser promovida, mas ainda precisa sair de uma lista "boa" para uma leitura de integridade operacional
- `Cockpit` ja informa, mas ainda nao conduz a decisao com a clareza necessaria para um ambiente industrial
- `Kanban` ja e honesto, porem ainda precisa deixar mais explicito o que e previsao automatica, manual e ausencia de previsao
- `Romaneios` ja separa bem oficial e buffer local, mas ainda carece de detalhe consolidado e "source of truth" visivel para produto

## 2. Base usada nesta fase

### Documentos

- `SPEC.json`
- `BACKLOG.json`
- `docs/handoff_ui_ux_design_engineer_web_react_command_center_pos_microvalidacao_2026-04-08.md`
- `docs/relatorio_teste_auditor_web_react_command_center_pos_microvalidacao_2026-04-08.md`
- `docs/handoff_implementation_ux_ui_engineer_web_react_command_center_pos_teste_2026-04-08.md`
- `docs/pcp_sync_fontes_reais.md`
- `docs/pcp_contrato_fontes_previsao.md`

### Codigo real observado

- `web-react/src/App.jsx`
- `web-react/src/pages/SourcesGovernance.jsx`
- `web-react/src/pages/Cockpit.jsx`
- `web-react/src/pages/KanbanBoard.jsx`
- `web-react/src/pages/RomaneiosInbox.jsx`
- `web/app.js` como oracle auxiliar para detalhe legado de romaneio

### Stitch

Projeto usado:

- `projects/6162515088644226406`

Design system usado:

- `Ironforge Industrial`
- asset: `assets/9d18fa2777404aeead1dc40090d48b24`

Exploracoes confirmadas:

- `Governanca de Fontes - Command Center`
  - screen: `projects/6162515088644226406/screens/0ab9c591089946fcad2174050c4c9fc5`
- `Romaneio Consolidado Detail View`
  - screen: `projects/6162515088644226406/screens/a82d99d5f94e4f82a548106692eb6ab3`
- `Kanban Logistico - Command Center`
  - screen: `projects/6162515088644226406/screens/79677434b2e84e2c9cb686a38f9b8e67`

Observacao:

- a exploracao dedicada de `Cockpit` no Stitch nao fechou por falha transitiva de API/argumento
- a direcao do `Cockpit` abaixo foi fechada a partir de `SPEC`, backlog, codigo atual e da mesma linguagem validada nas outras 3 exploracoes

## 3. Findings priorizados

### P1. `Governanca de Fontes` ainda explica pouco o que e "ultimo snapshot valido"

Problema real:

- a pagina ja mostra saude e alertas
- mas ainda nao deixa a integridade do snapshot como elemento de primeira classe
- o operador entende que ha atraso ou falha, mas ainda nao enxerga com a clareza ideal o que continua confiavel e o que entrou em degradacao

Impacto:

- reduz confianca na leitura do `Cockpit`
- enfraquece o contrato de fallback definido na `SPEC`

### P1. `Cockpit` ainda informa melhor do que prioriza

Problema real:

- as metricas e listas existem
- mas ainda falta um trilho de decisao mais direto para "acao imediata", "dados stale mas utilizaveis" e "vazio por contexto versus vazio real"

Impacto:

- a tela passa menos senso de centro operacional e mais senso de dashboard informativo

### P1. `Romaneios` ainda nao entrega o detalhe consolidado que a operacao precisa

Problema real:

- a separacao entre backend oficial e buffer local ficou boa
- porem a lista oficial ainda para cedo demais
- falta uma leitura lateral ou inferior que mostre cabecalho consolidado, itens, origem documental e estado de previsao

Impacto:

- o modulo ainda parece inbox + staging, e nao inbox + decisao

### P1. `Kanban` ainda precisa deixar a origem da previsao mais legivel

Problema real:

- o quadro ja nao mente
- mas ainda nao fica claro o suficiente quais romaneios vieram de criterio automatico, quais vieram de ajuste manual e quais continuam sem previsao

Impacto:

- reduz a leitura de risco e a confianca sobre o porque cada card esta naquela coluna

## 4. Direcao visual escolhida

### Norte

Seguir com a linha "industrial command center", nao com uma linguagem de backoffice generico.

Principios:

- hierarquia por leitura de risco e confianca, nao por decoracao
- superficies pesadas, dados legiveis e contraste alto
- destaque forte para degradacao operacional
- explicacao explicita de fallback, stale e leitura parcial
- nada de interacao que o backend ainda nao sustenta

### Consequencia pratica no `web-react/`

- menos listas planas
- mais blocos com papel semantico claro: `integrity rail`, `alert strip`, `source of truth panel`, `read-only protocol`
- tags e microcopy mais objetivas sobre origem do dado
- empty states diferentes para "nao ha conteudo", "nao ha contexto", "ha falha", "ha degradacao"

## 5. Direcao por modulo

### 5.1 `Governanca de Fontes`

O que existe hoje:

- hero
- resumo de saude
- lista ordenada por fonte
- alertas centrais
- sync global e por fonte

O que deve evoluir:

1. elevar `integridade do snapshot` para um painel proprio
2. separar visualmente `healthy`, `attention` e `blocked` antes da lista detalhada
3. explicitar melhor a relacao entre `escopo ativo` e `saude transversal`
4. deixar `ultimo snapshot valido` mais forte que o simples `ultimo sucesso`

Estrutura recomendada:

1. faixa superior de integridade
   - `escopo ativo`
   - `ultimo snapshot valido`
   - `estado global: healthy / attention / blocked`
   - nota curta dizendo se a operacao esta lendo snapshot recente ou fallback
2. grade de resumo
   - fontes saudaveis
   - fontes em atencao
   - fontes bloqueadas
   - alertas ativos
3. lista principal agrupada por estado
   - `bloqueadas`
   - `atrasadas/parciais`
   - `saudaveis`
4. painel lateral de integridade
   - o que continua confiavel
   - o que requer ressincronizacao
   - se o papel pode ou nao disparar `sync`

Estados obrigatorios:

- `loading`
- `error`
- `permission_denied`
- `empty`
- `stale_data`
- `partial`

Detalhe importante:

- a tela deve mostrar que a saude de fontes e transversal
- mas o `badge` de empresa ou consolidado do shell ainda precisa aparecer para nao quebrar a consistencia de contexto

Arquivos-alvo provaveis:

- `web-react/src/pages/SourcesGovernance.jsx`
- `web-react/src/index.css`
- opcionalmente um componente compartilhado de `snapshot integrity` em `web-react/src/components/`

### 5.2 `Cockpit`

O que existe hoje:

- hero com snapshot e escopo
- cards de resumo
- radar de gargalos
- fila observada
- governanca das fontes embutida
- alertas centrais embutidos

O que deve evoluir:

1. transformar a primeira dobra em um trilho de decisao
2. diferenciar melhor `stale mas utilizavel` de `erro` e de `vazio por contexto`
3. reduzir a sensacao de painel composto por blocos equivalentes
4. dar prioridade visual ao que pede acao imediata

Estrutura recomendada:

1. alert strip superior
   - frescor do snapshot
   - alertas de integracao
   - bloqueio de empresa quando existir
2. hero central
   - escopo
   - resumo de pressao operacional
   - uma frase objetiva do tipo: `acao imediata em X SKUs e Y romaneios sem previsao`
3. cards de indicadores
   - cobertura
   - demanda romaneios
   - fila montagem
   - fila producao
   - sem previsao
   - custo estimado
4. bloco principal de decisao
   - `radar de gargalos`
5. coluna auxiliar
   - `snapshot integrity`
   - `fontes em risco`
   - `alertas centrais`

Estados obrigatorios:

- `loading`
- `company_required`
- `permission_denied`
- `error`
- `empty por filtro`
- `empty operacional`
- `stale_data`

Detalhe importante:

- `stale` nao deve derrubar a utilidade da tela
- deve virar uma camada visual de cautela com microcopy clara sobre leitura do ultimo snapshot valido

Arquivos-alvo provaveis:

- `web-react/src/pages/Cockpit.jsx`
- `web-react/src/index.css`
- componente compartilhado de `operational alert strip` se a repeticao justificar

### 5.3 `Romaneios`

O que existe hoje:

- separacao boa entre backend oficial e buffer local
- dropzone/controlos honestos por papel
- lista oficial simples
- lista de intake local simples

O que deve evoluir:

1. promover a lista oficial para `lista + detalhe consolidado`
2. deixar muito claro quando um romaneio e composto por um ou dois documentos
3. tornar visivel a origem da previsao, o estado de frescor e a prioridade
4. manter o buffer local abaixo da fonte oficial na hierarquia de confianca

Estrutura recomendada:

1. hero e resumo atuais podem ser preservados
2. coluna esquerda
   - lista oficial com selecao
   - filtros por busca, empresa e criticidade quando ja houver dados suficientes
3. coluna direita
   - `detalhe consolidado do romaneio`
   - cabecalho: romaneio, empresa, prioridade, previsao de saida, status
   - badges: `1 documento`, `2 documentos`, `sem previsao`, `stale`
   - itens consolidados
   - origem documental e eventos relevantes
   - painel `source of truth`
4. area de buffer local segue existindo
   - mas como apoio operacional, nao como foco principal quando houver item oficial selecionado

Estados obrigatorios:

- `loading da lista`
- `error da lista`
- `empty da lista`
- `loading do detalhe`
- `error do detalhe`
- `empty sem selecao`
- `stale_data`
- `permission` ou `company_required` para escrita local

Referencia util do legado:

- `web/app.js`
  - `renderRomaneioDetail`
  - `renderLocalRomaneioDetail`

Arquivos-alvo provaveis:

- `web-react/src/pages/RomaneiosInbox.jsx`
- `web-react/src/pages/RomaneiosInbox.css`
- `web-react/src/index.css`

### 5.4 `Kanban`

O que existe hoje:

- quadro read-only honesto
- resumo inicial
- colunas por janela temporal
- produtos sob pressao
- painel de conducao operacional

O que deve evoluir:

1. deixar a `origem da previsao` mais legivel no card
2. introduzir `legenda operacional` mais forte
3. reforcar `read-only protocol` sem consumir o foco do quadro
4. preparar a tela para filtros por criticidade e empresa sem inventar mutacao

Estrutura recomendada:

1. hero atual pode ser preservado
2. linha de resumo mais orientada a leitura rapida
3. quadro principal
   - colunas seguem iguais
   - cards ganham badge de origem: `automatica`, `manual`, `sem previsao`
   - card mostra empresa, status, quantidade e criterio sem poluicao
4. coluna lateral ou faixa auxiliar
   - `legenda de previsao`
   - `protocolo read-only`
   - `produtos sob pressao`

Estados obrigatorios:

- `loading`
- `company_required`
- `permission_denied`
- `error`
- `empty`
- `stale_data`

Detalhe importante:

- o quadro continua sem drag
- qualquer linguagem de "edicao" deve seguir bloqueada enquanto a mutacao real nao entrar

Arquivos-alvo provaveis:

- `web-react/src/pages/KanbanBoard.jsx`
- `web-react/src/index.css`

## 6. O que o implementador deve construir primeiro

### Ordem recomendada

1. `Governanca de Fontes`
2. `Cockpit`
3. `Romaneios`
4. `Kanban`

### Justificativa

1. `Governanca` e `Cockpit` fecham a camada de confianca do produto
   - maior ganho visual e operacional com baixo risco de contrato
   - conversam diretamente com `S2-T2` e `S2-T3`
2. `Romaneios` depois
   - alto valor de produto
   - ainda exige detalhe consolidado, mas sem tocar auth
3. `Kanban` por ultimo nesta rodada
   - ja esta honesto
   - o ganho agora e de legibilidade e classificacao, nao de paradigma

## 7. O que precisa continuar congelado

- login real no `web-react/`
- sessao persistida em `pcp_app_session_v1`
- reset em `401`
- gating por papel
- gating multiempresa
- proxy real do Vite para `/api`
- `Kanban` sem drag ou mutacao fake
- `Romaneios` com backend oficial separado do buffer local
- `operator` sem `MRP`
- `operator` sem ingestao local

## 8. Resposta direta as perguntas desta fase

### 1. Como `Governanca`, `Cockpit`, `Kanban` e `Romaneios` podem evoluir sem quebrar a honestidade operacional?

Elevando leitura, hierarquia e detalhe sem prometer acao que o backend ainda nao sustenta.
Ou seja: mais contexto, mais integridade, mais explicacao de origem e mais states honestos; nenhuma simulacao nova.

### 2. Quais estados precisam ficar mais claros para tomada de decisao no chao de fabrica?

- `stale_data`
- `ultimo snapshot valido`
- `empty por contexto`
- `empty real`
- `partial`
- `sem previsao`
- `somente leitura por papel`

### 3. O que deve ser implementado primeiro pelo agente de Implementation?

Primeiro `Governanca de Fontes` e `Cockpit`.
Depois `Romaneios`.
Por ultimo, a camada adicional de legibilidade do `Kanban`.

### 4. O que precisa continuar intocado para nao reabrir auth, sessao e multiempresa?

Toda a camada autenticada do shell, incluindo sessao, `401`, selecao de empresa, papel e a honestidade read-only dos modulos ja validados.

## 9. Recomendacao final

Pode seguir para implementacao.

Mas a proxima fase deve ser tratada como promocao de produto, nao como nova rodada de shell.
O shell oficial ja passou.
Agora a meta e aumentar confianca operacional modulo por modulo.

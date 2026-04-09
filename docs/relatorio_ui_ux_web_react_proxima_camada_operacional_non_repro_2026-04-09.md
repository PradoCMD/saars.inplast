# Relatorio: Direcao UX/UI da Proxima Camada Operacional apos `non-repro` de `Governanca` e `Cockpit`

Data: 2026-04-09
Projeto: `saars.inplast`
Responsavel pela fase: UX/UI Design Engineer
Escopo desta entrega: evoluir a proxima camada de UX/UI de `Governanca`, `Cockpit`, `Kanban` e `Romaneios` sem reabrir auth, sessao, `401`, papel, multiempresa ou a honestidade operacional ja validada

## 1. Resumo executivo

O reteste `non-repro` de 2026-04-09 mudou a natureza desta trilha.
O problema agora nao e mais remediar `P0` ou revalidar shell.
O problema agora e elevar a continuidade de produto entre modulos que ja comecaram a amadurecer.

Minha leitura do worktree atual e:

- `Governanca de Fontes` e `Cockpit` ja melhoraram individualmente e deixaram de parecer placeholders
- `Kanban` e `Romaneios` ja absorveram parte importante da direcao anterior e estao mais honestos
- o proximo ganho real nao vem de mais densidade visual isolada
- o proximo ganho real vem de coerencia semantica entre superficies: o que e transversal, o que e contextual, o que e oficial, o que e fallback, o que e excecao

Em outras palavras:

- `Governanca` precisa operar como camada transversal de integridade
- `Cockpit` precisa operar como camada contextual de decisao por empresa
- `Kanban` e `Romaneios` precisam herdar o mesmo vocabulario visual de previsao, excecao e fonte de verdade

## 2. Base usada nesta fase

### Documentos

- `SPEC.json`
- `BACKLOG.json`
- `docs/relatorio_non_repro_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md`
- `docs/relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_non_repro_2026-04-09.md`
- `docs/handoff_ui_ux_design_engineer_web_react_command_center_governanca_fontes_cockpit_non_repro_2026-04-09.md`
- `docs/relatorio_ui_ux_web_react_proxima_camada_operacional_2026-04-08.md`
- `docs/handoff_implementation_ux_ui_engineer_web_react_proxima_camada_operacional_2026-04-08.md`
- `docs/pcp_prioridade_romaneios.md`

### Codigo real observado

- `web-react/src/App.jsx`
- `web-react/src/components/CommandDeck.jsx`
- `web-react/src/pages/SourcesGovernance.jsx`
- `web-react/src/pages/Cockpit.jsx`
- `web-react/src/pages/KanbanBoard.jsx`
- `web-react/src/pages/RomaneiosInbox.jsx`
- `backend/provider.py`
- `backend/queries.py`
- `data/romaneio_RM-240331-001.json`

## 3. Uso de Stitch nesta fase

Projeto confirmado:

- `projects/6162515088644226406`

Design system confirmado:

- `Ironforge Industrial`
- asset: `assets/9d18fa2777404aeead1dc40090d48b24`

Screens reutilizados como base visual:

- `Governanca de Fontes - Command Center`
  - `projects/6162515088644226406/screens/0ab9c591089946fcad2174050c4c9fc5`
- `Kanban Logistico - Command Center`
  - `projects/6162515088644226406/screens/79677434b2e84e2c9cb686a38f9b8e67`
- `Romaneio Consolidado Detail View`
  - `projects/6162515088644226406/screens/a82d99d5f94e4f82a548106692eb6ab3`

Observacao importante:

- em 2026-04-09, `generate_screen_from_text` retornou `Request contains an invalid argument.` nesta sessao
- por isso, usei Stitch primeiro via projeto, design system e screens existentes ja confirmados
- a direcao abaixo foi fechada combinando:
  - o design system `Ironforge Industrial`
  - os screens confirmados
  - o codigo atual do `web-react/`
  - o backlog e a `SPEC`

## 4. Findings priorizados

### P1. `Governanca` e `Cockpit` estao melhores, mas ainda nao operam como superficies irmas

Problema real:

- as duas telas ja falam de frescor, integridade, alerta e snapshot valido
- mas ainda falam disso de formas paralelas demais
- o usuario entende cada tela isoladamente, mas ainda nao sente com clareza o papel de cada uma no fluxo de decisao

Impacto:

- `Governanca` corre o risco de parecer apenas uma tela tecnica detalhada
- `Cockpit` corre o risco de repetir em excesso o discurso de fontes em vez de traduzir esse risco para decisao operacional

### P1. `Cockpit` ainda pode ficar mais contextual e menos "espelho reduzido" de `Governanca`

Problema real:

- a tela ja ganhou `alert strip`, hero de pressao e `snapshot integrity`
- mas ainda pode reduzir duplicacao e aumentar traducao contextual
- a proxima camada deveria responder mais diretamente: "o que muda para esta empresa agora?" em vez de reexplicar toda a saude transversal

Impacto:

- melhora a tomada de decisao
- reduz carga cognitiva acima da dobra

### P1. `Kanban` e `Romaneios` ja evoluiram, mas ainda nao compartilham completamente o mesmo vocabulario operacional

Problema real:

- os dois modulos ja falam de previsao e oficialidade
- porem ainda nao formam uma linguagem consistente o bastante para o usuario "migrar" entre eles sem recodificar mentalmente o estado

Impacto:

- menor continuidade de produto
- mais custo cognitivo entre fila, detalhe e excecao

### P2. `Romaneios` ainda nao consegue explicar composicao documental de forma forte porque o contrato atual nao expande isso na UI oficial

Problema real:

- a `SPEC` e o backlog pedem leitura de consolidado e origem
- o backend atual entrega `header`, `items` e `events`
- mas nao expande de forma explicita, no payload do detalhe, quantos documentos compuseram o consolidado

Impacto:

- o modulo ja pode ser forte em `source of truth`
- mas ainda nao deve prometer um badge documental super especifico sem inferencia arriscada

## 5. O que mudou desde a direcao de 2026-04-08

Na rodada de 2026-04-08, a principal necessidade era empurrar os modulos para fora da cara de prototipo.

No worktree atual de 2026-04-09:

- `SourcesGovernance.jsx` ja incorporou `integrity strip`, agrupamento por estado e linguagem de fallback
- `Cockpit.jsx` ja incorporou `alert strip`, hero de pressao, `stale but usable` e `snapshot integrity`
- `KanbanBoard.jsx` ja incorporou origem da previsao de forma mais clara
- `RomaneiosInbox.jsx` ja incorporou lista oficial + detalhe consolidado

Conclusao:

- a direcao anterior nao deve ser repetida como se nada tivesse sido implementado
- a proxima camada precisa partir do estado atual

## 6. Direcao visual escolhida

### Norte desta rodada

Transformar as quatro superficies em um conjunto com papeis mais nitidos:

- `Governanca`: inteligencia transversal de integridade
- `Cockpit`: decisao contextual por empresa
- `Kanban`: fila oficial e excecoes de previsao
- `Romaneios`: detalhe oficial e trilha de confianca

### Principios

- reduzir duplicacao entre `Governanca` e `Cockpit`
- reforcar semantica compartilhada entre `Kanban` e `Romaneios`
- manter a linguagem `stale but usable` sem banaliza-la
- explicitar quando uma tela observa o produto inteiro versus quando exige recorte de empresa
- continuar sem qualquer affordance de mutacao fake

### Primitive set recomendado

Esta rodada deveria consolidar alguns blocos semanticos compartilhados no frontend:

1. `Snapshot Integrity Rail`
   - um bloco compacto sobre leitura atual, fallback e confiabilidade
2. `Operational Impact Panel`
   - traduz risco transversal para impacto contextual
3. `Forecast Origin Badge Set`
   - `automatica`, `manual`, `sem previsao`
4. `Source of Truth Panel`
   - explica o que e oficial e o que nao e
5. `Read-only Protocol Panel`
   - explica limites honestos de um modulo sem parecer vazio

## 7. Direcao por modulo

### 7.1 `Governanca de Fontes`

O que o modulo ja faz bem:

- mostra `ultimo snapshot valido`
- agrupa `blocked`, `attention` e `healthy`
- deixa claro que stale nao some da UI

O que deve evoluir agora:

1. parar de tentar ser um "cockpit paralelo"
2. operar como camada transversal com traducao clara para os modulos contextuais
3. reforcar a pergunta: `isso impacta qual tipo de decisao no cockpit?`

Direcao estrutural:

1. manter `integrity strip`
2. manter `summary grid`
3. manter grupos por estado
4. evoluir a lateral para um `impacto nos modulos`
   - `impacta cockpit`
   - `impacta kanban`
   - `impacta romaneios`

Recomendacao de UX:

- a lateral de `Governanca` nao deve ser so "contrato desta tela"
- ela deve explicar em linguagem operacional onde o usuario deve agir depois

Exemplo de leitura:

- `fontes bloqueadas de estoque`: revisar integridade antes de confiar em cobertura no `Cockpit`
- `fonte stale de previsao`: tratar `Kanban` e `Romaneios` como leitura de cautela

Estados que precisam ficar ainda mais claros:

- `stale_data`
- `partial`
- `blocked but fallback available`
- `permission_denied`

Arquivos-alvo provaveis:

- `web-react/src/pages/SourcesGovernance.jsx`
- `web-react/src/index.css`

### 7.2 `Cockpit`

O que o modulo ja faz bem:

- deixa clara a necessidade de empresa
- destaca pressao imediata
- embute risco de fonte e alertas

O que deve evoluir agora:

1. reduzir o espelho de `Governanca`
2. ficar mais contextual e decisorio
3. traduzir fonte/alerta em impacto de empresa ativa

Direcao estrutural:

1. manter `alert strip`
2. manter hero e indicadores
3. compactar `snapshot integrity`
4. reduzir a presenca de lista de fontes
5. trocar parte dessa area por um `painel de impacto operacional`
   - `o que esta seguro`
   - `o que esta degradado`
   - `qual modulo precisa de cautela`

Recomendacao de UX:

- `Governanca` deve ser a tela de inspeção transversal
- `Cockpit` deve ser a tela de decisão contextual
- quando ambos falarem de fontes, o `Cockpit` deve falar em impacto, nao em inventario detalhado de integrações

Estados que precisam ficar ainda mais claros:

- `company_required`
- `stale but usable`
- `empty por filtro`
- `empty operacional`
- `integration degraded`

Arquivos-alvo provaveis:

- `web-react/src/pages/Cockpit.jsx`
- `web-react/src/index.css`

### 7.3 `Kanban`

O que o modulo ja faz bem:

- continua read-only
- ja explicita origem da previsao
- ja separa bem pressao de produto e protocolo do quadro

O que deve evoluir agora:

1. compartilhar a mesma semantica de excecao com `Romaneios`
2. tornar mais clara a leitura de fila versus excecao
3. usar o mesmo vocabulario visual de previsao e oficialidade

Direcao estrutural:

1. manter `origin strip`
2. manter board principal
3. evoluir o lado direito para um `painel de excecoes`
   - `sem previsao`
   - `manual`
   - `itens sob pressao`
4. reforcar que o quadro mostra fila e excecao, nao edicao

Recomendacao de UX:

- o `Kanban` deve ser a superficie mais rapida para decidir sequencia e risco de saida
- o badge de origem deve sempre parecer um classificador operacional, nao um ornamento

Estados que precisam ficar ainda mais claros:

- `company_required`
- `empty por filtro`
- `sem previsao como excecao`
- `stale_data`

Arquivos-alvo provaveis:

- `web-react/src/pages/KanbanBoard.jsx`
- `web-react/src/index.css`

### 7.4 `Romaneios`

O que o modulo ja faz bem:

- separa claramente backend oficial e buffer local
- ja traz detalhe consolidado oficial
- ja incorpora `source of truth`

O que deve evoluir agora:

1. tornar o detalhe oficial ainda mais dominante quando um romaneio estiver selecionado
2. aproximar a leitura de previsao e excecao da linguagem do `Kanban`
3. tratar o buffer local como apoio real, mas visualmente secundario

Direcao estrutural:

1. manter `lista oficial + detalhe`
2. reforcar `forecast origin` no detalhe com o mesmo set visual do `Kanban`
3. reduzir competicao visual do buffer local com o detalhe oficial
4. usar a lateral de `source of truth` para explicar:
   - o que veio do backend
   - o que segue apenas local
   - o que ainda nao pode ser inferido do payload, como composicao documental detalhada

Recomendacao de UX:

- quando houver romaneio oficial selecionado, a area de detalhe deve ser a ancora da tela
- o buffer local deve parecer subordinado, nao co-protagonista

Estados que precisam ficar ainda mais claros:

- `loading do detalhe`
- `error do detalhe`
- `empty sem selecao`
- `sem previsao`
- diferenca entre `oficial` e `local`

Arquivos-alvo provaveis:

- `web-react/src/pages/RomaneiosInbox.jsx`
- `web-react/src/pages/RomaneiosInbox.css`
- `web-react/src/index.css`

## 8. O que o implementador deve construir primeiro

### Ordem recomendada

1. consolidar primitive set compartilhado entre `Governanca` e `Cockpit`
2. refinar `Cockpit` para impacto contextual em vez de duplicacao transversal
3. alinhar `Kanban` e `Romaneios` no mesmo vocabulario de previsao e excecao
4. so depois fazer polimento adicional de layout

### Justificativa

Hoje o maior risco de UX nao e falta de componente bonito.
O maior risco e semantica desalinhada entre superficies que ja amadureceram.

Por isso:

- primeiro vem coerencia de linguagem e papel de modulo
- depois vem densidade e polimento

## 9. O que precisa continuar congelado

- login real no `web-react/`
- sessao persistida em `pcp_app_session_v1`
- reset em `401`
- gating por papel
- gating multiempresa
- `manager_multi` sem empresa em `Governanca`
- empresa obrigatoria em `Cockpit`
- empresa obrigatoria em `Kanban`
- `Kanban` sem drag ou mutacao fake
- `Romaneios` com separacao clara entre backend oficial e buffer local

## 10. Resposta direta as perguntas desta fase

### 1. Como `Governanca`, `Cockpit`, `Kanban` e `Romaneios` podem evoluir sem quebrar a honestidade operacional?

Tornando cada superficie mais especifica no seu papel:

- `Governanca` como integridade transversal
- `Cockpit` como decisao contextual
- `Kanban` como fila e excecao
- `Romaneios` como detalhe oficial e trilha de confianca

Sem criar novas promessas de mutacao ou esconder degradacao.

### 2. Quais estados precisam ficar mais claros para tomada de decisao no chao de fabrica?

- `stale but usable`
- `blocked but fallback available`
- `company_required`
- `empty por contexto`
- `empty real`
- `sem previsao`
- `manual versus automatico`
- `oficial versus local`

### 3. O que deve ser implementado primeiro pelo agente de Implementation?

Primeiro o conjunto compartilhado entre `Governanca` e `Cockpit`.
Depois o alinhamento semantico de `Kanban` e `Romaneios`.

### 4. O que precisa continuar intocado para nao reabrir auth, sessao, `401` e multiempresa?

Toda a fundacao autenticada do shell e os guardrails ja validados no reteste de 2026-04-09.

## 11. Recomendacao final

Pode seguir para implementacao.

Mas a proxima rodada nao deve ser tratada como "mais uma rodada de telas".
Ela deve ser tratada como consolidacao de linguagem operacional entre modulos que ja estao deixando de ser prototipo e passando a ser produto.

# Handoff de Revisao de Codigo - saars.inplast

## Objetivo

Passar o contexto para outro agente executar uma revisao tecnica do codigo atual da solucao do modulo PCP SaaS.

O foco desta revisao nao e implementar nada no primeiro passe.
O foco e encontrar:

- bugs
- riscos operacionais
- regressao potencial
- divergencia entre implementacao e objetivo do produto
- falta de validacao, resiliencia, permissao, observabilidade e auditoria
- gaps de teste ou fluxos ainda prototipados

## Regras da revisao

- Primeiro revisar. Nao sair editando codigo sem autorizacao posterior.
- Priorizar findings acima de resumo geral.
- Apontar severidade por prioridade pratica:
  - P0: quebra operacional grave ou risco de dado incorreto
  - P1: risco alto ou fluxo central incompleto
  - P2: problema importante, mas contornavel
  - P3: melhoria ou endurecimento desejavel
- Sempre que possivel, citar arquivo e linha.
- Separar claramente fato observado x inferencia.
- Nao assumir que o frontend oficial e o `web/`; hoje o projeto tem `web/` e `web-react/`.
- Nao reverter mudancas locais existentes no worktree.

## Contexto do produto

Este repositorio representa o modulo PCP do projeto `saars.inplast`.

Escopo alvo do modulo:

- cockpit operacional
- romaneios
- kanban logistico
- previsoes e programacao
- MRP
- montagem
- producao
- compras
- custos
- reciclagem
- governanca de fontes
- apontamento de producao
- usuarios, integracoes e movimentacoes manuais

Decisoes de negocio ja fechadas:

- O modulo inteiro entra na visao da SPEC, com foco operacional em romaneios, previsoes, MRP e apontamento.
- O Sankhya continua como dono dos dados ERP de origem.
- O PCP vira a fonte oficial do estado operacional calculado e ajustado no modulo.
- O ambiente e multiempresa, com Inplast, Recicla e UPE Metal no mesmo ERP.
- `romaneio` e `romaneio nota` com a mesma ordem de carga devem se complementar em um consolidado unico.
- Se chegar nova versao do mesmo tipo de documento, ela substitui a anterior daquele tipo.
- A previsao nasce automatica, mas ajuste manual passa a prevalecer e deve recalcular o restante da operacao.
- Em falha de integracao, o sistema deve preservar o ultimo snapshot valido.
- O MRP so pode ser rodado por perfis autorizados.
- O PCP e a interface operacional de apontamento, mas o Sankhya segue como destino oficial.
- Sobrescrita concorrente pode vencer por ultima gravacao, mas precisa manter historico com usuario responsavel.

## Artefatos que ja foram criados nesta rodada

- `SPEC.json`
- `BACKLOG.json`

Esses dois arquivos representam o entendimento consolidado atual do produto e da evolucao tecnica.

## Leitura minima recomendada

Comecar por estes arquivos:

1. `SPEC.json`
2. `BACKLOG.json`
3. `README.md`
4. `server.py`
5. `backend/provider.py`
6. `backend/config.py`
7. `backend/source_sync.py`
8. `backend/romaneio_integration.py`
9. `backend/romaneio_pdf.py`
10. `docs/pcp_contrato_fontes_previsao.md`
11. `docs/pcp_prioridade_romaneios.md`
12. `docs/pcp_estruturas_programacao.md`
13. `docs/pcp_sync_fontes_reais.md`
14. `web-react/src/App.jsx`
15. `web-react/src/pages/`
16. `web-react/src/components/`

## Areas que merecem prioridade maxima na revisao

### 1. Contratos da API

Revisar se as rotas atuais do `server.py`:

- usam status codes coerentes
- validam input de forma suficiente
- tratam payload invalido, JSON invalido e payload grande
- retornam erros estruturados de forma consistente
- fazem diferenciacao minimamente clara entre erro de validacao, erro interno e indisponibilidade temporaria

### 2. Autenticacao, permissao e seguranca

Revisar:

- `POST /api/pcp/auth/login`
- persistencia e bootstrap de usuarios
- risco de credenciais fixas ou bootstrap inseguro
- falta de protecao em rotas que hoje deveriam exigir autenticacao
- ausencia ou fragilidade de RBAC

### 3. Multiempresa

Revisar se `company_code` esta realmente aplicado de ponta a ponta ou se hoje e apenas parcial.

Checar risco de:

- mistura de dados entre empresas
- escrita sem contexto de empresa
- leitura consolidada sem controle de permissao

### 4. Romaneios e consolidacao por ordem de carga

Esse e um hotspot importante.

Revisar se a implementacao atual:

- consolida corretamente `romaneio` e `romaneio nota`
- substitui corretamente nova versao do mesmo tipo de documento
- evita duplicacao silenciosa
- mantem detalhe suficiente para auditoria e origem
- tem risco de merge incorreto entre documentos

### 5. Override manual, concorrencia e auditoria

Revisar:

- `POST /api/pcp/romaneios-kanban/update-date`
- fluxo de programacao manual
- fluxo de override de estrutura
- qualquer ponto onde a ultima gravacao sobrescreve estado

Checar especialmente:

- se existe historico
- se o usuario responsavel e preservado
- se ha risco de perda silenciosa de decisao manual

### 6. Integracoes e resiliencia

Revisar:

- `POST /api/pcp/sources/sync`
- `POST /api/pcp/romaneios/refresh`
- `POST /api/pcp/apontamento/dispatch`
- chamadas a webhook e parsers

Checar:

- timeout
- retry
- fallback
- comportamento em resposta parcial
- idempotencia
- efeito de falha sobre o estado operacional vigente

### 7. MRP

Revisar `POST /api/pcp/runs/mrp` e qualquer dependencia relacionada.

Checar:

- se hoje existe apenas ack de fila ou efeito operacional real
- risco de concorrencia ou dupla execucao
- preservacao de override manual
- publicacao de estado oficial sem garantias suficientes

### 8. Frontend oficial x legado

Hoje coexistem:

- `web/`
- `web-react/`

O entendimento atual e que `web-react/` deve virar a UI oficial.

Revisar:

- divergencias funcionais entre as duas UIs
- fluxos do React que ainda estao hardcoded ou prototipados
- estados faltantes: loading, error, empty, stale_data, permission_denied
- risco de a UI parecer pronta sem estar ligada ao estado oficial

### 9. Apontamento

Revisar:

- `web-react/src/pages/ProductionTracking.jsx`
- endpoints de save, export, sync-status e dispatch

Checar:

- se o fluxo esta mais para prototipo visual ou operacao real
- risco de perda de apontamento
- fila de reenvio
- compatibilidade com operacao mobile web

## Lista inicial de hotspots de arquivo

- `server.py`
- `backend/provider.py`
- `backend/config.py`
- `backend/source_sync.py`
- `backend/romaneio_integration.py`
- `backend/romaneio_pdf.py`
- `backend/queries.py`
- `web-react/src/App.jsx`
- `web-react/src/pages/Cockpit.jsx`
- `web-react/src/pages/KanbanBoard.jsx`
- `web-react/src/pages/RomaneiosInbox.jsx`
- `web-react/src/pages/ProductionTracking.jsx`
- `web-react/src/components/Sidebar.jsx`

## Estado do repositorio a considerar

O worktree esta sujo.
Ha mudancas locais que nao devem ser revertidas durante a revisao.

Arquivos com mudancas locais observadas:

- `backend/queries.py`
- `n8n/n8n_workflow_almoxarifado_ingest.json`
- `n8n/n8n_workflow_estoque_acabado_google_ingest.json`
- `n8n/n8n_workflow_estoque_intermediario_google_ingest.json`
- `n8n/n8n_workflow_sankhya_ordens_carga_poll.json`
- `n8n/n8n_workflow_sankhya_webhook_romaneio.json`
- `web/app.js`
- `web/styles.css`

Arquivos novos locais observados:

- `PEDIDOS TRANSPORTADORAS 2025 (1).xlsx`
- `PEDIDOS TRANSPORTADORAS 2025 (2).xlsx`
- `ROMANEIO 556.pdf`
- `ROMANEIO 556 NOTA.pdf`
- `n8n/n8n_workflow_romaneio_pdf_ingest.json`
- `parse_and_update_sheet.py`
- `scripts/update_planilha_romaneios_v2.py`
- `test_nota.py`

## O que o revisor deve responder

Entregar a revisao em formato de findings, com foco principal em bugs e riscos.

Formato esperado:

1. Findings priorizados por severidade
2. Arquivo e linha sempre que possivel
3. Explicacao curta do risco
4. Impacto esperado no negocio ou na operacao
5. Sugestao objetiva de correcao

Depois disso, opcionalmente:

- perguntas abertas
- riscos residuais
- gaps de teste

## Perguntas que o revisor deve tentar responder

1. Onde a implementacao atual mais diverge da SPEC?
2. Quais fluxos parecem prontos, mas ainda estao em modo prototipo?
3. Onde existe maior risco de dado operacional incorreto?
4. Onde ha maior chance de falha silenciosa ou perda de rastreabilidade?
5. Quais endpoints ou telas deveriam ser bloqueados ate endurecimento minimo?
6. Quais pontos merecem virar P0 antes de qualquer rollout mais serio?

## Resultado esperado desta revisao

Ao final, queremos sair com:

- uma lista curta e confiavel de riscos reais
- priorizacao objetiva do que precisa ser corrigido primeiro
- clareza sobre o que ja esta perto de producao e o que ainda e prototipo
- base segura para decidir a proxima rodada de implementacao

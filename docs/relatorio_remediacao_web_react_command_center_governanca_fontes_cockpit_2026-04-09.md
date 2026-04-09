# Relatorio: Remediacao Tecnica de `Governanca de Fontes` e estados centrais de `Cockpit` no `web-react`

Data: 2026-04-09
Projeto: `saars.inplast`
Responsavel pela remediacao: CODE Reviewer
Escopo desta rodada: fechar os dois `P0` apontados pelo TESTE Auditor sem reabrir auth, sessao, papel, multiempresa, `Kanban` honesto e `Romaneios` com separacao entre backend oficial e buffer local
Status ao fim desta remediacao: `pronto para reteste curto`

## 1. Resumo executivo

O `P0` de seguranca em `POST /api/pcp/sources/sync` foi confirmado no codigo e corrigido no backend.

Antes da remediacao, a rota aceitava:

- chamada sem autenticacao
- chamada com `operator`

Depois da remediacao, o contrato ficou:

- sem token: `401`
- `operator`: `403`
- `manager`: sucesso

O segundo `P0`, reportado como quebra de build/startup limpo do `web-react` por import nao resolvido de `KanbanBoard`, nao se reproduziu no worktree atual. O arquivo existe, o import em `App.jsx` resolve corretamente, `npm run build` passou e o Vite subiu limpo em sessao fresca. Por seguranca, nenhuma alteracao foi feita no frontend para esse ponto.

## 2. Findings confirmados e tratamento aplicado

### 2.1 `P0` corrigido: bypass de auth/RBAC em `POST /api/pcp/sources/sync`

Arquivos principais:

- [server.py](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1168)
- [server.py](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1463)

Causa confirmada:

- a rota so exigia `require_authorized_user(permission="sources.sync")` quando `authorize_sync(send_on_failure=False)` retornava `False`
- quando `PCP_SYNC_API_TOKEN` nao estava configurado, `authorize_sync()` retornava `True`
- nesse caminho, a rota executava `PROVIDER.sync_sources(payload)` sem exigir sessao autenticada nem permissao do papel

Correcao aplicada:

- a rota agora exige `require_authorized_user(permission="sources.sync")` sempre
- o `sync_api_token` passa a ser apenas controle adicional, nunca substituto de auth/RBAC
- a validacao adicional por token extra foi isolada em `X-PCP-Sync-Token`, evitando colisao com o `Authorization: Bearer <access_token>` da sessao normal do modulo

Resultado pratico:

- o backend agora sustenta a regra que a UI ja prometia
- `operator` continua bloqueado de forma honesta
- a trilha de auditoria volta a registrar ator/perfil corretamente tambem nesse fluxo

### 2.2 `P0` nao reproduzido no estado atual: build/startup limpo do `web-react`

Arquivos principais:

- [App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx#L8)
- [KanbanBoard.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx#L1)

Situacao encontrada durante esta rodada:

- `App.jsx` continua importando `./pages/KanbanBoard`
- o arquivo `KanbanBoard.jsx` existe no disco
- `npm run build` passou sem erro
- o Vite subiu limpo em `5173`
- o shell abriu e navegou normalmente em sessao fresca

Decisao tecnica:

- nao alterei o frontend para esse finding porque ele nao estava mais reproduzivel no worktree atual
- tratei esse ponto como `finding nao reproduzido`, nao como bug silenciosamente ignorado

## 3. O que foi alterado de fato

Alteracao de codigo aplicada nesta rodada:

- [server.py](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1168)

Resumo da mudanca:

1. auth do usuario com permissao `sources.sync` virou obrigatoria
2. `PCP_SYNC_API_TOKEN`, se existir, virou uma camada adicional
3. a camada adicional deixou de reaproveitar o Bearer da sessao do usuario

Nenhuma outra regra de negocio do shell React foi alterada nesta rodada.

## 4. Validacoes executadas

### 4.1 Validacao estatica

Executado:

- `PYTHONPYCACHEPREFIX=/tmp/pcp_pycache python3 -m py_compile server.py`
- `npm run build` em `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react`

Resultado:

- ambos passaram

### 4.2 Validacao HTTP real do backend

Ambiente usado:

- `PCP_DATA_MODE=mock`
- `PCP_PORT=8876`

Casos executados:

1. `POST /api/pcp/sources/sync` sem token
2. `POST /api/pcp/sources/sync` com token de `operator_inplast`
3. `POST /api/pcp/sources/sync` com token de `manager_inplast`

Resultado:

- sem token: `401`
- `operator`: `403`
- `manager`: `200`

Evidencia funcional:

- a auditoria passou a registrar negacao sem token, negacao por falta de permissao e sucesso com ator autenticado em [security_audit.jsonl](/Users/sistemas2/Documents/Playground 2/saars.inplast/data/security_audit.jsonl)

### 4.3 Validacao real do `web-react`

Ambiente usado:

- backend mock em `8876`
- Vite em `5173`

Fluxos executados:

1. login real de `manager_multi`
2. `Cockpit` sem empresa
3. `Governanca` sem empresa
4. `Kanban` sem empresa
5. reset controlado em `401`

Resultado:

- login real funcionou
- `manager_multi` continuou exigindo empresa em `Cockpit`
- `manager_multi` continuou podendo abrir `Governanca` sem empresa
- `manager_multi` continuou vendo `Kanban` exigir empresa
- o `401` derrubou a sessao, limpou `pcp_app_session_v1` e voltou ao login

## 5. Comportamentos preservados

Os comportamentos abaixo foram preservados no reteste local:

- login real do `web-react`
- sessao persistida em `pcp_app_session_v1`
- reset em `401`
- `manager_multi` abrindo `Governanca` sem empresa
- `manager_multi` exigindo empresa em `Cockpit`
- `manager_multi` exigindo empresa em `Kanban`

Como o frontend nao foi alterado nesta rodada, nao houve reabertura de:

- `Kanban` com mutacao fake
- `Romaneios` misturando backend oficial com buffer local

## 6. Riscos residuais

Os pontos abaixo continuam como risco residual e nao devem ser confundidos com regressao desta rodada:

- a documentacao de sync ainda esta desalinhada do contrato novo quando `PCP_SYNC_API_TOKEN` e usado; o exemplo em [pcp_sync_fontes_reais.md:57](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/pcp_sync_fontes_reais.md#L57) ainda descreve `Authorization: Bearer SEU_TOKEN`
- o `P0` de build/import de `KanbanBoard` nao reproduziu no estado atual; o proximo QA deve apenas reconfirmar build e boot limpo em ambiente fresco
- esta rodada nao mexeu no backend de `MRP`, no escopo multiempresa estrutural nem no contrato de `Romaneios`

## 7. Recomendacao final

Recomendacao: devolver ao `TESTE Auditor`.

Ordem recomendada do reteste:

1. confirmar fechamento do `P0` de `sources.sync`
2. reconfirmar build e boot limpo do `web-react`
3. rodar regressao curta de:
   - login real
   - sessao
   - `401`
   - `manager_multi` em `Governanca`
   - `manager_multi` em `Cockpit`
   - `manager_multi` em `Kanban`

Conclusao:

- a rodada saiu de `no-go` tecnico para `pronta para reteste curto`
- a seguranca do backend foi restaurada
- o frontend nao recebeu mudanca desnecessaria onde o problema nao mais reproduzia

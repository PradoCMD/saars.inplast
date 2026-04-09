# Relatorio: `P0` nao reproduzidos no worktree atual em `Governanca de Fontes` e `Cockpit`

Data: 2026-04-09
Projeto: `saars.inplast`
Responsavel: CODE Reviewer
Escopo desta etapa: validar os `P0` reabertos pelo QA e confirmar se ainda exigiam remediacao tecnica
Status final: `reteste recomendado`

## 1. Resumo executivo

Os dois `P0` apontados no handoff pos-remediacao nao reproduziram no worktree atual.

Os checks objetivos desta rodada mostraram:

- `POST /api/pcp/sources/sync` ja exige auth e permissao real
- `web-react/` fecha `npm run build` com sucesso
- o Vite sobe limpo
- o modulo `KanbanBoard` existe no disco e continua sendo importado corretamente

Traducao pratica:

- nao houve nova correcao de codigo nesta etapa
- o principal risco agora e de `drift` entre o relatorio/handoff anterior e o estado atual do repositorio
- o proximo passo correto e um reteste curto do QA no worktree atual

## 2. Findings confirmados nesta verificacao

### 2.1 `P0` de `sources.sync` nao reproduz no worktree atual

Referencias:

- [server.py:1169](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1169)
- [server.py:1463](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1463)

Estado atual encontrado:

- a rota exige `require_authorized_user(permission="sources.sync")`
- o token adicional de sync so entra como camada extra
- o backend sustenta auth/RBAC sem depender da UI

Resultado do reteste real:

- sem token -> `401`
- `operator_inplast` -> `403`
- `manager_inplast` -> `200`

Auditoria observada:

- novas entradas em [security_audit.jsonl](/Users/sistemas2/Documents/Playground 2/saars.inplast/data/security_audit.jsonl) registram negacao sem token, negacao por falta de permissao e sucesso com ator autenticado

### 2.2 `P0` de build/startup limpo do `web-react` nao reproduz no worktree atual

Referencias:

- [App.jsx:8](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx#L8)
- [KanbanBoard.jsx:1](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx#L1)

Estado atual encontrado:

- `App.jsx` continua importando `./pages/KanbanBoard`
- o arquivo `KanbanBoard.jsx` existe
- `npm run build` passou
- o Vite subiu limpo em sessao fresca

Conclusao objetiva:

- o finding descrito no relatorio de QA nao estava mais presente no worktree atual no momento desta verificacao

### 2.3 Risco real desta etapa: drift de evidencia

Referencias:

- [handoff_code_reviewer_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_code_reviewer_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md)
- [relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md)

Os artefatos do QA afirmam que os dois `P0` continuam reproduziveis, mas isso contradiz:

- o codigo atual
- o build atual
- os testes HTTP atuais
- o boot atual do Vite

Isso pode significar:

1. o QA validou um estado anterior do worktree
2. houve mudanca local apos o reteste
3. a evidencia de QA ficou obsoleta antes do handoff seguinte

## 3. Validacoes executadas

### Backend

Executado:

- `PYTHONPYCACHEPREFIX=/tmp/pcp_pycache python3 -m py_compile server.py`
- backend mock em `8876`
- `POST /api/pcp/sources/sync` sem token
- `POST /api/pcp/sources/sync` com `operator_inplast`
- `POST /api/pcp/sources/sync` com `manager_inplast`

Resultado:

- `py_compile` passou
- `401 / 403 / 200` conforme esperado

### Frontend

Executado:

- `npm run build` em `web-react`
- Vite em `5173`
- login real de `manager_multi`
- navegacao para `Governanca`
- navegacao para `Kanban`
- navegacao para `Romaneios`

Resultado:

- build passou
- Vite subiu limpo
- `Governanca` abriu sem empresa
- `Kanban` exigiu empresa
- `Romaneios` continuou separando backend oficial de buffer local

### Sessao

Executado:

- confirmacao de sessao persistida em `pcp_app_session_v1`

Limitacao:

- o reset em `401` nao foi revalidado com sucesso nesta etapa, apesar de nao haver indicio novo de regressao no codigo

## 4. O que nao foi alterado

Nenhum arquivo de codigo foi alterado nesta etapa.

Motivo:

- nao havia bug reproduzivel de alta confianca para corrigir no worktree atual
- mexer agora em backend ou frontend aumentaria risco de reabrir comportamento ja aprovado

## 5. Recomendacao final

Recomendacao: devolver para o `TESTE Auditor` com foco explicito em `drift`.

O reteste seguinte deve:

1. validar novamente os dois `P0` no worktree atual
2. tratar explicitamente `nao reproduziu` como resultado valido, se for o caso
3. revalidar `401` no shell React
4. so reabrir remediacao tecnica se os `P0` realmente voltarem a reproduzir

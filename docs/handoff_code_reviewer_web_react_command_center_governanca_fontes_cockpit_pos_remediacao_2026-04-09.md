# Handoff: CODE Reviewer para Remediacao Tecnica Pos-Remediacao de `Governanca de Fontes` e `Cockpit`

Data: 2026-04-09
Projeto: `saars.inplast`
Origem do handoff: TESTE Auditor
Destino: CODE Reviewer
Escopo deste handoff: corrigir os bloqueios tecnicos que permaneceram abertos no reteste pos-remediacao da camada operacional recente do `web-react`
Status de entrada: `no-go`

## 1. Objetivo deste handoff

Entregar para o `CODE Reviewer` um pacote de remediacao tecnica enxuto e objetivo.

Esta nao e uma rodada de redesign, backlog novo ou refinamento de UX.
Esta e uma rodada de fechamento tecnico de dois bloqueios que continuam reproduziveis:

1. `POST /api/pcp/sources/sync` sem auth/RBAC efetivo
2. `web-react/` sem build/startup limpo por import nao resolvido de `KanbanBoard`

## 2. Resumo executivo

O reteste independente confirmou que a direcao visual e funcional de `Governanca de Fontes`, `Cockpit`, `Kanban` e `Romaneios` continua boa.

O que travou a rodada foi fundacao tecnica:

- o backend ainda permite mutacao critica de sync sem auth/RBAC correto
- o frontend ainda nao fecha boot limpo no worktree atual

Traducao pratica:

- nao precisa rediscutir a UX agora
- precisa corrigir os dois P0 e devolver para reteste curto

## 3. Leitura obrigatoria

Leia nesta ordem:

1. [SPEC.json](/Users/sistemas2/Documents/Playground%202/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground%202/saars.inplast/BACKLOG.json)
3. [prompt_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/prompt_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md)
4. [handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md)
5. [relatorio_remediacao_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_remediacao_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md)
6. [relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_pos_remediacao_2026-04-09.md)
7. [server.py](/Users/sistemas2/Documents/Playground%202/saars.inplast/server.py)
8. [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx)
9. [web-react/src/pages/Cockpit.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/Cockpit.jsx)
10. [web-react/src/pages/SourcesGovernance.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/SourcesGovernance.jsx)

## 4. Findings que exigem foco imediato

### P0: `POST /api/pcp/sources/sync` continua sem auth/RBAC efetivo

Contexto confirmado em reteste:

- sem token, a rota respondeu `200`
- com `operator`, a rota respondeu `200`
- o achado continua reproduzivel mesmo apos a remediacao declarada

Pontos principais:

- [server.py](/Users/sistemas2/Documents/Playground%202/saars.inplast/server.py#L1168)
- [server.py](/Users/sistemas2/Documents/Playground%202/saars.inplast/server.py#L1457)

Objetivo esperado apos correcao:

- sem token -> `401`
- `operator_inplast` -> `403`
- `manager_inplast` -> sucesso

Leitura operacional:

- nao aceite bloqueio apenas de frontend como prova de fechamento
- o backend precisa sustentar auth/RBAC sozinho

### P0: build e startup limpo do `web-react` continuam quebrados

Contexto confirmado em reteste:

- `npm run build` falhou
- o restart limpo do Vite revelou erro de import
- a sessao fresca do shell nao ficou confiavel

Ponto principal:

- [App.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L8)

Fato observado no worktree atual:

- `App.jsx` importa `./pages/KanbanBoard`
- o reteste nao encontrou o modulo correspondente em [src/pages](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages)

Objetivo esperado apos correcao:

- `npm run build` passa
- o Vite sobe limpo
- o shell abre do zero em sessao fresca

## 5. O que ficou validado e precisa ser preservado

Nao reabra estes comportamentos:

- login real no `web-react`
- sessao em `pcp_app_session_v1`
- reset em `401`
- `manager` com `MRP` e `Sincronizar`
- `operator` sem `MRP`
- `operator` sem ingestao local em `Romaneios`
- `manager_multi` exigindo empresa em `Cockpit`
- `manager_multi` exigindo empresa em `Kanban`
- `manager_multi` podendo abrir `Governanca de Fontes` sem empresa
- `Kanban` read-only, sem mutacao fake
- `Romaneios` com separacao clara entre backend oficial e buffer local

## 6. Regras de trabalho para esta rodada

- primeiro confirmar a causa real no codigo
- corrigir apenas o que for de alta confianca
- nao reverter mudancas locais preexistentes
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao expandir escopo para redesenho de UX
- nao mascarar `sources.sync` com bloqueio apenas de interface
- nao tratar "na minha maquina passou antes" como fechamento do P0 de build

## 7. Validacoes obrigatorias apos corrigir

### Bloco A: backend

Validar:

1. `POST /api/pcp/sources/sync` sem token -> `401`
2. `POST /api/pcp/sources/sync` com `operator_inplast` -> `403`
3. `POST /api/pcp/sources/sync` com `manager_inplast` -> sucesso

### Bloco B: frontend

Validar:

1. `npm run build`
2. Vite em sessao fresca
3. abertura limpa do shell
4. login real no `web-react`

### Bloco C: regressao curta

Validar:

1. persistencia de sessao
2. reset em `401`
3. `manager_multi` abrindo `Governanca` sem empresa
4. `Cockpit` exigindo empresa
5. `Kanban` exigindo empresa
6. `Romaneios` oficial vs buffer

## 8. Resultado esperado da sua resposta

Sua devolutiva precisa trazer:

1. findings confirmados com causa e arquivo/linha
2. correcoes aplicadas
3. validacoes executadas
4. riscos residuais que permaneceram

Formato desejado:

- findings primeiro
- depois resumo curto das correcoes
- depois validacoes
- depois riscos residuais

## 9. Conclusao deste handoff

O shell operacional recente continua promissor, mas esta rodada segue bloqueada por dois problemas tecnicos de base.

Prioridade recomendada:

1. fechar `sources.sync` de forma realmente autenticada
2. restaurar build/startup limpo do `web-react`
3. devolver para reteste curto do QA

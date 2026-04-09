# Handoff: CODE Reviewer para Remediacao Tecnica de `Governanca de Fontes` e `Cockpit` no `web-react`

Data: 2026-04-09
Projeto: `saars.inplast`
Origem do handoff: TESTE Auditor
Destino: CODE Reviewer
Escopo deste handoff: corrigir os bloqueios tecnicos encontrados no reteste da nova fatia de `Governanca de Fontes` e `Cockpit`
Status de entrada: UI nova com sinais bons de produto, mas rodada bloqueada por falha de seguranca no backend e build quebrado no frontend

## 1. Objetivo deste handoff

Entregar para o `CODE Reviewer` um pacote acionavel para remediacao tecnica segura.

O foco aqui nao e redesenhar a UI nem reabrir discussoes amplas de backlog.
O foco aqui e fechar dois bloqueios concretos:

1. mutacao critica `sources.sync` aceita sem auth/RBAC efetivo
2. `web-react/` nao sobe limpo por import nao resolvido

## 2. Resumo executivo

O reteste independente confirmou que a nova `Governanca de Fontes` faz sentido como superficie de produto.

O problema desta rodada nao foi a direcao visual.
O problema foi tecnico:

- o backend deixou `POST /api/pcp/sources/sync` aberto quando `sync_api_token` nao esta configurado
- o frontend perdeu integridade estrutural porque `App.jsx` importa `KanbanBoard`, mas o modulo nao existe no disco

Traducao pratica:

- a rodada nao pode seguir
- o proximo passo correto e remediacao tecnica pelo `CODE Reviewer`

## 3. Leitura obrigatoria

Leia nesta ordem:

1. [SPEC.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json)
3. [handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md)
4. [relatorio_implementation_ux_ui_engineer_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_implementation_ux_ui_engineer_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md)
5. [relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md)
6. [server.py](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py)
7. [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx)
8. [web-react/src/pages/Cockpit.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx)
9. [web-react/src/pages/SourcesGovernance.jsx](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx)

## 4. Findings que exigem foco imediato

### P0: `POST /api/pcp/sources/sync` sem auth/RBAC efetivo

Contexto:

- sem token, a rota respondeu `200`
- com `operator`, a rota respondeu `200`
- a UI bloqueia `operator`, mas o backend nao sustenta a regra

Pontos principais:

- [server.py:1168](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1168)
- [server.py:1457](/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py#L1457)

Leitura recomendada:

- trate isso como falha de backend auth/RBAC, nao como bug de UX
- `sync_api_token` nao pode substituir a exigencia de usuario autenticado e permissao real de `sources.sync`

Resultado esperado apos remediacao:

- sem token: `401`
- `operator`: `403`
- `manager` com permissao: sucesso

### P0: build e startup limpo do `web-react` quebrados

Contexto:

- `npm run build` falhou
- restart limpo do Vite expos erro de import nao resolvido

Ponto principal:

- [App.jsx:8](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx#L8)

Fato observado:

- `App.jsx` importa `./pages/KanbanBoard`
- o arquivo nao existe em [src/pages](/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages)

Resultado esperado apos remediacao:

- `npm run build` fecha limpo
- Vite sobe limpo
- o shell carrega de forma confiavel em sessao fresca

## 5. O que ficou validado e deve ser preservado

Nao perca estes comportamentos na remediacao:

- login real do `web-react/`
- sessao em `pcp_app_session_v1`
- reset em `401`
- `manager` com `MRP` e `Sincronizar`
- `operator` sem `MRP`
- `operator` sem ingestao local em `Romaneios`
- `manager_multi` exigindo empresa em `Cockpit` e `Kanban`
- `manager_multi` podendo abrir `Governanca de Fontes` sem empresa
- `Kanban` sem mutacao fake
- `Romaneios` separando backend oficial de buffer local

## 6. Regras de trabalho para esta remediacao

- primeiro confirmar a causa no codigo
- corrigir apenas o que for de alta confianca
- nao reverter mudancas locais preexistentes
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao expandir escopo para redesign da UI
- nao mascarar a falha de `sources.sync` com bloqueio apenas de frontend
- se for preciso ajustar validacao de sync token, preserve auth/RBAC como requisito minimo sempre

## 7. Validacoes obrigatorias apos corrigir

### Bloco A: backend

Validar:

1. `POST /api/pcp/sources/sync` sem token -> `401`
2. `POST /api/pcp/sources/sync` com `operator` -> `403`
3. `POST /api/pcp/sources/sync` com `manager` -> sucesso

### Bloco B: frontend

Validar:

1. `npm run build`
2. Vite em sessao fresca
3. login real no `web-react`
4. `manager_multi` abrindo `Governanca` sem empresa
5. `Cockpit` e `Kanban` continuando a exigir empresa quando necessario

### Bloco C: regressao curta

Validar:

1. persistencia de sessao
2. logout
3. reset em `401`
4. `Romaneios` oficial vs buffer

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

O produto deu um passo bom em `Governanca` e `Cockpit`, mas a rodada travou por dois problemas tecnicos de fundacao.

Prioridade recomendada:

1. fechar seguranca de `sources.sync`
2. restaurar integridade estrutural do `web-react`
3. devolver para reteste curto do QA

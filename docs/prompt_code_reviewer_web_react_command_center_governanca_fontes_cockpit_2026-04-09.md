# Prompt: CODE Reviewer para Remediacao Tecnica de `Governanca de Fontes` e `Cockpit` no `web-react`

Use o texto abaixo no chat do agente responsavel pela correcao tecnica.

```text
Voce vai atuar como CODE Reviewer e agente de remediacao tecnica do projeto `saars.inplast`, com foco exclusivo em corrigir os bloqueios encontrados no reteste da rodada de `Governanca de Fontes` e estados centrais de `Cockpit` no `web-react/`.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Corrigir os bloqueios tecnicos desta rodada sem reabrir indevidamente auth, sessao, papel, multiempresa, proxy do Vite, `Kanban` sem mutacao fake e `Romaneios` com separacao clara entre backend oficial e buffer local.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_implementation_ux_ui_engineer_web_react_command_center_governanca_fontes_cockpit_2026-04-08.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_code_reviewer_web_react_command_center_governanca_fontes_cockpit_2026-04-09.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/Cockpit.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/SourcesGovernance.jsx`

Findings que precisam de foco imediato:

1. P0: `POST /api/pcp/sources/sync` aceita chamada sem auth/RBAC efetivo
2. P0: `web-react/` falha em build/startup limpo por import nao resolvido de `KanbanBoard`

Contexto importante ja confirmado em teste:

- `POST /api/pcp/sources/sync` sem token retornou `200`
- `POST /api/pcp/sources/sync` com `operator` retornou `200`
- `manager_multi` sem empresa continua correto em `Governanca`: abre a tela, enquanto `Cockpit` e `Kanban` seguem exigindo empresa
- a direcao visual da nova tela foi boa; o bloqueio agora e tecnico

O que voce deve preservar:

- login real no `web-react/`
- persistencia de sessao em `pcp_app_session_v1`
- reset em `401`
- `manager` com `MRP` e `Sincronizar`
- `operator` sem `MRP`
- `operator` sem ingestao local em `Romaneios`
- `manager_multi` exigindo empresa em `Cockpit` e `Kanban`
- `manager_multi` podendo abrir `Governanca de Fontes` sem empresa
- `Kanban` sem mutacao fake
- `Romaneios` separando backend oficial de buffer local

Regras de trabalho:

- primeiro confirmar a causa no codigo
- corrigir apenas o que for de alta confianca
- nao reverter mudancas locais preexistentes
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao expandir escopo para redesign do `web-react/`
- nao tratar bloqueio de UI como substituto de auth/RBAC backend
- se houver controle adicional por `sync_api_token`, mantenha auth e permissao de usuario como requisitos obrigatorios

Validacoes obrigatorias apos corrigir:

1. `POST /api/pcp/sources/sync` sem token -> `401`
2. `POST /api/pcp/sources/sync` com `operator` -> `403`
3. `POST /api/pcp/sources/sync` com `manager` -> sucesso
4. `npm run build` em `web-react/`
5. Vite sobe limpo
6. login real no `web-react/`
7. `manager_multi` continua abrindo `Governanca` sem empresa
8. `Cockpit` e `Kanban` continuam exigindo empresa onde necessario
9. reset em `401` continua funcionando

Saida esperada:

1. findings confirmados com causa e arquivo/linha
2. correcoes aplicadas
3. validacoes executadas
4. riscos residuais que permaneceram

Formato da resposta:

- findings primeiro
- depois resumo curto das correcoes
- depois validacoes executadas
- depois riscos residuais

Importante:

- priorize fechar primeiro os dois P0 desta rodada
- a meta nao e evoluir a UX agora, e sim restaurar seguranca e integridade tecnica para a nova fatia seguir
```

# Prompt: CODE Reviewer para Remediacao do Bloqueio do `web-react/`

Use o texto abaixo no chat do agente responsavel pela correcao tecnica.

```text
Voce vai atuar como CODE Reviewer e agente de correcao tecnica do projeto `saars.inplast`, com foco exclusivo na remediacao do bloqueio encontrado no reteste do `web-react/` apos a adaptacao ao contrato autenticado.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Corrigir o bloqueio real que impede o `web-react/` de funcionar no fluxo normal via Vite, preservando os comportamentos de auth, sessao, papel, multiempresa e honestidade de interface que ja foram validados quando a UI conversa com o backend correto.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_web_react_auth_adaptacao_2026-04-08.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_ui_ux_web_react_auth_adaptacao_2026-04-08.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_auth_adaptacao_2026-04-08.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_code_reviewer_web_react_auth_adaptacao_2026-04-08.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/vite.config.js`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/App.jsx`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/components/Topbar.jsx`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/KanbanBoard.jsx`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx`

Finding que precisa de foco imediato:

1. P0: o `web-react/` ainda sobe com proxy/base URL apontando para backend errado no fluxo real do Vite, causando falha de login valido com `Route not found`

Contexto importante ja confirmado em teste:

- o problema aparece no fluxo real do Vite
- o shell React passa nos cenarios centrais quando o trafego e roteado para o backend autenticado correto em `8876`
- portanto, nao assuma regressao nova de backend auth/RBAC sem evidencia

O que voce deve preservar:

- persistencia de sessao em `pcp_app_session_v1`
- reset completo em `401`
- logout limpo
- `manager` com `MRP` e `Sincronizar`
- `operator` sem `MRP`, sem `Sincronizar` e sem ingestao local de romaneios
- multiempresa exigindo empresa ativa
- `Kanban` sem mutacao fake
- `Romaneios` separando backend oficial de buffer local
- placeholders honestos para modulos ainda nao promovidos

Regras de trabalho:

- Primeiro confirmar a causa no codigo.
- Depois corrigir apenas o que for de alta confianca.
- Nao reverter mudancas locais preexistentes.
- Nao alterar `SPEC.json` nem `BACKLOG.json`.
- Nao reabrir backend auth, RBAC ou company scope sem evidencia objetiva.
- Nao expandir escopo para redesign do `web-react/`.
- Se a melhor solucao for remover hardcode e tornar a configuracao de API mais segura por ambiente, pode fazer isso desde que mantenha o setup local claro.

Validacoes obrigatorias apos corrigir:

1. subir backend autenticado em `8876`
2. subir `web-react/` via Vite em `5173`
3. validar login real de `manager_inplast` sem override de rede
4. validar persistencia de sessao
5. validar logout
6. validar reset em `401`
7. validar `operator` sem `MRP`
8. validar `manager_multi` exigindo empresa

Saida esperada:

1. finding confirmado com causa e arquivo/linha
2. correcao aplicada
3. validacoes executadas
4. riscos residuais que permaneceram

Formato da resposta:

- findings primeiro
- depois resumo curto das correcoes
- depois validacoes executadas
- depois riscos residuais

Importante:

- priorize fechar o bloqueio P0 desta rodada antes de qualquer endurecimento adicional
- a meta nao e melhorar tudo, e sim destravar o `web-react/` oficial sem reabrir seguranca ja validada
```

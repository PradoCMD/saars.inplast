# Handoff: CODE Reviewer para Remediacao do `web-react/` Pos-Adaptacao Auth

Data: 2026-04-08
Projeto: `saars.inplast`
Origem do handoff: TESTE Auditor
Destino: CODE Reviewer
Escopo deste handoff: remediacao tecnica do bloqueio encontrado no reteste do `web-react/`
Status de entrada: shell React validado em boa parte do comportamento, mas ainda bloqueado no fluxo real por erro de acoplamento ao backend

## 1. Objetivo deste handoff

Entregar para o CODE Reviewer um resumo acionavel do que falhou no `web-react/`, do que foi validado com sucesso e do que precisa ser corrigido sem reabrir indevidamente backend auth/RBAC ja estabilizados.

Este handoff nao redefine SPEC nem backlog.
O foco aqui e correcao tecnica segura e objetiva.

## 2. Resumo executivo

O reteste do `web-react/` encontrou um unico finding novo e realmente bloqueante:

1. o frontend React oficial ainda sobe via Vite apontando para um backend errado/legado

Isso impede o login real no fluxo normal de desenvolvimento e, por si so, bloqueia a rodada.

Ao mesmo tempo, o reteste mostrou que, quando o `web-react/` conversa com o backend autenticado correto:

- login funciona
- logout funciona
- `401` volta para login e limpa sessao
- `root`, `manager` e `operator` ficam com affordances coerentes
- multiempresa fica claro e seguro
- `Cockpit`, `Kanban` e `Romaneios` estao honestos e bem mais proximos de produto

Traducao pratica:

- o problema principal nao esta na logica do shell React
- o problema principal esta na integracao real do Vite com a API da rodada

## 3. Leitura obrigatoria

Leia nesta ordem:

1. [SPEC.json](/Users/sistemas2/Documents/Playground%202/saars.inplast/SPEC.json)
2. [BACKLOG.json](/Users/sistemas2/Documents/Playground%202/saars.inplast/BACKLOG.json)
3. [handoff_teste_auditor_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/handoff_teste_auditor_web_react_auth_adaptacao_2026-04-08.md)
4. [relatorio_ui_ux_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_ui_ux_web_react_auth_adaptacao_2026-04-08.md)
5. [relatorio_teste_auditor_web_react_auth_adaptacao_2026-04-08.md](/Users/sistemas2/Documents/Playground%202/saars.inplast/docs/relatorio_teste_auditor_web_react_auth_adaptacao_2026-04-08.md)
6. [web-react/vite.config.js](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/vite.config.js)
7. [web-react/src/App.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx)
8. [web-react/src/components/Topbar.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/components/Topbar.jsx)
9. [web-react/src/pages/KanbanBoard.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/KanbanBoard.jsx)
10. [web-react/src/pages/RomaneiosInbox.jsx](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/pages/RomaneiosInbox.jsx)

## 4. Finding que precisa de foco imediato

### P0: proxy/base URL do `web-react/` ainda aponta para backend errado no fluxo real

Contexto:

- o handoff desta rodada recomendava backend autenticado em `8876`
- o Vite ainda esta com proxy hardcoded para `8765`
- o login do React usa rota relativa `/api/pcp/auth/login`

Evidencias principais:

- proxy em [vite.config.js:6](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/vite.config.js#L6) e [vite.config.js:8](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/vite.config.js#L8)
- login relativo em [App.jsx:462](/Users/sistemas2/Documents/Playground%202/saars.inplast/web-react/src/App.jsx#L462)
- evidência visual do erro em [web_react_real_proxy_login_failure.png](/Users/sistemas2/Documents/Playground%202/saars.inplast/output/playwright/web_react_real_proxy_login_failure.png)

Comportamento observado:

- `manager_inplast / m123` falha no fluxo real com `Route not found`
- quando o trafego foi roteado para `8876` no reteste, o shell React passou nos cenarios centrais

Leitura recomendada:

- tratar isso primeiro como problema de configuracao/acoplamento do frontend
- nao partir do pressuposto de regressao de backend auth

## 5. O que ficou validado e deve ser preservado

Depois que o frontend foi ligado ao backend autenticado correto, os seguintes comportamentos passaram:

- sessao persistida em `pcp_app_session_v1`
- reset completo em `401`
- logout limpo
- `manager` com `MRP` e `Sincronizar`
- `operator` sem `MRP`, sem `Sincronizar` e sem ingestao local
- multiempresa exigindo empresa ativa
- `Kanban` sem drag ficticio
- `Romaneios` diferenciando backend oficial de buffer local
- placeholders honestos para areas ainda nao promovidas

Nao perca esses comportamentos na remediacao.

## 6. Regras de trabalho para esta remediacao

- Primeiro confirmar a causa no codigo.
- Corrigir com a menor mudanca confiavel possivel.
- Nao reverter mudancas locais preexistentes.
- Nao alterar `SPEC.json` nem `BACKLOG.json`.
- Nao reabrir backend auth/RBAC sem evidencia objetiva.
- Nao tentar ampliar escopo para redesenhar o `web-react/`.
- Se a melhor solucao envolver configuracao por ambiente em vez de hardcode, isso e aceitavel desde que mantenha o fluxo local claro e validavel.

## 7. Validacoes obrigatorias apos corrigir

### Bloco A: fluxo real sem override

Com ambiente:

- backend autenticado em `8876`
- Vite em `5173`

Validar:

1. login valido de `manager_inplast`
2. persistencia de sessao
3. logout
4. `401` derrubando sessao e voltando para login

### Bloco B: papel

Validar:

1. `root` com `MRP` e `Sincronizar`
2. `manager` com `MRP` e `Sincronizar`
3. `operator` sem `MRP`
4. `operator` sem ingestao local de romaneios

### Bloco C: multiempresa

Validar:

1. `manager_multi` exigindo selecao de empresa
2. `Cockpit` e `Kanban` bloqueando sem empresa
3. liberacao apos selecao

## 8. Resultado esperado da sua resposta

Sua devolutiva precisa trazer:

1. finding confirmado com causa e arquivo/linha
2. correcao aplicada
3. validacoes executadas
4. riscos residuais que permaneceram

Formato desejado:

- findings primeiro
- depois resumo curto das correcoes
- depois validacoes
- depois riscos residuais

## 9. Conclusao deste handoff

Hoje o `web-react/` esta a um passo de destravar a rodada:

- o shell principal parece tecnicamente bom
- o bloqueio real esta no caminho entre frontend e backend autenticado

Prioridade recomendada:

1. fechar o P0 de proxy/base URL
2. provar login real sem shim
3. devolver para novo reteste rapido

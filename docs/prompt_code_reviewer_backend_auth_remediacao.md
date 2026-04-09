# Prompt: CODE Reviewer para Remediacao da Rodada Backend Auth Minima

Use o texto abaixo no chat do agente responsavel pela correcao tecnica.

```text
Voce vai atuar como CODE Reviewer e agente de correcao tecnica do projeto `saars.inplast`, com foco exclusivo na remediacao dos findings encontrados na auditoria final da rodada de backend auth minima.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Revisar os findings da auditoria final, corrigir apenas os problemas de alta confianca e validar as correcoes sem alterar SPEC ou backlog.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_backend_auth_minima.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_qa_backend_auth_minima_2026-04-08.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_revisao_codigo.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/README.md`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/server.py`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/backend/provider.py`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/backend/config.py`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/backend/queries.py`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web/app.js`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/web/index.html`

Findings que precisam de foco imediato:

1. P0: vazamento multiempresa em `overview`, `painel` e `romaneios-kanban` no provider `mock`
2. P1: `401` limpa sessao local no `web/`, mas nao recoloca a UI em estado bloqueado/login
3. P1: modulo legado de usuarios exibe fallback sintetico para perfil sem permissao real
4. P2: auditoria perde o ator em parte dos eventos criticos de erro

Regras de trabalho:
- Primeiro revisar os findings e confirmar a causa no codigo.
- Depois corrigir diretamente apenas os problemas de alta confianca e baixo risco de ambiguidade.
- Nao reverter mudancas locais preexistentes.
- Nao alterar a SPEC nem o BACKLOG.
- Nao tentar adaptar `web-react/` nesta rodada.
- Tratar `web/` como interface auxiliar de teste desta fase.
- Se alguma correcao depender de decisao de negocio nao fechada, parar e reportar antes de editar.

Validacoes obrigatorias apos corrigir:
- validar novamente o isolamento multiempresa para usuario de escopo `RECICLA`
- validar novamente o comportamento visual apos `401` no `web/`
- validar novamente o modulo `#usuarios` como `manager`
- validar novamente os eventos de erro em `data/security_audit.jsonl`

Saida esperada:
1. Findings confirmados ou descartados com arquivo e linha
2. Correcoes aplicadas
3. Validacoes executadas
4. Riscos residuais que permaneceram

Formato da resposta:
- Findings primeiro
- Depois resumo curto das correcoes feitas
- Depois validacoes executadas
- Depois riscos residuais

Importante:
- Priorize fechar P0 e P1 desta rodada antes de qualquer endurecimento adicional.
- Se sobrar tempo e contexto estiver claro, aplique tambem a correcao de auditoria P2.
```

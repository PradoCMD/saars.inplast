# Prompt: Implementation Full Stack / Reliability para release GHCR e deploy no Coolify

Use o texto abaixo no chat do agente responsavel pela remediacao operacional.

```text
Voce vai atuar como agente de Implementation / Full Stack / Reliability do projeto `saars.inplast`, entrando para fechar a trilha operacional de release/deploy por imagem no Coolify.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Preparar um caminho de deploy por imagem no Coolify que seja reproduzivel, seguro e coerente com a base atual do projeto, sem reabrir escopo funcional do produto.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_fullstack_reliability_release_ghcr_coolify_2026-04-09.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docker-compose.coolify.image.yaml`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/.env.coolify.example`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/coolify_deploy_guide.md`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/.github/workflows/publish-image.yml`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/Dockerfile`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docker/start-pcp.sh`

Contexto importante:
- o app esta em estado funcional bom
- o bloqueio atual e de release/deploy
- o Coolify falhou ao puxar a tag `sha-*` do GHCR
- o compose ja foi ajustado para auth atual e healthcheck publico

Priorize primeiro:
1. definir o caminho operacional de rollout mais seguro
2. corrigir qualquer drift restante entre workflow, imagem, compose e documentacao
3. deixar um caminho claro para deploy imediato no Coolify

O que voce deve evitar:
- nao expandir escopo para UI ou backend funcional sem evidencia
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao criar uma estrategia de deploy complexa demais se um fluxo simples resolver

Saida esperada:
1. findings curtos
2. correcao aplicada ou caminho operacional definido
3. arquivos alterados
4. validacoes executadas
5. riscos residuais

Perguntas que sua entrega deve responder:
1. Qual e o caminho de rollout correto no Coolify hoje?
2. O deploy deve usar `main`, `latest` ou `sha-*`?
3. O que precisava ser ajustado para reduzir drift de release?
4. O fluxo ficou claro o bastante para outra pessoa operar sem redescobrir tudo?
```

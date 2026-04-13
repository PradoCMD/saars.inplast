# Prompt: CODE Reviewer para incidente de release GHCR e deploy no Coolify

Use o texto abaixo no chat do agente responsavel pela investigacao tecnica.

```text
Voce vai atuar como CODE Reviewer do projeto `saars.inplast`, com foco exclusivo em investigar e fechar o incidente de release envolvendo GHCR e deploy no Coolify.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Descobrir por que a imagem `ghcr.io/pradocmd/saars-inplast:sha-bd1216d61bc8020b93e6a1d805fced92b33de8dd` nao foi encontrada no deploy do Coolify e definir a estrategia correta de release por imagem para este projeto.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_code_reviewer_release_ghcr_coolify_2026-04-09.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/.github/workflows/publish-image.yml`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docker-compose.coolify.image.yaml`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/.env.coolify.example`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/coolify_deploy_guide.md`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/Dockerfile`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docker/start-pcp.sh`

Contexto importante:
- o app e o QA funcional estao em estado bom
- o bloqueio atual e de release/deploy
- o compose ja foi ajustado para auth atual e healthcheck publico
- o erro observado foi `not found` na tag `sha-*`

Priorize primeiro:
1. revisar o workflow `publish-image.yml`
2. confirmar a estrategia de tags real
3. identificar se o problema e de publicacao, naming ou permissao no GHCR
4. definir o padrao correto para o Coolify: `main`, `latest` ou `sha-*`

O que voce deve evitar:
- nao expandir escopo para frontend/backend funcional sem evidencia
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao redesenhar o processo inteiro se um ajuste pequeno no workflow resolver

Saida esperada:
1. findings primeiro
2. causa confirmada ou mais provavel
3. correcao recomendada ou aplicada
4. validacoes executadas
5. riscos residuais

Perguntas que sua entrega deve responder:
1. Por que a tag `sha-*` nao foi encontrada?
2. O workflow realmente publica essa tag hoje?
3. O pacote GHCR esta utilizavel pelo Coolify sem credenciais extras?
4. Qual deve ser a estrategia padrao de imagem para evitar drift de release?
```

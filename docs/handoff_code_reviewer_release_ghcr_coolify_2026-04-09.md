# Handoff: CODE Reviewer para incidente de release GHCR e deploy no Coolify

Data: 2026-04-09
Projeto: `saars.inplast`
Origem do handoff: coordenacao de release apos rodada aprovada de QA
Destino: CODE Reviewer
Escopo deste handoff: investigar a causa do erro de imagem/tag no GHCR e validar a estrategia correta de release para o Coolify
Status de entrada: app funcional e compose ajustado, mas deploy por imagem bloqueado por tag `sha-*` nao encontrada

## 1. Objetivo deste handoff

Passar para o `CODE Reviewer` a investigacao tecnica da trilha de release.

O foco aqui nao e evoluir frontend, backend funcional ou UX.
O foco aqui e responder com evidencia:

1. por que a tag `sha-bd1216d...` nao foi encontrada no GHCR
2. se o problema esta no workflow, no pacote, na tag, na permissao ou na expectativa do deploy
3. qual deve ser a estrategia correta de release versionada daqui para frente

## 2. Leitura obrigatoria

Leia nesta ordem:

1. `SPEC.json`
2. `BACKLOG.json`
3. `docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`
4. `.github/workflows/publish-image.yml`
5. `docker-compose.coolify.image.yaml`
6. `docker-compose.coolify.yaml`
7. `.env.coolify.example`
8. `coolify_deploy_guide.md`
9. `Dockerfile`
10. `docker/start-pcp.sh`

## 3. Evidencia principal do incidente

O deploy no Coolify falhou com:

```text
failed to resolve reference "ghcr.io/pradocmd/saars-inplast:sha-bd1216d61bc8020b93e6a1d805fced92b33de8dd": not found
```

## 4. O que ja foi confirmado

- o repositório tem workflow de publish no push para `main`
- o workflow declara tags `main`, `latest` e `sha-*`
- o compose de deploy foi ajustado para nao usar healthcheck autenticado
- o problema atual nao e da aplicacao; e da trilha de imagem/publicacao

## 5. Perguntas que voce precisa responder

1. A tag `sha-*` realmente deveria existir para `bd1216d`?
2. O workflow publicou `main` e `latest`, mas nao `sha-*`, ou falhou completamente?
3. Existe problema de naming/tagging no `docker/metadata-action`?
4. O pacote GHCR esta publico ou exige credenciais para o Coolify?
5. O deploy deveria usar `main`, `latest` ou `sha-*` como padrao?

## 6. O que voce deve preservar

Nao reabra escopo de produto:

- nao mexer em auth, sessao, papel ou multiempresa sem necessidade objetiva
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao transformar a trilha em refatoracao de frontend/backend fora do incidente

## 7. Resultado esperado da sua entrega

Sua devolutiva precisa trazer:

1. findings priorizados sobre a trilha de release
2. causa provavel confirmada com evidencia
3. correcao recomendada
4. se necessario, patch no workflow ou na estrategia de imagem
5. validacao do caminho correto para o Coolify

## 8. Conclusao do handoff

Este problema deve ser tratado como incidente de release, nao como bug funcional do app.
O seu papel aqui e fechar a causa tecnica e devolver uma estrategia de imagem confiavel.

---
tags: [infra, ci-cd, github-actions, ghcr, docker, deploy]
relacionado: [[Docker e Deploy]], [[Configuração de Ambiente]]
status: ativo
tipo: arquitetura
versao: 1.0.0
---

# CI/CD

Pipeline de integração e entrega contínua via GitHub Actions. Publica automaticamente a imagem Docker no GitHub Container Registry (GHCR) a cada push.

## Como funciona

O workflow `.github/workflows/publish-image.yml` executa:
1. Build do `Dockerfile` (multi-stage: Node/Vite + Python)
2. Tag da imagem com `main` e `sha-<commit>`
3. Push para `ghcr.io/pradocmd/saars-inplast`

A imagem publicada no GHCR é usada pelo `docker-compose.coolify.image.yaml` no Coolify para deploy sem rebuild.

## Arquivos principais

- `.github/workflows/publish-image.yml` — workflow de publicação
- `Dockerfile` — imagem sendo publicada
- `docs/release_deploy_governanca.md` — processo de release e aprovação
- `docs/release_rollout_status.md` — status dos rollouts
- `coolify_deploy_guide.md` — runbook operacional do Coolify

## Integrações

Este módulo se conecta com:
- [[Docker e Deploy]]
- [[Configuração de Ambiente]]

## Configuração

```bash
# Imagem publicada
ghcr.io/pradocmd/saars-inplast:main
ghcr.io/pradocmd/saars-inplast:sha-<commit>

# Secrets necessários no GitHub
GITHUB_TOKEN (automático do Actions)
```

## Observações importantes

- Aprovação funcional do produto **não implica** aprovação de rollout — ver `docs/release_deploy_governanca.md`
- Use `sha-<commit>` para rollout pinado após publicação e verificação da tag
- O guia do Coolify é runbook operacional — não é fonte única de aprovação de release
- Falha na publicação da imagem deve bloquear o rollout até resolução

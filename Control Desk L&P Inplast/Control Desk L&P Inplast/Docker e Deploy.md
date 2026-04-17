---
tags: [infra, docker, deploy, coolify, ghcr, ci-cd]
relacionado: [[Configuração de Ambiente]], [[Banco de Dados Postgres]], [[CI/CD]]
status: ativo
tipo: arquitetura
versao: 1.0.0
---

# Docker e Deploy

Infraestrutura de containerização e deployment do módulo PCP. Suporta topologia integrada (app + banco no mesmo compose) e topologia separada (apps/data).

## Como funciona

O `Dockerfile` constrói a imagem em duas etapas:
1. Build do frontend `web-react` com Node/Vite
2. Imagem final Python com o backend + `web-react/dist`

**Topologias disponíveis:**

| Compose | Uso |
|---------|-----|
| `docker-compose.integrated.yaml` | Stack completa local (saas + postgres) |
| `docker-compose.coolify.yaml` | Deploy no Coolify (build local) |
| `docker-compose.coolify.image.yaml` | Deploy no Coolify (imagem GHCR) |

**Bootstrap do banco:** `docker/start-pcp.sh` aplica o schema SQL no primeiro boot do `pcp-postgres`.

## Arquivos principais

- `Dockerfile` — build multi-stage (Node + Python)
- `docker-compose.integrated.yaml` — topologia integrada local
- `docker-compose.coolify.yaml` — deploy Coolify (build)
- `docker-compose.coolify.image.yaml` — deploy Coolify (imagem)
- `docker/start-pcp.sh` — bootstrap do banco
- `docker/postgres/` — configuração do container Postgres
- `.dockerignore` — exclusões do build

## Integrações

Este módulo se conecta com:
- [[Configuração de Ambiente]]
- [[Banco de Dados Postgres]]
- [[CI/CD]]

## Configuração

```bash
# Subir stack integrada local
cp .env.integrated.example .env
docker compose -f docker-compose.integrated.yaml up -d --build

# Verificar health
curl http://127.0.0.1:8765/health
curl http://127.0.0.1:8765/ready
```

Imagem publicada: `ghcr.io/pradocmd/saars-inplast:main`

Regra de tags:
- `main` — para deploy imediato ou validação rápida
- `sha-<commit>` — para rollout pinado após verificação
- Evitar `latest` como padrão operacional

## Observações importantes

- Se o volume do Postgres já existir, o bootstrap SQL não roda novamente
- A porta padrão do Postgres isolado é `55432` (evita conflito com `5432` do host)
- O `web-react/dist/` deve estar construído antes de rodar `python3 server.py` fora do Docker
- O Coolify usa `Base Directory` configurado para o diretório do módulo em monorepos

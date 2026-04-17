---
tags: [database, postgres, sql, schema]
relacionado: [[Provider e Modos de Operação]], [[Autenticação e RBAC]], [[MRP]], [[Romaneios]]
status: ativo
tipo: arquitetura
versao: 1.0.0
---

# Banco de Dados Postgres

Schema operacional completo do módulo PCP. Armazena romaneios, usuários, integrações, movimentos de estoque, apontamentos e estado do MRP.

## Como funciona

O banco é um Postgres dedicado ao módulo PCP, inicializado automaticamente no primeiro boot via `docker/start-pcp.sh`. Dois arquivos SQL definem o schema completo:

1. `pcp_operacional_postgres.sql` (89 KB) — tabelas, views `mart.*`, `core.*`, `ops.*`, funções e seeds
2. `pcp_postgres_roles_permissions.sql` (5 KB) — roles `pcp_app` (leitura) e `pcp_integration` (escrita/ações)

O `backend/queries.py` mapeia todas as queries para as views e funções do banco.

## Arquivos principais

- `database/pcp_operacional_postgres.sql` — schema completo, views, funções
- `database/pcp_postgres_roles_permissions.sql` — criação de roles e permissões
- `backend/queries.py` — queries SQL usadas pelo provider
- `docker/postgres/` — configuração do container Postgres
- `docker/start-pcp.sh` — bootstrap do banco no startup

## Integrações

Este módulo se conecta com:
- [[Provider e Modos de Operação]]
- [[Autenticação e RBAC]]
- [[MRP]]
- [[Romaneios]]
- [[Kanban Logístico]]
- [[Apontamento de Produção]]

## Configuração

```bash
# Conexão padrão
PCP_DATABASE_URL=postgresql://pcp_app:SENHA@host:55432/inplast_pcp
PCP_ACTIONS_DATABASE_URL=postgresql://pcp_integration:SENHA@host:55432/inplast_pcp

# Porta isolada (evita conflito com Postgres do host)
Porta padrão da stack integrada: 55432
```

Docker Compose integrado:
- `docker-compose.integrated.yaml` — sobe `pcp-saas` + `pcp-postgres`
- `docker-compose.coolify.image.yaml` — usa imagem GHCR + Postgres próprio

## Observações importantes

- Se o volume do Postgres já existir, o bootstrap SQL **não roda de novo** automaticamente
- No modo postgres, `kanban_db.json` deixa de ser usado — kanban é persistido no banco
- Previsões manuais de romaneio, usuários, integrações e movimentos de estoque são persistidos no banco
- `data/*.json` continuam como seed inicial quando o banco estiver vazio
- O banco é `inplast_pcp` — isolado de outros serviços da infra

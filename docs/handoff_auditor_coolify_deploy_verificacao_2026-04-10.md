# Handoff: Auditoria de Deploy Coolify

Data: 2026-04-10
Projeto: `saars.inplast`
Origem: Implementation / Full Stack / Reliability
Destino: Auditor de Solucao
Status: AGUARDANDO AUDITORIA

## 1. Escopo

Verificar consistência dos arquivos de deploy antes do deploy no Coolify.

## 2. Problema Resolvido

Deploy anterior falhou com:
```
FATAL: password authentication failed for user "postgres"
```

Causa: Senha não configurada corretamente no Coolify.

## 3. Arquivos Ajustados

| Arquivo | Status | Notes |
|--------|--------|-------|
| `docker-compose.coolify.image.yaml` | Ajustado | Postgres configs |
| `.env.coolify.example` | Preenchido | Senhas modelo |
| `.env.coolify.production` | Novo | Production ready |
| `docs/coolify_postgres_password_recovery_2026-04-10.md` | Novo | Recovery guide |

## 4. Variveis Consistencia

Verificar que estas variaveis estao consistentes entre compose e env:

```bash
# Banco
PCP_POSTGRES_DB=inplast_pcp
PCP_POSTGRES_SUPERUSER=postgres
PCP_POSTGRES_SUPERPASSWORD=inplast_pcp_2026

# App DB
PCP_APP_DB_PASSWORD=inplast_pcp_2026

# Integration DB  
PCP_INTEGRATION_DB_PASSWORD=inplast_pcp_2026

# Auth
PCP_AUTH_TOKEN_SECRET=pcp_s3cr3t_2026_inplast_!
```

## 5. Tarefas do Auditor

1. **Verificar consistencia compose vs env**
   - Todas as variaveis batem?
   - Senhas consistentes?

2. **Verificar healthcheck**
   - Compose usa `/` (nao mais `/api/pcp/overview`)

3. **Verificar imagem**
   - `ghcr.io/pradocmd/saars-inplast:main`

4. **Aprovar para deploy**
   - Aprovar ou pedir ajustes

## 6. Referencias

- `docker-compose.coolify.image.yaml`
- `.env.coolify.example`
- `.env.coolify.production`
- `docs/coolify_postgres_password_recovery_2026-04-10.md`

## 7. Proximo Passo Apos Auditoria

Deploy no Coolify:
1. Remover volume `pcp_postgres_data`
2. Usar variaveis do `.env.coolify.production`
3. Subir com `docker-compose.coolify.image.yaml`
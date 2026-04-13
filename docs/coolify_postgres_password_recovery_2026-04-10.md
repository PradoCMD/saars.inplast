# Recovery: PostgreSQL Password Auth Failure no Coolify

Data: 2026-04-10
Problema: `FATAL: password authentication failed for user "postgres"`

## Sintoma

```
psql: error: connection to server at "pcp-postgres" (10.0.13.2), port 5432 failed: 
FATAL: password authentication failed for user "postgres"
```

O container `pcp-saas` tenta executar o bootstrap mas a senha não confere com o banco.

## Causas Comuns

| # | Causa | Probabilidade | Solução |
|---|------|--------------|---------|
| 1 | Volume antigo com senha diferente | Alta | Remover volume |
| 2 | Variável não configurada no Coolify | Alta | Verificar env vars |
| 3 | Senha diferente em cada variável | Média | Padronizar senhas |
| 4 | Primeira inicialização com senha vazia | Baixa | Definir senha antes do deploy |

## Procedimento de Recovery

### Passo 1: Remover Volume Antigo

No Coolify UI:
1. Ir para a aplicação
2. Encontrar o volume `pcp_postgres_data`
3. Remover/deletar o volume

Isso força recriação do banco com a senha correta.

### Passo 2: Verificar Variáveis

Garantir que estas variáveis estão configuradas no Coolify:

```bash
# Obrigatórias
PCP_POSTGRES_SUPERPASSWORD=SUA_SENHA_AQUI
PCP_APP_DB_PASSWORD=SUA_SENHA_AQUI
PCP_INTEGRATION_DB_PASSWORD=SUA_SENHA_AQUI

# Recomendado usar a mesma base para as três
# Exemplo:
# PCP_POSTGRES_SUPERPASSWORD=inplast2026
# PCP_APP_DB_PASSWORD=inplast2026
# PCP_INTEGRATION_DB_PASSWORD=inplast2026
```

### Passo 3: Redeploy

1. Remover volume ( Passo 1)
2. Verificar variáveis (Passo 2)
3. Subir aplicação com `docker-compose.coolify.image.yaml`

### Passo 4: Verificação

Verificar logs do container `pcp-saas`:

```bash
# Logs devem mostrar:
Bootstrapping PCP Postgres at pcp-postgres:5432/inplast_pcp...
Applying PCP schema to database inplast_pcp...
PCP Postgres bootstrap complete.
```

## Prevención

Para evitar recurrence:

1. **Sempre usar senha definida** - Não usar valor padrão ou vazio
2. **Documentar a senha** - Manter registro da senha usada
3. **Volume management** - Em caso de dúvida, sempre remover volume antes de muda senha

## Variaveis Obrigatorias Resumo

| Variável | Exemplo | Notes |
|----------|--------|-------|
| `PCP_POSTGRES_SUPERPASSWORD` | `inplast2026` | Senha do superuser postgres |
| `PCP_APP_DB_PASSWORD` | `inplast2026` | Senha do usuário pcp_app |
| `PCP_INTEGRATION_DB_PASSWORD` | `inplast2026` | Senha do usuário pcp_integration |
| `PCP_POSTGRES_DB` | `inplast_pcp` | Nome do banco |
| `PCP_AUTH_TOKEN_SECRET` | `gerar_token_seguro` | Token de auth do app |

## Referências

- `docker-compose.coolify.image.yaml`
- `.env.coolify.example`
- `coolify_deploy_guide.md`
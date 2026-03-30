# Primeira Implantacao do PCP na VM Data

Contexto validado:
- VM `data`: `192.168.25.251`
- Postgres exposto em `5432`
- Container atual: `postgres_n8n-v80csss0sgw0k888wkggg0kg`
- Banco alvo do PCP: `inplast`
- Roles criadas: `pcp_app`, `pcp_integration`

Importante:
- As roles foram criadas com as senhas literais `SENHA_FORTE_APP` e `SENHA_FORTE_INTEGRATION`.
- Antes de subir o SaaS ou o n8n, troque essas senhas por valores reais.

## 1. Ajustar as senhas das roles

Entre no `psql`:

```bash
docker exec -it postgres_n8n-v80csss0sgw0k888wkggg0kg sh -lc 'psql -U "$POSTGRES_USER" -d postgres'
```

Rode:

```sql
ALTER ROLE pcp_app PASSWORD 'TROQUE_AQUI_POR_UMA_SENHA_REAL';
ALTER ROLE pcp_integration PASSWORD 'TROQUE_AQUI_POR_UMA_SENHA_REAL';
\q
```

## 2. Copiar os scripts para a VM data

Do seu computador local:

```bash
scp './database/pcp_operacional_postgres.sql' deploy@192.168.25.251:/tmp/
```

```bash
scp './database/pcp_postgres_roles_permissions.sql' deploy@192.168.25.251:/tmp/
```

## 3. Aplicar o schema do PCP no banco `inplast`

Na `vm data`:

```bash
docker exec -i postgres_n8n-v80csss0sgw0k888wkggg0kg sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d inplast' < /tmp/pcp_operacional_postgres.sql
```

## 4. Aplicar as permissoes

Na `vm data`:

```bash
docker exec -i postgres_n8n-v80csss0sgw0k888wkggg0kg sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d inplast' < /tmp/pcp_postgres_roles_permissions_2026-03-30.sql
```

Observacao:
- Esse script vai mostrar `notice` para as roles `pcp_app` e `pcp_integration`, porque elas ja existem. Isso e esperado.
- Se o schema tiver sido aplicado parcialmente em uma primeira tentativa, reaplique primeiro o `pcp_operacional_postgres.sql` corrigido e depois rode novamente este script de permissoes.

## 5. Smoke tests basicos

Schemas:

```bash
docker exec postgres_n8n-v80csss0sgw0k888wkggg0kg sh -lc 'psql -U "$POSTGRES_USER" -d inplast -c "\dn"'
```

Tabelas principais:

```bash
docker exec postgres_n8n-v80csss0sgw0k888wkggg0kg sh -lc 'psql -U "$POSTGRES_USER" -d inplast -c "\dt ops.*"'
```

```bash
docker exec postgres_n8n-v80csss0sgw0k888wkggg0kg sh -lc 'psql -U "$POSTGRES_USER" -d inplast -c "\dt core.*"'
```

```bash
docker exec postgres_n8n-v80csss0sgw0k888wkggg0kg sh -lc 'psql -U "$POSTGRES_USER" -d inplast -c "\dt mart.*"'
```

Views importantes:

```bash
docker exec postgres_n8n-v80csss0sgw0k888wkggg0kg sh -lc 'psql -U "$POSTGRES_USER" -d inplast -c "\dv mart.*"'
```

Fontes seedadas:

```bash
docker exec postgres_n8n-v80csss0sgw0k888wkggg0kg sh -lc 'psql -U "$POSTGRES_USER" -d inplast -c "select source_code, source_area, is_active from ops.source_registry order by source_code;"'
```

Permissoes do `pcp_app`:

```bash
docker exec postgres_n8n-v80csss0sgw0k888wkggg0kg sh -lc "PGPASSWORD='SENHA_REAL_DO_PCP_APP' psql -h 127.0.0.1 -U pcp_app -d inplast -c 'select count(*) from mart.vw_painel_current;'"
```

Permissoes do `pcp_integration`:

```bash
docker exec postgres_n8n-v80csss0sgw0k888wkggg0kg sh -lc "PGPASSWORD='SENHA_REAL_DO_PCP_INTEGRATION' psql -h 127.0.0.1 -U pcp_integration -d inplast -c 'select count(*) from ops.source_registry;'"
```

## 6. `.env` alvo do modulo PCP na VM apps

```env
PCP_PORT=8765
PCP_DATA_MODE=postgres
PCP_DATABASE_URL=postgresql://pcp_app:SENHA_REAL_DO_PCP_APP@192.168.25.251:5432/inplast
PCP_ACTIONS_DATABASE_URL=postgresql://pcp_integration:SENHA_REAL_DO_PCP_INTEGRATION@192.168.25.251:5432/inplast
```

## 7. Ordem recomendada depois disso

1. Subir o backend do modulo PCP na `vm apps` apontando para `inplast`.
2. Importar o workflow de almoxarifado no `n8n`.
3. Importar o webhook sombra do Sankhya no `n8n`.
4. Validar que o SaaS consegue ler `overview`.
5. Rodar a primeira carga de estoque.
6. Rodar o primeiro romaneio de teste.

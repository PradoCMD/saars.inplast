# Deploy no Coolify

## Arquivos para usar

- `docker-compose.coolify.yaml`
- `docker-compose.coolify.image.yaml`
- `.env.coolify.example`

## Passos

1. subir este diretorio ou apontar o Coolify para ele
2. usar `docker-compose.coolify.image.yaml` se quiser subir a imagem pronta do app junto com o Postgres proprio do modulo
3. usar `docker-compose.coolify.yaml` se quiser buildar direto do repo, tambem com o Postgres proprio do modulo
4. cadastrar as variaveis diretamente na UI do Coolify com base em `.env.coolify.example`
5. configurar o dominio/URL no Coolify apontando para a porta `8765`

## Variaveis obrigatorias

- `PCP_DATA_MODE=postgres`
- `PCP_POSTGRES_SUPERPASSWORD`
- `PCP_APP_DB_PASSWORD`
- `PCP_INTEGRATION_DB_PASSWORD`

## Variavel recomendada

- `PCP_POSTGRES_DB`
- `PCP_POSTGRES_PORT`
- `PCP_ACTIONS_DATABASE_URL`
- `PCP_IMAGE`
- `PCP_DATABASE_URL`

## Topologia recomendada na vm-apps

Para este servico, a recomendacao atual e replicar o mesmo padrao do app de cubagem:

- um Postgres proprio do modulo PCP
- uma porta dedicada para esse banco
- o SaaS apontando apenas para esse banco

Se a VM hospedar o banco localmente, use a stack integrada como referencia:

- `docker-compose.integrated.yaml`
- porta externa `55432`

Isso evita conflito com outros servicos, elimina a persistencia paralela em arquivo para romaneios no modo `postgres` e centraliza kanban, romaneios, ajustes manuais e ingestao no mesmo banco do modulo.

## Modo recomendado para colar so o YAML

Use `docker-compose.coolify.image.yaml`.

Ele nao precisa de `build`, mas continua usando os arquivos de bootstrap do repo para inicializar o Postgres do modulo.

Ele sobe:

- a imagem pronta do `pcp-saas` no GHCR
- o container `pcp-postgres`
- o bootstrap inicial com `database/pcp_operacional_postgres.sql`
- as permissoes de `database/pcp_postgres_roles_permissions.sql`
- as variaveis de ambiente do banco

Imagem padrao:

```bash
ghcr.io/pradocmd/saars-inplast:main
```

Se o pacote estiver privado no GitHub, configure credenciais de registry no Coolify.
Se o pacote estiver publico, basta colar o YAML e preencher as variaveis.

## Variaveis sugeridas

Exemplo coerente com a stack dedicada:

```bash
PCP_DATA_MODE=postgres
PCP_PORT=8765
PCP_POSTGRES_PORT=55432
PCP_POSTGRES_HOST=pcp-postgres
PCP_POSTGRES_INTERNAL_PORT=5432
PCP_POSTGRES_DB=inplast_pcp
PCP_POSTGRES_SUPERUSER=postgres
PCP_POSTGRES_SUPERPASSWORD=CHANGE_ME_POSTGRES
PCP_APP_DB_PASSWORD=CHANGE_ME_PCP_APP
PCP_INTEGRATION_DB_PASSWORD=CHANGE_ME_PCP_INTEGRATION
PCP_DATABASE_URL=postgresql://pcp_app:CHANGE_ME_PCP_APP@pcp-postgres:5432/inplast_pcp
PCP_ACTIONS_DATABASE_URL=postgresql://pcp_integration:CHANGE_ME_PCP_INTEGRATION@pcp-postgres:5432/inplast_pcp
```

Com essa topologia, o Postgres dedicado do proprio servico passa a concentrar:

- usuarios e autenticacao do app
- integracoes e webhooks operacionais
- entrada e saida do almoxarifado
- datas de referencia dos romaneios
- regras de producao importadas das planilhas H-H

Os YAMLs tambem sobem um servico `pcp-db-migrate`, que reaplica o schema e as permissoes em todo deploy para acomodar evolucao de tabela sem exigir limpeza manual do volume do banco.

## Repositorio recomendado

O caminho mais simples e usar este diretorio como raiz de um repositorio dedicado do modulo PCP.

Se o repositrio tiver esta pasta na raiz, o Coolify encontra automaticamente:

- `Dockerfile`
- `docker-compose.coolify.yaml`
- `server.py`
- `backend/`
- `web/`
- `data/`

Se voce optar por colocar esse diretorio dentro de um repo maior, ajuste o `build.context` do compose ou configure `Base Directory` no Coolify para `saas_pcp_module`.

## Observacao

Se por algum motivo voce quiser demonstrar a interface sem banco real, pode trocar:

```bash
PCP_DATA_MODE=mock
```

Nesse caso o modulo sobe com os dados de exemplo do prototipo.

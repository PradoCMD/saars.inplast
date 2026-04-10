# Deploy no Coolify

## Antes de usar este guia

Este arquivo agora deve ser tratado como runbook operacional.

Fonte canonica de governanca:

- `docs/release_deploy_governanca.md`

Snapshot atual de aprovacao:

- `docs/release_rollout_status.md`

Historico do incidente de release:

- `docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`

Importante:

- `estado funcional aprovado` nao significa `rollout aprovado`
- este guia explica como operar o deploy
- este guia nao deve ser usado sozinho para concluir que uma tag de imagem ja esta aprovada para rollout

## Arquivos para usar

- `docker-compose.coolify.yaml`
- `docker-compose.coolify.image.yaml`
- `.env.coolify.example`

## Ordem recomendada de uso

1. confirmar o status em `docs/release_rollout_status.md`
2. usar este guia apenas se o gate de rollout estiver destravado para a tag pretendida
3. preencher as variaveis com base em `.env.coolify.example`
4. executar o deploy com a estrategia de imagem validada para a rodada

## Caminho operacional recomendado hoje

Use esta ordem:

1. para destravar o deploy no Coolify agora, use `docker-compose.coolify.image.yaml`
2. mantenha `PCP_IMAGE=ghcr.io/pradocmd/saars-inplast:main` enquanto o objetivo for rollout imediato ou validacao operacional rapida
3. troque para `sha-*` apenas depois de confirmar no workflow e no GHCR que a tag exata desejada foi realmente publicada e esta acessivel

Decisao pratica:

- `main` = padrao operacional mais seguro hoje para deploy imediato
- `sha-*` = padrao para rollout pinado e rastreavel depois de verificacao do artefato
- `latest` = nao usar como padrao do Coolify

## Passos

1. subir este diretorio ou apontar o Coolify para ele
2. usar `docker-compose.coolify.image.yaml` se quiser subir a imagem pronta do app junto com o Postgres proprio do modulo
3. usar `docker-compose.coolify.yaml` se quiser buildar direto do repo, tambem com o Postgres proprio do modulo
4. cadastrar as variaveis diretamente na UI do Coolify com base em `.env.coolify.example`
5. configurar o dominio/URL no Coolify apontando para a porta `8765`

Observacao:

- os compose atuais publicam a porta da app com `ports: "${PCP_PORT:-8765}:8765"`
- isso permite testar direto por IP, por exemplo `http://SEU_IP:8765`
- se ainda assim nao abrir, o proximo suspeito passa a ser firewall/roteamento da VM, nao o container

## Variaveis obrigatorias

- `PCP_DATA_MODE=postgres`
- `PCP_AUTH_TOKEN_SECRET`
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
- o bootstrap do banco pelo startup do app
- as variaveis de ambiente do banco

Imagem padrao:

```bash
ghcr.io/pradocmd/saars-inplast:main
```

Se o pacote estiver privado no GitHub, configure credenciais de registry no Coolify.
Se o pacote estiver publico, basta colar o YAML e preencher as variaveis.

Observacao importante:

- este compose nao sobe um servico separado `pcp-db-migrate`
- o caminho real atual de bootstrap passa por `docker/start-pcp.sh`
- esse startup aplica schema e permissoes quando `PCP_DATA_MODE=postgres`

## Variaveis sugeridas

Exemplo coerente com a stack dedicada:

```bash
PCP_DATA_MODE=postgres
PCP_PORT=8765
PCP_AUTH_TOKEN_SECRET=CHANGE_ME_LONG_RANDOM_AUTH_SECRET
PCP_AUTH_TOKEN_TTL_SECONDS=28800
PCP_SYNC_API_TOKEN=
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

## Tag recomendada da imagem

Nao assuma que `main`, `latest` ou `sha-*` estao automaticamente aprovadas para rollout.

Sempre confirme primeiro no snapshot de status:

- `docs/release_rollout_status.md`

Se voce quiser atualizar sempre para a cabeca de `main`, use:

```bash
PCP_IMAGE=ghcr.io/pradocmd/saars-inplast:main
```

Use `main` como trilha movel de deploy imediato ou validacao rapida no Coolify.

`latest` continua existindo como alias, mas nao agrega rastreabilidade extra em relacao a `main` e nao deve ser o padrao de release.

Se voce quiser travar exatamente um snapshot aprovado no QA, prefira a tag por SHA publicada pelo workflow do GitHub:

```bash
PCP_IMAGE=ghcr.io/pradocmd/saars-inplast:sha-06b5c4e2237646bb2e20e7e94a013d3ee073f2bd
```

Esse deve ser o padrao para rollout no Coolify quando a versao ja tiver sido aprovada.

O workflow declara publicacao de:

- `main`
- `latest`
- `sha-<commit_curto>`
- `sha-<commit_completo>`

Na pratica, a tag exata a usar no rollout deve ser sempre a que foi verificada como existente e acessivel no GHCR para a rodada.

Use a tag por SHA quando quiser evitar drift entre a versao testada e a versao implantada.
Para o Coolify, prefira a SHA completa quando a rodada pedir rastreabilidade mais explicita.

Observacao importante:

- o incidente de 2026-04-09 mostrou que expectativa de tag e artefato realmente publicado podem divergir
- por isso, nao trate o exemplo de `sha-*` deste guia como prova de disponibilidade no GHCR
- nao assuma disponibilidade da tag apenas lendo o workflow; confirme o artefato publicado
- so use a tag por SHA quando a existencia e a acessibilidade dela estiverem verificadas para o ambiente alvo

## Healthcheck da stack

Os compose do Coolify usam healthcheck no path `/` e nao mais em `/api/pcp/overview`.

Motivo:

- `overview` hoje exige autenticacao
- o root continua publico e e suficiente para validar se o processo HTTP esta respondendo

Com essa topologia, o Postgres dedicado do proprio servico passa a concentrar:

- usuarios e autenticacao do app
- integracoes e webhooks operacionais
- entrada e saida do almoxarifado
- datas de referencia dos romaneios
- regras de producao importadas das planilhas H-H

Hoje os YAMLs do Coolify nao sobem um servico dedicado `pcp-db-migrate`.

O caminho real da stack atual e:

- `pcp-postgres` como banco do modulo
- `pcp-saas` como app
- bootstrap do schema e das permissoes feito pelo startup do app em `docker/start-pcp.sh`

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

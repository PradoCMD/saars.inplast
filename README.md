# Modulo PCP SaaS - Prototipo de Referencia

Este diretorio contem um prototipo executavel do modulo PCP no SaaS.

O objetivo aqui nao e definir a stack final do produto. A ideia e entregar uma base neutra para:

- validar o fluxo do modulo
- testar a experiencia do usuario
- alinhar contratos de API
- acelerar a transicao para o repositorio real do SaaS

## Conteudo do repositorio

- `backend/`: camada de leitura e acoes contra o Postgres
- `web/`: interface web do modulo PCP
- `data/`: dados mock para demonstracao
- `parsers/`: parsers Python usados pela ingestao de estoque
- `database/`: schema e permissoes do Postgres
- `n8n/`: workflows de webhook e almoxarifado
- `docs/`: guias de implantacao e operacao
- `source_templates/`: modelos CSV para previsoes operacionais
- `scripts/`: scripts para clonar e atualizar o repo na `vm-apps`
- `.github/workflows/`: publicacao automatica da imagem Docker no GHCR

## Estrutura

- `server.py`: servidor de referencia do modulo
- `backend/`: configuracao, providers e queries SQL
- `data/`: respostas JSON dos endpoints
- `web/`: frontend web que consome a API

## Como rodar

```bash
cd "/caminho/do/repositorio/saars.inplast"
python3 server.py
```

Depois abra:

- `http://127.0.0.1:8765`

## Stack integrada com Postgres dedicado

Se voce quiser subir este modulo com um banco proprio, isolado do restante da maquina, use:

- `docker-compose.integrated.yaml`
- `.env.integrated.example`

Essa topologia sobe:

- `pcp-saas`
- `pcp-postgres`

E publica o Postgres na porta `55432` por padrao, evitando conflito com outro servico que ja use `5432`.

Passo a passo:

```bash
cd "/caminho/do/repositorio/saars.inplast"
cp .env.integrated.example .env
docker compose -f docker-compose.integrated.yaml up -d --build
```

Depois abra:

- `http://127.0.0.1:8765`

E, se quiser acessar o banco dessa stack pela maquina host:

- `postgresql://postgres:SUA_SENHA@127.0.0.1:55432/inplast_pcp`

Observacoes:

- na primeira subida, o container `pcp-postgres` aplica automaticamente `database/pcp_operacional_postgres.sql`
- na mesma inicializacao ele aplica tambem `database/pcp_postgres_roles_permissions.sql`
- as credenciais `pcp_app` e `pcp_integration` sao criadas com as senhas do `.env`
- se o volume do Postgres ja existir, o bootstrap nao roda de novo automaticamente
- este e o modo recomendado para a `vm-apps` quando o objetivo for manter romaneios, kanban logistico e ajustes manuais no proprio banco do servico

## Modos de operacao

### 1. `mock`

Modo padrao. Serve os dados locais de `data/`.

```bash
PCP_DATA_MODE=mock python3 server.py
```

### 2. `postgres`

Modo preparado para o backend real do SaaS.

Variaveis esperadas:

- `PCP_DATA_MODE=postgres`
- `PCP_DATABASE_URL=postgresql://usuario:senha@host:5432/banco`

Opcional para acoes que escrevem no banco:

- `PCP_ACTIONS_DATABASE_URL=postgresql://usuario_escrita:senha@host:5432/banco`

Ou:

- `DATABASE_URL=postgresql://usuario:senha@host:5432/banco`

Exemplo:

```bash
PCP_DATA_MODE=postgres \
PCP_DATABASE_URL='postgresql://pcp_app:senha@127.0.0.1:55432/inplast_pcp' \
PCP_ACTIONS_DATABASE_URL='postgresql://pcp_integration:senha@127.0.0.1:55432/inplast_pcp' \
python3 server.py
```

Observacao:

- o modo `postgres` tenta usar `psycopg` e, se nao existir, tenta `psycopg2`
- as consultas ja estao mapeadas para as views e funcoes do arquivo `database/pcp_operacional_postgres.sql`
- a partir desta versao, o caminho recomendado e o modulo rodar com um Postgres proprio na `vm-apps`
- a recomendacao e usar `pcp_app` para leitura e `pcp_integration` para acoes como `run_mrp`
- se `PCP_DATABASE_URL` nao for informado, o backend tambem consegue montar a conexao automaticamente a partir de `PCP_POSTGRES_HOST`, `PCP_POSTGRES_DB`, `PCP_APP_DB_PASSWORD` e `PCP_INTEGRATION_DB_PASSWORD`

## Implantacao

### Opcao A: stack dedicada do modulo

Para um ambiente isolado so para este servico:

1. copiar `.env.integrated.example` para `.env`
2. ajustar senhas e portas
3. subir `docker-compose.integrated.yaml`
4. importar os workflows em `n8n/`

### Opcao B: topologia separada apps/data

Esse modo continua suportado, mas agora e legado. Use apenas se houver uma exigencia operacional clara para manter o banco fora da `vm-apps`.

Para essa topologia:

- `apps`: SaaS + n8n
- `data`: Postgres

use esta sequencia:

1. aplicar `database/pcp_operacional_postgres.sql`
2. aplicar `database/pcp_postgres_roles_permissions.sql`
3. configurar as variaveis do app conforme `.env.coolify.example`
4. subir o servico pelo `docker-compose.coolify.yaml`
5. importar os workflows em `n8n/`

Observacao operacional:

- a partir desta versao, o modo `postgres` deixa de depender de `backend/kanban_db.json` para romaneios e kanban
- previsoes manuais de saida do romaneio passam a ser registradas no proprio Postgres
- filas locais do navegador continuam existindo apenas como rascunho temporario de upload/manual antes da ingestao

## Imagem pronta para o Coolify

Se voce preferir colar apenas um compose no Coolify, use:

- `docker-compose.coolify.image.yaml`

Esse arquivo agora sobe:

- `pcp-postgres`
- `pcp-saas`

e usa a imagem publicada pelo GitHub Container Registry:

- `ghcr.io/pradocmd/saars-inplast:main`

A automacao dessa imagem fica em:

- `.github/workflows/publish-image.yml`

## Repo local na VM apps

Para manter uma copia local estavel do repo para o `n8n`, use:

- `scripts/bootstrap_vm_apps_repo.sh`
- `scripts/update_vm_apps_repo.sh`

Ou siga o guia em `docs/vm_apps_repo_local.md`.

## Endpoints incluidos

- `GET /api/pcp/overview`
- `GET /api/pcp/painel`
- `GET /api/pcp/romaneios`
- `GET /api/pcp/romaneios/{romaneioCode}`
- `GET /api/pcp/assembly`
- `GET /api/pcp/production`
- `GET /api/pcp/purchases`
- `GET /api/pcp/recycling`
- `GET /api/pcp/costs`
- `GET /api/pcp/sources`
- `GET /api/pcp/alerts`
- `POST /api/pcp/runs/mrp`

## O que este prototipo representa

- frontend consumindo API
- dominio PCP segmentado em cockpit, romaneios, montagem, producao, compras, recicla, custos e fontes
- previsao de saida do romaneio por estoque e disponibilidade operacional
- acao operacional de disparo de MRP
- detalhe de romaneio com historico de eventos
- backend em dois modos: `mock` e `postgres`
- mapeamento real dos endpoints para `mart.*`, `core.*` e `ops.*`

## O que ainda nao representa

- autenticacao real
- permissao por perfil
- mutacoes operacionais definitivas

## Proximo encaixe no produto real

Quando o repositorio do SaaS estiver disponivel, a migracao fica simples:

1. trocar o mock backend pelos endpoints reais
2. ligar cada rota do frontend na camada oficial do SaaS
3. manter o Postgres como motor do dominio PCP

## Publicacao recomendada

Para deploy no Coolify, o ideal e publicar este diretorio como um repositorio proprio do modulo PCP.

Assim o repositorio fica com esta estrutura na raiz:

- `Dockerfile`
- `docker-compose.coolify.yaml`
- `server.py`
- `backend/`
- `web/`
- `data/`
- `parsers/`
- `database/`
- `n8n/`
- `docs/`

Se voce preferir manter isso dentro de um monorepo maior, configure o `Base Directory` do Coolify para a pasta do modulo.

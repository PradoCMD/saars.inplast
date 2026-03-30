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
PCP_DATABASE_URL='postgresql://pcp_app:senha@db:5432/inplast' \
PCP_ACTIONS_DATABASE_URL='postgresql://pcp_integration:senha@db:5432/inplast' \
python3 server.py
```

Observacao:

- o modo `postgres` tenta usar `psycopg` e, se nao existir, tenta `psycopg2`
- as consultas ja estao mapeadas para as views e funcoes do arquivo `database/pcp_operacional_postgres.sql`
- para a topologia atual, o esperado e o SaaS rodar na VM `apps` apontando para o banco na VM `data`
- a recomendacao e usar `pcp_app` para leitura e `pcp_integration` para acoes como `run_mrp`

## Implantacao

Para esta topologia:

- `apps`: SaaS + n8n
- `data`: Postgres

use esta sequencia:

1. aplicar `database/pcp_operacional_postgres.sql`
2. aplicar `database/pcp_postgres_roles_permissions.sql`
3. configurar as variaveis do app conforme `.env.coolify.example`
4. subir o servico pelo `docker-compose.coolify.yaml`
5. importar os workflows em `n8n/`

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

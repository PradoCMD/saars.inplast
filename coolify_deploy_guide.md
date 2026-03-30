# Deploy no Coolify

## Arquivos para usar

- `docker-compose.coolify.yaml`
- `docker-compose.coolify.image.yaml`
- `.env.coolify.example`

## Passos

1. subir este diretorio ou apontar o Coolify para ele
2. usar `docker-compose.coolify.image.yaml` se quiser somente puxar a imagem pronta
3. usar `docker-compose.coolify.yaml` se quiser buildar direto do repo
4. cadastrar as variaveis diretamente na UI do Coolify com base em `.env.coolify.example`
5. configurar o dominio/URL no Coolify apontando para a porta `8765`

## Variaveis obrigatorias

- `PCP_DATA_MODE=postgres`
- `PCP_DATABASE_URL`

## Variavel recomendada

- `PCP_ACTIONS_DATABASE_URL`
- `PCP_IMAGE`

Use essa segunda URL quando quiser separar:

- leitura do SaaS com `pcp_app`
- acoes operacionais com `pcp_integration`

## Modo recomendado para colar so o YAML

Use `docker-compose.coolify.image.yaml`.

Ele nao precisa de `build`, `Dockerfile` nem checkout local do codigo no host.

So precisa:

- da imagem pronta no GHCR
- das variaveis de ambiente do banco

Imagem padrao:

```bash
ghcr.io/pradocmd/saars-inplast:main
```

Se o pacote estiver privado no GitHub, configure credenciais de registry no Coolify.
Se o pacote estiver publico, basta colar o YAML e preencher as variaveis.

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

# Deploy no Coolify

## Arquivos para usar

- `docker-compose.coolify.yaml`
- `.env.coolify.example`

## Passos

1. subir este diretorio ou apontar o Coolify para ele
2. usar `docker-compose.coolify.yaml`
3. cadastrar as variaveis diretamente na UI do Coolify com base em `.env.coolify.example`
4. configurar o dominio/URL no Coolify apontando para a porta `8765`

## Variaveis obrigatorias

- `PCP_DATA_MODE=postgres`
- `PCP_DATABASE_URL`

## Variavel recomendada

- `PCP_ACTIONS_DATABASE_URL`

Use essa segunda URL quando quiser separar:

- leitura do SaaS com `pcp_app`
- acoes operacionais com `pcp_integration`

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

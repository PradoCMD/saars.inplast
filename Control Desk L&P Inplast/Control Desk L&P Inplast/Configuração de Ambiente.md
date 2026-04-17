---
tags: [infra, env, configuracao, variaveis, ambiente]
relacionado: [[Docker e Deploy]], [[Provider e Modos de Operação]], [[Banco de Dados Postgres]]
status: ativo
tipo: arquitetura
versao: 1.0.0
---

# Configuração de Ambiente

Variáveis de ambiente e arquivos de configuração que controlam o comportamento do módulo PCP em diferentes ambientes (local, integrado, Coolify, produção).

## Como funciona

O `backend/config.py` (5 KB) lê e valida as variáveis de ambiente no startup. Fornece defaults seguros e falha com mensagem clara quando uma variável crítica está ausente.

Arquivos de template disponíveis:

| Arquivo | Uso |
|---------|-----|
| `.env.example` | Referência mínima local |
| `.env.integrated.example` | Stack integrada (saas + postgres) |
| `.env.coolify.example` | Deploy Coolify (build) |
| `.env.coolify.production` | Coolify de produção |

## Arquivos principais

- `backend/config.py` — leitura e validação de envs
- `.env.example` — template local
- `.env.integrated.example` — template stack integrada
- `.env.coolify.example` — template Coolify
- `.env.coolify.production` — configuração de produção

## Integrações

Este módulo se conecta com:
- [[Docker e Deploy]]
- [[Provider e Modos de Operação]]
- [[Banco de Dados Postgres]]

## Configuração

Variáveis principais:

```bash
# Modo de operação
PCP_DATA_MODE=mock|postgres

# Banco de dados
PCP_DATABASE_URL=postgresql://pcp_app:SENHA@host:55432/inplast_pcp
PCP_ACTIONS_DATABASE_URL=postgresql://pcp_integration:SENHA@host:55432/inplast_pcp

# Composição alternativa (banco)
PCP_POSTGRES_HOST=localhost
PCP_POSTGRES_DB=inplast_pcp
PCP_APP_DB_PASSWORD=senha_app
PCP_INTEGRATION_DB_PASSWORD=senha_integration

# Limites operacionais
API_PAYLOAD_LIMIT_BYTES=1048576
REQUEST_TIMEOUT_SECONDS=60
```

## Observações importantes

- `.env` real nunca deve ser commitado no repo — está no `.gitignore`
- Senhas com caracteres especiais devem ser **quotadas** nos arquivos `.env` do Docker
- O `backend/config.py` monta `PCP_DATABASE_URL` automaticamente a partir das variáveis individuais quando a URL composta não for informada
- `.env.coolify.production` contém senhas reais — tratar como arquivo sensível

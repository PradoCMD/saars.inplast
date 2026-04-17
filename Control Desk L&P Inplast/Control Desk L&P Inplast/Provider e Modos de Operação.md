---
tags: [backend, python, mock, postgres, dados]
relacionado: [[Servidor HTTP]], [[Banco de Dados Postgres]], [[Configuração de Ambiente]]
status: ativo
tipo: arquitetura
versao: 1.0.0
---

# Provider e Modos de Operação

Camada de abstração entre os handlers HTTP e a fonte de dados real. Permite alternância entre dados mock (JSON local) e dados reais (Postgres) sem alterar o servidor.

## Como funciona

O `backend/provider.py` (97 KB) é o coração do sistema. Expõe métodos padronizados que o `server.py` chama. Internamente, resolve qual fonte usar com base na variável `PCP_DATA_MODE`.

**Modo mock:** lê arquivos JSON de `data/` — útil para desenvolvimento e demonstração.

**Modo postgres:** conecta ao banco via `psycopg` (ou `psycopg2` como fallback) e executa queries de `backend/queries.py`.

O provider também gerencia:
- Snapshot state — preserva último estado válido em caso de falha
- Kanban state — em mock usa `backend/kanban_db.json`; em postgres usa Postgres
- Usuários, integrações e movimentos de estoque — persistidos em Postgres no modo real

## Arquivos principais

- `backend/provider.py` — implementação completa do provider (mock + postgres)
- `backend/queries.py` — queries SQL mapeadas para views `mart.*`, `core.*`, `ops.*`
- `backend/config.py` — leitura e validação das envs de conexão
- `backend/__init__.py` — exports do módulo
- `data/*.json` — seeds e respostas do modo mock

## Integrações

Este módulo se conecta com:
- [[Servidor HTTP]]
- [[Banco de Dados Postgres]]
- [[Configuração de Ambiente]]
- [[Autenticação e RBAC]]

## Configuração

```bash
# Modo mock (padrão)
PCP_DATA_MODE=mock

# Modo postgres
PCP_DATA_MODE=postgres
PCP_DATABASE_URL=postgresql://pcp_app:senha@127.0.0.1:55432/inplast_pcp
PCP_ACTIONS_DATABASE_URL=postgresql://pcp_integration:senha@127.0.0.1:55432/inplast_pcp
```

Variáveis alternativas de composição automática:
- `PCP_POSTGRES_HOST`, `PCP_POSTGRES_DB`, `PCP_APP_DB_PASSWORD`, `PCP_INTEGRATION_DB_PASSWORD`

## Observações importantes

- O provider mock injeta usuário root com senha fixa — deve ser removido do fluxo de produção (ver Sprint 1)
- `data/*.json` continuam como seed inicial quando o banco estiver vazio
- Usuário `pcp_app` é usado para leitura; `pcp_integration` para ações como `run_mrp`
- Em caso de falha do Postgres, o provider deve preservar último snapshot válido e sinalizar `stale_data`
- `backend/kanban_db.json` é usado apenas no modo mock; no modo postgres, kanban é persistido no banco

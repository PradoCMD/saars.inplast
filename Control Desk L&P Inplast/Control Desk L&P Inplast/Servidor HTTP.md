---
tags: [backend, api, python, http]
relacionado: [[Provider e Modos de Operação]], [[Autenticação e RBAC]], [[Banco de Dados Postgres]], [[MRP]]
status: ativo
tipo: arquitetura
versao: 1.0.0
---

# Servidor HTTP

Ponto de entrada único do módulo PCP. Implementado em Python (sem framework), serve a API REST e entrega o frontend React compilado.

## Como funciona

O `server.py` (81 KB) registra todas as rotas `/api/pcp/*` e delega leitura e escrita ao `backend/provider.py` conforme o modo de operação (`mock` ou `postgres`). Serve também os arquivos estáticos do `web-react/dist/` para qualquer rota desconhecida.

Fluxo de uma requisição:
1. Request chega em `server.py`
2. Rota é identificada e validada (Content-Type, payload limit, company_code)
3. Provider resolve a fonte de dados (mock JSON ou Postgres)
4. Resposta segue envelope padrão `{status, data, meta, errors}`

## Arquivos principais

- `server.py` — roteamento, validação, handlers de todas as rotas
- `backend/provider.py` — camada de dados (leitura e escrita)
- `backend/queries.py` — queries SQL para o modo postgres
- `backend/config.py` — leitura de variáveis de ambiente

## Integrações

Este módulo se conecta com:
- [[Provider e Modos de Operação]]
- [[Autenticação e RBAC]]
- [[Banco de Dados Postgres]]
- [[Romaneios]]
- [[MRP]]
- [[Sincronização de Fontes]]

## Configuração

```bash
PCP_DATA_MODE=mock|postgres
PCP_DATABASE_URL=postgresql://usuario:senha@host:5432/banco
PCP_ACTIONS_DATABASE_URL=postgresql://usuario_escrita:senha@host:5432/banco
```

Portas:
- App: `8765`
- Health: `GET /health`
- Readiness: `GET /ready`

## Observações importantes

- O servidor hoje devolve payloads heterogêneos entre rotas — padronização para envelope único é Sprint 1
- Shutdown gracioso: para novos requests, aguarda os em andamento até timeout, depois encerra
- Payload limit: 1 MB por requisição (`api_payload_limit_bytes: 1048576`)
- Rotas de health/readiness não exigem autenticação
- `web/` é servido apenas como legado — `web-react/dist/` é a UI oficial

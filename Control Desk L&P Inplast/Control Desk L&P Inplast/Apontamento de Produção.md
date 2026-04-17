---
tags: [frontend, react, apontamento, producao, operacional]
relacionado: [[Servidor HTTP]], [[Rastreamento de Produção]], [[Banco de Dados Postgres]], [[Autenticação e RBAC]]
status: ativo
tipo: componente
versao: 1.0.0
---

# Apontamento de Produção

Interface operacional para registro de produção no chão de fábrica. Ponto de entrada de dados de ordens de produção executadas pelos operadores.

## Como funciona

`web-react/src/pages/Apontamento.jsx` (7 KB) permite ao operador:

1. Selecionar ordem de produção ativa
2. Registrar quantidade produzida, refugo e turno
3. Confirmar apontamento via `POST /api/pcp/apontamento/save`
4. Exportar logs de apontamento
5. Sincronizar status com o Sankhya (destino transacional oficial)

O PCP é a **interface operacional** — o Sankhya continua sendo o **destino transacional oficial**.

Fluxo de dispatch:
- `POST /api/pcp/apontamento/save` — salva localmente no PCP
- `POST /api/pcp/apontamento/sync-status` — consulta status de sincronização com Sankhya
- `POST /api/pcp/apontamento/dispatch` — envia para o Sankhya (requer `apontamento.dispatch`)

## Arquivos principais

- `web-react/src/pages/Apontamento.jsx` — componente operacional
- `data/` — logs de demonstração
- `server.py` — handlers dos endpoints de apontamento

## Integrações

Este módulo se conecta com:
- [[Rastreamento de Produção]]
- [[Servidor HTTP]]
- [[Banco de Dados Postgres]]
- [[Autenticação e RBAC]]

## Configuração

Endpoints:
- `GET /api/pcp/apontamento/logs` — histórico de apontamentos
- `GET /api/pcp/apontamento/export` — exportação
- `POST /api/pcp/apontamento/save` — requer `apontamento.write`
- `POST /api/pcp/apontamento/sync-status`
- `POST /api/pcp/apontamento/dispatch` — requer `apontamento.dispatch`

Timeout: `apontamento_dispatch_timeout_seconds: 90`

## Observações importantes

- Toda operação de apontamento gera trilha de auditoria com usuário responsável
- O dispatch para o Sankhya pode falhar — o apontamento salvo localmente deve ser preservado
- Interface deve ser responsiva para uso em mobile web no chão de fábrica
- Estados necessários: `loading`, `error`, `empty`, `stale_data`, `permission_denied`

---
tags: [backend, integracao, fontes, estoque, sync, google-sheets]
relacionado: [[Servidor HTTP]], [[Provider e Modos de Operação]], [[Parsers de Estoque]], [[Governança de Fontes]], [[MRP]]
status: ativo
tipo: feature
versao: 1.0.0
---

# Sincronização de Fontes

Pipeline de sincronização das fontes reais de estoque e previsão operacional. Puxa dados do Sankhya e Google Sheets, normaliza via parsers e persiste snapshots para consumo do MRP e do cockpit.

## Como funciona

Disparada via `POST /api/pcp/sources/sync`, a sincronização:

1. Resolve credenciais, URLs e workbook paths configurados por fonte
2. Executa o parser correspondente a cada fonte (com timeout e retry)
3. Persiste `snapshot_at`, `record_count`, `summary`, `status` e último erro por fonte
4. Mantém o último snapshot válido em caso de falha parcial ou total
5. Expõe estado de frescor (`healthy`, `stale`, `partial`, `error`) na API e na UI

Fontes tipicamente sincronizadas:
- Estoque acabado (Google Sheets)
- Estoque intermediário (Google Sheets)
- Almoxarifado MP (Google Sheets, aba `ESTOQUE MP`)
- Almoxarifado Componentes (Google Sheets, aba `ESTOQUE PARAFUSOS`)
- BOM/estruturas (fonte homologada)

## Arquivos principais

- `backend/source_sync.py` — orquestrador de sync por fonte
- `backend/config.py` — leitura de credenciais e configuração de fontes
- `parsers/parse_estoque_acabado_google.py` — parser estoque acabado
- `parsers/parse_estoque_intermediario_google.py` — parser estoque intermediário
- `parsers/parse_estoque_almoxarifado_mp_google.py` — parser almoxarifado MP
- `parsers/parse_estoque_almoxarifado_componentes_google.py` — parser componentes
- `scripts/update_planilha_gsheets.py` — atualização bidirecional GSheets
- `docs/pcp_sync_fontes_reais.md` — contrato técnico das fontes
- `docs/pcp_contrato_fontes_previsao.md` — contrato de previsão

## Integrações

Este módulo se conecta com:
- [[Servidor HTTP]]
- [[Parsers de Estoque]]
- [[Governança de Fontes]]
- [[MRP]]
- [[Cockpit]]
- [[Scripts Google Sheets]]

## Configuração

```bash
# Credenciais Google (service account)
GOOGLE_CREDENTIALS_PATH=scripts/google_credentials.json

# Timeout e retry
sources_sync_timeout_seconds: 180
retry_attempts: 2
retry_strategy: exponential_backoff
```

Endpoints:
- `POST /api/pcp/sources/sync` — dispara sync (todas ou subconjunto por `source_code`)
- `GET /api/pcp/sources` — lê estado atual das fontes

## Observações importantes

- Falha de **uma** fonte não apaga snapshot válido das demais
- Sync concorrente da mesma fonte deve ser serializado para evitar race condition
- Parser com schema inválido falha com `source_code` e `detail` claros
- Token ausente ou inválido em ambiente protegido retorna 401
- O retorno inclui: `status`, `requested_sources`, `results`, `errors`, `snapshot_at`

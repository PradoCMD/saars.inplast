---
tags: [scripts, google-sheets, python, automacao, planilhas]
relacionado: [[Sincronização de Fontes]], [[Parsers de Estoque]], [[Integração n8n]]
status: ativo
tipo: feature
versao: 1.0.0
---

# Scripts Google Sheets

Conjunto de scripts Python para atualização e migração de planilhas Google Sheets com dados operacionais (pedidos, transportadoras, romaneios, estoque).

## Como funciona

Os scripts operam com a API do Google Sheets via service account. São executados manualmente ou via n8n para manter as planilhas sincronizadas com os dados do sistema.

Scripts principais:
- **`update_planilha_gsheets.py`** (23 KB) — atualização principal da planilha de pedidos
- **`update_planilha_romaneios_v2.py`** (12 KB) — atualização específica de romaneios
- **`ingest_romaneio_pdf.py`** (14 KB) — ingestão offline de PDFs para o sistema
- **`migrar_planilha.py`** (8 KB) — migração de dados entre planilhas
- **`sankhya_ordens_carga_poll.py`** (19 KB) — polling das ordens de carga no Sankhya
- **`sync_real_to_mock.py`** — sincroniza dados reais para o mock de desenvolvimento

## Arquivos principais

- `scripts/update_planilha_gsheets.py` — atualização GSheets
- `scripts/update_planilha_romaneios_v2.py` — romaneios
- `scripts/ingest_romaneio_pdf.py` — ingestão PDF offline
- `scripts/migrar_planilha.py` — migração de planilhas
- `scripts/sankhya_ordens_carga_poll.py` — polling Sankhya
- `scripts/sync_real_to_mock.py` — sync para mock
- `scripts/google_credentials.json` — credenciais service account
- `scripts/requirements.txt` — dependências Python dos scripts
- `scripts/Atualizar Planilha.command` — launcher macOS
- `scripts/Atualizar Planilha.bat` — launcher Windows

## Integrações

Este módulo se conecta com:
- [[Sincronização de Fontes]]
- [[Parsers de Estoque]]
- [[Integração n8n]]
- [[Romaneios]]

## Configuração

```bash
# Instalar dependências
pip install -r scripts/requirements.txt

# Credenciais Google
scripts/google_credentials.json  # service account com permissão nas planilhas

# ID da planilha alvo
scripts/.sheet_id  # contém o Google Sheet ID
```

## Observações importantes

- `google_credentials.json` é sensível — não deve ser commitado em repos públicos
- O script `sankhya_ordens_carga_poll.py` faz polling periódico do Sankhya para capturar ordens de carga novas
- `sync_real_to_mock.py` é exclusivo para desenvolvimento — nunca usar em produção
- Rate limit da Google Sheets API pode causar erros 429 — scripts usam retry com backoff

---
tags: [backend, romaneio, pdf, ingestao, kanban, integracao]
relacionado: [[Servidor HTTP]], [[Kanban Logístico]], [[Kanban Board]], [[Romaneios Inbox]], [[MRP]], [[Parser de Romaneio PDF]]
status: ativo
tipo: feature
versao: 1.0.0
---

# Romaneios

Módulo de ingestão, consolidação e gestão operacional de romaneios. Recebe documentos por upload PDF, payload de integração ou refresh via webhook. Consolida romaneio e romaneio nota em um registro único por ordem de carga.

## Como funciona

**Regra de identidade:**
- Romaneio e romaneio nota com a mesma ordem de carga se complementam em um registro consolidado
- Nova versão do mesmo tipo substitui a anterior

**Fluxo de ingestão:**
1. Upload PDF ou payload chega ao servidor
2. `backend/romaneio_pdf.py` extrai e normaliza dados do documento
3. `backend/romaneio_integration.py` aplica a lógica de merge por ordem de carga
4. Registro consolidado é persistido com itens, pedidos, totalizações e metadados
5. Kanban e lista são atualizados automaticamente

**Prioridade na fila:**
- Sem override: ordenado por `data_evento` e `romaneio_code`
- Com override manual: `rank` menor = maior prioridade
- Override recalcula ETAs e gargalos a jusante

## Arquivos principais

- `backend/romaneio_pdf.py` — parsing e extração de PDFs
- `backend/romaneio_integration.py` — lógica de merge e consolidação
- `data/romaneios.json` — seed de demonstração
- `docs/pcp_prioridade_romaneios.md` — regras de prioridade
- `scripts/ingest_romaneio_pdf.py` — script de ingestão offline

## Integrações

Este módulo se conecta com:
- [[Servidor HTTP]]
- [[Kanban Logístico]]
- [[Romaneios Inbox]]
- [[Kanban Board]]
- [[MRP]]
- [[Parser de Romaneio PDF]]
- [[Banco de Dados Postgres]]

## Configuração

Endpoints:
- `POST /api/pcp/romaneios/upload` — upload de PDF (máx 10 arquivos / 20 MB por request)
- `POST /api/pcp/romaneios-kanban/sync` — sync por payload estruturado
- `POST /api/pcp/romaneios/refresh` — refresh via webhook
- `POST /api/pcp/romaneios-kanban/update-date` — override manual de data de saída
- `POST /api/pcp/romaneios/delete` — remoção (requer `romaneios.delete`)
- `GET /api/pcp/romaneios` — lista consolidada
- `GET /api/pcp/romaneios/{romaneioCode}` — detalhe por ordem de carga
- `GET /api/pcp/romaneios-kanban` — fila kanban

Limites:
```bash
romaneio_upload_max_files_per_request: 10
romaneio_upload_max_total_bytes: 20971520  # 20 MB
romaneio_refresh_timeout_seconds: 180
```

## Observações importantes

- PDF inválido ou corrompido retorna erro por arquivo sem derrubar o lote inteiro
- Documento sem identidade resolvível é rejeitado com `detail` claro
- Romaneio e romaneio nota chegando fora de ordem devem convergir para o mesmo consolidado
- Payload duplicado do mesmo tipo não cria segunda ordem de carga oficial
- Toda alteração manual de prioridade ou data é auditada com usuário, antes e depois
- Falha no recalc não pode apagar o override salvo

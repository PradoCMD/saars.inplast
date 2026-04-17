---
tags: [backend, romaneio, pdf, parser, extracao]
relacionado: [[Romaneios]], [[Parsers de Estoque]], [[Integração n8n]]
status: ativo
tipo: feature
versao: 1.0.0
---

# Parser de Romaneio PDF

Extração e normalização de dados de documentos PDF de romaneio. Suporta romaneio padrão e romaneio nota, consolidando-os por ordem de carga.

## Como funciona

`backend/romaneio_pdf.py` (8 KB) recebe um arquivo PDF e extrai:
- Cabeçalho: número do romaneio, data, transportadora, empresa
- Itens: código, descrição, quantidade, peso, pedido vinculado
- Totalizações: peso total, volume, valor
- Tipo de documento: romaneio ou romaneio nota

Após extração, `backend/romaneio_integration.py` (12 KB) aplica a lógica de merge por ordem de carga.

## Arquivos principais

- `backend/romaneio_pdf.py` — extração de PDF
- `backend/romaneio_integration.py` — lógica de merge e consolidação
- `scripts/ingest_romaneio_pdf.py` — script para ingestão offline de PDFs
- `ROMANEIO 556 NOTA.pdf` / `ROMANEIO 556.pdf` — PDFs de referência para testes

## Integrações

Este módulo se conecta com:
- [[Romaneios]]
- [[Integração n8n]]
- [[Banco de Dados Postgres]]

## Configuração

Limites por request:
```bash
romaneio_upload_max_files_per_request: 10
romaneio_upload_max_total_bytes: 20971520  # 20 MB
```

Endpoint: `POST /api/pcp/romaneios/upload`

## Observações importantes

- PDF corrompido ou ilegível retorna erro por arquivo sem derrubar o lote
- Documento sem identidade de ordem de carga resolvível é rejeitado com `detail` claro
- Romaneio e romaneio nota do **mesmo** número se complementam — não criam dois registros
- Nova versão do mesmo tipo de documento substitui a versão anterior daquele tipo

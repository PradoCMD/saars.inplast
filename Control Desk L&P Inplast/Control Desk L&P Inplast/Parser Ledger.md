---
tags: [backend, parsers, etl, ledger, xlsx]
relacionado: [[Parsers de Estoque]], [[Sincronização de Fontes]], [[Scripts Google Sheets]]
status: ativo
tipo: feature
versao: 1.0.0
---

# Parser Ledger

Parsers especializados para extração de dados financeiros e de movimentação de ledger a partir de arquivos XLSX publicados e planilhas locais.

## Como funciona

Dois parsers de ledger lidam com fontes distintas:

- **`published_ledger_parser.py`** (10 KB) — extrai dados de ledger publicado (Google Sheets ou endpoint)
- **`xlsx_ledger_parser.py`** (14 KB) — extrai dados de arquivos XLSX locais (ex: `PEDIDOS TRANSPORTADORAS 2025.xlsx`)

Ambos normalizam os dados para o schema interno, permitindo que o módulo PCP consolide informações financeiras com os dados operacionais.

## Arquivos principais

- `parsers/published_ledger_parser.py` — parser de fonte publicada
- `parsers/xlsx_ledger_parser.py` — parser de XLSX local
- `PEDIDOS TRANSPORTADORAS 2025 (1).xlsx` — arquivo de referência / fonte
- `parse_and_update_sheet.py` — script na raiz para processar e atualizar planilha

## Integrações

Este módulo se conecta com:
- [[Parsers de Estoque]]
- [[Sincronização de Fontes]]
- [[Scripts Google Sheets]]

## Configuração

```bash
# Executar parser de XLSX local
python3 parse_and_update_sheet.py
```

## Observações importantes

- Os arquivos XLSX de transportadoras são usados como fonte de dados de pedidos logísticos
- O parser XLSX lida com múltiplas abas e formatos variados do Excel
- Validação de schema deve falhar com detalhe claro quando o arquivo XLSX não corresponder ao formato esperado

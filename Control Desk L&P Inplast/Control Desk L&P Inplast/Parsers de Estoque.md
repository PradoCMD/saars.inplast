---
tags: [backend, parsers, etl, estoque, bom, google-sheets]
relacionado: [[Sincronização de Fontes]], [[Estruturas e BOM]], [[Scripts Google Sheets]]
status: ativo
tipo: feature
versao: 1.0.0
---

# Parsers de Estoque

Módulo de ETL responsável pela extração e normalização de dados de estoque e BOM a partir de Google Sheets e fontes locais.

## Como funciona

Cada parser extrai dados de uma fonte específica e normaliza para o schema interno do PCP. São executados pelo `backend/source_sync.py` durante a sincronização de fontes.

Parsers disponíveis:
- **Estoque acabado** (`parse_estoque_acabado_google.py`, 14 KB) — produtos acabados via GSheets
- **Estoque intermediário** (`parse_estoque_intermediario_google.py`, 11 KB) — semifabricados via GSheets
- **Almoxarifado MP** (`parse_estoque_almoxarifado_mp_google.py`) — extrai matéria-prima da aba `ESTOQUE MP`
- **Almoxarifado Componentes** (`parse_estoque_almoxarifado_componentes_google.py`) — extrai componentes da aba `ESTOQUE PARAFUSOS`
- **BOM** (`parse_bom_estrutura_padrao.py`, 6 KB) — estrutura de produto

## Arquivos principais

- `parsers/parse_estoque_acabado_google.py`
- `parsers/parse_estoque_intermediario_google.py`
- `parsers/parse_estoque_almoxarifado_mp_google.py`
- `parsers/parse_estoque_almoxarifado_componentes_google.py`
- `parsers/parse_bom_estrutura_padrao.py`
- `parsers/run_inventory_parser.py` — runner dos parsers de estoque
- `parsers/run_bom_parser.py` — runner do parser de BOM
- `parsers/README.md` — documentação dos parsers

## Integrações

Este módulo se conecta com:
- [[Sincronização de Fontes]]
- [[Estruturas e BOM]]
- [[Scripts Google Sheets]]
- [[MRP]]

## Configuração

```bash
GOOGLE_CREDENTIALS_PATH=scripts/google_credentials.json
```

Credenciais: service account Google com acesso de leitura às planilhas configuradas.

## Observações importantes

- Parser com schema inválido falha com `source_code` e `detail` claros
- Cada parser é independente — falha de um não cancela os outros
- `source_templates/` contém modelos CSV das fontes para referência
- Versões locais dos parsers (`parse_estoque_almoxarifado_mp.py` sem `_google`) são para teste local sem GSheets
- Os parsers Google do almoxarifado usam abas exatas do workbook atual:
  - MP: `MOVIMENTACOES DE MP`, `ESTOQUE MP`, `BANCO DE DADOS DE MP`
  - Componentes: `MOVIMENTACOES DE PARAFUSOS`, `ESTOQUE PARAFUSOS`, `BANCO DE DADOS PARAFUSOS`

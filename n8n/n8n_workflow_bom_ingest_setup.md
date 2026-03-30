# PCP | Estruturas | Setup de ingestao

## Objetivo

Preparar o `n8n` para receber a composicao de:

- produto acabado
- produto intermediario

usando o mesmo layout padrao de planilha.

## Parser

Arquivos:

- `parsers/parse_bom_estrutura_padrao.py`
- `parsers/run_bom_parser.py`

## Exemplo de comando

Produto acabado:

```bash
python3 /opt/saars.inplast/parsers/run_bom_parser.py \
  --source-code bom_final_pendente \
  --source-scope bom_final \
  --parser-path /opt/saars.inplast/parsers/parse_bom_estrutura_padrao.py \
  --workbook-path "/data/ingest/PARTE 1 - COMP DE PRODUTOS.xlsx"
```

Produto intermediario:

```bash
python3 /opt/saars.inplast/parsers/run_bom_parser.py \
  --source-code bom_intermediario_pendente \
  --source-scope bom_intermediario \
  --parser-path /opt/saars.inplast/parsers/parse_bom_estrutura_padrao.py \
  --workbook-path "/data/ingest/COMP INTERMEDIARIOS.xlsx"
```

## Carga no Postgres

Chamar:

```sql
select ops.ingest_bom_payload(
  :source_code,
  :snapshot_at,
  :source_scope,
  :records_jsonb,
  :meta_jsonb
);
```

## Observacoes

- a mesma estrutura vale para acabado e intermediario
- o PCP pode ajustar depois pelo SaaS via `structure-overrides`
- a programacao manual entra pelo endpoint `programming-entries`

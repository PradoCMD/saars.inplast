# Parsers de almoxarifado

## Arquivos

- `parse_estoque_almoxarifado_mp.py`
- `parse_estoque_almoxarifado_componentes.py`
- `xlsx_ledger_parser.py`
- `run_inventory_parser.py`

## Uso

Materia-prima:

```bash
python3 parsers/parse_estoque_almoxarifado_mp.py --summary "/caminho/Estoque Almoxarifado.xlsx"
```

Componentes:

```bash
python3 parsers/parse_estoque_almoxarifado_componentes.py --summary "/caminho/Estoque Almoxarifado.xlsx"
```

Envelope unico para `n8n`:

```bash
python3 parsers/run_inventory_parser.py \
  --source-code estoque_materia_prima_almoxarifado \
  --parser-path parsers/parse_estoque_almoxarifado_mp.py \
  --workbook-path "/caminho/Estoque Almoxarifado.xlsx"
```

## Saida

O `stdout` devolve um array JSON no contrato esperado pelo `n8n`.

Exemplo:

```json
[
  {
    "sku": "100001",
    "description": "PC CRISTAL",
    "quantity": 5950.0,
    "location_code": "ALMOXARIFADO_MP",
    "company_code": "INPLAST",
    "unit_code": "KG",
    "product_type": "materia_prima",
    "supply_strategy": "comprar",
    "metadata": {
      "code_status": "trusted_code"
    }
  }
]
```

Com `--summary`, o `stderr` devolve um resumo de validacao com:

- quantidade de registros
- tipos de movimento
- itens sem estoque consolidado
- itens sem movimentacao
- conflitos de codigo
- divergencias entre saldo calculado e aba de estoque

## Regras

- o saldo e calculado a partir das abas de movimentacao
- a aba de estoque e usada como conferência
- o banco de dados e usado para resolver codigo legado
- quando o codigo esta faltando ou conflita com outro item, o parser gera um `sku` tecnico com prefixo `ALMOX-`

## Premissas atuais

- materia-prima sai com `unit_code='KG'`
- componentes comprados saem com `unit_code='UN'`
- ambos saem com `company_code='INPLAST'`

Essas premissas podem ser ajustadas depois sem mudar a estrutura do parser.

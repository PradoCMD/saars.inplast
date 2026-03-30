# Parsers de estoque

## Arquivos

- `parse_estoque_almoxarifado_mp.py`
- `parse_estoque_almoxarifado_componentes.py`
- `parse_estoque_intermediario_google.py`
- `parse_estoque_acabado_google.py`
- `parse_bom_estrutura_padrao.py`
- `xlsx_ledger_parser.py`
- `run_inventory_parser.py`
- `run_bom_parser.py`

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

Estoque intermediario publicado:

```bash
python3 parsers/parse_estoque_intermediario_google.py --summary \
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSs-C_7_vu6L1lq9ScJEcQNT3F23en4MdgHBUI2FFkqBm9c_Zq8WHdtZuXkMhQvcegp05KewJQzPlCP/pubhtml?widget=true&headers=false"
```

Estoque acabado publicado:

```bash
python3 parsers/parse_estoque_acabado_google.py --summary \
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRIlcxI2E0BRlf4i2M49MIW5XiLx69xWwkrLmst0Fs5HW5gSlk-wf8wAVjur7FH1mQRz_-qmUvZGJND/pubhtml?widget=true&headers=false"
```

Estrutura BOM padrao para acabado:

```bash
python3 parsers/parse_bom_estrutura_padrao.py --summary --source-scope bom_final \
  "/caminho/PARTE 1 - COMP DE PRODUTOS.xlsx"
```

Estrutura BOM padrao para intermediario:

```bash
python3 parsers/parse_bom_estrutura_padrao.py --summary --source-scope bom_intermediario \
  "/caminho/COMP INTERMEDIARIOS.xlsx"
```

Envelope unico de BOM para `n8n`:

```bash
python3 parsers/run_bom_parser.py \
  --source-code bom_final_pendente \
  --source-scope bom_final \
  --parser-path parsers/parse_bom_estrutura_padrao.py \
  --workbook-path "/caminho/PARTE 1 - COMP DE PRODUTOS.xlsx"
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

Exemplo de saida de BOM:

```json
[
  {
    "parent_sku": "4600001",
    "parent_description": "CX MED MONO SULGIPE",
    "component_sku": "4100006",
    "component_description": "TAMPA ALOJAMENTO DISJUNTOR MONO PC CR",
    "quantity_per": 1,
    "source_scope": "bom_final",
    "process_stage": "montagem",
    "component_role": "componente"
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
- quantidade de pais da estrutura
- linhas sem pai ou sem quantidade na BOM

## Regras

- o saldo e calculado a partir das abas de movimentacao
- a aba de estoque e usada como conferência
- o banco de dados e usado para resolver codigo legado
- quando o codigo esta faltando ou conflita com outro item, o parser gera um `sku` tecnico com prefixo especifico da fonte
- no estoque intermediario publicado, a fonte bruta e a aba `Movimentacoes`
- na BOM padrao, a linha do pai preenche as colunas `A/B` e as linhas seguintes continuam o mesmo pai ate aparecer um novo codigo

## Premissas atuais

- materia-prima sai com `unit_code='KG'`
- componentes comprados saem com `unit_code='UN'`
- estoque intermediario sai com `unit_code='UN'`
- estoque acabado sai com `unit_code='UN'`
- ambos saem com `company_code='INPLAST'`

Essas premissas podem ser ajustadas depois sem mudar a estrutura do parser.

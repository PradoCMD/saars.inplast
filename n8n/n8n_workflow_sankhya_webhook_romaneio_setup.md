# Setup do workflow novo de webhook do Sankhya

Arquivo do workflow:

- `n8n/n8n_workflow_sankhya_webhook_romaneio.json`

## Objetivo

Receber romaneios do Sankhya em um fluxo novo, separado do legado, e gravar a demanda no Postgres em modo sombra.

## Antes de importar

Garanta que o banco recebeu a versao atual de:

- `database/pcp_operacional_postgres.sql`

Pontos importantes dessa versao:

- existe a fonte `romaneio_sankhya_webhook` em `ops.source_registry`
- existe a tabela `ops.webhook_event`
- existe a funcao `ops.ingest_romaneio_event_payload(...)`

## Como importar

1. criar um novo workflow no `n8n`
2. importar `n8n/n8n_workflow_sankhya_webhook_romaneio.json`
3. configurar a credencial do node `Postgres | Ingest Romaneio Event`
4. configurar a variavel de ambiente `SANKHYA_PCP_TOKEN` no `n8n`
5. testar com o workflow ainda `inactive`

## Path do webhook

O workflow novo foi criado com:

- path: `pcp/sankhya-romaneio-shadow`

Na URL final do `n8n`, normalmente isso vira algo como:

- `https://seu-n8n/webhook/pcp/sankhya-romaneio-shadow`

## Modo sombra

Esse fluxo foi pensado para nao conflitar com o atual.

Na pratica:

- ele usa o `source_code='romaneio_sankhya_webhook'`
- mas esse source pode continuar `is_active = false` durante a homologacao
- assim a carga entra no banco, porem ainda nao vira fonte obrigatoria de planejamento

Quando quiser virar a chave:

```sql
update ops.source_registry
set is_active = true,
    updated_at = now()
where source_code = 'romaneio_sankhya_webhook';
```

## O que o workflow faz

1. recebe o `POST` do Sankhya
2. le `body`, `headers`, `query` e `params`
3. valida o header `x-pcp-token` contra `$env.SANKHYA_PCP_TOKEN`
4. monta uma chamada SQL unica
5. executa `ops.ingest_romaneio_event_payload(...)`
6. responde com o status:
   - `processed`
   - `duplicate_ignored`
   - `unauthorized`

## Payload esperado

Exemplo recomendado:

```json
{
  "event_id": "sankhya-598-20260330T091500Z",
  "event_type": "create",
  "event_at": "2026-03-30T09:15:00Z",
  "romaneio": {
    "codigo": "598",
    "empresa": "INPLAST",
    "status": "aberto",
    "pedido": "42620",
    "parceiro": "13824 - THIBRUMA SERVICOS ADMINISTRATIVO",
    "cidade": "CANAA DOS",
    "valor_total": 7723.31,
    "itens": [
      {
        "sku": "4300001",
        "descricao": "MANGUEIRA LISA 1 25MM C 100M",
        "produto": "4300001 - MANGUEIRA LISA 1 25MM C 100M",
        "unidade": "PC",
        "quantidade_neg": 150,
        "quantidade_vol": 5,
        "tipo_produto": "PRODUTO ACABADO"
      }
    ]
  }
}
```

## Regras implementadas no banco

A funcao `ops.ingest_romaneio_event_payload(...)` faz:

- deduplicacao por `event_id`
- registro do evento em `ops.webhook_event`
- abertura e fechamento de `ops.ingestion_run`
- persistencia em `raw.landing_payload`
- `upsert` de produto em `core.product`
- atualizacao de `core.romaneio_demand_snapshot`
- cancelamento por reinsercao com `quantity = 0`
- remocao de itens que sairam do romaneio em updates

## Teste manual sugerido

Exemplo com `curl`:

```bash
curl -X POST 'https://seu-n8n/webhook/pcp/sankhya-romaneio-shadow' \
  -H 'Content-Type: application/json' \
  -H 'x-pcp-token: SEU_TOKEN' \
  --data-binary @payload_romaneio.json
```

Resposta esperada:

```json
{
  "ok": true,
  "mode": "shadow",
  "status": "processed",
  "event_key": "sankhya-598-20260330T091500Z",
  "romaneio_code": "598",
  "run_id": 123,
  "item_count": 1
}
```

## Consultas uteis

Eventos recebidos:

```sql
select
  event_key,
  status,
  reference_at,
  run_id,
  received_at,
  finished_at,
  error_message
from ops.webhook_event
order by received_at desc
limit 20;
```

Ultimas linhas de demanda atuais:

```sql
select
  d.snapshot_at,
  d.romaneio_code,
  p.sku,
  p.description,
  d.quantity,
  d.company_code
from core.vw_romaneio_line_current d
join core.product p on p.product_id = d.product_id
where d.source_id = (
  select source_id
  from ops.source_registry
  where source_code = 'romaneio_sankhya_webhook'
)
order by d.snapshot_at desc, d.romaneio_code, p.description;
```

Demanda agregada atual:

```sql
select
  p.sku,
  p.description,
  d.demand_total
from core.vw_romaneio_demand_current d
join core.product p on p.product_id = d.product_id
order by d.demand_total desc, p.description;
```

## Observacao importante

Esse workflow ainda nao dispara o planejamento automaticamente.

A recomendacao e:

1. primeiro homologar recepcao e escrita da demanda
2. depois conectar esse fluxo ao planejamento
3. so no fim desativar o legado

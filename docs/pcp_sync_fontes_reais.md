# Sync direto das fontes reais

O backend do SaaS agora consegue puxar fontes reais de estoque diretamente, sem depender obrigatoriamente do workflow do `n8n`.

## Fontes suportadas

- `estoque_acabado_atual`
- `estoque_intermediario_atual`
- `estoque_materia_prima_almoxarifado`
- `estoque_componente_almoxarifado`

## Variaveis de ambiente

- `PCP_REPO_ROOT=/opt/saars.inplast`
- `PCP_ACABADO_PUBLISHED_URL=https://docs.google.com/.../pubhtml?widget=true&headers=false`
- `PCP_INTERMEDIARIO_PUBLISHED_URL=https://docs.google.com/.../pubhtml?widget=true&headers=false`
- `PCP_ALMOX_WORKBOOK=/data/ingest/Estoque Almoxarifado.xlsx`
- `PCP_SYNC_API_TOKEN=defina-um-token-se-quiser-proteger-a-rota`

Observacoes:

- se `PCP_ACABADO_PUBLISHED_URL` ou `PCP_INTERMEDIARIO_PUBLISHED_URL` nao forem definidos, o backend tenta usar o `published_url_hint` cadastrado em `ops.source_registry`
- se `PCP_ALMOX_WORKBOOK` nao for definido, o backend tenta `/data/ingest/Estoque Almoxarifado.xlsx`
- se `PCP_SYNC_API_TOKEN` nao existir, a rota fica sem autenticacao adicional

## Endpoint

- `POST /api/pcp/sources/sync`

### Sincronizar todas as fontes de estoque ativas

```bash
curl -s -X POST http://127.0.0.1:8765/api/pcp/sources/sync \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### Sincronizar somente os estoques publicados do Google

```bash
curl -s -X POST http://127.0.0.1:8765/api/pcp/sources/sync \
  -H 'Content-Type: application/json' \
  -d '{
    "source_codes": [
      "estoque_acabado_atual",
      "estoque_intermediario_atual"
    ]
  }'
```

### Com token

```bash
curl -s -X POST http://127.0.0.1:8765/api/pcp/sources/sync \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer SEU_TOKEN' \
  -d '{
    "source_codes": [
      "estoque_acabado_atual",
      "estoque_intermediario_atual"
    ]
  }'
```

## Resposta esperada

O retorno traz:

- `status`
- `requested_sources`
- `results`
- `errors`
- `snapshot_at`

Cada item em `results` devolve:

- `source_code`
- `source_area`
- `workbook_path`
- `record_count`
- `run_id`
- `snapshot_at`
- `summary`

## Sequencia recomendada

1. sincronizar estoques
2. conferir `GET /api/pcp/sources`
3. disparar `POST /api/pcp/runs/mrp`
4. validar `GET /api/pcp/overview`
5. validar `GET /api/pcp/romaneios`

# Deploy do modulo PCP nas VMs `apps` e `data`

Data: 2026-03-30

> Atualizacao: a topologia abaixo continua suportada, mas deixou de ser a recomendacao principal. O padrao atual para este modulo e manter um Postgres proprio na `vm-apps`, igual ao app de cubagem, usando o banco `inplast_pcp` na porta `55432`.

## Topologia separada apps/data

- VM `data`
  - `Postgres`
- VM `apps`
  - `SaaS`
  - `n8n`
  - parsers e rotinas auxiliares

Essa separacao e boa para a arquitetura que desenhamos.

## Fluxo alvo

```mermaid
flowchart LR
    A["Sankhya ERP"] --> B["n8n na VM apps"]
    C["Planilhas e fontes legadas"] --> B
    B --> D["Postgres na VM data"]
    E["SaaS na VM apps"] --> D
```

## O que isso muda na pratica

- o SaaS nao precisa ficar no mesmo host do banco
- o `n8n` e o SaaS podem compartilhar a mesma rede privada na VM `apps`
- o `Postgres` na VM `data` vira a fonte oficial central
- a VM `apps` passa a ser a camada de aplicacao
- a VM `data` passa a ser a camada de persistencia

## Regras recomendadas de rede

- liberar acesso da VM `apps` para a VM `data` na porta `5432`
- restringir a porta `5432` para rede privada ou IP da VM `apps`
- nao expor o `Postgres` publicamente
- manter `SaaS` e `n8n` acessando o banco por hostname interno

## Variaveis sugeridas na VM `apps`

Exemplo para o modulo PCP:

```bash
PCP_HOST=0.0.0.0
PCP_PORT=8765
PCP_DATA_MODE=postgres
PCP_DATABASE_URL=postgresql://pcp_app:senha@192.168.25.251:5432/inplast
```

Se o SaaS real usar uma unica `DATABASE_URL`, o backend ja aceita tambem:

```bash
DATABASE_URL=postgresql://pcp_app:senha@192.168.25.251:5432/inplast
PCP_DATA_MODE=postgres
```

## Usuario recomendado no Postgres

Criar um usuario de aplicacao dedicado, por exemplo:

- usuario: `pcp_app`
- permissao de leitura nas `views`
- permissao de execucao em `mart.run_mrp()`

Se o proprio SaaS tambem for disparar funcoes de ingestao ou manutencao, ai sim ampliamos o escopo.

## Escopo minimo de acesso do SaaS

Leitura:

- `mart.vw_painel_current`
- `mart.vw_mrp_assembly`
- `mart.vw_mrp_production`
- `mart.vw_mrp_purchase`
- `mart.vw_mrp_cost_last_run`
- `mart.vw_recycling_projection_last_run`
- `ops.vw_source_freshness`
- `mart.vw_items_without_bom`
- `core.vw_romaneio_line_current`

Execucao:

- `mart.run_mrp()`

## Escopo do `n8n` na VM `apps`

O `n8n` continua responsavel por:

- receber webhook do Sankhya
- ler arquivos e planilhas
- executar parsers
- gravar ingestao no Postgres
- disparar alertas
- carregar previsoes operacionais de montagem/producao/compra quando essas fontes estiverem disponiveis

Por isso, o `n8n` provavelmente vai precisar de um usuario com mais permissao que o frontend do SaaS.

Sugestao:

- `pcp_app`: usuario do SaaS
- `pcp_integration`: usuario do `n8n`

## Checklist da VM `data`

- Postgres ativo
- banco `inplast` criado
- schema aplicado com `database/pcp_operacional_postgres.sql`
- usuario `pcp_app` criado
- usuario `pcp_integration` criado
- `pg_hba.conf` liberando a VM `apps`
- firewall permitindo somente origem da VM `apps`

## Checklist da VM `apps`

- `n8n` ativo
- SaaS ativo
- variaveis de ambiente configuradas
- driver `psycopg` ou `psycopg2` instalado no ambiente do backend
- teste de conexao com a VM `data`
- hostname interno da VM `data` resolvendo corretamente

## Ordem de implantacao recomendada

1. aplicar o schema do PCP no Postgres da VM `data`
2. criar usuarios e permissoes separados
3. validar conexao da VM `apps` para a VM `data`
4. ligar o backend do modulo PCP em modo `postgres`
5. manter o `n8n` alimentando o mesmo banco
6. trocar o painel final para o SaaS

## Proximo passo tecnico

Com essa topologia confirmada, o caminho mais seguro agora e:

1. aplicar o SQL de permissoes em `database/pcp_postgres_roles_permissions.sql`
2. seguir o checklist da VM `apps` em `docs/pcp_vm_apps_checklist.md`
3. ligar as fontes de previsao operacional conforme `docs/pcp_contrato_fontes_previsao.md`
4. testar o backend do modulo diretamente contra a VM `data`

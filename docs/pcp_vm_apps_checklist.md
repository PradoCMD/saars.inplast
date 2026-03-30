# Checklist da VM `apps` para o modulo PCP

Data: 2026-03-30

## 1. Rede e resolucao

- confirmar que a VM `apps` resolve o hostname da VM `data`
- confirmar que a VM `apps` alcança a porta `5432` da VM `data`
- confirmar que o firewall da VM `data` aceita conexao somente da VM `apps`

Comandos uteis:

```bash
getent hosts 192.168.25.251 || true
nc -vz 192.168.25.251 5432
```

## 2. Segredos e usuarios

- configurar `pcp_app` para leitura
- configurar `pcp_integration` para ingestao e `run_mrp`
- guardar credenciais no gerenciador de segredos da VM `apps`
- nao reutilizar usuario do SaaS para o `n8n`

## 3. Variaveis de ambiente do modulo PCP

Para o backend do modulo:

```bash
PCP_HOST=0.0.0.0
PCP_PORT=8765
PCP_DATA_MODE=postgres
PCP_DATABASE_URL=postgresql://pcp_app:senha@192.168.25.251:5432/inplast
PCP_ACTIONS_DATABASE_URL=postgresql://pcp_integration:senha@192.168.25.251:5432/inplast
```

Para o `n8n`:

- usar `pcp_integration` nas credenciais do Postgres

## 4. Cliente e driver do Postgres

### Se for usar o backend de referencia em Python

- instalar `python3`
- instalar `psycopg` ou `psycopg2`

Exemplo:

```bash
python3 -m pip install "psycopg[binary]"
```

### Se o SaaS real usar outra stack

- instalar o driver proprio da stack
- manter a mesma separacao de credencial:
  - leitura: `pcp_app`
  - acoes/escrita: `pcp_integration`

## 5. Testes de banco antes de subir a aplicacao

Se `psql` estiver disponivel:

```bash
psql "postgresql://pcp_app:senha@192.168.25.251:5432/inplast" -c "select current_user, current_database();"
psql "postgresql://pcp_app:senha@192.168.25.251:5432/inplast" -c "select * from mart.vw_romaneio_eta_current limit 5;"
psql "postgresql://pcp_integration:senha@192.168.25.251:5432/inplast" -c "select mart.run_mrp();"
```

## 6. Subida do modulo PCP

No prototipo de referencia:

```bash
cd "/caminho/do/repositorio/saars.inplast"
PCP_DATA_MODE=postgres \
PCP_DATABASE_URL='postgresql://pcp_app:senha@192.168.25.251:5432/inplast' \
PCP_ACTIONS_DATABASE_URL='postgresql://pcp_integration:senha@192.168.25.251:5432/inplast' \
python3 server.py
```

## 7. Smoke test HTTP

Depois de subir o backend:

```bash
curl -s http://127.0.0.1:8765/api/pcp/overview
curl -s http://127.0.0.1:8765/api/pcp/romaneios
curl -s http://127.0.0.1:8765/api/pcp/sources
curl -s -X POST http://127.0.0.1:8765/api/pcp/runs/mrp
```

## 8. Checklist do `n8n`

- credencial Postgres apontando para `pcp_integration`
- fluxo de almoxarifado funcionando
- webhook do Sankhya em modo ativo ou sombra
- rotinas de parser acessando os caminhos corretos
- erro de ingestao gerando alerta

## 9. Checklist funcional do MVP

- cockpit abre sem erro
- lista de romaneios mostra `previsao_saida_at`
- romaneios sem previsão aparecem com status `sem_previsao`
- montagem, producao e compras retornam dados
- fontes e alertas retornam dados

## 10. Bloqueios mais comuns

- DNS da VM `data` nao resolve
- porta `5432` fechada
- `psycopg` ausente
- schema do PCP nao aplicado na VM `data`
- credencial `pcp_app` sem permissao de leitura
- credencial `pcp_integration` sem permissao de executar `mart.run_mrp()`

---
tags: [backend, n8n, webhook, almoxarifado, integracao]
relacionado: [[Sincronização de Fontes]], [[Romaneios]], [[Scripts Google Sheets]], [[Docker e Deploy]]
status: ativo
tipo: feature
versao: 1.0.0
---

# Integração n8n

Workflows de automação para webhook de romaneios e integração com almoxarifado via n8n. Múltiplas versões de workflow documentam a evolução da solução.

## Como funciona

O n8n atua como orquestrador de integrações:
- **Webhook de romaneios:** recebe eventos externos e dispara `POST /api/pcp/romaneios/refresh`
- **Almoxarifado:** automatiza extração e atualização de movimentos de estoque
- **Planilhas:** workflows para atualizar Google Sheets com dados dos pedidos transportadoras
- **Rotas por fonte (`target_source`)**: integrações podem ser filtradas por `source_code` para disparo seletivo em `POST /api/pcp/sources/sync`

Os workflows são importados via interface do n8n a partir dos arquivos JSON.

## Arquivos principais

- `scripts/n8n_workflow_final_V2.json` — workflow final de romaneios
- `scripts/n8n_workflow_romaneios.json` — workflow específico romaneios
- `scripts/n8n_workflow_nativo_v3_logica_certa.json` — versão nativa com lógica correta
- `n8n/` — workflows adicionais de webhook e almoxarifado
- `docs/` — documentação de deploy e integração com n8n

## Integrações

Este módulo se conecta com:
- [[Romaneios]]
- [[Sincronização de Fontes]]
- [[Scripts Google Sheets]]
- [[Docker e Deploy]]

## Configuração

O n8n é parte da topologia `apps` (junto com o saas):
- `docker-compose.coolify.yaml` — inclui configuração de webhook

Variáveis necessárias no n8n:
- URL do servidor PCP
- Credenciais Google (service account)

## Observações importantes

- Múltiplas versões de workflow (`v2`, `v3`, `nativo`, `service_account`) documentam iterações de solução de rate limiting e autenticação
- Versão recomendada: `n8n_workflow_final_V2.json` ou `n8n_workflow_nativo_v3_logica_certa.json`
- A versão com `python_logic` executa scripts Python via Code Node do n8n
- Rate limit do Google Sheets API (429) é mitigado com configuração "Execute Once" nos nodes nativos
- Tipos de integração aceitos na governança para sync operacional: `n8n_webhook_romaneios` e `n8n_webhook_stock`

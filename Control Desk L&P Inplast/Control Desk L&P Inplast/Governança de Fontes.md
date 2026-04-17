---
tags: [frontend, react, governanca, fontes, integracao, status]
relacionado: [[Sincronização de Fontes]], [[Cockpit]], [[Servidor HTTP]]
status: ativo
tipo: componente
versao: 1.0.0
---

# Governança de Fontes

Tela de monitoramento e controle das fontes de dados do módulo PCP. Exibe o estado de saúde, frescor e histórico de sync de cada fonte por empresa.

## Como funciona

`web-react/src/pages/SourcesGovernance.jsx` (23 KB) exibe:

- Status de cada fonte: `healthy`, `stale`, `partial`, `error`
- Timestamp da última sincronização válida por fonte
- Botão de disparo manual de sync (requer `sources.sync`)
- Erro estruturado da última falha com `source_code` e `detail`
- Filtro por empresa e tipo de fonte

## Arquivos principais

- `web-react/src/pages/SourcesGovernance.jsx` — componente principal
- `data/sources.json` — seed de demonstração de fontes

## Integrações

Este módulo se conecta com:
- [[Sincronização de Fontes]]
- [[Cockpit]]
- [[Servidor HTTP]]

## Configuração

Endpoints consumidos:
- `GET /api/pcp/sources`
- `POST /api/pcp/sources/sync` — requer `sources.sync`

## Observações importantes

- Fonte em `stale` mostra o último snapshot com aviso claro de desatualização
- Disparo de sync pode retornar status `partial` — a UI deve distinguir de `success` e `error`
- Permissão `sources.sync` é restrita ao perfil `integracao_pcp`

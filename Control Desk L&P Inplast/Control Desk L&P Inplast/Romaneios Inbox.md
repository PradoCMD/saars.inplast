---
tags: [frontend, react, romaneio, inbox, listagem]
relacionado: [[Romaneios]], [[Kanban Board]], [[Kanban Logístico]], [[Servidor HTTP]]
status: ativo
tipo: componente
versao: 1.0.0
---

# Romaneios Inbox

Tela de listagem e consulta de romaneios consolidados. Exibe a fila operacional com filtros por empresa, criticidade e texto.

## Como funciona

`web-react/src/pages/RomaneiosInbox.jsx` (39 KB — maior componente do frontend) exibe:

- Lista de romaneios com prioridade, previsão de saída, status e empresa
- Upload de novos PDFs diretamente pela interface
- Detalhe consolidado por romaneio: itens, pedidos, origem documental
- Indicação clara se a previsão é automática, manual ou ausente
- Filtros: empresa, criticidade, texto livre

Fluxo de upload na tela:
1. Usuário seleciona PDFs
2. Fila local temporária (rascunho no browser) antes da ingestão
3. `POST /api/pcp/romaneios/upload` envia para o backend
4. Lista é atualizada com o consolidado resultante

## Arquivos principais

- `web-react/src/pages/RomaneiosInbox.jsx` — componente completo
- `web-react/src/pages/RomaneiosInbox.css` — estilos específicos

## Integrações

Este módulo se conecta com:
- [[Romaneios]]
- [[Kanban Board]]
- [[Kanban Logístico]]
- [[Servidor HTTP]]

## Configuração

Endpoints consumidos:
- `GET /api/pcp/romaneios`
- `GET /api/pcp/romaneios/{romaneioCode}`
- `POST /api/pcp/romaneios/upload`
- `POST /api/pcp/romaneios/delete`

## Observações importantes

- Romaneio sem previsão é destacado sem quebrar a ordenação geral
- Romaneio sem item consolidado válido cai em fila de exceção ou alerta
- Filtro com retorno vazio mostra empty state explicativo
- A fila local do browser é apenas rascunho temporário — nunca fonte oficial
- Estado `stale_data` deve ser visível com aviso de última sincronização válida

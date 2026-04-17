---
tags: [backend, mrp, planejamento, producao]
relacionado: [[Servidor HTTP]], [[Sincronização de Fontes]], [[Estruturas e BOM]], [[Programação de Produção]], [[Cockpit]]
status: ativo
tipo: feature
versao: 1.0.0
---

# MRP

Material Requirements Planning — ação oficial do módulo PCP que calcula o cenário operacional vigente com base em estoque atual, previsões, programações e estruturas de produto.

## Como funciona

O MRP é disparado via `POST /api/pcp/runs/mrp` apenas por perfis com permissão `mrp.run`. A execução:

1. Cria `run_id` único e registra `status`, timestamps e trilha de execução
2. Carrega estoque atual, previsões, programações manuais e estrutura vigente
3. Respeita **overrides manuais ativos** durante o recálculo
4. Atualiza o cenário oficial apenas quando a execução atingiu estado válido
5. Publica resultado, alertas e impactos por empresa e consolidado

Política de consumo:
- Consome primeiro estoque atual
- Depois consome previsões e programações por `available_at`
- A saída do romaneio é a maior data necessária para fechar seus itens

## Arquivos principais

- `server.py` — handler `POST /api/pcp/runs/mrp`
- `backend/provider.py` — execução e publicação do cenário MRP
- `docs/pcp_contrato_fontes_previsao.md` — contrato de fontes usadas pelo MRP
- `data/overview.json` — snapshot de demonstração pós-MRP

## Integrações

Este módulo se conecta com:
- [[Sincronização de Fontes]]
- [[Estruturas e BOM]]
- [[Programação de Produção]]
- [[Romaneios]]
- [[Cockpit]]
- [[Banco de Dados Postgres]]

## Configuração

Endpoints:
- `POST /api/pcp/runs/mrp` — dispara execução (requer `mrp.run`)
- `GET /api/pcp/overview` — lê cenário operacional vigente

Permissão obrigatória: `mrp.run` (restrito a `gestao_pcp`)

## Observações importantes

- Dois disparos simultâneos de MRP devem ser serializados ou rejeitados com **409**
- Execução sem fontes mínimas válidas falha de forma controlada
- Timeout de processamento encerra a rodada com status claro — não publica cenário incompleto
- Run concluída com dados parciais é marcada como `partial`, não `success`
- Falha de execução preserva o cenário anterior e registra erro estruturado
- Perfis sem `mrp.run` recebem 403

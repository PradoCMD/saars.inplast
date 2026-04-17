---
tags: [backend, logistica, kanban, fila, prioridade]
relacionado: [[Romaneios]], [[Kanban Board]], [[MRP]], [[Banco de Dados Postgres]]
status: ativo
tipo: feature
versao: 1.0.0
---

# Kanban Logístico

Camada de negócio da fila operacional de romaneios. Gerencia prioridade, previsão de saída e overrides manuais com regras de precedência e auditoria.

## Como funciona

O kanban logístico é o estado operacional vigente da fila de romaneios. Regras:

**Prioridade padrão:** ordenada por `data_evento` e `romaneio_code` — sem override manual.

**Override manual:** `rank` menor = maior prioridade. Enquanto ativo, prevalece sobre qualquer cálculo automático. Recalcula ETAs e gargalos a jusante.

**Previsão de saída:** calculada automaticamente com base em estoque + programação. Se existir override manual de data, ele prevalece.

**Persistência:**
- Modo mock: `backend/kanban_db.json`
- Modo postgres: tabela no banco dedicado

## Arquivos principais

- `backend/provider.py` — lógica de kanban, merge, overrides
- `backend/kanban_db.json` — estado kanban em modo mock
- `docs/pcp_prioridade_romaneios.md` — contrato de prioridade
- `server.py` — endpoints kanban

## Integrações

Este módulo se conecta com:
- [[Romaneios]]
- [[Kanban Board]]
- [[MRP]]
- [[Banco de Dados Postgres]]
- [[Apontamento de Produção]]

## Configuração

Endpoints:
- `GET /api/pcp/romaneios-kanban`
- `POST /api/pcp/romaneios-kanban/update-date` — requer `romaneios.write`
- `POST /api/pcp/romaneios-kanban/sync`

## Observações importantes

- Mudança manual na fila deve recalcular ETAs e dependências a jusante
- Falha no recalc não pode apagar o override salvo — sistema sinaliza estado inconsistente até nova rodada
- Toda sobrescrita concorrente gera histórico e aviso na interface
- A UI explica quando a previsão é automática vs manual vs ausente

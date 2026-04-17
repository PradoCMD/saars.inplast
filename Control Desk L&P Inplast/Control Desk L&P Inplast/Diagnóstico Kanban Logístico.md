---
tags: [diagnostico, kanban, logistica, pcp, fontes, estoque]
relacionado: [[Kanban Logístico]], [[Kanban Board]], [[Sincronização de Fontes]], [[Romaneios]], [[Configuração de Ambiente]]
status: ativo
tipo: decisão
versao: 1.0.0
---

# Diagnóstico Kanban Logístico

Levantamento do estado atual e plano de ação para entregar o módulo de Kanban Logístico operacional, integrado ao Sankhya e às fontes reais de estoque.

## Como funciona

### O que realmente estamos construindo

Módulo de gestão logística e PCP integrado ao ERP Sankhya:

```
Sankhya ERP
  └─ Gera Romaneio (Ordem de Carga)
       └─ Contém N Pedidos (números Mercur)
            └─ Cada pedido tem produtos + quantidades
                 └─ PCP precisa saber:
                      ├─ Estoque atual de cada produto
                      ├─ Necessidade de produção (demanda − estoque)
                      └─ Estoque após saída do romaneio
```

A tela principal é um Kanban onde:
- Colunas = datas reais de saída prevista (geradas dinamicamente)
- Coluna "SEM DATA" = vermelho, sempre visível à esquerda
- Cada card = um Romaneio com pedidos Mercur + análise de estoque por produto

## Arquivos principais

- `web-react/src/pages/KanbanBoard.jsx` — componente a ser redesenhado
- `backend/source_sync.py` — orquestrador de sync (com bug nas URLs)
- `backend/config.py` — leitura das variáveis de ambiente
- `.env` — URLs das fontes de estoque (configuradas incorretamente)
- `data/romaneios.json` — seed atual (insuficiente para validação)

## Integrações

Este módulo se conecta com:
- [[Kanban Logístico]]
- [[Romaneios]]
- [[Sincronização de Fontes]]
- [[Configuração de Ambiente]]
- [[Servidor HTTP]]

## Configuração

### Problema 1 — URLs das planilhas de estoque (quebrado)

As URLs no `.env` estão no formato `pubhtml` (HTML de visualização), mas os parsers precisam de exportação `xlsx`.

```bash
# QUEBRADO — formato pubhtml com parâmetros extras que invalidam a conversão:
PCP_ACABADO_PUBLISHED_URL=https://docs.google.com/.../pubhtml?widget=true&headers=false

# CORRETO — formato de exportação direta:
PCP_ACABADO_PUBLISHED_URL=https://docs.google.com/.../pub?output=xlsx
```

A função `normalize_google_sheets_url()` em `backend/source_sync.py` converte `/pubhtml` → `/pub?output=xlsx` corretamente, mas não remove os parâmetros `?widget=true&headers=false` que ficam acoplados, tornando a URL inválida para download.

**Correção necessária:** Limpar query string antes da normalização.

### Problema 2 — Modelo de dados do card incompleto

O card atual não contém `pedidos_mercur` nem dados de estoque por produto. O schema de `data/romaneios.json` precisa ser estendido:

```json
{
  "romaneio": "RM-2024-001",
  "empresa": "INPLAST",
  "pedidos_mercur": ["PED-12345", "PED-12346"],
  "previsao_saida_at": null,
  "quantidade_total": 5420,
  "items": [
    {
      "sku": "ACB-41002",
      "produto": "Porta escova slim 2 divisorias",
      "quantidade_demanda": 3240,
      "estoque_atual": 820,
      "necessidade_producao": 2420,
      "estoque_apos_saida": 0
    }
  ]
}
```

### Problema 3 — Colunas fixas no Kanban

O `KanbanBoard.jsx` usa 4 grupos fixos (`missing`, `today`, `upcoming`, `scheduled`). Devem ser substituídos por colunas geradas dinamicamente a partir das datas nos romaneios.

## Observações importantes

### Sequência de execução

```
Etapa 1  Corrigir normalize_google_sheets_url() — strip dos query params antes da conversão
Etapa 2  Enriquecer seed de dados com pedidos + produtos + estoque real por romaneio
Etapa 3  Redesenhar KanbanBoard — colunas dinâmicas por data + coluna SEM DATA vermelha
Etapa 4  Redesenhar card — pedidos Mercur + tabela produto/estoque/necessidade
Etapa 5  Backend — enriquecer GET /api/pcp/romaneios-kanban com pedidos e dados de stock
Etapa 6  Integração Sankhya (Fase 2 — após kanban estável)
```

### Perguntas em aberto (aguardando resposta do cliente)

1. **Planilha de modelo** — qual é a estrutura exata dos campos de estoque e cálculo de necessidade?
2. **"Pedidos Mercur"** — é o sistema do cliente final ou o nome interno dos pedidos no Sankhya? Os números já vêm dentro da Ordem de Carga?
3. **URLs corretas** — gerar link `pub?output=xlsx` das planilhas de estoque acabado e intermediário
4. **Sankhya** — credenciais disponíveis? Webhook ou polling? Qual endpoint retorna as Ordens de Carga?
5. **Cálculo de estoque após saída** — só estoque atual ou inclui produção prevista?

### Redesign do card (protótipo)

```
┌─────────────────────────────────────────┐
│  RM-2024-001                  INPLAST   │
│  PED-12345 · PED-12346 · PED-12347     │
├─────────────────────────────────────────┤
│  ACB-41002  Porta escova slim           │
│  Demanda: 3.240  │  Estoque: 820        │
│  ⚠ Produzir: 2.420  │  Após saída: 0   │
│                                         │
│  ACB-99010  Organizador M               │
│  Demanda: 1.000  │  Estoque: 1.500      │
│  ✅ OK  │  Após saída: 500              │
├─────────────────────────────────────────┤
│  Total: 5.420 un     📅 Sem previsão    │
│            [Definir data de saída]      │
└─────────────────────────────────────────┘
```

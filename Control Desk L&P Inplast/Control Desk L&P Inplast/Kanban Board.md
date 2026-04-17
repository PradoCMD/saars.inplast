---
tags: [frontend, react, kanban, logistica, romaneio, estoque, pcp]
relacionado: [[Romaneios]], [[Sincronização de Fontes]], [[Kanban Logístico]], [[Configuração de Ambiente]]
status: ativo
tipo: componente
versao: 2.0.0
---

# Kanban Board

Tela principal de gestão logística do PCP. Exibe os romaneios (ordens de carga) em colunas organizadas por data de saída prevista, com coluna vermelha para itens sem programação.

## Como funciona

**`web-react/src/pages/KanbanBoard.jsx`** — redesenhado na v2.0.0.

### Estrutura de colunas (dinâmica)

- **Coluna SEM PROGRAMAÇÃO** — sempre à esquerda, fundo vermelho, exige atenção do PCP
- **Colunas por data** — geradas automaticamente a partir das datas nos romaneios (`previsao_saida_at`), ordenadas cronologicamente
- Não há colunas hardcoded — se não houver romaneio para uma data, a coluna não aparece

### Conteúdo de cada card

1. Número do Romaneio + Empresa
2. **Pedidos Mercur** — chips com os números de pedido (`#42620`, `#42621`)
3. Parceiro (cliente) + Cidade de destino
4. **Tabela de produtos** — por SKU: demanda, estoque atual, necessidade de produção, estoque após saída
5. Total de unidades + valor
6. Editor de data de saída (PCP) — apenas para `gestao_pcp`

### Lógica de cálculo por produto

```
necessidade_producao = max(0, quantidade_demanda − estoque_atual)
estoque_apos_saida   = estoque_atual − quantidade_demanda  (pode ser negativo)
```

Produto marcado como ✅ quando `necessidade_producao = 0`.
Produto marcado como ⚠ quando há produção pendente.

### Banner global de alerta

Se existir qualquer romaneio sem programação, exibe banner vermelho no topo:
`"N romaneios precisam de programação"`

## Arquivos principais

- `web-react/src/pages/KanbanBoard.jsx` — componente (v2.0.0)
- `web-react/src/index.css` — estilos do kanban (bloco "KANBAN LOGÍSTICO v2")
- `data/romaneios.json` — seed de dados (modo mock)
- `data/romaneio_*.json` — detalhes por romaneio individual

## Integrações

Este módulo se conecta com:
- [[Kanban Logístico]]
- [[Romaneios]]
- [[Sincronização de Fontes]]
- [[Autenticação e RBAC]]

## Configuração

Endpoint consumido:
```
GET /api/pcp/romaneios-kanban?company_code=INPLAST
```

Resposta esperada:
```json
{
  "romaneios": [
    {
      "romaneio": "598",
      "empresa": "INPLAST",
      "pedidos_mercur": ["42620", "42621"],
      "parceiro": "THIBRUMA SERVICOS ADMINISTRATIVO",
      "cidade": "CANAÃ DOS CARAJÁS",
      "quantidade_total": 310,
      "valor_total": 7723.31,
      "previsao_saida_at": null,
      "previsao_saida_status": "sem_previsao",
      "items": [
        {
          "sku": "4300001",
          "produto": "MANGUEIRA LISA 1 25MM C 100M",
          "quantidade_demanda": 150,
          "estoque_atual": 80,
          "necessidade_producao": 70,
          "estoque_apos_saida": -70
        }
      ]
    }
  ]
}
```

Para salvar data de saída:
```
POST /api/pcp/romaneios-kanban/update-date
{ romaneio, empresa, company_code, previsao_saida_at, reason }
```
Requer permissão `romaneios.write`.

## Observações importantes

- **Pedidos Mercur** vêm do Sankhya dentro da Ordem de Carga — são os pedidos da plataforma Mercur já integrada ao ERP
- `previsao_saida_at` = `null` → romaneio vai para a coluna SEM PROGRAMAÇÃO (vermelha)
- O estoque (`estoque_atual`) é preenchido pelo sync das fontes Google Sheets — sem sync, mostra `0`
- v2.0.0 removeu colunas fixas (Hoje / Próximos / Programados) — agora são datas reais
- Permissão `canManageDates` = `true` apenas para perfil `gestao_pcp`

---
tags: [backend, planejamento, programacao, manual, producao]
relacionado: [[Centro de Programação]], [[MRP]], [[Estruturas e BOM]], [[Banco de Dados Postgres]]
status: ativo
tipo: feature
versao: 1.0.0
---

# Programação de Produção

Camada de planejamento manual da produção. Permite inserir entradas de programação que complementam e sobrepõem os cálculos automáticos do MRP.

## Como funciona

O planejador de PCP insere entradas que definem:
- Produto/intermediário a ser produzido
- Quantidade planejada
- Data de disponibilidade esperada

Estas entradas são usadas pelo MRP como entrada de planejamento, junto com estoque atual e estrutura vigente.

**Regra de precedência:** Se existir ajuste manual ativo, ele prevalece sobre o cálculo automático e dispara recálculo dos impactos no restante da operação.

## Arquivos principais

- `server.py` — handler `POST /api/pcp/programming-entries`
- `backend/provider.py` — lógica de programação manual
- `docs/pcp_estruturas_programacao.md` — contrato técnico
- `data/` — seed de programação para modo mock

## Integrações

Este módulo se conecta com:
- [[Centro de Programação]]
- [[MRP]]
- [[Estruturas e BOM]]
- [[Banco de Dados Postgres]]

## Configuração

Endpoints:
- `GET /api/pcp/programming` — requer `programming.read`
- `POST /api/pcp/programming-entries` — requer `programming.write`

## Observações importantes

- Toda entrada manual é auditada obrigatoriamente
- Override manual recalcula impactos a jusante no MRP
- A UI deve diferenciar claramente programação automática de manual

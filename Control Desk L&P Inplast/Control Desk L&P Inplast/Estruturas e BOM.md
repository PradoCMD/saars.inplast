---
tags: [backend, database, bom, estrutura, producao]
relacionado: [[MRP]], [[Programação de Produção]], [[Parsers de Estoque]], [[Servidor HTTP]]
status: ativo
tipo: feature
versao: 1.0.0
---

# Estruturas e BOM

Bill of Materials (BOM) operacional do módulo PCP. Mantém a estrutura base homologada separada dos overrides operacionais aplicados pelo PCP.

## Como funciona

O fluxo de estruturas tem duas camadas:

1. **Estrutura base homologada:** importada do Sankhya via parser. É a referência oficial de componentes, quantidades e sequências de produção.

2. **Override do PCP:** permite ao planejador ajustar campos operacionais sem alterar a estrutura homologada. Campos ajustáveis: `quantity_per`, `scrap_pct`, `sequence_no`, `process_stage`, `component_role`, bloqueios.

O MRP sempre usa a **estrutura vigente** — que é a base homologada com os overrides ativos aplicados.

## Arquivos principais

- `parsers/parse_bom_estrutura_padrao.py` — parser da estrutura base
- `parsers/run_bom_parser.py` — script de execução do parser
- `docs/pcp_estruturas_programacao.md` — contrato técnico de estruturas
- `server.py` — endpoints de estruturas
- `data/` — seeds de estrutura para modo mock

## Integrações

Este módulo se conecta com:
- [[MRP]]
- [[Programação de Produção]]
- [[Parsers de Estoque]]
- [[Sincronização de Fontes]]
- [[Banco de Dados Postgres]]

## Configuração

Endpoints:
- `GET /api/pcp/structures` — lê estrutura vigente (base + overrides)
- `POST /api/pcp/structure-overrides` — aplica override operacional (requer `structures.write`)

## Observações importantes

- A estrutura base homologada e a camada de override são mantidas **separadas** no banco
- Overrides devem ser auditados obrigatoriamente
- BOM sem override usa 100% a estrutura homologada
- Estrutura com componente bloqueado impede execução do MRP para aquele produto

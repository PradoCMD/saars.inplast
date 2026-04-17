---
tags: [backend, multiempresa, contexto, inplast, recicla, upe]
relacionado: [[Autenticação e RBAC]], [[Servidor HTTP]], [[Banco de Dados Postgres]], [[Cockpit]]
status: ativo
tipo: arquitetura
versao: 1.0.0
---

# Contexto Multiempresa

Suporte a múltiplas empresas (Inplast, Recicla, UPE Metal) no mesmo ambiente, com visão consolidada do grupo e filtros por empresa individual.

## Como funciona

Toda entidade operacional relevante carrega `company_code`. A camada de leitura permite:
- **Visão isolada:** dados de uma empresa específica
- **Visão consolidada:** dados de todo o grupo (requer permissão adequada)

O `company_code` é validado em toda operação de leitura e escrita. Permissões do usuário determinam quais empresas e quais modos de visão estão disponíveis.

**Estado atual:** Suporte parcialmente implementado. Parte das leituras já aceita `company_code`, mas não cobre o módulo inteiro nem a matriz de permissão completa. Formalização total é Sprint 1.

## Arquivos principais

- `server.py` — validação de `company_code` nas rotas
- `backend/provider.py` — filtros por empresa nas queries
- `backend/config.py` — configuração de empresas permitidas
- `database/pcp_operacional_postgres.sql` — campo `company_code` nas tabelas

## Integrações

Este módulo se conecta com:
- [[Autenticação e RBAC]]
- [[Servidor HTTP]]
- [[Banco de Dados Postgres]]
- [[Cockpit]]
- [[MRP]]

## Configuração

Empresas do grupo:
- `INPLAST` — empresa principal
- `RECICLA` — reciclagem
- `UPE` — UPE Metal

Endpoints que aceitam `company_code` (query param ou body):
- `GET /api/pcp/overview`, `GET /api/pcp/painel`
- `GET /api/pcp/romaneios`, `GET /api/pcp/assembly`
- `GET /api/pcp/production`, `GET /api/pcp/purchases`
- `GET /api/pcp/sources`, `GET /api/pcp/alerts`

## Observações importantes

- `company_code` inexistente retorna 404 ou 422 conforme o caso
- Usuário sem permissão de consolidado não enxerga o grupo inteiro
- Entidade sem `company_code` não pode ser promovida a estado oficial
- A UI sempre deve exibir empresa ativa ou modo consolidado de forma explícita
- Mudança de empresa durante edição deve avisar risco de sobrescrita fora de contexto

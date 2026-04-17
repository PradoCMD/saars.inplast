---
tags: [backend, auth, rbac, segurança, sessão]
relacionado: [[Servidor HTTP]], [[Provider e Modos de Operação]], [[Banco de Dados Postgres]], [[Contexto Multiempresa]]
status: ativo
tipo: feature
versao: 1.0.0
---

# Autenticação e RBAC

Sistema de autenticação e controle de acesso por perfil. Toda rota operacional exige credencial válida. Permissões são granulares por área e ação.

## Como funciona

O login é feito via `POST /api/pcp/auth/login` com usuário e senha. O sistema valida a credencial, cria uma sessão ou token e associa as permissões do perfil ao contexto da requisição.

Cada requisição protegida verifica:
1. Presença e validade do token/sessão → 401 se inválido ou expirado
2. Permissão para a operação → 403 se insuficiente
3. Escopo de empresa do usuário → filtra dados conforme company_code permitido

**Estado atual:** Existe `POST /api/pcp/auth/login` com validação por usuário/senha e sessão em cookie HTTP-only (`pcp_session`). A autorização aplica permissões por role e, quando configurado no usuário, também por matriz modular (`permissions`) persistida em `meta_json`.

## Arquivos principais

- `server.py` — handler da rota `/api/pcp/auth/login`
- `backend/provider.py` — validação de credenciais e gestão de usuários
- `database/pcp_operacional_postgres.sql` — tabelas `users` e permissões
- `database/pcp_postgres_roles_permissions.sql` — roles do Postgres (`pcp_app`, `pcp_integration`)

## Integrações

Este módulo se conecta com:
- [[Servidor HTTP]]
- [[Banco de Dados Postgres]]
- [[Contexto Multiempresa]]
- [[Governança do Sistema]]

## Configuração

Roles do sistema previstos:
- `leitura_pcp` — acesso de leitura geral
- `operacao_pcp` — pode registrar apontamentos e ajustes
- `gestao_pcp` — pode rodar MRP, deletar romaneios, gerenciar usuários
- `integracao_pcp` — acesso a sync de fontes e integrações

Unidades de permissão (RBAC granular):
```
cockpit.read, romaneios.read/write/ingest/delete,
mrp.run, sources.read/sync, structures.read/write,
programming.read/write, apontamento.read/write/dispatch,
users.manage, integrations.manage, stock_movements.manage
```

## Observações importantes

- Senha inválida deve retornar 401 **sem revelar** se o usuário existe
- Tentativas repetidas de login devem disparar rate limit e bloqueio temporário
- O bootstrap de usuário root com senha fixa (mock) NÃO deve existir em produção
- Toda operação manual deve registrar `changed_by_user_id` e `changed_by_username` na trilha de auditoria
- Troca de permissão em usuário logado reflete no próximo request
- Endpoints de governança de usuários ativos:
  - `POST /api/pcp/users/save`
  - `POST /api/pcp/users/delete`

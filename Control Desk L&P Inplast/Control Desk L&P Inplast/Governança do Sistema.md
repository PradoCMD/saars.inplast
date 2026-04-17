---
tags: [frontend, react, governanca, usuarios, integracoes, admin]
relacionado: [[Autenticação e RBAC]], [[Movimentos de Estoque]], [[Sincronização de Fontes]], [[Servidor HTTP]]
status: ativo
tipo: componente
versao: 1.0.0
---

# Governança do Sistema

Tela administrativa para gestão de usuários, integrações, configurações do sistema e movimentos de estoque do almoxarifado.

## Como funciona

`web-react/src/pages/SystemGovernance.jsx` (13 KB) concentra:

- Gestão de usuários: criar, editar e excluir usuários não-root (requer `users.manage`)
- Gestão de integrações: configurar fontes, credenciais, URLs (requer `integrations.manage`)
- Gestão de webhooks com `target_source` para rotear integrações por fonte de estoque
- Regras de produção: configurações operacionais do módulo
- Acesso restrito a perfis `gestao_pcp`

## Arquivos principais

- `web-react/src/pages/SystemGovernance.jsx` — componente administrativo

## Integrações

Este módulo se conecta com:
- [[Autenticação e RBAC]]
- [[Movimentos de Estoque]]
- [[Sincronização de Fontes]]
- [[Servidor HTTP]]

## Configuração

Endpoints consumidos:
- `GET /api/pcp/users`
- `POST /api/pcp/users/save` — requer `users.manage`
- `POST /api/pcp/users/delete` — requer `users.manage`
- `GET /api/pcp/integrations`
- `POST /api/pcp/integrations/save` — requer `integrations.manage`
- `POST /api/pcp/integrations/delete` — requer `integrations.manage`
- `GET /api/pcp/production-rules`

## Observações importantes

- Toda alteração de usuário ou integração é auditada obrigatoriamente
- Usuário inativo não consegue autenticar mesmo que sessão exista
- Troca de permissão de usuário logado reflete no próximo request protegido
- Acesso a esta tela requer `users.manage` ou `integrations.manage`

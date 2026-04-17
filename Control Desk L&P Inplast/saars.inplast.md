---
tags: [moc, pcp, saas, inplast]
status: ativo
tipo: arquitetura
versao: 1.0.0
---

# saars.inplast — Map of Content

> Módulo PCP SaaS da Inplast. Consolida planejamento, romaneios, MRP, apontamento e governança multiempresa (Inplast, Recicla, UPE Metal).

---

## 🗂 Módulos do Sistema

### Backend
- [[Servidor HTTP]] — `server.py`, roteamento principal, todos os endpoints `/api/pcp/*`
- [[Provider e Modos de Operação]] — camada mock/postgres, `backend/provider.py`
- [[Autenticação e RBAC]] — login, sessão, permissões por área e ação
- [[Banco de Dados Postgres]] — schema operacional, roles, views, funções SQL
- [[Contexto Multiempresa]] — Inplast, Recicla, UPE Metal no mesmo ambiente

### Integrações
- [[Sincronização de Fontes]] — `backend/source_sync.py`, fontes reais de estoque
- [[Romaneios]] — ingestão PDF, sync payload, refresh webhook, consolidação
- [[Integração n8n]] — workflows de webhook e almoxarifado
- [[Scripts Google Sheets]] — atualização planilhas Sankhya → GSheets

### Planejamento Operacional
- [[MRP]] — execução, cenário vigente, overrides manuais
- [[Estruturas e BOM]] — estrutura base homologada, overrides PCP
- [[Programação de Produção]] — entradas manuais, quadros de planejamento
- [[Kanban Logístico]] — fila de romaneios, prioridade, previsão de saída

### Frontend (web-react)
- [[Cockpit]] — painel consolidado, alertas, indicadores
- [[Romaneios Inbox]] — lista, filtros, detalhe consolidado por ordem de carga
- [[Kanban Board]] — visualização da fila logística operacional
- [[Apontamento de Produção]] — registro operacional de produção
- [[Centro de Programação]] — planejamento e entradas manuais
- [[Rastreamento de Produção]] — `ProductionTracking.jsx`
- [[Simulador de Fábrica]] — `FactorySimulator.jsx`
- [[Governança de Fontes]] — status, frescor, sync por fonte
- [[Governança do Sistema]] — usuários, integrações, movimentos de estoque
- [[Movimentos de Estoque]] — entrada/saída almoxarifado

### Parsers e ETL
- [[Parsers de Estoque]] — BOM, estoque acabado, intermediário, almoxarifado
- [[Parser de Romaneio PDF]] — `backend/romaneio_pdf.py`, extração e normalização
- [[Parser Ledger]] — `parsers/published_ledger_parser.py`, `xlsx_ledger_parser.py`

### Infraestrutura e Deploy
- [[Docker e Deploy]] — Dockerfile, Compose, Coolify, GHCR
- [[Configuração de Ambiente]] — `.env`, variáveis de ambiente, modos de operação
- [[CI/CD]] — GitHub Actions, publicação de imagem GHCR

---

## 📐 Decisões de Arquitetura

| Tema | Decisão |
|------|---------|
| Fonte da verdade ERP | Sankhya é dono dos dados de origem; PCP é fonte oficial do estado operacional calculado |
| Multiempresa | Mesmo ambiente, filtros e visão consolidada por empresa |
| Override manual | Manual prevalece sobre automático e recalcula o restante |
| Falha de integração | Preservar último snapshot válido; sinalizar stale_data |
| Autenticação | Login obrigatório com RBAC por área e ação |
| Frontend oficial | `web-react/` é a UI alvo; `web/` é legado auxiliar |
| Concorrência | last_write_wins com trilha de auditoria obrigatória |

---

## 🚀 Sprints

- **Sprint 1** — Base operacional, segurança e contratos (API padronizada, Auth, RBAC, Multiempresa, UI oficial)
- **Sprint 2** — Fontes, governança, cockpit e MRP
- **Sprint 3** — Romaneios e kanban logístico
- **Sprint 4** — Estruturas, programação e planejamento operacional
- **Sprint 5** — Apontamento e rastreabilidade
- **Sprint 6** — Governança avançada e SLAs

---

## 📁 Estrutura de Pastas

```
saars.inplast/
├── server.py               ← servidor HTTP principal
├── backend/                ← provider, config, queries, integrações
├── web-react/              ← frontend oficial (Vite + React)
├── web/                    ← UI legacy (referência)
├── database/               ← schema Postgres e roles
├── parsers/                ← ETL estoque, BOM, ledger
├── scripts/                ← automação GSheets, deploy VM
├── data/                   ← mock JSON (seeds iniciais)
├── n8n/                    ← workflows webhook e almoxarifado
├── docs/                   ← guias operacionais e handoffs
└── docker/                 ← start-pcp.sh, postgres config
```

---

## 🔗 Links Externos

- Imagem Docker: `ghcr.io/pradocmd/saars-inplast:main`
- App rodando: `http://127.0.0.1:8765`
- Health check: `GET /health` | `GET /ready`

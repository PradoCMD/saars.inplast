# CLAUDE.md — saars.inplast PCP SaaS

> Arquivo de contexto operacional. Leia este arquivo inteiro antes de qualquer alteração no projeto.
> Atualizado em: 2026-04-17

---

## 🔗 Vault do Obsidian (Fonte de Verdade)

O vault com a documentação completa do projeto está em:

```
Caminho local: saars.inplast/Control Desk L&P Inplast/
MCP SSE:       http://localhost:22360/sse
```

**Antes de qualquer tarefa de desenvolvimento, consulte o vault.** Ele contém o estado atual
documentado de cada módulo, decisões de arquitetura, contratos de API e edge cases conhecidos.

---

## 📚 Mapa de Documentação por Tipo de Tarefa

Use a tabela abaixo para encontrar o arquivo certo no vault antes de começar.

| Tarefa | Arquivos do Vault a Consultar |
|--------|-------------------------------|
| Alterar rotas ou endpoints | `Servidor HTTP.md`, `Autenticação e RBAC.md` |
| Modificar lógica de dados | `Provider e Modos de Operação.md`, `Banco de Dados Postgres.md` |
| Trabalhar com romaneios | `Romaneios.md`, `Kanban Logístico.md`, `Parser de Romaneio PDF.md` |
| Alterar o MRP | `MRP.md`, `Estruturas e BOM.md`, `Programação de Produção.md`, `Sincronização de Fontes.md` |
| Modificar frontend | `Cockpit.md`, `Romaneios Inbox.md`, `Kanban Board.md`, `Apontamento de Produção.md`, `Centro de Programação.md` |
| Adicionar autenticação/permissão | `Autenticação e RBAC.md`, `Contexto Multiempresa.md` |
| Alterar parsers ou ETL | `Parsers de Estoque.md`, `Parser Ledger.md`, `Parser de Romaneio PDF.md` |
| Modificar scripts GSheets | `Scripts Google Sheets.md`, `Integração n8n.md` |
| Alterar deploy ou infra | `Docker e Deploy.md`, `CI-CD.md`, `Configuração de Ambiente.md` |
| Decisões de arquitetura | `saars.inplast.md` (MOC), `SPEC.json` (fonte da verdade técnica) |

---

## ⚙️ Protocolo Obrigatório

### Antes de qualquer alteração

1. **Leia o arquivo do vault correspondente** à área que você vai modificar (tabela acima)
2. **Verifique a `SPEC.json`** se a alteração envolve contratos de API, permissões ou regras de domínio
3. **Consulte o `.env.example`** antes de adicionar qualquer variável de ambiente nova
4. **Cheque o modo de operação ativo:** `PCP_DATA_MODE=mock` ou `postgres` — comportamentos diferentes

### Depois de qualquer alteração

1. **Atualize o arquivo `.md` correspondente no vault** (seção "Como funciona" e "Arquivos principais")
2. **Se criou nova feature, crie um novo `.md` no vault** seguindo o padrão abaixo
3. **Atualize o MOC** (`saars.inplast.md`) se adicionou ou removeu um módulo
4. **Registre no Active Context** (seção final deste arquivo) o que foi feito nesta sessão

---

## 📝 Padrão de Documentação no Vault

Todo arquivo novo no vault deve seguir este formato exato:

```markdown
---
tags: [categorias-relevantes]
relacionado: [[Arquivo Relacionado]], [[Outro Arquivo]]
status: ativo | em-revisão | depreciado
tipo: feature | decisão | arquitetura | endpoint | componente
versao: 1.0.0
---

# Nome do Módulo

Descrição clara do que faz e por que existe.

## Como funciona

Fluxo completo com referência aos módulos envolvidos.

## Arquivos principais

Lista dos arquivos de código relevantes.

## Integrações

Este módulo se conecta com:
- [[Módulo A]]
- [[Módulo B]]

## Configuração

Variáveis de ambiente, endpoints, flags.

## Observações importantes

Edge cases, limitações conhecidas, decisões não-óbvias.
```

**Regra:** Nome do arquivo em PascalCase com espaços. Ex: `Sistema de Pagamentos.md`

---

## 🏗️ Arquitetura Geral

### Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Python puro (sem framework), `server.py` |
| Frontend oficial | React + Vite (`web-react/`) — **única UI ativa** |
| Frontend legado | HTML/JS (`web/`) — referência apenas, não evoluir |
| Banco de dados | PostgreSQL dedicado (`inplast_pcp`) |
| ETL / Parsers | Python (`parsers/`, `backend/source_sync.py`) |
| Automação | n8n (workflows em `scripts/n8n_*.json`) |
| Containerização | Docker + Coolify |
| CI/CD | GitHub Actions → GHCR |

### Modos de Operação

```bash
PCP_DATA_MODE=mock      # lê data/*.json — para desenvolvimento local
PCP_DATA_MODE=postgres  # lê banco Postgres — para staging e produção
```

### Topologia de Deploy

```
pcp-saas    (porta 8765) ← serve API + web-react/dist
pcp-postgres (porta 55432) ← banco dedicado do módulo
```

### Empresas Suportadas

```
INPLAST | RECICLA | UPE
```
Toda entidade operacional deve carregar `company_code`. A API filtra por empresa conforme permissão do usuário.

### RBAC — Roles e Permissões

| Role | Acesso |
|------|--------|
| `leitura_pcp` | Leitura geral |
| `operacao_pcp` | Apontamentos e ajustes |
| `gestao_pcp` | MRP, delete romaneios, gestão de usuários |
| `integracao_pcp` | Sync de fontes e integrações |

---

## 🔌 Endpoints Principais

```
# Leitura
GET  /api/pcp/overview          → indicadores consolidados
GET  /api/pcp/painel            → painel operacional
GET  /api/pcp/romaneios         → lista de romaneios
GET  /api/pcp/romaneios/{code}  → detalhe por ordem de carga
GET  /api/pcp/romaneios-kanban  → fila kanban
GET  /api/pcp/assembly          → montagem
GET  /api/pcp/production        → produção
GET  /api/pcp/structures        → estruturas/BOM
GET  /api/pcp/programming       → quadro de programação
GET  /api/pcp/sources           → status das fontes
GET  /api/pcp/alerts            → alertas ativos
GET  /api/pcp/users             → usuários (requer users.manage)
GET  /api/pcp/integrations      → integrações configuradas
GET  /api/pcp/stock-movements   → movimentos de estoque
GET  /api/pcp/apontamento/logs  → histórico de apontamentos
GET  /health                    → liveness (sem auth)
GET  /ready                     → readiness (sem auth)

# Escrita / Ações
POST /api/pcp/auth/login
POST /api/pcp/runs/mrp                    ← mrp.run obrigatório
POST /api/pcp/sources/sync                ← sources.sync
POST /api/pcp/romaneios/upload            ← romaneios.ingest
POST /api/pcp/romaneios/refresh
POST /api/pcp/romaneios/delete            ← romaneios.delete
POST /api/pcp/romaneios-kanban/sync
POST /api/pcp/romaneios-kanban/update-date ← romaneios.write
POST /api/pcp/structure-overrides         ← structures.write
POST /api/pcp/programming-entries         ← programming.write
POST /api/pcp/apontamento/save            ← apontamento.write
POST /api/pcp/apontamento/dispatch        ← apontamento.dispatch
POST /api/pcp/users/save                  ← users.manage
POST /api/pcp/users/delete                ← users.manage
POST /api/pcp/integrations/save           ← integrations.manage
POST /api/pcp/integrations/delete         ← integrations.manage
POST /api/pcp/stock-movements/save        ← stock_movements.manage
```

---

## 💻 Comandos Essenciais

```bash
# Desenvolvimento local (modo mock)
cd saars.inplast
PCP_DATA_MODE=mock python3 server.py
# Acesse: http://127.0.0.1:8765

# Build do frontend
npm --prefix web-react run build

# Stack integrada com Postgres local
cp .env.integrated.example .env
docker compose -f docker-compose.integrated.yaml up -d --build

# Verificar saúde
curl http://127.0.0.1:8765/health
curl http://127.0.0.1:8765/ready

# Modo postgres local (após subir a stack integrada)
PCP_DATA_MODE=postgres \
PCP_DATABASE_URL='postgresql://pcp_app:senha@127.0.0.1:55432/inplast_pcp' \
PCP_ACTIONS_DATABASE_URL='postgresql://pcp_integration:senha@127.0.0.1:55432/inplast_pcp' \
python3 server.py

# Scripts de estoque (Google Sheets)
pip install -r scripts/requirements.txt
python3 scripts/update_planilha_gsheets.py

# Schema do banco (apenas primeira vez ou reset)
# Bootstrap ocorre automaticamente via docker/start-pcp.sh no primeiro boot
```

---

## 🚨 Regras Críticas

### Regras de Produto (NUNCA violar)

1. **Override manual prevalece sobre automático** — sempre. Se existir ajuste manual ativo,
   o cálculo automático não sobrescreve. Recálculo a jusante é obrigatório após override.

2. **Falha de fonte não apaga o cenário** — o último snapshot válido deve ser preservado.
   A API e a UI sinalizam `stale_data` mas nunca perdem o estado operacional vigente.

3. **Romaneio + Romaneio Nota = mesmo consolidado** — documentos do mesmo número e tipo
   complementam um registro único. Nova versão do mesmo tipo substitui a anterior.

4. **Toda alteração manual gera auditoria** — campos obrigatórios: `entity_type`, `entity_id`,
   `company_code`, `changed_by_user_id`, `changed_by_username`, `changed_fields`, `before`,
   `after`, `changed_at`.

5. **company_code é obrigatório em toda entidade operacional** — sem `company_code`, a entidade
   não pode ser promovida a estado oficial.

### Regras de Código

6. **`web-react/` é a UI oficial** — nunca evoluir `web/`. Se criar tela nova, vai em
   `web-react/src/pages/`.

7. **Envelope de resposta padrão** — toda rota deve responder com:
   ```json
   { "status": "success|accepted|partial|error", "data": {}, "meta": {}, "errors": [] }
   ```

8. **Erros nunca vazam stack trace** — 400/422 para validação, 413 para payload grande,
   404 estruturado para rotas inexistentes, 503 distinguido de 500.

9. **`data/*.json` são seeds** — nunca são Fonte Oficial em produção. Postgres é a fonte
   de verdade no modo `postgres`.

10. **Senhas com caracteres especiais em `.env`** — sempre entre aspas nos arquivos Docker.

11. **MRP nunca publica cenário incompleto** — se `partial`, marcar como `partial`, não `success`.
    Dois disparos simultâneos de MRP → 409.

12. **`google_credentials.json` é sensível** — nunca commitar em repositórios públicos.

### Limites Operacionais (não alterar sem validação)

```
api_payload_limit_bytes:              1_048_576   (1 MB)
romaneio_upload_max_files_per_request: 10
romaneio_upload_max_total_bytes:       20_971_520  (20 MB)
request_timeout_seconds:              60
romaneio_refresh_timeout_seconds:     180
apontamento_dispatch_timeout_seconds: 90
retry_attempts_on_network_failure:    2
```

---

## 🗂️ Estrutura de Pastas (Referência Rápida)

```
saars.inplast/
├── server.py                    ← servidor HTTP principal (81 KB)
├── SPEC.json                    ← especificação técnica completa (51 KB)
├── CLAUDE.md                    ← este arquivo
├── backend/
│   ├── provider.py              ← camada de dados mock/postgres (97 KB)
│   ├── queries.py               ← queries SQL (26 KB)
│   ├── config.py                ← leitura de envs (5 KB)
│   ├── source_sync.py           ← orquestrador de sync de fontes
│   ├── romaneio_pdf.py          ← parser de PDF
│   └── romaneio_integration.py  ← merge por ordem de carga
├── web-react/src/
│   ├── App.jsx                  ← roteamento principal (39 KB)
│   ├── pages/
│   │   ├── Cockpit.jsx
│   │   ├── RomaneiosInbox.jsx   ← maior componente (39 KB)
│   │   ├── KanbanBoard.jsx
│   │   ├── Apontamento.jsx
│   │   ├── ProgrammingCenter.jsx
│   │   ├── ProductionTracking.jsx
│   │   ├── FactorySimulator.jsx
│   │   ├── SourcesGovernance.jsx
│   │   ├── SystemGovernance.jsx
│   │   └── StockMovements.jsx
│   └── components/
│       ├── Sidebar.jsx
│       ├── Topbar.jsx
│       └── ...
├── database/
│   ├── pcp_operacional_postgres.sql  ← schema completo (89 KB)
│   └── pcp_postgres_roles_permissions.sql
├── parsers/                     ← ETL de estoque e BOM
├── scripts/                     ← GSheets, n8n, deploy
├── data/                        ← seeds JSON (modo mock)
├── docs/                        ← guias e handoffs
├── docker/                      ← start-pcp.sh, postgres config
├── Control Desk L&P Inplast/    ← VAULT OBSIDIAN
│   ├── saars.inplast.md         ← MOC principal
│   └── Control Desk L&P Inplast/
│       └── *.md                 ← 29 arquivos de documentação
└── .env.integrated.example      ← template de ambiente local
```

---

## ⚠️ Lacunas de Documentação Identificadas

As seguintes áreas ainda não têm cobertura completa — documente quando trabalhar nelas:

| Área | Lacuna |
|------|--------|
| **Autenticação** | Mecanismo de sessão/token ainda não formalizado — Sprint 1 pendente |
| **RBAC** | Proteção ampla das rotas ainda não implementada — rotas desprotegidas em produção |
| **Envelope de API** | Respostas ainda heterogêneas entre rotas — padronização é Sprint 1 |
| **Multiempresa** | Suporte parcial — não cobre todas as rotas nem a matriz de permissão |
| **Graceful shutdown** | Documentado na SPEC mas não confirmado como implementado |
| **Auditoria** | Trilha de auditoria documentada na SPEC mas não confirmada em todas as rotas |
| **web/ legado** | Sem mapeamento de cobertura funcional vs. web-react/ |
| **n8n versão ativa** | Múltiplas versões de workflow sem indicação clara de qual é a oficial |
| **Sankhya** | Sem documentação do protocolo de integração com o ERP |

---

## 🎯 Active Context

> Atualize esta seção a cada sessão de trabalho. Registre o estado atual, o que foi feito
> e o que está pendente. Não deixe este campo desatualizado por mais de uma sessão.

### Sessão atual: 2026-04-17

**Status do projeto:** Governança estabilizada para gestão de usuários/webhooks e sync de estoque corrigido para fontes do almoxarifado.

**O que foi feito recentemente:**
- Corrigido parser Google de almoxarifado MP (`MOVIMENTACOES DE MP`, `ESTOQUE MP`, `BANCO DE DADOS DE MP`)
- Corrigido parser Google de almoxarifado Componentes (`MOVIMENTACOES DE PARAFUSOS`, `ESTOQUE PARAFUSOS`, `BANCO DE DADOS PARAFUSOS`)
- Implementado endpoint `POST /api/pcp/users/delete` (mock e postgres)
- Persistência de `permissions` de usuário em Postgres (`meta_json`) e leitura no login/autorização
- Persistência de `target_source` em integrações e disparo seletivo de webhooks (`n8n_webhook_romaneios` + `n8n_webhook_stock`)
- Sanitização da resposta de integrações (`auth_value` não é mais exposto no GET)

**Sprint atual:** Sprint 1 — Base operacional, segurança e contratos
- [ ] Padronizar envelope de resposta da API
- [ ] Implementar autenticação obrigatória em todas as rotas
- [~] Implementar RBAC completo com matrix de permissões (módulos de governança já persistem e influenciam autorização)
- [ ] Fechar contexto multiempresa no módulo inteiro
- [ ] Definir web-react como UI oficial (remover referências à web/)

**Próximas decisões pendentes:**
- Mecanismo de sessão: JWT vs cookie de sessão server-side
- Estratégia de migração de dados mock → postgres em produção

**Ambiente de trabalho:**
- Modo: `mock` (desenvolvimento local)
- Frontend: `web-react/` (Vite + React)
- Imagem Docker: `ghcr.io/pradocmd/saars-inplast:main`
- Vault: `Control Desk L&P Inplast/` (Obsidian local + MCP em `localhost:22360`)

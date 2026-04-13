# 🔍 Relatório — Auditoria Corretiva web-react

**Data:** 2026-04-10  
**Commit:** `d0075dc` → `main`  
**Push:** ✅ `f2cb277..d0075dc main → main`  
**Agente:** Auditor Técnico Sênior  

---

## 📋 Escopo da Auditoria

| Módulo | Caminho | Status |
|--------|---------|--------|
| App.jsx | `src/App.jsx` | ✅ Revisado |
| ProgrammingCenter | `src/pages/ProgrammingCenter.jsx` | ✅ Corrigido |
| FactorySimulator | `src/pages/FactorySimulator.jsx` | ✅ Corrigido |
| ProductionTracking | `src/pages/ProductionTracking.jsx` | ✅ Corrigido |
| OperationsWorkspace.css | `src/pages/OperationsWorkspace.css` | ✅ Corrigido |
| api.js | `src/lib/api.js` | ✅ Corrigido |
| operations.js | `src/lib/operations.js` | ✅ Corrigido |
| OperationsCharts.jsx | `src/components/OperationsCharts.jsx` | ✅ Revisado (OK) |
| vite.config.js | `vite.config.js` | ✅ Corrigido |

---

## 🐛 Findings e Correções

### 1. BUG CRÍTICO — 401 Double State Mutation
- **Arquivo:** `api.js` L47-58
- **Problema:** Ao receber 401, `requestJson` chamava `onUnauthorized` (que faz logout) e depois também deixava o `throw` cair na cláusula genérica `!response.ok`. O caller recebia o throw no catch block e tentava `setNotice()` já com o componente em processo de desmontagem.
- **Correção:** Agora o 401 faz `onUnauthorized` + `throw ApiError` dedicado com code `'unauthorized'`, e a cláusula `!response.ok` só ativa para outros status.
- **Severidade:** 🔴 Alta

### 2. BUG — Math.max(...[]) = -Infinity em bar charts
- **Arquivos:** `FactorySimulator.jsx` L462, L488 · `ProgrammingCenter.jsx` L377 · `ProductionTracking.jsx` L433
- **Problema:** `Math.max(...array)` com array vazio retorna `-Infinity`, quebrando o cálculo de width das barras. Edge case real quando o backend retorna fila vazia.
- **Correção:** Sentinel `1` como primeiro argumento de `Math.max()` antes do spread.
- **Severidade:** 🟡 Média

### 3. SAFETY — Dispatch sem confirmação
- **Arquivo:** `ProductionTracking.jsx` L249-274
- **Problema:** `handleDispatchPending` disparava `POST /api/pcp/apontamento/dispatch` sem nenhuma confirmação. Em ambiente com n8n ativo, isso aciona webhooks externos (Sankhya) imediatamente.
- **Correção:** Adicionado `window.confirm()` com mensagem explicativa + guard para fila vazia.
- **Severidade:** 🔴 Alta (conforme requisito do usuário)

### 4. PERFORMANCE — defaultMachineCodes recriado a cada render
- **Arquivo:** `FactorySimulator.jsx` L293
- **Problema:** `buildDefaultMachineCodes(type)` executava a cada render, invalidando `plannedLanes` e `machineCards` downstream via deps do `useMemo`.
- **Correção:** Envolvido com `useMemo(() => ..., [type])`.
- **Severidade:** 🟢 Baixa

### 5. DEAD CODE — Imports não utilizados
- **Arquivo:** `ProgrammingCenter.jsx` L8-9
- **Problema:** `FiTarget` e `FiTrendingUp` importados mas nunca usados. Passavam no lint porque `varsIgnorePattern: ^[A-Z_]` ignora nomes que começam com maiúscula.
- **Correção:** Removidos.
- **Severidade:** 🟢 Baixa

### 6. UX — Event labels incompletos
- **Arquivo:** `operations.js` L81-104
- **Problema:** `apontar` (o evento mais frequente do formulário) não tinha mapping explícito em `toneFromEventType` nem em `getEventLabel`. Funcionava por fallthrough, mas violava o padrão de documentação explícita.
- **Correção:** Mapeamentos explícitos adicionados.
- **Severidade:** 🟢 Baixa

### 7. RESPONSIVIDADE — Faltavam breakpoints mobile
- **Arquivo:** `OperationsWorkspace.css`
- **Problema:** Sem `@media (max-width: 480px)`, o highlight-grid, form-actions e meta-row estouravam em telas pequenas. Faltavam tone styles para `.ops-slot-card` (high/warning/ok).
- **Correção:** Breakpoint 480px adicionado + tone styles + hover micro-animação em machine-row.
- **Severidade:** 🟡 Média

### 8. CONFIG — Porta proxy desalinhada
- **Arquivo:** `vite.config.js` L5
- **Problema:** Default `8876` não correspondia a nenhuma configuração real. `.env` define `PCP_PORT=8765`.
- **Correção:** `8876` → `8765`.
- **Severidade:** 🟡 Média (impede dev local sem variável explícita)

---

## ✅ Validação Executada

| Etapa | Resultado |
|-------|-----------|
| `npm run lint` | 0 warnings, 0 errors |
| `npm run build` | ✅ 38 modules, 356 KB JS (99 KB gzip) |
| Smoke browser (login) | ✅ Renderizado, 0 console errors |
| Git commit | `d0075dc` — 16 files, +3108/−636 |
| Git push | ✅ `main → main` |

---

## ⚠️ Riscos Residuais

### 1. `programming-entries` responde `mock_saved`
O backend neste ambiente não materializa a fila de programação. A UI já trata isso com banner amarelo explícito. **Risco:** o usuário pode criar entradas que desaparecem após reload.
> **Ação sugerida:** Implementar persistência SQLite/Postgres no endpoint `/api/pcp/programming-entries` (backend).

### 2. `apontamento/dispatch` pode acionar webhook externo
Mesmo com a confirmação agora, se o n8n estiver apontando para produção Sankhya, o dispatch real vai criar payload lá.
> **Ação sugerida:** Considerar flag `dry_run: true` no contrato de dispatch.

### 3. Session storage sem criptografia
O token JWT é salvo em `localStorage` em plaintext. Qualquer XSS consegue exfiltrar.
> **Ação sugerida:** Migrar para `httpOnly` cookie quando o backend suportar.

### 4. `useEffectEvent` é API experimental do React 19
O projeto usa `useEffectEvent` de `react@19.2.4`. Se migrar para uma versão anterior, isso quebra.
> **Ação sugerida:** Documentar no README a dependência mínima de React 19.

### 5. ProductionTracking.css não é importado pelo módulo novo
O arquivo `ProductionTracking.css` contém 626 linhas de estilos para o app mobile (`.aponta-*`), mas o novo `ProductionTracking.jsx` importa `OperationsWorkspace.css`. O CSS antigo é dead code ou pertence ao antigo web app.
> **Ação sugerida:** Remover ou mover para o diretório `web/` se pertence ao app legado.

---

## 🤝 O que ficou preservado (conforme requisitos)

- ✅ Auth, sessão, 401 — fluxo intacto, apenas corrigido o double-mutation
- ✅ Papéis (root/manager/operator) — sem alteração
- ✅ Multiempresa — lógica de scope intacta
- ✅ Kanban — sem mutação fake, somente leitura fiel
- ✅ Romaneios — separação backend oficial vs buffer local mantida
- ✅ Extrusão — honestidade operacional mantida ("derivada do backlog")

---

## 🏗️ Compose e Env

**Nenhuma alteração necessária** no `docker-compose.coolify.image.yaml` nem no `.env`. As correções foram todas no frontend React.

O Dockerfile existente já copia o `dist/` para servir via Python backend. Após o push, a GitHub Action `publish-image.yml` vai buildar e publicar a nova imagem no GHCR automaticamente.

---

## 📝 Mensagem para o Próximo Agente

```
HANDOFF — Auditor Técnico → Próximo Agente
Data: 2026-04-10
Commit: d0075dc (main)

CONTEXTO:
Auditoria corretiva completa em 8 módulos do web-react. 8 findings
identificados e corrigidos, incluindo bug crítico de 401 loop e dispatch
sem confirmação que acionava webhook externo.

ESTADO ATUAL:
- Lint: 0 warnings/errors
- Build: OK (38 modules, 356KB)
- Smoke: OK (login renderiza, 0 console errors)
- Push: OK (main → GHCR trigger automático)

PONTOS DE ATENÇÃO:
1. /api/pcp/programming-entries devolve mock_saved — a UI avisa,
   mas a persistência real ainda não existe no backend
2. /api/pcp/apontamento/dispatch agora pede confirm() antes de disparar
3. useEffectEvent requer React 19 mínimo (documentar no README)
4. ProductionTracking.css (626 linhas) pode ser dead code do app legado

PRÓXIMOS PASSOS SUGERIDOS:
- Implementar persistência real em programming-entries (backend)
- Considerar dry_run flag no dispatch
- Remover CSS órfão (ProductionTracking.css) se confirmado como legado
- Testar fluxo completo de login → apontamento → sync em staging
```

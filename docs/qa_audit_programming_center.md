# Relatório de Auditoria QA - Programming Center (PCP SaaS)

## Resumo Executivo
Foram executados testes de verificação funcionais (White-box/Code Review profundo orientado a comportamento) focando no componente `web-react/src/pages/ProgrammingCenter.jsx`.
O componente possui um design estruturado muito bom, mas a validação de regras de negócio no lado do cliente (formulário de nova programação) é gravemente insuficiente e frágil no tratamento de campos textuais e temporais. Isso impactará o "chão de fábrica" ao poluir métricas (NaN) e inflar os painéis com células duplicadas.

---

## 🐞 Bugs e Achados

### 1. Inversão e Omissão Crítica de Datas (Time Travel) quebrando métricas de Lead
* **Severidade:** BLOQUEANTE
* **Área afetada:** Formulário `Composer de programação` e Cálculos de Dashboard (`averageLeadHours`).
* **Passos para reproduzir:**
  1. Abrir a tela de Programação e ir no painel "Nova janela".
  2. Preencher "Ação", "SKU", "Produto" e "Quantidade" com dados válidos.
  3. Preencher "Início planejado" com `2026-04-20` e "Disponível em" com `2026-04-10` (Uma data de término ANTERIOR ao início). Ou deixar ambos em branco.
  4. Clicar em "Registrar janela".
* **Resultado esperado:** O sistema deve bloquear o registro e exigir que 1) As datas sejam preenchidas e 2) A data `available_at` seja estritamente posterior ou igual a `planned_start_at`.
* **Resultado atual:** O sistema **aceita** a inserção sem datas ou com recuo temporal.
* **Evidência:** Arquivo `ProgrammingCenter.jsx`, Linha 198: O validador se restringe a `if (!payload.sku || !payload.produto || payload.quantity_planned <= 0)`.
* **Impacto operacional:** Acumula métricas corrompidas no Card de Lead (`NaN` ou horas negativas), distorcendo totalmente qualquer confiabilidade de prazo para a logística.
* **Hipótese da causa:** Pressão na entrega ou delegação excessiva de validação para a API (que, se mockada, engole tudo).
* **Recomendação objetiva:** Garantir exigência de valores e que `new Date(available_at) >= new Date(planned_start_at)`. Garantir fallback para quando a data vier ausente.

### 2. Fragmentação de Linhas/Células por Entrada de Texto Livre
* **Severidade:** ALTA
* **Área afetada:** Relatório `Mix de célula` e Agrupamento no Kanban do Dashboard.
* **Passos para reproduzir:**
  1. Criar uma nova programação e no campo "Linha ou célula", digitar `inj-03   ` (com letras minúsculas e espaços no final).
  2. Registrar.
  3. Criar outra programação, digitando `INJ-03` no mesmo campo.
  4. Registrar.
* **Resultado esperado:** A tela os agrupa sob uma única célula, normalizando o identificador de máquina para manter as filas íntegras na visão de esteira.
* **Resultado atual:** A lista de células no painel exibe "inj-03   " e "INJ-03" como máquinas / esteiras distintas. 
* **Evidência:** Arquivo `ProgrammingCenter.jsx`, Linha 189: No payload, apenas SKU sofre `.trim().toUpperCase()`. Máquina (`assembly_line_code` e `workstation_code`) sofrem binding cego (`event.target.value`). 
* **Impacto operacional:** O operador terá 3 quadros para a mesma Linha num tablet, prejudicando a visão unificada de fila/capacidade na esteira. 
* **Hipótese da causa:** Faltou mapeamento trim/strict case em campos descritivos vs estruturais.
* **Recomendação objetiva:** Aplicar `String(...).trim().toUpperCase()` nos códigos de montagem, linhas e postos.

### 3. Formulário refém em eventuais instabilidades de rede (UI Trap)
* **Severidade:** MÉDIA
* **Área afetada:** Flow de requisição em `handleSubmit`.
* **Passos para reproduzir:**
  1. Reduzir a conexão de rede no DevTools para "Offline" ou "Slow 3G" extremo ou simular backend retornando Timeout 504.
  2. Submeter formulário.
* **Resultado esperado:** A requisição aguarda X segundos, informa um erro "Timeout" ou falha, e destrava o formulário (volta `submitBusy` pra `false`), mantendo o dado no state pra que o usuário tente de novo.
* **Resultado atual:** O cliente `requestJson` (da helper API) geralmente sofre delay do fetch standard. A SPEC pede `"apontamento_dispatch_timeout_seconds": 90`. O front pode ficar congelado com o botão loading até dar falha de rede fatal no Chrome. Se ocorrer falha silenciosa, as informações estarão presas.
* **Evidência:** Nenhuma injeção temporal via `AbortController` presente no handler que garante timeout na óptica UI. A tela depende 100% de que o utilitário lance erro rápido.
* **Impacto operacional:** Operação em área com Wi-Fi/4G escasso (comum no chão de fábrica) congela a tela do funcionário que não saberá se aOP foi salva ou sumiu.
* **Recomendação objetiva:** Adicionar timeout resiliente implementado via Abort Signal.

---

## O que foi validado vs não validado
✅ Validação de estado inicial `loading` e `empty state`.
✅ Validação de restrição funcional quando na falta de empresa (Company Scope obedece corretamente o "writeBlockedByScope").
✅ Agrupamentos de saldo (Pressão OEM ordena adequadamente e ignora positivo se filter está bloqueando).
🚫 Limites de estresse de renderização (Lista virtualizada): 10.000 cards de OPs e performance do React no DOM não avaliados.
🚫 A UI em dimensões estritas de um celular específico (resolução 320px vertical) ainda precisará de run manual real (Storybook ou Playwright Real Device). 

## Riscos Residuais
Para além da SPEC atual, notei que a página não re-busca dados sozinhos (Auto-polling). A prop `reloadKey` só dispara na submissão originada internamente pelo form. Se outro PC no chão de fábrica criar OP na mesma célula, a visão do usuário ficará *stale* (velha) silenciosamente. Recomendo pensar em um heartbeat ou websocket.

---
[Fim do relatório]

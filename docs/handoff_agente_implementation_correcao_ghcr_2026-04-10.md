# Hand-off: Implementation Engineer - Correção GHCR para Rollout

**Data:** 2026-04-10  
**De:** SPEC Reviewer (orquestrador)  
**Para:** Implementation Engineer  
**Status:** Pronto para execução

---

## 1. Contexto

### Situação Atual

| Camada | Status |
|--------|--------|
| Funcional | Aprovado |
| Release | Parcial |
| Rollout | Não aprovado (GHCR privado) |

### Problema Identificado

O Auditor de Solução verificou e confirmou:

- **Todas as tags retornam HTTP 401 (Unauthorized)**
- Tag `main`: 401
- Tag `latest`: 401
- Tag `sha-bd1216d`: 401
- Tag SHA longa: 401

**Causa:** Pacote GHCR `pradocmd/saars-inplast` está com visibilidade **privada**.

### Evidência

Relatório completo em: `docs/relatorio_verificacao_ghcr_rollout_2026-04-10.md`

---

## 2. Tarefa

###Objetivo

**Corrigir a visibilidade do GHCR** para permitir deploy no Coolify.

### Solução Necessária

Escolha uma das opções:

| Opção | Ação | Requisito |
|------|------|----------|
| A) Tornar público | Alterar visibilidade do pacote para `public` | Exposição da imagem publicamente |
| B) Credenciais no Coolify | Configurar token GHCR no Coolify | Acesso ao token |

**Recomendação:** Opção A (tornar público) - é o caminho mais simples e Align com a estratégia documental de "imagem pronta do GHCR sem autenticação".

### Passos para Opção A (Recomendada)

1. **Acessar configurações do pacote**
   - URL: `https://github.com/PradoCMD/saars.inplast/pkgs/container/saars-inplast`
   - Ou: GitHub → Packages → saars-inplast → Package settings

2. **Alterar visibilidade**
   - Visibility: `private` → `public`
   - Confirmar mudança

3. **Re-publicar imagem** (se necessário)
   - Executar workflow `publish-image.yml` manualmente
   - Ou fazer push de `main` para acionar automático

4. **Verificar acesso**
   - Testar curl anónimo após correção
   - Confirmar HTTP 200

---

## 3. Skills a Utilizar

Para esta tarefa, utilize as skills:

- **`docker-expert`** - Docker, docker-compose, GHCR, publicação de imagens
- **`code-reviewer`** - Validar workflow de publicação

Referências em:
- `references/backend_best_practices.md`
- `references/security_guide.md`

---

## 4. Ação Esperada

### Passo 1: Corrigir Visibilidade GHCR

Aplicar a solução escolhida (A ou B).

### Passo 2: Re-verificar

Executar verificação para confirmar que as tags agora retornam HTTP 200.

### Passo 3: Documentar

Criar relatório de remediação em `docs/relatorio_remediacao_ghcr_2026-04-10.md` com:

- Solução aplicada
- Evidência de acesso (HTTP 200)
- Tag funcional confirmada

### Passo 4: Hand-off para Re-teste

Se remediação funcionar, criar hand-off para o Auditor re-verificar os gates.

---

## 5. Critério de Aceite

**Remediação aprovada se:**
- Tags retornam HTTP 200 (acesso anónimo funciona)
- Tag `main` ou `sha-*` disponível
- Evidência documentada

**Remediação rejeitada se:**
- Problema persiste
- Requer autenticação complexa
- Não é possível resolver

---

## 6. Output Esperado

Documentar em `docs/relatorio_remediacao_ghcr_2026-04-10.md`:
- Solução aplicada
- Evidência de sucesso (output do curl)
- Recomendação de próximo passo
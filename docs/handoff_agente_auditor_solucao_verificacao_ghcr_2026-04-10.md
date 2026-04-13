# Hand-off: Auditor de Solução - Verificação GHCR e Gate de Rollout

**Data:** 2026-04-10  
**De:** SPEC Reviewer (orquestrador)  
**Para:** Auditor de Solução  
**Status:** Pronto para execução

---

## 1. Contexto

### Situação Atual

| Camada | Status |
|--------|--------|
| Funcional | Aprovado |
| Release | Parcial |
| Rollout | Não aprovado |

### Bloqueio Atual

O rollout está bloqueado por verificação de artefato no GHCR:

- Incidenteregistrado em `docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`
- Tag `sha-bd1216d61bc8020b93e6a1d805fced92b33de8dd` não foi encontrada
- Gate mínimo de rollout precisa de validação operacional

### Referências Canônicas

1. `docs/release_deploy_governanca.md` - Mapa principal de release/deploy
2. `docs/release_rollout_status.md` - Snapshot atual do status
3. `docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md` - Histórico do incidente
4. `coolify_deploy_guide.md` - Runbook operacional do Coolify

---

## 2. Tarefa

### Objetivo

**Validar o gate de rollout** - verificar se o artefato de imagem está acessível no GHCR e documentar as evidências para aprovado ou rejeição do rollout.

### O Que Verificar (Gate Mínimo)

Conforme `release_rollout_status.md` seção 5, os gates são:

1. **Tag existente no GHCR**
   - Verificar se `ghcr.io/pradocmd/saars-inplast:sha-bd1216d` existe
   - Ou se `main` está disponível
   - Usar `gh api` ou browser para confirmar

2. **Acessibilidade no ambiente alvo**
   - Verificar se o GHCR está público ou exige credenciais
   - Confirmar se Coolify consegue acessar (com ou sem credenciais)

3. **Tag definida como padrão operacional**
   - Documentar qual tag será usada: `main`, `latest` ou `sha-*`
   - Justificar a escolha

4. **Evidência de deploy bem-sucedido**
   - Se possível, intentar deploy de teste
   - Registrar logs/output

5. **Verificação pós-deploy mínima**
   - Healthcheck responde em `/`
   - App sobe sem erros críticos

---

## 3. Skills a Utilizar

Para esta tarefa, utilize as skills:

- **`senior-architect`** - Validar arquitetura da trilha de release (workflow, registry, deploy)
- **`code-reviewer`** - Revisar workflow de publicação (`publish-image.yml`)

Referencias em:
- `references/architecture_patterns.md`
- `references/system_design_workflows.md`
- `references/code_review_checklist.md`

---

## 4. Ação Esperada

### Passo 1: Verificar GHCR

Executar comando para verificar imagem:

```bash
gh api repos/pradocmd/saars-inplast/tags
# ou
curl -s "https://ghcr.io/v2/pradocmd/saars-inplast/tags/list"
```

### Passo 2: Documentar Evidências

Criar relatório em `docs/relatorio_verificacao_ghcr_rollout_[data].md` com:

- Tag verificada como existente (sim/não)
- Status de visibilidade do GHCR (público/privado)
- Tag escolhida para padrão operacional
- Evidência de deploy (sucesso/falha)
- Recommendation de aprovação ou rejeição do rollout

### Passo 3: Atualizar Status

Se evidências confirmam:
- Atualizar `docs/release_rollout_status.md` para aprovada
- Incluir documento de evidência na base objetiva

---

## 5. Critério de Aceite

**Rollout aprovado se:**
- Tag verificada existe no GHCR
- Tag acessível do ambiente Coolify
- Evidência de deploy bem-sucedido registrada

**Rollout rejeitado se:**
- Tag não existe
- Tag inacessível
- Depende de remanufatura/republicação

---

## 6. Output Esperado

Documentar em `docs/relatorio_verificacao_ghcr_rollout_2026-04-10.md`:

- Status de cada gate verificado
- Evidências objetivas (screenshots, logs, output de comandos)
- Recomendação clara
- Próximos passos se rejeitado
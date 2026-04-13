# Handoff: TESTE Auditor para release GHCR e deploy no Coolify pos-remediacao

Data: 2026-04-10
Projeto: `saars.inplast`
Origem: `CODE Reviewer`
Destino: `TESTE Auditor`
Escopo: confirmar a remediacao da estrategia de imagem para GHCR/Coolify e validar o caminho operacional correto de deploy
Status de entrada: causa do incidente confirmada, workflow ajustado para SHA longa, docs alinhadas, faltando reteste operacional

## 1. Objetivo deste handoff

Seu foco aqui nao e testar UX, frontend funcional ou regra de negocio do app.

Seu foco e validar a trilha de release.

Voce deve confirmar:

1. se o workflow corrigido realmente passa a publicar tag `sha-<commit completo>`
2. se o GHCR continua resolvendo `main` e `latest`
3. se a nova imagem por SHA longa fica utilizavel pelo Coolify
4. se o caminho correto de rollout ficou claro e reproduzivel

## 2. Leitura obrigatoria

Leia nesta ordem:

1. `SPEC.json`
2. `BACKLOG.json`
3. `docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`
4. `docs/relatorio_remediacao_release_ghcr_coolify_2026-04-10.md`
5. `.github/workflows/publish-image.yml`
6. `docker-compose.coolify.image.yaml`
7. `docker-compose.coolify.yaml`
8. `.env.coolify.example`
9. `coolify_deploy_guide.md`
10. `Dockerfile`
11. `docker/start-pcp.sh`

## 3. O que foi corrigido

### 3.1 Causa confirmada

O deploy falhou porque tentou usar:

```text
ghcr.io/pradocmd/saars-inplast:sha-bd1216d61bc8020b93e6a1d805fced92b33de8dd
```

mas a imagem publicada para esse commit era:

```text
ghcr.io/pradocmd/saars-inplast:sha-bd1216d
```

### 3.2 Patch aplicado

O workflow agora usa:

```yaml
type=sha,format=long,prefix=sha-
```

Logo, para novos publishes, a referencia canonica esperada passa a ser:

```text
sha-<40 caracteres>
```

## 4. O que voce deve validar primeiro

### Prioridade 1

Confirmar se houve novo publish apos o patch.

Sem isso, o reteste nao fecha a trilha inteira.

Se ainda nao houve push ou `workflow_dispatch` depois da correcao:

- reporte isso claramente
- separe o que esta validado em codigo do que ainda nao esta validado no registry

### Prioridade 2

Se houve novo publish, validar:

1. existencia de `main`
2. existencia de `latest`
3. existencia de `sha-<commit completo>` para o novo commit publicado
4. possibilidade de pull pelo Coolify sem credencial extra, se o pacote seguir publico

## 5. Casos minimos de teste

### Bloco A: workflow

- revisar se `publish-image.yml` esta com `type=sha,format=long,prefix=sha-`
- confirmar se o run de publish correspondente concluiu com sucesso

### Bloco B: GHCR

- testar resolucao de `main`
- testar resolucao de `latest`
- testar resolucao da nova SHA longa
- se a nova SHA longa nao existir, diferenciar:
  - workflow nao rodou
  - workflow falhou
  - workflow rodou mas publicou outra coisa

### Bloco C: estrategia para Coolify

- confirmar que `docker-compose.coolify.image.yaml` segue usando `PCP_IMAGE` configuravel
- confirmar que `.env.coolify.example` e `coolify_deploy_guide.md` nao induzem mais release aprovada em tag movel
- confirmar se o caminho correto de release ficou:
  - `main` para homologacao
  - `sha-<commit completo>` para rollout aprovado

### Bloco D: fallback imediato

Mesmo com o patch, registrar claramente qual e o fallback operacional de curto prazo:

- usar `main`
- ou usar a SHA curta existente do commit antigo

## 6. O que nao tratar como bug novo

Nao reabrir nesta rodada:

- auth
- RBAC
- company scope
- `web-react`
- romaneios
- kanban
- UX

So reabra algo fora da trilha de release se houver evidencia objetiva de que afeta diretamente a imagem ou o deploy no Coolify.

## 7. Resultado esperado da sua entrega

Sua devolutiva deve trazer:

1. findings priorizados
2. confirmacao do que foi fechado e do que ainda depende de publish real
3. testes executados
4. recomendacao objetiva:
   - pode seguir com rollout por SHA longa
   - pode seguir so com `main` provisoriamente
   - ou ainda nao pode seguir

## 8. Perguntas que voce deve responder explicitamente

1. O patch no workflow realmente fecha a causa do incidente?
2. A nova tag por SHA longa ja existe no GHCR ou ainda nao?
3. O GHCR segue utilizavel pelo Coolify sem credenciais extras?
4. Qual e o comando/valor exato de `PCP_IMAGE` que o operador deve usar agora?

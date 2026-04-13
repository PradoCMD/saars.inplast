# Relatorio: SPEC Reviewer da governanca de release e deploy

Data: 2026-04-10
Projeto: `saars.inplast`
Escopo desta rodada: reorganizar a documentacao de release/deploy, separar estado funcional aprovado de estado de rollout aprovado e definir uma trilha canonica de governanca sem alterar comportamento do produto
Status final da rodada: concluida

## 1. Objetivo da rodada

Esta rodada entrou depois de um incidente de release envolvendo:

- deploy no Coolify
- expectativa de uso de imagem publicada no GHCR
- falha por tag `sha-*` nao encontrada

O objetivo aqui nao era reabrir produto, frontend, backend ou backlog funcional.
O objetivo era fechar a governanca documental da trilha de release/deploy.

Traducao pratica:

- deixar claro o que esta aprovado funcionalmente
- deixar claro o que ainda nao esta aprovado para rollout
- parar de depender de historico espalhado entre handoffs, prompts e relatorios
- transformar o guia do Coolify em runbook, e nao em documento ambiguo de aprovacao

## 2. Base lida antes da reorganizacao

Leituras usadas como base:

1. `SPEC.json`
2. `BACKLOG.json`
3. `docs/handoff_spec_reviewer_governanca_release_deploy_2026-04-09.md`
4. `docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`
5. `coolify_deploy_guide.md`
6. `.env.coolify.example`
7. `docker-compose.coolify.image.yaml`
8. `.github/workflows/publish-image.yml`
9. `docs/relatorio_teste_auditor_web_react_consolidacao_semantica_operacional_2026-04-09.md`
10. `docs/relatorio_implementation_ux_ui_engineer_web_react_consolidacao_semantica_operacional_2026-04-09.md`

Tambem foi feita leitura de apoio no `README.md` e no inventario de `docs/` para entender onde a trilha de rollout estava espalhada.

## 3. Findings documentais

### 3.1 Falta de documento canonico de governanca

O projeto tinha:

- guia de deploy
- relatorio de incidente
- handoffs e prompts de agentes

Mas nao tinha um documento principal dizendo:

- qual e a ordem correta entre QA, release e rollout
- qual doc consultar primeiro
- como separar aprovacao funcional de aprovacao operacional

### 3.2 Risco de confusao entre produto aprovado e rollout aprovado

O contexto mostrava claramente um estado funcional bom.
Mas, sem uma separacao formal, havia risco de alguem ler:

- `QA aprovado`
- `guia do Coolify pronto`

e concluir erroneamente:

- `rollout aprovado`

### 3.3 `coolify_deploy_guide.md` forte como runbook, fraco como camada de governanca

O guia de deploy estava util para operacao.
O problema e que ele podia ser usado como se validasse sozinho:

- estrategia de imagem
- aprovacao de tag
- readiness de rollout

### 3.4 Trilha de release muito distribuida

O contexto relevante estava fragmentado entre:

- relatorio de incidente
- handoff de `CODE Reviewer`
- handoff de `Implementation / Reliability`
- prompt do `SPEC Reviewer`
- `README`
- guia do Coolify

Isso aumentava o custo de retomada e favorecia leitura parcial do estado real.

## 4. O que foi reorganizado

### 4.1 Novo documento canonico de governanca

Criado:

- [docs/release_deploy_governanca.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/release_deploy_governanca.md)

Esse documento agora responde:

- qual e a trilha oficial
- qual a ordem entre QA, release e rollout
- qual documento usar em cada etapa
- o que e historico e o que e referencia canonica

### 4.2 Novo snapshot de status operacional

Criado:

- [docs/release_rollout_status.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/release_rollout_status.md)

Esse documento agora registra explicitamente:

- estado funcional: aprovado
- estado de release: parcial
- estado de rollout: nao aprovado

### 4.3 `coolify_deploy_guide.md` reposicionado como runbook

Atualizado:

- [coolify_deploy_guide.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/coolify_deploy_guide.md)

Mudancas aplicadas:

- o guia agora aponta primeiro para a governanca canonica
- deixa claro que `estado funcional aprovado` nao significa `rollout aprovado`
- deixa claro que exemplo de `PCP_IMAGE` nao equivale a aprovacao de tag
- reforca que a tag exata precisa ser verificada no GHCR antes do rollout

### 4.4 `README.md` religado para a trilha correta

Atualizado:

- [README.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/README.md)

Mudancas aplicadas:

- a secao de imagem pronta para o Coolify agora aponta para:
  - `docs/release_deploy_governanca.md`
  - `docs/release_rollout_status.md`
  - `coolify_deploy_guide.md`
- o README deixa claro que aprovacao funcional nao implica aprovacao de rollout

## 5. Documentos canonicos definidos

### Referencia principal de governanca

- [docs/release_deploy_governanca.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/release_deploy_governanca.md)

### Snapshot oficial do estado atual

- [docs/release_rollout_status.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/release_rollout_status.md)

### Runbook operacional

- [coolify_deploy_guide.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/coolify_deploy_guide.md)

### Historico do incidente

- [docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md](/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md)

## 6. O que foi preservado

Nao houve alteracao em:

- comportamento do produto
- `SPEC.json`
- `BACKLOG.json`
- codigo de app
- regras funcionais

A rodada foi estritamente documental.

## 7. Lacunas residuais

A lacuna residual principal agora esta bem isolada:

- verificar o artefato real de imagem/tag no GHCR
- definir a tag aprovada para uso no Coolify
- fechar o gate de rollout com evidencia operacional

Ou seja:

- a governanca documental foi consolidada
- o rollout ainda nao foi liberado

## 8. Recomendacao de proximo passo

Encaminhar agora para `Implementation / Full Stack / Reliability`.

Foco recomendado:

1. usar a nova trilha canonica como base
2. confirmar a estrategia real de imagem para o Coolify
3. fechar o gate de rollout com evidencia
4. atualizar o status de rollout se a trilha operacional for validada

## 9. Respostas objetivas desta rodada

1. Qual doc passa a ser a referencia principal de release/deploy?
   - `docs/release_deploy_governanca.md`
2. O que hoje estava espalhado e precisou ser consolidado?
   - governanca entre QA, release, rollout, guia do Coolify e incidente de GHCR
3. Como separar estado funcional aprovado de estado de rollout aprovado?
   - com o documento de governanca e com o snapshot `docs/release_rollout_status.md`
4. O time agora consegue retomar esse contexto sem reconstruir o historico inteiro?
   - Sim, com muito menos dependencia de prompts e handoffs antigos.

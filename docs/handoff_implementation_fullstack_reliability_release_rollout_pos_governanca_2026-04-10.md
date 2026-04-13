# Handoff: Implementation / Full Stack / Reliability para fechamento de release e rollout

Data: 2026-04-10
Projeto: `saars.inplast`
Origem do handoff: SPEC Reviewer apos consolidacao documental de release/deploy
Destino: Implementation / Full Stack / Reliability
Escopo deste handoff: fechar a trilha operacional de release/rollout usando a nova governanca canonica, sem reabrir produto
Status de entrada: documentacao de governanca consolidada; produto funcionalmente aprovado no recorte validado; rollout ainda nao aprovado

## 1. Objetivo deste handoff

Passar para `Implementation / Full Stack / Reliability` a etapa seguinte a esta rodada documental.

O trabalho de governanca ja foi feito.
O que falta agora e fechar a parte operacional de release/rollout.

Seu objetivo nao e redesenhar documentacao do zero.
Seu objetivo e usar a documentacao canonica para:

1. validar a estrategia real de imagem/tag no GHCR
2. definir o caminho correto para o Coolify
3. reduzir drift entre workflow, registry, compose e runtime
4. atualizar o status de rollout apenas quando houver evidencia suficiente

## 2. Leitura obrigatoria

Leia nesta ordem:

1. `docs/release_deploy_governanca.md`
2. `docs/release_rollout_status.md`
3. `docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`
4. `coolify_deploy_guide.md`
5. `.env.coolify.example`
6. `docker-compose.coolify.image.yaml`
7. `.github/workflows/publish-image.yml`
8. `docs/handoff_implementation_fullstack_reliability_release_ghcr_coolify_2026-04-09.md`
9. `docs/handoff_code_reviewer_release_ghcr_coolify_2026-04-09.md`

## 3. O que ja foi resolvido antes de voce entrar

Nesta rodada do `SPEC Reviewer`:

- foi criada a referencia canonica de governanca em `docs/release_deploy_governanca.md`
- foi criado o snapshot oficial do estado em `docs/release_rollout_status.md`
- `coolify_deploy_guide.md` passou a ser explicitamente um runbook operacional
- `README.md` foi religado para apontar primeiro para governanca e status

Traducao pratica:

- agora existe um trilho documental claro
- o proximo trabalho nao e de organizacao
- o proximo trabalho e de fechamento operacional

## 4. Estado de entrada consolidado

### Funcional

Estado: aprovado no recorte validado

### Release

Estado: parcial

### Rollout

Estado: nao aprovado

Bloqueio atual:

- falta confirmar artefato/tag realmente utilizavel no GHCR para o Coolify

## 5. O que voce deve fazer

Prioridade recomendada:

1. confirmar a tag de imagem realmente publicada e utilizavel
2. definir a estrategia operacional correta para o Coolify hoje
3. corrigir qualquer drift restante entre workflow, compose, env e runbook
4. registrar evidencia objetiva da trilha aprovada
5. atualizar `docs/release_rollout_status.md` somente se o gate de rollout for realmente fechado

## 6. O que voce deve preservar

- nao reabrir escopo funcional do app
- nao alterar `SPEC.json`
- nao alterar `BACKLOG.json`
- nao transformar o incidente em refatoracao ampla de backend/frontend
- manter a diferenciacao entre:
  - estado funcional aprovado
  - estado de release aprovado
  - estado de rollout aprovado

## 7. Resultado esperado da sua entrega

Sua devolutiva precisa trazer:

1. qual tag deve ser usada no Coolify
2. se o registry exige ou nao credencial adicional
3. quais ajustes operacionais foram necessarios
4. quais validacoes foram executadas
5. se o rollout continua bloqueado ou se pode mudar de status

## 8. Criterio de encerramento da trilha

Considere esta trilha encerrada apenas se houver evidencia para responder:

1. qual artefato foi verificado no GHCR
2. como o Coolify deve consumir esse artefato
3. se o deploy alvo subiu com sucesso
4. qual status final deve constar em `docs/release_rollout_status.md`

## 9. Conclusao do handoff

O trabalho documental necessario ja foi consolidado.
O proximo passo agora e engenharia de release/reliability de fato.

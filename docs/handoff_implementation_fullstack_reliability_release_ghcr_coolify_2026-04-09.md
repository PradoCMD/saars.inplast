# Handoff: Implementation Full Stack / Reliability para release GHCR e deploy no Coolify

Data: 2026-04-09
Projeto: `saars.inplast`
Origem do handoff: coordenacao de release apos incidente de deploy
Destino: Implementation / Full Stack / Reliability
Escopo deste handoff: preparar ou aplicar a remediacao operacional da trilha de deploy por imagem no Coolify
Status de entrada: deploy bloqueado por imagem/tag no GHCR, enquanto o app em si permanece funcional

## 1. Objetivo deste handoff

Passar para implementacao/reliability a parte operacional do incidente.

Seu papel aqui nao e apenas investigar.
Seu papel aqui e deixar o caminho de rollout seguro e reproduzivel.

## 2. Leitura obrigatoria

Leia nesta ordem:

1. `SPEC.json`
2. `BACKLOG.json`
3. `docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`
4. `docs/handoff_implementation_fullstack_reliability_release_ghcr_coolify_2026-04-09.md`
5. `docker-compose.coolify.image.yaml`
6. `docker-compose.coolify.yaml`
7. `.env.coolify.example`
8. `coolify_deploy_guide.md`
9. `.github/workflows/publish-image.yml`
10. `Dockerfile`
11. `docker/start-pcp.sh`

## 3. Problema de entrada

Deploy no Coolify falhou tentando puxar:

- `ghcr.io/pradocmd/saars-inplast:sha-bd1216d61bc8020b93e6a1d805fced92b33de8dd`

Erro:

- `not found`

## 4. O que ja foi ajustado

Os arquivos de deploy ja receberam correcoes de base:

- `PCP_AUTH_TOKEN_SECRET` entrou explicitamente no pacote
- o healthcheck do app saiu de `/api/pcp/overview` e foi para `/`
- o guia de deploy passou a mencionar `main` versus `sha-*`

## 5. O que voce deve fazer

Prioridade recomendada:

1. confirmar a estrategia operacional de release
2. preparar um caminho de deploy que funcione no Coolify hoje
3. endurecer a documentacao e o fallback de rollout

Isso pode incluir:

- ajustar compose/env se ainda houver drift
- endurecer a estrategia `main` versus `sha-*`
- preparar instrucoes mais seguras para deploy manual
- alinhar release e runtime sem depender de suposicao implicita

## 6. O que voce deve preservar

- nao reabrir escopo funcional do produto
- nao mexer em `SPEC.json` nem `BACKLOG.json`
- nao transformar o incidente em refatoracao ampla do app
- manter o deploy coerente com auth atual e com a topologia de banco dedicada

## 7. Resultado esperado da sua entrega

Sua devolutiva deve trazer:

1. o caminho operacional que deve ser seguido agora
2. correcoes aplicadas em deploy/release, se necessarias
3. validacoes executadas
4. o que mudou no fluxo de rollout
5. riscos residuais

## 8. Conclusao do handoff

O problema atual precisa ser fechado como engenharia de release/reliability.
Seu sucesso aqui e deixar o deploy do Coolify previsivel e repetivel.

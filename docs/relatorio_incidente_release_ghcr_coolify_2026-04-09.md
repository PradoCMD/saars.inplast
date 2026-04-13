# Relatorio: incidente de release GHCR e deploy no Coolify

Data: 2026-04-09
Projeto: `saars.inplast`
Escopo deste relatorio: registrar o estado atual do deploy por imagem no Coolify depois do push de `main` e do snapshot aprovado de `web-react/`
Status atual: RESOLVIDO - GHCR público e tags acessíveis

Verificação em 2026-04-10: Pacote público em https://github.com/PradoCMD/saars.inplast/pkgs/container/saars-inplast

## 1. Contexto

A trilha funcional do produto chegou em um estado bom:

- `web-react/` consolidado semanticamente
- base autenticada preservada
- QA aprovando a rodada de consolidacao operacional

Depois disso, o proximo passo foi preparar rollout por imagem no Coolify, seguindo a estrategia recomendada:

- usar imagem pronta do GHCR
- evitar build local do repo no Coolify
- travar o deploy em imagem versionada quando possivel

## 2. Estado aprovado antes do deploy

Commits relevantes ja publicados em `main`:

- `06b5c4e` `feat: consolidate operational semantics in web-react`
- `bd1216d` `chore: align coolify deploy config with auth`

Arquivos de deploy ajustados e publicados:

- `docker-compose.coolify.image.yaml`
- `docker-compose.coolify.yaml`
- `.env.coolify.example`
- `coolify_deploy_guide.md`

Ajustes feitos nessa rodada de deploy:

- healthcheck do app deixou de bater em `/api/pcp/overview`
- healthcheck passou a usar `/`, porque `overview` agora exige autenticacao
- `PCP_AUTH_TOKEN_SECRET` entrou explicitamente no pacote de deploy
- a documentacao passou a sugerir uso de tag por SHA para evitar drift

## 3. Evidencia objetiva do problema atual

Ao tentar subir no Coolify com:

- `PCP_IMAGE=ghcr.io/pradocmd/saars-inplast:sha-bd1216d61bc8020b93e6a1d805fced92b33de8dd`

o deploy falhou com:

```text
failed to resolve reference "ghcr.io/pradocmd/saars-inplast:sha-bd1216d61bc8020b93e6a1d805fced92b33de8dd": not found
```

Leitura objetiva:

- o problema nao esta no compose em si
- o problema esta na disponibilidade real do artefato de imagem/tag no GHCR

## 4. Hipoteses mais provaveis

### Hipotese A

O workflow `Publish Docker Image` ainda nao publicou a tag `sha-*` para esse commit.

### Hipotese B

O workflow rodou, mas falhou antes de publicar a imagem.

### Hipotese C

A estrategia de tagging do workflow e diferente da expectativa do deploy.

### Hipotese D

Existe restricao de visibilidade/permissao no pacote `ghcr.io/pradocmd/saars-inplast`.

## 5. O que ja esta confirmado no repositorio

Workflow encontrado:

- `.github/workflows/publish-image.yml`

Ele declara publicacao em push para `main` com tags:

- `main`
- `latest`
- `sha-*`

Isso significa que, em teoria, a tag por SHA deveria existir depois da publicacao bem-sucedida.

## 6. O que este incidente nao e

Nao tratar este incidente como:

- bug de UX
- regressao funcional do `web-react`
- problema da autenticacao do app
- problema do compose por causa de empresa/papel/multiempresa

O problema atual e de trilha de release/deploy.

## 7. Decisao recomendada de triagem

### Trilha 1: `CODE Reviewer`

Objetivo:

- investigar o workflow do GitHub Actions
- confirmar por que a tag `sha-*` nao foi encontrada
- revisar publish, tags, registry e permissoes

### Trilha 2: `Implementation / Full Stack / Reliability`

Objetivo:

- fechar a remediacao operacional de deploy
- ajustar estrategia de rollout, compose, guias e fallback seguro
- garantir que o Coolify receba um caminho de release reproduzivel

### Trilha 3: `SPEC Reviewer`

Objetivo:

- reorganizar a documentacao de release, deploy e governanca
- consolidar o que e estado aprovado, o que e incidente de release e qual e o fluxo certo de rollout

## 8. Recomendacao de paralelizacao

Sim, faz sentido paralelizar:

- `CODE Reviewer`
- `Implementation / Full Stack / Reliability`

Com divisao clara:

- `CODE Reviewer` investiga causa e confirma a estrategia de release correta
- `Implementation / Reliability` prepara ou aplica a correcao operacional

O `SPEC Reviewer` pode entrar em paralelo tambem, desde que focado em documentacao e governanca, sem alterar produto.

## 9. Resultado esperado desta trilha

Para considerar o incidente encerrado, o time precisa conseguir:

1. identificar se a imagem `sha-*` realmente existe ou por que nao existe
2. definir se o Coolify deve usar `main`, `latest` ou `sha-*`
3. validar se o GHCR esta publico ou exige credenciais
4. publicar um caminho de deploy que suba no Coolify sem drift entre versao testada e versao implantada
5. consolidar a documentacao para que a proxima pessoa nao precise reconstruir esse contexto do zero

# Relatorio: remediacao da trilha de release GHCR e deploy no Coolify

Data: 2026-04-10
Projeto: `saars.inplast`
Origem: rodada de `CODE Reviewer`
Escopo: investigar o incidente de tag ausente no GHCR, corrigir o ponto de alta confianca e consolidar a estrategia correta de release por imagem para o Coolify
Status ao fim desta rodada: causa confirmada, patch aplicado, aguardando reteste operacional da trilha de publish/deploy

## 1. Resumo executivo

O incidente nao era do Coolify, do compose nem do app em si.

O erro aconteceu porque o deploy tentou usar:

```text
ghcr.io/pradocmd/saars-inplast:sha-bd1216d61bc8020b93e6a1d805fced92b33de8dd
```

mas o workflow do GitHub Actions publicava `sha-` curta por padrao.

Na pratica:

- a tag longa `sha-bd1216d61bc8020b93e6a1d805fced92b33de8dd` nao existia no GHCR
- a tag que existia para esse commit era `sha-bd1216d`
- `main` e `latest` estavam publicados normalmente

Portanto, a causa confirmada foi desencontro entre:

- expectativa de release imutavel por SHA completa
- comportamento real do `docker/metadata-action` configurado com `type=sha` sem `format=long`

## 2. Evidencia objetiva coletada

### 2.1 Estado do commit

Foi confirmado localmente que:

- `bd1216d61bc8020b93e6a1d805fced92b33de8dd` existe
- esse commit esta em `main`
- esse commit corresponde a `chore: align coolify deploy config with auth`

### 2.2 Estado do workflow

Antes da correcao, o workflow em `.github/workflows/publish-image.yml` usava:

```yaml
type=sha,prefix=sha-
```

Segundo a documentacao oficial do `docker/metadata-action`, `type=sha` gera SHA curta por padrao, e `format=long` e necessario para a tag com commit completo.

Referencia oficial:

- [Docker Metadata action](https://github.com/marketplace/actions/docker-metadata-action)

### 2.3 Estado real do GHCR

Foi consultado o registry do GHCR com token anonimo de pull para `pradocmd/saars-inplast`.

Resultados confirmados:

- `ghcr.io/pradocmd/saars-inplast:main` respondeu `200`
- `ghcr.io/pradocmd/saars-inplast:latest` respondeu `200`
- `ghcr.io/pradocmd/saars-inplast:sha-bd1216d61bc8020b93e6a1d805fced92b33de8dd` respondeu `404`
- `ghcr.io/pradocmd/saars-inplast:sha-bd1216d` respondeu `200`

Leitura tecnica:

- o pacote esta utilizavel para pull anonimo no estado atual
- o problema principal nao foi permissao do GHCR
- o problema principal foi naming/tagging da imagem

## 3. Correcoes aplicadas

### 3.1 Workflow de publish

Arquivo:

- `.github/workflows/publish-image.yml`

Correcao:

```yaml
type=sha,format=long,prefix=sha-
```

Objetivo:

- alinhar o publish real do GHCR com a estrategia de release por SHA completa
- permitir que o Coolify use uma tag imutavel e rastreavel por commit aprovado

### 3.2 Documentacao de deploy

Arquivos ajustados:

- `.env.coolify.example`
- `coolify_deploy_guide.md`

Alinhamentos feitos:

- `main` fica como trilha movel para homologacao ou validacao rapida
- `latest` fica apenas como alias, nao como padrao de release
- `sha-<40 caracteres>` passa a ser o padrao recomendado para rollout aprovado
- foi registrado que imagens antigas podem existir apenas com `sha-` curta

## 4. Estrategia correta de release por imagem

### Padrao recomendado

Para rollout aprovado no Coolify:

```text
usar PCP_IMAGE=ghcr.io/pradocmd/saars-inplast:sha-<commit completo>
```

Motivo:

- evita drift entre o que foi testado e o que foi implantado
- permite rastrear a imagem diretamente ao commit aprovado
- reduz ambiguidade operacional em rollback e auditoria

### Quando usar `main`

Somente para:

- homologacao
- validacao rapida
- smoke deploy

### Quando usar `latest`

Nao deve ser o padrao de release.

Ele nao agrega governanca adicional sobre `main`.

## 5. Limitacao importante desta rodada

O patch corrige a estrategia futura, mas nao recria automaticamente a tag longa do commit antigo.

Ou seja:

- `sha-bd1216d61bc8020b93e6a1d805fced92b33de8dd` ainda nao passara a existir por magia
- sera preciso um novo ciclo de publish para gerar uma imagem com `sha-<40 caracteres>` sob o workflow corrigido

Para o incidente imediato, existem dois caminhos:

1. usar a tag curta ja existente para esse commit:

```text
ghcr.io/pradocmd/saars-inplast:sha-bd1216d
```

2. publicar uma nova imagem apos push do patch atual, e entao usar a nova tag longa gerada pelo workflow

## 6. Validacoes executadas

### 6.1 Validacoes locais

- leitura obrigatoria de `SPEC.json`, `BACKLOG.json`, handoff e relatorio do incidente
- revisao de:
  - `.github/workflows/publish-image.yml`
  - `docker-compose.coolify.image.yaml`
  - `docker-compose.coolify.yaml`
  - `.env.coolify.example`
  - `coolify_deploy_guide.md`
  - `Dockerfile`
  - `docker/start-pcp.sh`
- confirmacao por `git` de que `bd1216d...` e `HEAD` de `main`
- validacao automatica do workflow alterado para garantir `format=long`

### 6.2 Validacoes remotas

Consultas diretas ao GHCR confirmaram:

- token anonimo de pull disponivel
- manifests `main` e `latest` existentes
- manifest da SHA longa inexistente
- manifest da SHA curta existente

## 7. Riscos residuais

- a publicacao da nova tag longa ainda depende de novo run do GitHub Actions apos push ou `workflow_dispatch`
- se o pacote GHCR tiver sua visibilidade alterada no futuro, o Coolify pode passar a exigir credenciais, mas isso nao explica este incidente
- a documentacao externa ou handoffs antigos que mencionem SHA longa para commits ja publicados antes desta correcao continuam potencialmente enganosos

## 8. Conclusao

O incidente de release foi explicado com evidencia.

Resposta curta:

1. a tag nao foi encontrada porque nunca foi publicada com SHA completa
2. o workflow publicava `sha-` curta por padrao
3. o GHCR esta acessivel para pull no estado atual
4. a estrategia correta para o Coolify e usar `sha-<commit completo>` como release aprovada, mantendo `main` apenas como trilha movel

O proximo passo correto agora e retestar a trilha de publish/deploy com um agente de `TESTE Auditor`, confirmando:

- que o workflow corrigido passa a publicar SHA longa
- que o Coolify consegue resolver a nova imagem
- que `main` continua funcional como fallback movel

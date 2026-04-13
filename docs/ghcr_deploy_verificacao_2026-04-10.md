# GHCR Deploy - Verificação

**Data:** 2026-04-10

## Nome do Pacote

```
ghcr.io/PradoCMD/saars-inplast
```

O pacote está publicado como **público** (Public) no GitHub Container Registry.

## Comando para Docker Pull

### Sem login (para imagens públicas):
```bash
docker pull ghcr.io/PradoCMD/saars-inplast:main
```

### Com SHA específico:
```bash
docker pull ghcr.io/PradoCMD/saars-inplast:sha-bd1216d
```

### Latest:
```bash
docker pull ghcr.io/PradoCMD/saars-inplast:latest
```

## Login Necessário?

**Não é necessário login** para imagens públicas do GHCR.

O Docker por padrão consegue fazer pull de imagens públicas sem autenticação.

## Notas

- O nome do pacote no workflow é `saars-inplast` (com hífen)
- Repository owner: `PradoCMD`
- Tags disponíveis: `main`, `latest`, `sha-<commit>`

## Possíveis Problemas

Se o pull falhar:

1. **Erro de rede** - verificar conexão com ghcr.io
2. **Tag não existe** - verificar se a tag foi realmente publicada no GHCR
3. **Cache Docker** - usar `--no-cache` ou `docker system prune`

### Com login (se necessário):
```bash
echo $GHCR_TOKEN | docker login ghcr.io -u PradoCMD --password-stdin
```
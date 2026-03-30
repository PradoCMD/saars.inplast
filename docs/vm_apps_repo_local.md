# Repositorio Local na VM Apps

Objetivo:

- manter o repositorio no GitHub como fonte oficial
- manter uma copia local estavel na `vm-apps`
- usar essa copia local para `n8n`, parsers e arquivos auxiliares

## Caminho recomendado

```bash
/opt/saars.inplast
```

## Primeiro clone

Se o repositorio for publico:

```bash
git clone https://github.com/PradoCMD/saars.inplast.git /opt/saars.inplast
```

Ou usando o script do proprio repo:

```bash
bash /opt/saars.inplast/scripts/bootstrap_vm_apps_repo.sh
```

Se ainda nao existir uma copia local do repo, faca assim:

```bash
sudo mkdir -p /opt
sudo chown "$USER":"$USER" /opt
git clone https://github.com/PradoCMD/saars.inplast.git /opt/saars.inplast
```

## Atualizacao

```bash
git -C /opt/saars.inplast pull --ff-only origin main
```

Ou usando o script:

```bash
bash /opt/saars.inplast/scripts/update_vm_apps_repo.sh
```

## Variaveis recomendadas para o n8n

```env
PCP_REPO_ROOT=/opt/saars.inplast
PCP_ALMOX_WORKBOOK=/data/ingest/Estoque Almoxarifado.xlsx
```

## Pastas importantes

- `parsers/`: scripts usados pelo workflow de almoxarifado
- `database/`: SQL do schema e permissoes
- `n8n/`: workflows para importar
- `docs/`: guias operacionais

## Fluxo recomendado

1. GitHub recebe a versao nova.
2. `vm-apps` roda `git pull`.
3. Coolify faz deploy do app pelo repo Git.
4. `n8n` usa a copia local em `/opt/saars.inplast`.

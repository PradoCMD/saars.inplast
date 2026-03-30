#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${1:-https://github.com/PradoCMD/saars.inplast.git}"
TARGET_DIR="${2:-/opt/saars.inplast}"
BRANCH="${3:-main}"

if ! command -v git >/dev/null 2>&1; then
  echo "git nao encontrado. Instale o git antes de continuar."
  exit 1
fi

if [ -d "$TARGET_DIR/.git" ]; then
  echo "Repositorio ja existe em $TARGET_DIR"
  echo "Use scripts/update_vm_apps_repo.sh para atualizar."
  exit 0
fi

mkdir -p "$(dirname "$TARGET_DIR")"
git clone --branch "$BRANCH" "$REPO_URL" "$TARGET_DIR"

echo "Repositorio clonado em $TARGET_DIR"
echo "Sugestao de variaveis para n8n:"
echo "  PCP_REPO_ROOT=$TARGET_DIR"
echo "  PCP_ALMOX_WORKBOOK=/data/ingest/Estoque Almoxarifado.xlsx"

#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-/opt/saars.inplast}"
BRANCH="${2:-main}"

if [ ! -d "$TARGET_DIR/.git" ]; then
  echo "Repositorio nao encontrado em $TARGET_DIR"
  echo "Use scripts/bootstrap_vm_apps_repo.sh primeiro."
  exit 1
fi

git -C "$TARGET_DIR" fetch origin
git -C "$TARGET_DIR" checkout "$BRANCH"
git -C "$TARGET_DIR" pull --ff-only origin "$BRANCH"

echo "Repositorio atualizado em $TARGET_DIR"

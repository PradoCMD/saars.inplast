#!/bin/sh
set -eu

app_root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

if [ "${PCP_DATA_MODE:-mock}" = "postgres" ]; then
  : "${PCP_POSTGRES_SUPERPASSWORD:?PCP_POSTGRES_SUPERPASSWORD is required in postgres mode}"
  : "${PCP_APP_DB_PASSWORD:?PCP_APP_DB_PASSWORD is required in postgres mode}"
  : "${PCP_INTEGRATION_DB_PASSWORD:?PCP_INTEGRATION_DB_PASSWORD is required in postgres mode}"

  export POSTGRES_USER="${PCP_POSTGRES_SUPERUSER:-postgres}"
  export POSTGRES_DB="${PCP_POSTGRES_DB:-inplast_pcp}"
  export PGPASSWORD="${PCP_POSTGRES_SUPERPASSWORD}"
  export PGHOST="${PCP_POSTGRES_HOST:-pcp-postgres}"
  export PGPORT="${PCP_POSTGRES_INTERNAL_PORT:-5432}"
  export PCP_SCHEMA_DIR="${app_root}/database"

  echo "Bootstrapping PCP Postgres at ${PGHOST}:${PGPORT}/${POSTGRES_DB}..."
  /bin/sh "${app_root}/docker/postgres/init/01-bootstrap-pcp.sh"
fi

exec python3 "${app_root}/server.py"

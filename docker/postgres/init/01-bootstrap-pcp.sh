#!/bin/sh
set -eu

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${PCP_APP_DB_PASSWORD:?PCP_APP_DB_PASSWORD is required}"
: "${PCP_INTEGRATION_DB_PASSWORD:?PCP_INTEGRATION_DB_PASSWORD is required}"

sql_escape_for_file() {
  printf '%s' "$1" | sed -e "s/'/''/g" -e 's/[&|\\]/\\&/g'
}

app_password_escaped="$(sql_escape_for_file "$PCP_APP_DB_PASSWORD")"
integration_password_escaped="$(sql_escape_for_file "$PCP_INTEGRATION_DB_PASSWORD")"
tmp_sql="/tmp/pcp_postgres_roles_permissions.sql"

echo "Applying PCP schema to database ${POSTGRES_DB}..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -f /opt/pcp/database/pcp_operacional_postgres.sql

echo "Applying PCP roles and permissions..."
sed \
  -e "s|CHANGE_ME_PCP_APP|${app_password_escaped}|g" \
  -e "s|CHANGE_ME_PCP_INTEGRATION|${integration_password_escaped}|g" \
  /opt/pcp/database/pcp_postgres_roles_permissions.sql > "$tmp_sql"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -f "$tmp_sql"

rm -f "$tmp_sql"

echo "PCP Postgres bootstrap complete."

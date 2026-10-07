#!/bin/sh
set -eu
: "${APP_DB_PASSWORD:?Configure APP_DB_PASSWORD}"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v app_password="$APP_DB_PASSWORD" <<'SQL'
ALTER ROLE persoo_app PASSWORD :'app_password';
SQL

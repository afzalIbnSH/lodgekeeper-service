#!/usr/bin/env bash
set -Eeuo pipefail

: "${APP_DB_USER:?APP_DB_USER must be set}"
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD must be set}"
: "${MIGRATION_DB_USER:?MIGRATION_DB_USER must be set}"
: "${MIGRATION_DB_PASSWORD:?MIGRATION_DB_PASSWORD must be set}"
: "${POSTGRES_DB:?POSTGRES_DB must be set}"
: "${POSTGRES_TEST_DB:?POSTGRES_TEST_DB must be set}"
: "${POSTGRES_USER:?POSTGRES_USER must be set}"

psql \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=app_user="$APP_DB_USER" \
  --set=app_password="$APP_DB_PASSWORD" \
  --set=migration_user="$MIGRATION_DB_USER" \
  --set=migration_password="$MIGRATION_DB_PASSWORD" \
  --set=runtime_group="lodgekeeper_runtime" \
  --set=main_database="$POSTGRES_DB" \
  --set=test_database="$POSTGRES_TEST_DB" <<'SQL'
select format(
  'create role %I nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls',
  :'runtime_group'
)
where not exists (
  select from pg_roles where rolname = :'runtime_group'
)
\gexec

select format(
  'create role %I login password %L inherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls in role %I',
  :'app_user',
  :'app_password',
  :'runtime_group'
)
where not exists (
  select from pg_roles where rolname = :'app_user'
)
\gexec

select format(
  'create role %I login password %L noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls',
  :'migration_user',
  :'migration_password'
)
where not exists (
  select from pg_roles where rolname = :'migration_user'
)
\gexec

select format(
  'alter database %I owner to %I',
  :'main_database',
  :'migration_user'
)
\gexec

select format(
  'create database %I owner %I',
  :'test_database',
  :'migration_user'
)
where not exists (
  select from pg_database where datname = :'test_database'
)
\gexec
SQL

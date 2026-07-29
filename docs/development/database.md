# Database development

## Local PostgreSQL

The development database runs from `compose.yml` and is published only on
`127.0.0.1`, using port 5433 by default. Configuration values in `.env` can
override its database names, credentials and port.

On first initialization, scripts in `docker/postgres/init` provision the local
roles and test database. PostgreSQL's container entrypoint runs those scripts
only for a new data volume; restarting an existing container does not run them
again.

Start the database with:

```sh
docker compose up --detach --wait
```

## Connection roles

The running application and migration tooling use separate connections:

| Variable                 | Local role          | Purpose                       |
| ------------------------ | ------------------- | ----------------------------- |
| `DATABASE_URL`           | `lodgekeeper_app`   | Restricted application access |
| `MIGRATION_DATABASE_URL` | `lodgekeeper_owner` | Schema migrations             |

`lodgekeeper_runtime` is the non-login privilege role inherited by the
application login. Environments applying the migrations must provision this
role before the first migration because the SQL grants privileges to it by
name. Example credentials are intended only for local development.

## Migration workflow

Migrations are version-controlled in `src/database/migrations` and are the
authoritative database schema. The application does not synchronize the schema
automatically at startup.

Generate a migration after changing entity metadata:

```sh
npm run db:create-migration
```

MikroORM-generated migrations are starting diffs and must be reviewed before
they are applied. Entity metadata represents the ordinary relational schema,
including its checks, indexes, composite foreign keys and effective-rate
exclusion constraint. Update triggers are declared in the metadata too, while
their shared function remains PostgreSQL-specific. The migration adds the
infrastructure that remains outside entity metadata:

- The `btree_gist` extension
- Tenant-context and shared update functions
- Row-level security policies and grants

Schema generation explicitly ignores the handwritten function and trigger
layer. Preserve the PostgreSQL-only additions when editing a generated migration
or reviewing a later schema diff. Commit the named schema snapshot alongside
the migration that updates it.

Apply or revert migrations with:

```sh
npm run db:migrate
npm run db:migrate:down
```

The MikroORM CLI loads `mikro-orm.config.ts`, which selects
`MIGRATION_DATABASE_URL`. Applied migration names are recorded in the
`mikro_orm_migrations` table.

## Integration tests

Copy `.env.test.example` to `.env.test` when the local defaults are unsuitable.
The test suite applies pending migrations programmatically and then connects as
the restricted application role. As a safety check, both connection URLs must
target the same host, port and database, and the database name must contain
`test` as a distinct segment:

```sh
npm run test:integration
```

The suite exercises tenant visibility, transaction-local tenant context,
cross-tenant write and reference rejection, unit-kind defaults, RLS enforcement,
runtime-role restrictions and effective-rate overlap protection.

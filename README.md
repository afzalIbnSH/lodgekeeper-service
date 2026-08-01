# Lodgekeeper Service

The backend service for Lodgekeeper, a tenant-aware lodging management
application.

It is built with NestJS, MikroORM and PostgreSQL. Runtime versions and exact
dependency versions are pinned in `.nvmrc`, `package.json` and `compose.yml`.

## Prerequisites

- Node.js matching `.nvmrc` (using nvm is recommended)
- Docker with Docker Compose

## Local development

Install dependencies and create the local environment file:

```sh
nvm use
npm install
cp .env.example .env
```

Start PostgreSQL and apply the database migrations:

```sh
docker compose up --detach --wait
npm run db:migrate
```

The local PostgreSQL instance is published only on `127.0.0.1`, using port 5433
by default. Database credentials, ports, connection-pool settings and SSL
options are configurable through `.env`.

Start the application in watch mode:

```sh
npm run start:dev
```

## Common commands

| Command                       | Purpose                              |
| ----------------------------- | ------------------------------------ |
| `npm run start:dev`           | Start the application in watch mode  |
| `npm run build`               | Compile the production application   |
| `npm run start:prod`          | Run the compiled application         |
| `npm run lint`                | Run ESLint                           |
| `npm run typecheck:tools`     | Type-check development tooling       |
| `npm test`                    | Run the integration test suite       |
| `npm run db:create-migration` | Generate a migration from metadata   |
| `npm run db:migrate`          | Apply pending migrations             |
| `npm run db:migrate:down`     | Revert the most recent migration     |
| `npm run provision:tenant`    | Provision a tenant and initial admin |

## Documentation

- [Accommodation domain](docs/architecture/accommodation.md)
- [Tenant isolation](docs/architecture/tenant-isolation.md)
- [Identity and access](docs/architecture/identity-and-access.md)
- [Database development](docs/development/database.md)
- [Tenant provisioning](docs/development/tenant-provisioning.md)

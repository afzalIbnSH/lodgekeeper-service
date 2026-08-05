# Lodgekeeper repository guidance

## Start with the project sources

- Read `README.md` for commands and repository entry points.
- Read the relevant documents under `docs/architecture` and
  `docs/development` before changing a domain or database workflow.
- Treat the code, migrations and current documentation as the source of truth.
  Do not infer current behaviour from old discussions or rejected designs.
- Use the Node.js version in `.nvmrc`. Dependency and runtime versions are
  pinned; do not upgrade them unless the task explicitly asks for it.

## Working approach

- For non-trivial product, API or database design, present a concise plan and
  resolve material business decisions before editing code.
- Prefer the smallest implementation that serves the current lodge while
  preserving established tenant and property boundaries. Do not add generic
  frameworks, speculative roles or workflows, or abstractions without a
  current use.
- Preserve unrelated worktree changes. Do not reset, delete or recreate local
  data unless the user explicitly authorizes it.
- Use conventional branch names such as `feat/...`, `fix/...` and `test/...`;
  do not add a `codex/` prefix.
- Do not commit or push unless requested. Use Conventional Commit titles when
  a commit is requested.

## Architecture invariants

- PostgreSQL row-level security is the tenant boundary. The application uses a
  restricted runtime role that cannot bypass RLS.
- Never accept `tenantId` from a path, query parameter or request body for an
  authenticated business operation. Obtain it from the authenticated
  principal.
- Run all tenant-owned database work through `TenantTransaction.run(...)`.
  Inside its callback, use only the provided transactional `EntityManager` for
  operations that belong to that unit of work.
- Tenant context is transaction-local. Do not introduce connection-scoped
  tenant state that could leak through the pool.
- Property-specific references must remain within the authenticated tenant and
  selected property. Preserve the composite foreign-key protections.
- The non-RLS `users` table is deliberate: login finds a globally unique email
  before the tenant is known. Do not weaken RLS on other tenant-owned tables.
- Tenants and initial properties are created through the standalone
  provisioner. There is no self-sign-up flow or public tenant-administration
  API.
- Authentication uses opaque, database-backed server-side sessions. Do not
  replace them with JWTs without an explicit design decision.
- Business records that support archiving must not be physically deleted by
  ordinary application flows.

## NestJS and API conventions

- Keep domain logic in the existing domain module rather than creating a
  generic catch-all module.
- Use explicit `@Inject(...)` constructor injection. The project runs
  TypeScript through `tsx`, so do not rely solely on emitted constructor-type
  metadata.
- Use class-validator DTOs for HTTP input. The global validation pipe
  transforms input, strips unknown fields and rejects non-whitelisted fields.
- Validate at the HTTP/application boundary so expected mistakes produce
  useful client errors instead of raw database errors.
- Return explicit plain response objects or response DTOs. Do not expose
  MikroORM entities, relations, password data, token hashes or database error
  details directly.
- Use established HTTP semantics: malformed input is `400`, missing
  authentication is `401`, inaccessible or absent tenant-owned data is `404`,
  and expected uniqueness or period conflicts are `409`.
- Keep currency values out of floating-point fields. Follow the domain model's
  minor-unit representation and choose a JSON-safe representation for database
  `bigint` values.
- Keep dates and local operating times unambiguous at the API boundary.
- Do not add API versioning, pagination frameworks, Swagger, generic
  repositories or speculative RBAC unless the current task needs them.

## Database and migrations

- Version-controlled MikroORM migrations are the authoritative schema. The
  application must not synchronize the schema automatically at startup.
- Entity metadata uses MikroORM's `defineEntity` API. Do not switch to legacy
  decorators.
- Generate ordinary relational schema changes with MikroORM, then review and
  edit the generated migration where PostgreSQL-specific functions, triggers,
  grants or RLS policies are required.
- Preserve the handwritten RLS, database-function, trigger and grant layers
  when reviewing later schema diffs.
- Keep the named MikroORM schema snapshot synchronized with migration changes.
- Do not create or modify a migration when a task changes only application
  behaviour.
- Database roles are cluster-level bootstrap concerns and do not belong in
  ordinary schema migrations.

## Testing and verification

- Unit-test pure parsing, validation, mapping and cryptographic wrapper
  behaviour without booting Nest or mocking MikroORM unnecessarily.
- Use the real PostgreSQL integration suite for RLS, migrations, constraints,
  grants, persistence mappings and HTTP/database workflows.
- Integration specs reset the test schemas and must run sequentially. Preserve
  the test-database target safety checks.
- Add focused regression coverage with every behavioural fix. Moving a check
  to a faster unit test is fine when database behaviour is not involved.
- Before handing off completed code, run:

  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run build`
  - `npm run typecheck:tools`
  - `npm run lint`
  - `git diff --check`

## Documentation and deferred work

- Documentation describes only the current what and how of the software. Do
  not record conversation history, rejected alternatives or temporary session
  details.
- Keep `README.md` as a stable project entry point. Put architecture,
  development workflows and API details in the appropriate document under
  `docs`.
- Do not maintain a general `TODO.md`. Track deferred work in GitHub Issues and
  use sparse issue-linked TODO comments only when the code location needs the
  reminder.
- Never include credentials, invitation links, session cookies or other
  secrets in source files, tests, documentation or commits.

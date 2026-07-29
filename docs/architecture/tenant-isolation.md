# Tenant isolation

Lodgekeeper uses PostgreSQL row-level security (RLS) as its database tenant
boundary.

## Tenant ownership

The `tenants` table is the root of the ownership hierarchy. Every other
tenant-owned row carries a non-null `tenant_id`. Property-specific rows also
carry `property_id` where it is needed to enforce property consistency.

Composite foreign keys prevent records from referring to another tenant's
property, rental policy, unit type or amenity. These constraints complement RLS:
RLS controls row visibility and writes, while foreign keys protect references
between rows.

## Row-level security

RLS is enabled and forced on every tenant-owned table. The `tenants` policy
compares its primary key with the current tenant; other policies compare their
`tenant_id` column:

```sql
tenant_id = app.current_tenant_id()
```

Policies define both `USING` and `WITH CHECK` expressions so that the boundary
applies to reads, inserts, updates and deletes. With no tenant context, the
expression does not match any tenant rows.

The application connects through a restricted, non-owner role that cannot
bypass RLS. Schema migrations use a separate privileged connection. See
[Database development](../development/database.md) for role provisioning and
connection configuration.

## Transaction context

Tenant-owned work must run through `TenantTransaction`:

```ts
await tenantTransaction.run(tenantId, async (entityManager) => {
  // All database work here uses the transaction-local tenant context.
});
```

The wrapper starts a transaction and executes:

```sql
select set_config('app.current_tenant_id', ?, true)
```

The final argument makes the setting local to that transaction. It is therefore
cleared when the transaction commits or rolls back and cannot leak through the
connection pool.

MikroORM propagates the active transaction through its context, but passing the
transactional entity manager explicitly keeps the boundary visible to callers.
The tenant identifier supplied to this wrapper must come from trusted
authentication context rather than request-controlled input.

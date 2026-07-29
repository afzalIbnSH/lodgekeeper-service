import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import dotenv from 'dotenv';

import {
  AccommodationUnitKind,
  AccommodationUnitType,
} from '../src/accommodation/entities/accommodation-unit-type.entity';
import { AccommodationUnitTypeAmenity } from '../src/accommodation/entities/accommodation-unit-type-amenity.entity';
import { AccommodationUnit } from '../src/accommodation/entities/accommodation-unit.entity';
import { Amenity } from '../src/accommodation/entities/amenity.entity';
import { Property as LodgingProperty } from '../src/accommodation/entities/property.entity';
import { Tenant } from '../src/accommodation/entities/tenant.entity';
import { DatabaseEnvironment } from '../src/config/environment';
import { createMikroOrmOptions } from '../src/database/mikro-orm.options';
import { TenantTransaction } from '../src/database/tenant-transaction';
import { assertSafeTestDatabaseUrls } from './test-database-safety';

dotenv.config({ path: '.env.test', quiet: true });

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://lodgekeeper_app:lodgekeeper_app@localhost:5433/lodgekeeper_test';

const TEST_MIGRATION_DATABASE_URL =
  process.env.MIGRATION_DATABASE_URL ??
  'postgresql://lodgekeeper_owner:lodgekeeper_owner@localhost:5433/lodgekeeper_test';

assertSafeTestDatabaseUrls(TEST_DATABASE_URL, TEST_MIGRATION_DATABASE_URL);

function testDatabaseEnvironment(clientUrl: string): DatabaseEnvironment {
  return {
    clientUrl,
    debug: false,
    poolMax: 5,
    poolMin: 1,
    ssl: false,
    sslRejectUnauthorized: true,
  };
}

function hasDatabaseCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

void describe('integration database safety', () => {
  void it('rejects non-test and mismatched database targets', () => {
    assert.throws(
      () =>
        assertSafeTestDatabaseUrls(
          'postgresql://app:secret@localhost:5433/lodgekeeper',
          'postgresql://owner:secret@localhost:5433/lodgekeeper',
        ),
      /must target a database with "test" as a distinct name segment/,
    );

    assert.throws(
      () =>
        assertSafeTestDatabaseUrls(
          'postgresql://app:secret@localhost:5433/lodgekeeper_test',
          'postgresql://owner:secret@localhost:5433/another_test',
        ),
      /must target the same test database/,
    );
  });
});

void describe('accommodation database', () => {
  let orm: MikroORM;
  let tenantTransaction: TenantTransaction;

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const propertyA = randomUUID();
  const propertyB = randomUUID();
  const policyA = randomUUID();
  const policyB = randomUUID();
  const unitTypeA = randomUUID();
  const unitTypeB = randomUUID();

  async function asTenant<T>(
    tenantId: string,
    work: (transaction: EntityManager) => Promise<T>,
  ): Promise<T> {
    return tenantTransaction.run(tenantId, work);
  }

  before(async () => {
    const migrationOrm = await MikroORM.init(
      createMikroOrmOptions(
        testDatabaseEnvironment(TEST_MIGRATION_DATABASE_URL),
      ),
    );

    await migrationOrm.migrator.up();
    await migrationOrm.close(true);

    orm = await MikroORM.init(
      createMikroOrmOptions(testDatabaseEnvironment(TEST_DATABASE_URL)),
    );
    tenantTransaction = new TenantTransaction(orm.em.fork());

    await asTenant(tenantA, async (transaction) => {
      await transaction.execute(
        'insert into tenants (id, name) values (?, ?)',
        [tenantA, 'Tenant A'],
      );
      await transaction.execute(
        `insert into properties
          (id, tenant_id, name, currency_code, timezone)
         values (?, ?, ?, ?, ?)`,
        [propertyA, tenantA, 'Property A', 'INR', 'Asia/Kolkata'],
      );
      await transaction.execute(
        `insert into rental_policies
          (
            id,
            tenant_id,
            property_id,
            name,
            kind,
            duration_minutes,
            grace_period_minutes
          )
         values (?, ?, ?, ?, ?, ?, ?)`,
        [
          policyA,
          tenantA,
          propertyA,
          'Strict 24 hours',
          'rolling_duration',
          1_440,
          30,
        ],
      );
      await transaction.execute(
        `insert into accommodation_unit_types
          (
            id,
            tenant_id,
            property_id,
            rental_policy_id,
            name,
            max_occupancy
          )
         values (?, ?, ?, ?, ?, ?)`,
        [unitTypeA, tenantA, propertyA, policyA, 'Double room with AC', 2],
      );
    });

    await asTenant(tenantB, async (transaction) => {
      await transaction.execute(
        'insert into tenants (id, name) values (?, ?)',
        [tenantB, 'Tenant B'],
      );
      await transaction.execute(
        `insert into properties
          (id, tenant_id, name, currency_code, timezone)
         values (?, ?, ?, ?, ?)`,
        [propertyB, tenantB, 'Property B', 'USD', 'America/New_York'],
      );
      await transaction.execute(
        `insert into rental_policies
          (
            id,
            tenant_id,
            property_id,
            name,
            kind,
            duration_minutes,
            grace_period_minutes
          )
         values (?, ?, ?, ?, ?, ?, ?)`,
        [
          policyB,
          tenantB,
          propertyB,
          'Strict 24 hours',
          'rolling_duration',
          1_440,
          0,
        ],
      );
      await transaction.execute(
        `insert into accommodation_unit_types
          (
            id,
            tenant_id,
            property_id,
            rental_policy_id,
            name,
            max_occupancy
          )
         values (?, ?, ?, ?, ?, ?)`,
        [unitTypeB, tenantB, propertyB, policyB, 'Single room', 1],
      );
    });
  });

  after(async () => {
    await orm.close(true);
  });

  void it('shows only the current tenant and keeps tenant context transaction-local', async () => {
    const tenantAProperties = await asTenant(tenantA, (transaction) =>
      transaction.execute<Array<{ id: string }>>(
        'select id from properties order by id',
      ),
    );

    assert.deepEqual(tenantAProperties, [{ id: propertyA }]);

    const withoutContext = await orm.em
      .fork()
      .execute<Array<{ id: string }>>('select id from properties');

    assert.deepEqual(withoutContext, []);
  });

  void it('defaults new accommodation unit types to room', async () => {
    const unitType = await asTenant(tenantA, (transaction) =>
      transaction.findOneOrFail(AccommodationUnitType, { id: unitTypeA }),
    );

    assert.ok(unitType instanceof AccommodationUnitType);
    assert.equal(unitType.kind, AccommodationUnitKind.ROOM);
  });

  void it('persists tenant-aware composite relationships through MikroORM', async () => {
    await asTenant(tenantA, async (transaction) => {
      const tenant = await transaction.findOneOrFail(Tenant, { id: tenantA });
      const property = await transaction.findOneOrFail(LodgingProperty, {
        id: propertyA,
      });
      const unitType = await transaction.findOneOrFail(AccommodationUnitType, {
        id: unitTypeA,
      });

      const unit = transaction.create(AccommodationUnit, {
        code: 'A-402',
        property,
        tenant,
        unitType,
      });
      const amenity = transaction.create(Amenity, {
        name: 'Attached bathroom',
        tenant,
      });

      transaction.persist(unit);
      transaction.persist(amenity);
      await transaction.flush();

      const mapping = transaction.create(AccommodationUnitTypeAmenity, {
        amenity,
        amenityId: amenity.id,
        property,
        tenant,
        unitType,
        unitTypeId: unitType.id,
      });

      transaction.persist(mapping);
      await transaction.flush();

      const [unitRow] = await transaction.execute<
        Array<{
          accommodation_unit_type_id: string;
          property_id: string;
          tenant_id: string;
        }>
      >(
        `select tenant_id, property_id, accommodation_unit_type_id
         from accommodation_units
         where id = ?`,
        [unit.id],
      );
      const [mappingRow] = await transaction.execute<
        Array<{
          accommodation_unit_type_id: string;
          amenity_id: string;
          property_id: string;
          tenant_id: string;
        }>
      >(
        `select tenant_id, property_id, accommodation_unit_type_id, amenity_id
         from accommodation_unit_type_amenities
         where tenant_id = ? and accommodation_unit_type_id = ? and amenity_id = ?`,
        [tenantA, unitTypeA, amenity.id],
      );

      assert.deepEqual(unitRow, {
        accommodation_unit_type_id: unitTypeA,
        property_id: propertyA,
        tenant_id: tenantA,
      });
      assert.deepEqual(mappingRow, {
        accommodation_unit_type_id: unitTypeA,
        amenity_id: amenity.id,
        property_id: propertyA,
        tenant_id: tenantA,
      });

      transaction.clear();

      const reloadedMapping = await transaction.findOneOrFail(
        AccommodationUnitTypeAmenity,
        {
          amenityId: amenity.id,
          tenant: tenantA,
          unitTypeId: unitTypeA,
        },
        { populate: ['amenity', 'unitType'] },
      );

      assert.equal(reloadedMapping.amenity.id, amenity.id);
      assert.equal(reloadedMapping.amenityId, amenity.id);
      assert.equal(reloadedMapping.unitType.id, unitTypeA);
      assert.equal(reloadedMapping.unitTypeId, unitTypeA);
    });
  });

  void it('rejects writes for a different tenant', async () => {
    await assert.rejects(
      asTenant(tenantA, (transaction) =>
        transaction.execute(
          `insert into properties
            (id, tenant_id, name, currency_code, timezone)
           values (?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            tenantB,
            'Invisible property',
            'USD',
            'America/New_York',
          ],
        ),
      ),
      (error: unknown) => hasDatabaseCode(error, '42501'),
    );
  });

  void it('rejects cross-tenant references even when the row tenant is valid', async () => {
    await assert.rejects(
      asTenant(tenantB, (transaction) =>
        transaction.execute(
          `insert into accommodation_units
            (
              id,
              tenant_id,
              property_id,
              accommodation_unit_type_id,
              code
            )
           values (?, ?, ?, ?, ?)`,
          [randomUUID(), tenantB, propertyB, unitTypeA, 'B-101'],
        ),
      ),
      (error: unknown) => hasDatabaseCode(error, '23503'),
    );
  });

  void it('allows adjacent rates and rejects overlapping rate periods', async () => {
    await asTenant(tenantA, async (transaction) => {
      await transaction.execute(
        `insert into accommodation_unit_type_rates
          (
            tenant_id,
            property_id,
            accommodation_unit_type_id,
            amount_minor,
            valid_from,
            valid_to
          )
         values (?, ?, ?, ?, ?, ?)`,
        [tenantA, propertyA, unitTypeA, 100_000, '2026-01-01', '2026-02-01'],
      );

      await transaction.execute(
        `insert into accommodation_unit_type_rates
          (
            tenant_id,
            property_id,
            accommodation_unit_type_id,
            amount_minor,
            valid_from,
            valid_to
          )
         values (?, ?, ?, ?, ?, ?)`,
        [tenantA, propertyA, unitTypeA, 120_000, '2026-02-01', null],
      );
    });

    await assert.rejects(
      asTenant(tenantA, (transaction) =>
        transaction.execute(
          `insert into accommodation_unit_type_rates
            (
              tenant_id,
              property_id,
              accommodation_unit_type_id,
              amount_minor,
              valid_from,
              valid_to
            )
           values (?, ?, ?, ?, ?, ?)`,
          [tenantA, propertyA, unitTypeA, 110_000, '2026-01-15', '2026-02-15'],
        ),
      ),
      (error: unknown) => hasDatabaseCode(error, '23P01'),
    );
  });

  void it('forces RLS on every tenant-owned table', async () => {
    const rows = await orm.em.fork().execute<
      Array<{
        relforcerowsecurity: boolean;
        relrowsecurity: boolean;
        table_name: string;
      }>
    >(
      `select
         relname as table_name,
         relrowsecurity,
         relforcerowsecurity
       from pg_class
       where relname in (
         'tenants',
         'properties',
         'rental_policies',
         'accommodation_unit_types',
         'accommodation_units',
         'amenities',
         'accommodation_unit_type_amenities',
         'accommodation_unit_type_rates'
       )
       order by relname`,
    );

    assert.equal(rows.length, 8);
    assert.ok(rows.every((row) => row.relrowsecurity));
    assert.ok(rows.every((row) => row.relforcerowsecurity));
  });

  void it('uses a restricted non-owner runtime role', async () => {
    const [role] = await orm.em.fork().execute<
      Array<{
        current_user: string;
        owns_tenants: boolean;
        rolbypassrls: boolean;
        rolsuper: boolean;
      }>
    >(
      `select
         current_user,
         rolsuper,
         rolbypassrls,
         (
           select tableowner = current_user
           from pg_tables
           where schemaname = 'public' and tablename = 'tenants'
         ) as owns_tenants
       from pg_roles
       where rolname = current_user`,
    );

    assert.equal(role?.current_user, 'lodgekeeper_app');
    assert.equal(role?.rolsuper, false);
    assert.equal(role?.rolbypassrls, false);
    assert.equal(role?.owns_tenants, false);
  });
});

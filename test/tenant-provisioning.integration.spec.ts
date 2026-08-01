import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import { MikroORM } from '@mikro-orm/postgresql';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import dotenv from 'dotenv';
import type { INestApplication, INestApplicationContext } from '@nestjs/common';

import { DatabaseEnvironment } from '../src/config/environment';
import { createMikroOrmOptions } from '../src/database/mikro-orm.options';
import { ProvisioningEnvironment } from '../src/provisioning/provisioning.config';
import { ProvisioningModule } from '../src/provisioning/provisioning.module';
import { ProvisioningService } from '../src/provisioning/provisioning.service';
import { resetTestDatabase } from './reset-test-database';
import { assertSafeTestDatabaseUrls } from './test-database-safety';

dotenv.config({ path: '.env.test', quiet: true });

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://lodgekeeper_app:lodgekeeper_app@localhost:5433/lodgekeeper_test';
const TEST_MIGRATION_DATABASE_URL =
  process.env.MIGRATION_DATABASE_URL ??
  'postgresql://lodgekeeper_owner:lodgekeeper_owner@localhost:5433/lodgekeeper_test';
const TEST_PROVISIONING_DATABASE_URL =
  process.env.PROVISIONING_DATABASE_URL ??
  'postgresql://lodgekeeper_provisioner:lodgekeeper_provisioner@localhost:5433/lodgekeeper_test';

assertSafeTestDatabaseUrls(
  TEST_DATABASE_URL,
  TEST_MIGRATION_DATABASE_URL,
  TEST_PROVISIONING_DATABASE_URL,
);

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

void describe('tenant provisioning and account activation', () => {
  let application: INestApplication;
  let baseUrl: string;
  let provisioningApplication: INestApplicationContext;
  let provisionerOrm: MikroORM;
  let provisioner: ProvisioningService;

  before(async () => {
    const migrationOrm = await MikroORM.init(
      createMikroOrmOptions(
        testDatabaseEnvironment(TEST_MIGRATION_DATABASE_URL),
      ),
    );

    await resetTestDatabase(migrationOrm, TEST_MIGRATION_DATABASE_URL);
    await migrationOrm.migrator.up();
    await migrationOrm.close(true);

    const provisioningEnvironment: ProvisioningEnvironment = {
      appPublicUrl: 'http://localhost:3000/',
      database: testDatabaseEnvironment(TEST_PROVISIONING_DATABASE_URL),
      delivery: 'console',
      invitationTtlHours: 48,
      smtpPort: 587,
      smtpSecure: false,
    };

    provisioningApplication = await NestFactory.createApplicationContext(
      ProvisioningModule.register(provisioningEnvironment),
      { logger: false },
    );
    provisioner = provisioningApplication.get(ProvisioningService);
    provisionerOrm = provisioningApplication.get(MikroORM);

    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.DATABASE_DEBUG = 'false';
    process.env.DATABASE_POOL_MAX = '5';
    process.env.DATABASE_POOL_MIN = '1';
    process.env.DATABASE_SSL = 'false';
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = 'true';
    process.env.AUTH_SESSION_COOKIE_SECURE = 'false';

    const { AppModule } = await import('../src/app.module');

    application = await NestFactory.create(AppModule, { logger: ['error'] });
    application.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await application.listen(0, '127.0.0.1');
    baseUrl = await application.getUrl();
  });

  after(async () => {
    await application.close();
    await provisioningApplication.close();
  });

  void it('uses a restricted provisioner role without bypassing RLS', async () => {
    const [role] = await provisionerOrm.em.fork().execute<
      Array<{
        current_user: string;
        rolbypassrls: boolean;
        rolsuper: boolean;
      }>
    >(
      `select current_user, rolsuper, rolbypassrls
       from pg_roles
       where rolname = current_user`,
    );

    assert.equal(role?.current_user, 'lodgekeeper_provisioner');
    assert.equal(role?.rolsuper, false);
    assert.equal(role?.rolbypassrls, false);
  });

  void it('provisions one tenant admin and completes the invitation over HTTP', async () => {
    const email = `admin-${randomUUID()}@example.com`;
    const password = 'correct horse battery staple';
    const result = await provisioner.provisionTenant({
      adminEmail: email,
      currencyCode: 'INR',
      propertyName: 'Town Lodge',
      tenantName: 'Test Lodgekeeper Tenant',
      timezone: 'Asia/Kolkata',
    });

    const acceptance = await fetch(`${baseUrl}/auth/invitations/accept`, {
      body: JSON.stringify({
        displayName: 'Tenant Administrator',
        password,
        tenantId: result.tenantId,
        token: result.invitationToken,
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    assert.equal(acceptance.status, 201);
    const acceptedUser = (await acceptance.json()) as {
      displayName: string;
      email: string;
      role: string;
      tenantId: string;
      userId: string;
    };
    assert.deepEqual(acceptedUser, {
      displayName: 'Tenant Administrator',
      email,
      role: 'tenant_admin',
      tenantId: result.tenantId,
      userId: acceptedUser.userId,
    });

    const setCookie = acceptance.headers.get('set-cookie');
    assert.ok(setCookie);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.match(setCookie, /Path=\//i);
    const cookie = setCookie.split(';', 1)[0];

    const currentUser = await fetch(`${baseUrl}/auth/me`, {
      headers: { cookie },
    });
    assert.equal(currentUser.status, 200);

    const runtimeOrm = application.get(MikroORM);
    const usersWithoutTenant = await runtimeOrm.em
      .fork()
      .execute<Array<{ email: string }>>('select email from users');
    assert.deepEqual(usersWithoutTenant, [{ email }]);

    await assert.rejects(
      runtimeOrm.em
        .fork()
        .execute('update users set display_name = null where email = ?', [
          email,
        ]),
      /users_status_shape_valid/,
    );

    const secondAcceptance = await fetch(`${baseUrl}/auth/invitations/accept`, {
      body: JSON.stringify({
        displayName: 'Another name',
        password,
        tenantId: result.tenantId,
        token: result.invitationToken,
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    assert.equal(secondAcceptance.status, 422);

    const logout = await fetch(`${baseUrl}/auth/logout`, {
      headers: { cookie },
      method: 'POST',
    });
    assert.equal(logout.status, 204);

    const revokedSession = await fetch(`${baseUrl}/auth/me`, {
      headers: { cookie },
    });
    assert.equal(revokedSession.status, 401);

    const rejectedLogin = await fetch(`${baseUrl}/auth/login`, {
      body: JSON.stringify({
        email,
        password: 'this is not the password',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    assert.equal(rejectedLogin.status, 401);
    assert.equal(rejectedLogin.headers.get('set-cookie'), null);

    const login = await fetch(`${baseUrl}/auth/login`, {
      body: JSON.stringify({
        email,
        password,
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    assert.equal(login.status, 200);
    assert.ok(login.headers.get('set-cookie'));
    const loggedInUser = (await login.json()) as typeof acceptedUser;
    assert.equal(loggedInUser.tenantId, result.tenantId);
    assert.equal(loggedInUser.userId, acceptedUser.userId);

    await assert.rejects(
      provisioner.provisionTenant({
        adminEmail: email,
        currencyCode: 'INR',
        propertyName: 'Another property',
        tenantName: 'Another tenant',
        timezone: 'Asia/Kolkata',
      }),
      /A user with this email already exists/,
    );
  });

  void it('leaves users globally readable while forcing RLS on tenant-owned auth tables', async () => {
    const rows = await provisionerOrm.em.fork().execute<
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
         'users',
         'user_invitations',
         'auth_sessions'
       )
       order by relname`,
    );

    assert.deepEqual(rows, [
      {
        relforcerowsecurity: true,
        relrowsecurity: true,
        table_name: 'auth_sessions',
      },
      {
        relforcerowsecurity: true,
        relrowsecurity: true,
        table_name: 'user_invitations',
      },
      {
        relforcerowsecurity: false,
        relrowsecurity: false,
        table_name: 'users',
      },
    ]);
  });
});

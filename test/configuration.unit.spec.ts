import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { databaseEnvironmentFromProcess } from '../src/config/database-environment';
import { validateEnvironment } from '../src/config/environment';
import { provisioningEnvironmentFromProcess } from '../src/provisioning/provisioning.config';

const APPLICATION_DATABASE_URL =
  'postgresql://lodgekeeper_app:secret@localhost:5433/lodgekeeper';
const MIGRATION_DATABASE_URL =
  'postgresql://lodgekeeper_owner:secret@localhost:5433/lodgekeeper';
const PROVISIONING_DATABASE_URL =
  'postgresql://lodgekeeper_provisioner:secret@localhost:5433/lodgekeeper';

void describe('application environment', () => {
  void it('normalizes shared database and application values', () => {
    const values = validateEnvironment({
      AUTH_SESSION_COOKIE_NAME: ' lodgekeeper_session ',
      AUTH_SESSION_COOKIE_SECURE: ' FALSE ',
      AUTH_SESSION_TTL_SECONDS: '3600',
      DATABASE_DEBUG: ' TRUE ',
      DATABASE_POOL_MAX: '5',
      DATABASE_POOL_MIN: '0',
      DATABASE_SSL: 'false',
      DATABASE_URL: ` ${APPLICATION_DATABASE_URL} `,
    });

    assert.equal(values.DATABASE_URL, APPLICATION_DATABASE_URL);
    assert.equal(values.DATABASE_DEBUG, true);
    assert.equal(values.DATABASE_POOL_MAX, 5);
    assert.equal(values.DATABASE_POOL_MIN, 0);
    assert.equal(values.DATABASE_SSL, false);
    assert.equal(values.DATABASE_SSL_REJECT_UNAUTHORIZED, true);
    assert.equal(values.AUTH_SESSION_COOKIE_NAME, 'lodgekeeper_session');
    assert.equal(values.AUTH_SESSION_COOKIE_SECURE, false);
    assert.equal(values.AUTH_SESSION_TTL_SECONDS, 3600);
  });

  void it('defaults secure session cookies on in production', () => {
    const values = validateEnvironment({
      DATABASE_URL: APPLICATION_DATABASE_URL,
      NODE_ENV: 'production',
    });

    assert.equal(values.AUTH_SESSION_COOKIE_SECURE, true);
  });

  void it('rejects a non-positive session lifetime', () => {
    assert.throws(
      () =>
        validateEnvironment({
          AUTH_SESSION_TTL_SECONDS: '0',
          DATABASE_URL: APPLICATION_DATABASE_URL,
        }),
      /AUTH_SESSION_TTL_SECONDS must be a positive integer/,
    );
  });
});

void describe('database environment', () => {
  void it('validates only settings used by database tooling', () => {
    const environment = databaseEnvironmentFromProcess(
      {
        AUTH_SESSION_COOKIE_NAME: '',
        AUTH_SESSION_TTL_SECONDS: '0',
        MIGRATION_DATABASE_URL,
      },
      'MIGRATION_DATABASE_URL',
    );

    assert.equal(environment.clientUrl, MIGRATION_DATABASE_URL);
    assert.equal(environment.poolMax, 10);
    assert.equal(environment.poolMin, 1);
  });

  void it('rejects a zero-sized maximum pool', () => {
    assert.throws(
      () =>
        databaseEnvironmentFromProcess(
          {
            DATABASE_POOL_MAX: '0',
            MIGRATION_DATABASE_URL,
          },
          'MIGRATION_DATABASE_URL',
        ),
      /DATABASE_POOL_MAX must be a positive integer/,
    );
  });
});

void describe('provisioning environment', () => {
  void it('uses shared parsing while retaining provisioning-specific values', () => {
    const environment = provisioningEnvironmentFromProcess({
      APP_PUBLIC_URL: ' https://lodgekeeper.example/ ',
      INVITATION_DELIVERY: ' smtp ',
      INVITATION_TTL_HOURS: '24',
      PROVISIONING_DATABASE_URL,
      SMTP_FROM: ' Lodgekeeper <noreply@lodgekeeper.example> ',
      SMTP_HOST: ' smtp.lodgekeeper.example ',
      SMTP_PASSWORD: 'secret',
      SMTP_PORT: '465',
      SMTP_SECURE: ' TRUE ',
      SMTP_USER: ' lodgekeeper ',
    });

    assert.equal(environment.appPublicUrl, 'https://lodgekeeper.example/');
    assert.equal(environment.database.clientUrl, PROVISIONING_DATABASE_URL);
    assert.equal(environment.delivery, 'smtp');
    assert.equal(environment.invitationTtlHours, 24);
    assert.equal(
      environment.smtpFrom,
      'Lodgekeeper <noreply@lodgekeeper.example>',
    );
    assert.equal(environment.smtpHost, 'smtp.lodgekeeper.example');
    assert.equal(environment.smtpPort, 465);
    assert.equal(environment.smtpSecure, true);
    assert.equal(environment.smtpUser, 'lodgekeeper');
  });

  void it('rejects a non-positive invitation lifetime', () => {
    assert.throws(
      () =>
        provisioningEnvironmentFromProcess({
          APP_PUBLIC_URL: 'http://localhost:3000',
          INVITATION_TTL_HOURS: '0',
          PROVISIONING_DATABASE_URL,
        }),
      /INVITATION_TTL_HOURS must be a positive integer/,
    );
  });
});

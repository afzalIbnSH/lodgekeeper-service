import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assertSafeTestDatabaseUrls } from './test-database-safety';

const APPLICATION_URL =
  'postgresql://app:secret@localhost:5433/lodgekeeper_test';
const MIGRATION_URL =
  'postgresql://owner:secret@localhost:5433/lodgekeeper_test';
const PROVISIONING_URL =
  'postgresql://provisioner:secret@localhost:5433/lodgekeeper_test';

void describe('test database safety', () => {
  void it('accepts different roles targeting the same test database', () => {
    assert.doesNotThrow(() =>
      assertSafeTestDatabaseUrls(
        APPLICATION_URL,
        MIGRATION_URL,
        PROVISIONING_URL,
      ),
    );
  });

  void it('requires test to be a distinct database-name segment', () => {
    assert.throws(
      () =>
        assertSafeTestDatabaseUrls(
          'postgresql://app:secret@localhost:5433/lodgekeeper_contest',
          MIGRATION_URL,
        ),
      /must target a database with "test" as a distinct name segment/,
    );
  });

  void it('rejects invalid and non-PostgreSQL URLs', () => {
    assert.throws(
      () => assertSafeTestDatabaseUrls('not-a-url', MIGRATION_URL),
      /DATABASE_URL must be a valid PostgreSQL URL/,
    );
    assert.throws(
      () =>
        assertSafeTestDatabaseUrls(
          'mysql://app:secret@localhost:5433/lodgekeeper_test',
          MIGRATION_URL,
        ),
      /DATABASE_URL must be a valid PostgreSQL URL/,
    );
  });

  void it('rejects mismatched database hosts, ports and names', () => {
    const mismatchedUrls = [
      'postgresql://owner:secret@other-host:5433/lodgekeeper_test',
      'postgresql://owner:secret@localhost:5434/lodgekeeper_test',
      'postgresql://owner:secret@localhost:5433/another_test',
    ];

    for (const migrationUrl of mismatchedUrls) {
      assert.throws(
        () => assertSafeTestDatabaseUrls(APPLICATION_URL, migrationUrl),
        /must target the same test database/,
      );
    }
  });

  void it('also checks the optional provisioning target', () => {
    assert.throws(
      () =>
        assertSafeTestDatabaseUrls(
          APPLICATION_URL,
          MIGRATION_URL,
          'postgresql://provisioner:secret@localhost:5433/another_test',
        ),
      /must target the same test database/,
    );
  });
});

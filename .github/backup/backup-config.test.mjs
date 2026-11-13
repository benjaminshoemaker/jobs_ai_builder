import { test } from 'node:test';
import { deepStrictEqual, equal, throws } from 'node:assert';
import { backupConnection, backupPath } from './backup-config.mjs';

test('uses environment credentials and requires direct PostgreSQL', () => {
  deepStrictEqual(backupConnection('postgresql://backup:p%40ss@db.example.test:5433/board?sslmode=require'), {
    PGHOST: 'db.example.test', PGPORT: '5433', PGUSER: 'backup', PGPASSWORD: 'p@ss', PGDATABASE: 'board', PGSSLMODE: 'verify-full', PGSSLROOTCERT: 'system',
  });
  throws(() => backupConnection('postgresql://backup:secret@db-pooler.example.test/board'), /direct/);
});

test('uses unique environment-scoped object paths', () => {
  equal(backupPath('preview', new Date('2026-11-12T18:30:00.000Z')), 'backups/preview/2026-11-12T18-30-00-000Z.dump');
});

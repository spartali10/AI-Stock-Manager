const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { SqliteRepository, PostgresRepository, createRepository } = require('../backend/repository');
test('local database persists across reopen, snapshots precede changes, failed transactions roll back', async () => {
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'stock-db-test-')), filename = path.join(folder, 'data.sqlite');
    let repo = new SqliteRepository(filename);
    try {
        await repo.transaction(s => { s.data.stores.push({ id: 1, name: 'Real Store' }); });
        await repo.close(); repo = new SqliteRepository(filename);
        assert.equal((await repo.read()).data.stores[0].name, 'Real Store');
        await assert.rejects(repo.transaction(s => { s.data.stores = []; throw Error('simulated failure'); }));
        assert.equal((await repo.read()).data.stores.length, 1);
        const backups = await repo.backups(); assert.equal(backups.length, 1);
        assert.equal((await repo.backup(backups[0].id)).data.stores.length, 0);
    } finally { await repo.close(); await fs.rm(folder, { recursive: true, force: true }); }
});
test('production requires PostgreSQL and never silently falls back to local storage', () => {
    assert.throws(() => createRepository({ NODE_ENV: 'production' }), /DATABASE_URL/);
    assert.throws(() => createRepository({ RENDER: 'true' }), /DATABASE_URL/);
});
test('PostgreSQL schema, JSONB round trip, backup and rollback execute on PostgreSQL engine', async () => {
    const { PGlite } = require('@electric-sql/pglite');
    const db = new PGlite();
    const query = (sql, params) => sql.includes('CREATE TABLE') ? db.exec(sql).then(result => result[0]) : db.query(sql, params);
    const pool = { query, connect: async () => ({ query, release() {} }), end: () => db.close() };
    const repo = new PostgresRepository({}, pool);
    try {
        await repo.transaction(s => { s.data.stores.push({ id: 1, name: 'Ankara' }); }, { reason: 'test-import' });
        assert.equal((await repo.read()).data.stores[0].name, 'Ankara');
        const before = await repo.read();
        await assert.rejects(repo.transaction(s => { s.data.stores = []; throw Error('rollback'); }));
        assert.deepEqual(await repo.read(), before);
        const backups = await repo.backups(); assert.equal(backups[0].reason, 'test-import');
        assert.equal((await repo.backup(backups[0].id)).data.stores.length, 0);
    } finally { await repo.close(); }
});

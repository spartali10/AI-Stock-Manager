const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { SqliteRepository, PostgresRepository } = require('../backend/repository');
const auth = require('../backend/auth-service');
const { createApp } = require('../server');
const password = () => randomBytes(24).toString('base64url');

test('concurrent first setups create exactly one hashed admin and preserve business data', async t => {
    const repo = new SqliteRepository(':memory:'); t.after(() => repo.close());
    await repo.transaction(s => { s.data.stores.push({ id: 1, name: 'Existing Store' }); });
    const before = await repo.read(), secret = password();
    const results = await Promise.all(Array.from({ length: 8 }, () => auth.initialize(repo, { ADMIN_PASSWORD: secret })));
    assert.equal(results.filter(r => r.status === 'created').length, 1);
    const state = await repo.read(); assert.equal(state.accounts.length, 1);
    assert.deepEqual(state.data, before.data);
    assert(state.authSetup.completedAt); assert.equal(state.accounts[0].username, 'admin');
    assert.equal(state.accounts[0].role, 'admin'); assert(auth.verify(secret, state.accounts[0]));
    assert(!JSON.stringify(state).includes(secret)); assert(!('password' in state.accounts[0]));
    for (const env of [{}, { ADMIN_PASSWORD: password() }, { ADMIN_PASSWORD: 'short' }]) {
        assert.equal((await auth.initialize(repo, env)).status, 'existing');
        assert.deepEqual(await repo.read(), state);
    }
});

test('any existing account prevents seeding, including a non-admin or inactive account', async t => {
    const repo = new SqliteRepository(':memory:'); t.after(() => repo.close());
    for (const status of ['active', 'passive']) {
        await repo.transaction(s => { s.accounts = [{ id: 9, username: 'existing', role: 'viewer', status, permissions: [], ...auth.credentials(password()) }]; });
        const before = await repo.read();
        assert.equal((await auth.initialize(repo, { ADMIN_PASSWORD: password() })).status, 'existing');
        assert.deepEqual(await repo.read(), before);
    }
});

test('missing/invalid setup secret creates no account; completed setup never silently re-seeds', async t => {
    const repo = new SqliteRepository(':memory:'); t.after(() => repo.close());
    const before = await repo.read();
    for (const secret of [undefined, '', 'short', 'x'.repeat(1025)]) {
        assert.equal((await auth.initialize(repo, { ADMIN_PASSWORD: secret })).status, 'configuration-required');
        assert.deepEqual(await repo.read(), before);
    }
    await auth.initialize(repo, { ADMIN_PASSWORD: password() });
    // Simulate missing accounts after an operator/database mistake, not normal user deletion.
    await repo.transaction(s => { s.accounts = []; });
    assert.equal((await auth.initialize(repo, { ADMIN_PASSWORD: password() })).status, 'recovery-required');
    assert.equal((await repo.read()).accounts.length, 0);
});

test('unconfigured login explains setup instead of returning a misleading wrong-password error', async t => {
    const repo = new SqliteRepository(':memory:');
    const app = createApp({ repository: repo, env: {} }), server = app.listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    t.after(async () => { await new Promise(r => server.close(r)); await repo.close(); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Stock-Request': '1' }, body: JSON.stringify({ username: 'admin', password: password() }) });
    assert.equal(response.status, 503); const data = await response.json();
    assert.equal(data.code, 'ADMIN_SETUP_REQUIRED'); assert.match(data.error, /ADMIN_PASSWORD/);
    assert.match(await (await fetch(base + '/api/session.js')).text(), /ADMIN_PASSWORD/);
    assert.equal((await repo.read()).accounts.length, 0);
});

test('PostgreSQL first admin authenticates via HTTP and remains unchanged on restart', async t => {
    const { PGlite } = require('@electric-sql/pglite');
    const db = new PGlite();
    const query = (sql, params) => sql.includes('CREATE TABLE') ? db.exec(sql).then(r => r[0]) : db.query(sql, params);
    const pool = { query, connect: async () => ({ query, release() {} }), end: () => db.close() };
    const repo = new PostgresRepository({}, pool), secret = password();
    const app = createApp({ repository: repo, env: { ADMIN_PASSWORD: secret } });
    const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
    t.after(async () => { await new Promise(r => server.close(r)); await repo.close(); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Stock-Request': '1' }, body: JSON.stringify({ username: 'Admin', password: secret }) });
    assert.equal(response.status, 200);
    const result = await response.json(); assert.equal(result.user.username, 'admin');
    assert(!JSON.stringify(result).includes('passwordHash'));
    const cookie = response.headers.get('set-cookie'); assert.match(cookie, /HttpOnly/i);
    const session = await (await fetch(base + '/api/session', { headers: { Cookie: cookie.split(';')[0] } })).json();
    assert.equal(session.user.role, 'admin');
    const persisted = (await db.query('SELECT payload FROM app_state WHERE id=1')).rows[0].payload;
    assert(auth.verify(secret, persisted.accounts[0])); assert(!JSON.stringify(persisted).includes(secret));
    assert.equal((await auth.initialize(repo, { ADMIN_PASSWORD: password() })).status, 'existing');
    assert.deepEqual(await repo.read(), persisted);
});

test('local .env loading preserves hosting environment and ignores an absent file', async () => {
    const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
    const { execFileSync } = require('node:child_process');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stock-env-test-'));
    const file = path.join(directory, '.env');
    try {
        fs.writeFileSync(file, 'STOCK_TEST_FROM_FILE=file-value\nSTOCK_TEST_HOSTED=file-value\n');
        const script = `require(${JSON.stringify(require.resolve('../backend/environment'))})(${JSON.stringify(file)}); process.stdout.write(JSON.stringify([process.env.STOCK_TEST_FROM_FILE, process.env.STOCK_TEST_HOSTED]));`;
        const env = { ...process.env, STOCK_TEST_HOSTED: 'host-value' }; delete env.STOCK_TEST_FROM_FILE;
        assert.deepEqual(JSON.parse(execFileSync(process.execPath, ['-e', script], { env, encoding: 'utf8' })), ['file-value', 'host-value']);
        assert.doesNotThrow(() => require('../backend/environment')(path.join(directory, 'absent.env')));
    } finally { fs.unlinkSync(file); fs.rmdirSync(directory); }
});

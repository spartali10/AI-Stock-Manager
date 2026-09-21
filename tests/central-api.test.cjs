const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { SqliteRepository } = require('../backend/repository');
const { createApp } = require('../server');
const { emptyData } = require('../backend/state');
async function setup(t) {
    const repository = new SqliteRepository(':memory:');
    const app = createApp({ repository, env: { ADMIN_PASSWORD: 'only-a-test-password' } });
    const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
    const base = `http://127.0.0.1:${server.address().port}`;
    t.after(async () => { await new Promise(r => server.close(r)); await repository.close(); });
    function client() {
        let cookie = '', csrf = '';
        return {
            async request(path, body, headers = {}) {
                const response = await fetch(base + '/api' + path, { method: body === undefined ? 'GET' : 'POST', headers: { Cookie: cookie, 'X-Stock-Request': '1', 'X-CSRF-Token': csrf, 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
                if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
                const data = await response.json(); if (data.csrf) csrf = data.csrf;
                return { status: response.status, data, headers: response.headers };
            },
            call(method, args, headers = {}) { return this.request('/data/' + method, { args }, { 'Idempotency-Key': randomUUID(), ...headers }); },
            login(username = 'admin', password = 'only-a-test-password') { return this.request('/login', { username, password }); }
        };
    }
    const a = client(), b = client(); assert.equal((await a.login()).status, 200); assert.equal((await b.login()).status, 200);
    return { a, b, repository, base, client };
}
const product = { code: '001', name: 'Ürün', color: 'Black', size: '1', store: 'Mamül Depo', stock: 10, capacity: 100 };
test('two independent devices share Excel stock, serialized transfers, snapshots, and idempotency', async t => {
    const { a, b, repository } = await setup(t);
    assert.deepEqual((await b.request('/products')).data.result, []);
    const imported = await a.call('replaceProductsFromExcel', [[product], 'same-format.xlsx'], { 'If-Match': '0' });
    assert.equal(imported.status, 200, JSON.stringify(imported));
    assert.equal((await b.request('/products')).data.result[0].stock, 10);
    assert.equal((await b.request('/stores')).data.result[0].name, 'Mamül Depo');
    await a.call('addStore', [{ name: 'Target' }]);
    const transfers = await Promise.all([a.call('transferStock', [1, ['Target'], 7]), b.call('transferStock', [1, ['Target'], 7])]);
    assert.deepEqual(transfers.map(r => r.status).sort(), [200, 400]);
    let rows = (await a.request('/products')).data.result;
    assert.equal(rows.reduce((n, p) => n + p.stock, 0), 10);
    assert.equal(rows.find(p => p.id === 1).stock, 3);
    const key = randomUUID();
    const one = await a.call('transferStock', [1, ['Target'], 2], { 'Idempotency-Key': key });
    const replay = await a.call('transferStock', [1, ['Target'], 2], { 'Idempotency-Key': key });
    assert.equal(one.status, 200); assert.deepEqual(replay.data.result, one.data.result);
    assert.equal((await a.call('transferStock', [1, ['Target'], 1], { 'Idempotency-Key': key })).status, 409);
    rows = (await b.request('/stocks')).data.result; assert.equal(rows.find(p => p.id === 1).stock, 1);
    assert.equal((await b.request('/transfers')).data.result.length, 2);
    assert((await repository.backups()).length >= 4);
    const before = await repository.read();
    assert.equal((await a.call('replaceProductsFromExcel', [[product], 'stale.xlsx'], { 'If-Match': '0' })).status, 409);
    assert.equal((await a.call('replaceProductsFromExcel', [[{ ...product, stock: 'bad' }], 'bad.xlsx'], { 'If-Match': String(before.dataRevision) })).status, 400);
    assert.deepEqual((await repository.read()).data, before.data);
    assert.equal((await a.call('resetToSeed', [])).status, 404);
});
test('migration validates without writing, imports once, preserves unknown fields and legacy accounts', async t => {
    const { a, b, repository } = await setup(t);
    const payload = { data: { ...emptyData(), products: [{ ...product, id: 77, hierarchy: { Sezon: 'AW26' } }], stores: [], sales: [], meta: { stockSource: 'excel', custom: 'preserved' } }, accounts: [{ id: 4, name: 'Reader', username: 'reader', role: 'viewer', status: 'active', password: 'legacy-test-password', permissions: ['stock'] }] };
    const before = await repository.read();
    const preview = await a.request('/migration/preview', { payload }); assert.equal(preview.status, 200);
    assert.deepEqual(await repository.read(), before);
    const input = { payload, digest: preview.data.digest, revision: preview.data.revision };
    assert.equal((await a.request('/migration/import', { ...input, digest: 'changed' })).status, 409);
    assert.equal((await a.request('/migration/import', input)).status, 200);
    assert.equal((await a.request('/migration/import', input)).status, 409);
    assert.equal((await b.request('/products')).data.result[0].hierarchy.Sezon, 'AW26');
    const persisted = await repository.read(); assert.equal(persisted.data.meta.custom, 'preserved'); assert(!JSON.stringify(persisted).includes('legacy-test-password'));
    assert.equal((await b.login('reader', 'legacy-test-password')).status, 200);
    assert.equal((await b.request('/products')).status, 200);
    assert.equal((await b.call('applyStockOperation', [77, 'Mamül Depo', 'add', 1])).status, 403);
    assert.equal((await b.request('/backup')).status, 403);
});
test('server authentication, CSRF, revoked sessions, no demo writes and shared notes/templates', async t => {
    const { a, b, client, repository } = await setup(t);
    assert.equal((await client().request('/products')).status, 401);
    assert.equal((await a.call('addProduct', [product], { Origin: 'https://elsewhere.invalid' })).status, 403);
    assert.equal((await a.call('addProduct', [product], { 'X-CSRF-Token': 'wrong' })).status, 403);
    await a.call('replaceProductsFromExcel', [[product], 'stock.xlsx'], { 'If-Match': '0' });
    await a.call('addStore', [{ name: 'Target' }]);
    await a.call('transferStock', [1, ['Target'], 1]);
    assert.equal((await a.call('saveOrderNote', [1, 'Merkezi not'])).status, 200);
    assert.equal((await b.call('getOrderNote', [1])).data.result, 'Merkezi not');
    const template = (await a.call('saveTemplate', [{ name: 'Plan', config: { sources: ['Mamül Depo'], targets: ['Target'] } }])).data.result;
    assert.equal((await b.call('getTemplates', [])).data.result[0].id, template.id);
    await a.request('/users/save', { input: { username: 'reader', name: 'Reader', password: 'only-reader-password', role: 'viewer', status: 'active' } });
    const reader = client(); await reader.login('reader', 'only-reader-password');
    const account = (await repository.read()).accounts.find(u => u.username === 'reader');
    await a.request('/users/remove', { id: account.id });
    assert.equal((await reader.request('/products')).status, 401);
    const exported = await a.request('/backup'); assert.equal(exported.data.data.notes['1'], 'Merkezi not'); assert(!JSON.stringify(exported.data).includes('passwordHash'));
    assert.equal((await b.request('/logout', {})).status, 200);
    assert.equal((await b.request('/products')).status, 401);
});

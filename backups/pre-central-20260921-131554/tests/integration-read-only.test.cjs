const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../public/js/integration-settings.js'), 'utf8');
const requestSource = source.slice(source.indexOf('    async function request('), source.indexOf('    async function run('));

test('Nebim requests and write-scope keys are rejected before any network access', async () => {
    let calls = 0;
    const context = { load: () => ({}), fetch: () => { calls++; }, admin: () => { throw Error('Guard was bypassed'); } };
    vm.runInNewContext(requestSource + '\nthis.request = request;', context);
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        await assert.rejects(context.request('/integrations/nebim/test', { method }), /isteği gönderilmedi/);
    }
    await assert.rejects(context.request('/integrations/api-keys', { method: 'POST', body: JSON.stringify({ scope: 'read_write' }) }), /Yalnızca okuma/);
    assert.equal(calls, 0);
});

test('API key creation ignores a tampered scope selector', async () => {
    const start = source.indexOf("        const name = get('apiKeyName')");
    const end = source.indexOf('\n    }));', start);
    const calls = [];
    const elements = { apiKeyName: { value: 'Rapor' }, apiKeyScope: { value: 'read_write' }, issuedApiKey: {} };
    await vm.runInNewContext('(async () => {' + source.slice(start, end) + '})()', {
        load: () => ({}), get: id => elements[id], status() {}, request: async (path, options) => { calls.push(JSON.parse(options.body)); return { key: 'test' }; }
    });
    assert.equal(calls[0].scope, 'read');
    await vm.runInNewContext('(async () => {' + source.slice(start, end) + '})()', {
        load: () => ({ api: { scope: 'read_write' } }), get: id => elements[id], status() {},
        request: async (path, options) => { calls.push(JSON.parse(options.body)); return { key: 'test' }; }
    });
    assert.equal(calls[1].scope, 'read_write');
});

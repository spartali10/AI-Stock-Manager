const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup(stock) {
    let stored = JSON.stringify({
        products: [{ id: 1, code: 'SKU', color: 'Red', size: 'M', store: 'Source', stock }],
        stores: [{ name: 'Source' }, { name: 'Target' }, { name: 'Target2' }, { name: 'Depot', type: 'finished_goods' }],
        transfers: []
    });
    const env = { window: {}, localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } } };
    for (const file of ['distribution-engine.js', 'nebim-adapter.js']) {
        vm.runInNewContext((file === 'nebim-adapter.js' ? require('./helpers/inventory-source.cjs')() : fs.readFileSync(path.join(__dirname, '../public/js', file), 'utf8')), env);
    }
    return { api: env.window.NebimAdapter, read: () => JSON.parse(stored) };
}

for (const [stock, targets, enabled, remainder] of [
    [2, ['Target'], true, 1],
    [7, ['Target', 'Target2'], true, 5],
    [2, ['Target'], false, 0],
    [1, ['Target'], true, 0]
]) {
    test(`quick transfer: stock=${stock}, targets=${targets.length}, remainder=${enabled}`, async () => {
        const { api, read } = setup(stock);
        const records = await api.transferStock(1, targets, 1, null, { sendRemainder: enabled, remainderStore: 'Depot' });
        const db = read();
        assert.equal(db.products.find(p => p.store === 'Source').stock, enabled ? 0 : stock - targets.length);
        for (const target of targets) assert.equal(db.products.find(p => p.store === target).stock, 1);
        assert.equal(db.products.find(p => p.store === 'Depot')?.stock || 0, remainder);
        assert.equal(db.products.reduce((sum, p) => sum + p.stock, 0), stock);
        assert.equal(records.length, targets.length + (remainder > 0 ? 1 : 0));
        assert(records.every(r => r.from === 'Source' && r.color === 'red' && r.size === 'm'));
    });
}

test('invalid remainder destination does not save a partial transfer', () => {
    for (const remainderStore of ['', 'Missing', 'Target', 'Source']) {
        const { api, read } = setup(2);
        const before = read();
        assert.throws(() => api.transferStock(1, ['Target'], 1, null, { sendRemainder: true, remainderStore }));
        assert.deepEqual(read(), before);
    }
});

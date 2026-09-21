const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = require('./helpers/inventory-source.cjs')();
function setup() {
    let data = JSON.stringify({ products: [
        { id: 1, code: 'SKU', name: 'Tişört', store: 'A', color: 'Red', size: 'M', stock: 20, capacity: 100 },
        { id: 2, code: 'SKU', name: 'Tişört', store: 'B', color: 'Red', size: 'M', stock: 5, capacity: 50 },
        { id: 3, code: 'SKU', name: 'Tişört', store: 'B', color: 'Blue', size: 'M', stock: 8, capacity: 50 }
    ], stores: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] });
    let allowed = true;
    const window = { StockAuth: { require(permission) { assert.equal(permission, 'stockWrite'); if (!allowed) throw Error('Yetki yok'); } } };
    vm.runInNewContext(source, { window, localStorage: { getItem: () => data, setItem: (key, value) => { data = value; } } });
    return { adapter: window.NebimAdapter, read: () => JSON.parse(data), deny: () => { allowed = false; } };
}
test('stock entry changes only selected store/variant and survives reload', async () => {
    const { adapter, read } = setup();
    await adapter.applyStockOperation(1, 'B', 'add', 7);
    assert.deepEqual(read().products.map(p => p.stock), [20, 12, 8]);
    await adapter.applyStockOperation(1, 'C', 'add', 3);
    const created = read().products.find(p => p.store === 'C');
    assert.equal(created.stock, 3); assert.equal(created.color, 'Red'); assert.equal(created.size, 'M'); assert.notEqual(created.id, 1);
    await adapter.applyStockOperation(1, 'C', 'add', 2);
    assert.equal(read().products.length, 4);
    assert.equal((await adapter.getProducts()).find(p => p.store === 'C').stock, 5);
    await adapter.applyStockOperation(1, 'A', 'remove', 2);
    assert.equal(read().products[0].stock, 18);
});
test('invalid store, quantity, capacity, stock and permissions do not mutate data', () => {
    const { adapter, read, deny } = setup();
    const before = read();
    for (const args of [[1, '', 'add', 1], [1, 'Unknown', 'add', 1], [999, 'A', 'add', 1], [1, 'A', 'add', 0], [1, 'A', 'add', 1.5], [1, 'A', 'add', Infinity], [1, 'B', 'add', 46], [1, 'A', 'remove', 21], [1, 'B', 'remove', 1]]) {
        assert.throws(() => adapter.applyStockOperation(...args));
        assert.deepEqual(read(), before);
    }
    deny(); assert.throws(() => adapter.applyStockOperation(1, 'B', 'add', 1), /Yetki/);
    assert.deepEqual(read(), before);
});

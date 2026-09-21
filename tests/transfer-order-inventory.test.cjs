const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('order inventories preserve pre-transfer size stock despite later product updates', async () => {
    let data = JSON.stringify({ products: [
        { id: 1, code: 'P', color: 'Black', size: '1', store: 'Source', stock: 20 },
        { id: 2, code: 'P', color: 'Black', size: '2', store: 'Source', stock: 10 },
        { id: 3, code: 'P', color: 'Black', size: '1', store: 'Target', stock: 3 },
        { id: 4, code: 'P', color: 'White', size: '1', store: 'Source', stock: 100 }
    ], stores: [{ name: 'Source' }, { name: 'Target' }], transfers: [] });
    const window = {}, env = { window, localStorage: { getItem: () => data, setItem: (_, value) => { data = value; } } };
    for (const file of ['distribution-engine', 'nebim-adapter', 'transfer-order-matrix']) {
        vm.runInNewContext((file === 'nebim-adapter' ? require('./helpers/inventory-source.cjs')() : fs.readFileSync(require.resolve(`../public/js/${file}.js`), 'utf8')), env);
    }
    const api = window.NebimAdapter;
    const records = await api.transferStock(1, ['Target'], 1);
    const context = await api.getTransferOrderContext();
    const row = window.TransferOrderMatrix.build(records, context).rows[0];
    assert.equal(row.sourceInventory, 20);
    assert.equal(row.targetInventory, 3);
    assert.equal(row.sourceInventory + row.targetInventory, 23);
    assert.equal(row.quantity, 1);
    assert.equal(JSON.parse(data).products.find(p => p.id === 4).stock, 100);
    // Later stock changes must not alter historical inventory.
    const updated = JSON.parse(data);
    updated.products.find(p => p.id === 1).stock = 7;
    updated.products.find(p => p.id === 3).stock = 12;
    data = JSON.stringify(updated);
    const refreshed = window.TransferOrderMatrix.build(records, await api.getTransferOrderContext()).rows[0];
    assert.equal(refreshed.sourceInventory, 20);
    assert.equal(refreshed.targetInventory, 3);
    assert.equal(refreshed.quantity, 1);
});

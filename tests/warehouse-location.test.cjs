const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('Mamül Depo is classified separately, including warehouses only present in imported stock', async () => {
    for (const registered of [true, false]) {
        const db = { stores: [{ id: 1, name: 'İstanbul' }, ...(registered ? [{ id: 2, name: 'Mamül Depo', userCreated: true }] : [])], products: [{ id: 1, code: '001', store: 'Mamül Depo', stock: 12 }], meta: {} };
        let saved = JSON.stringify(db);
        const context = { window: {}, localStorage: { getItem: () => saved, setItem: (key, value) => { saved = value; } } };
        vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../public/js/nebim-adapter.js'), 'utf8'), context);
        const api = context.window.NebimAdapter;
        const retail = await api.getRetailStores(), warehouses = await api.getWarehouses();
        assert.equal(retail.length, 1);
        assert.equal(warehouses.length, 1);
        assert.equal(warehouses[0].role, 'distribution_warehouse');
        assert.equal(warehouses[0].isMainWarehouse, true);
        await api.updateProduct(1, { stock: 12 });
        assert.equal(JSON.parse(saved).stores.find(s => s.name === 'Mamül Depo').type, 'finished_goods');
        assert.equal(JSON.parse(saved).products[0].stock, 12);
    }
});

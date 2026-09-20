const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('two-plus checkbox skips single stock and allocates one per empty target without moving stock', async () => {
    const { api, read } = setup(true, db => { db.products[0].stock = 2; db.products[1].stock = 1; });
    const before = read().products;
    const records = await api.transferMissingSizes([1, 2], ['Depo', 'B'], null, { stockPriority: true, targetOrder: true, draftOnly: true, minTwoStock: true, sendAllStock: true, minimumQuantity: 5 });
    assert.deepEqual(Array.from(records, r => [r.to, r.size, r.quantity]), [['Depo', '0', 1], ['B', '0', 1]]);
    assert.deepEqual(read().products, before);
    assert.equal(read().transferTasks[0].quantity, 2);
});

test('legacy prepared orders display ready without changing stored stock or completed orders', async () => {
    const { api, read } = setup(false, db => {
        db.transferTasks = [
            { id: 1, status: 'Bekliyor', progress: 0, finishedAt: null, startedAt: '2026-09-19T10:00:00Z', lastMessage: 'Emir oluşturuldu. Stok hareketi yapılmadı.', records: [{ quantity: 1 }] },
            { id: 2, status: 'Tamamlandı', progress: 100, records: [] }
        ];
    });
    const before = read();
    const tasks = await api.getTransferTasks();
    assert.equal(tasks[0].progress, 100);
    assert.equal(tasks[0].finishedAt, tasks[0].startedAt);
    assert.equal(tasks[0].status, 'Emir hazır · Gönderilmedi');
    assert.equal(tasks[1].status, 'Tamamlandı');
    assert.deepEqual(read(), before);
});

test('minimum above available stock still creates a one-unit draft without changing stock', async () => {
    for (const minimumQuantity of [2, 5]) {
        const { api, read } = setup(false, db => { db.products[0].stock = 1; });
        const before = read().products;
        const records = await api.transferMissingSizes([1], ['Depo'], null, { stockPriority: true, targetOrder: true, draftOnly: true, minimumQuantity, sendAllStock: false });
        assert.equal(records[0].quantity, 1);
        assert.equal(read().transferTasks[0].quantity, 1);
        assert.deepEqual(read().products, before);
    }
});

test('quick order respects minimum quantity unless send all is checked', async () => {
    for (const [sendAllStock, expected] of [[false, 1], [true, 4]]) {
        const { api, read } = setup();
        const before = read().products;
        const records = await api.transferMissingSizes([1], ['Depo'], null, { stockPriority: true, targetOrder: true, draftOnly: true, minimumQuantity: 1, sendAllStock });
        assert.equal(records[0].quantity, expected);
        assert.equal(records[0].inventorySnapshot.source, 4);
        assert.equal(read().transferTasks[0].quantity, expected);
        assert.deepEqual(read().products, before);
    }
});

test('draft order preserves all stocks and movement history for existing and new targets', async () => {
    for (const destination of ['Depo', 'B']) {
        const { api, read } = setup(true);
        const before = read();
        const records = await api.transferMissingSizes([1, 2, 3], [destination], null, { stockPriority: true, targetOrder: true, draftOnly: true });
        const after = read();
        assert.deepEqual(after.products, before.products);
        assert.deepEqual(after.transfers, before.transfers);
        assert.equal(after.transferTasks.length, 1);
        assert.equal(after.transferTasks[0].status, 'Emir hazır · Gönderilmedi');
        assert.equal(after.transferTasks[0].progress, 100);
        assert.equal(after.transferTasks[0].finishedAt, after.transferTasks[0].startedAt);
        assert(records.every(r => r.status === 'Bekliyor'));
    }
});

test('negative destination stock is preserved and increased by the transferred quantity', async () => {
    const { api, read } = setup(false, db => { db.products.find(p => p.id === 5).stock = -2; });
    const records = await api.transferMissingSizes([1], ['Depo'], null, { stockPriority: true, targetOrder: true });
    assert.equal(records[0].inventorySnapshot.target, -2);
    assert.equal(records[0].quantity, 4);
    assert.equal(read().products.find(p => p.id === 5).stock, 2);
    assert.equal(read().transferTasks.length, 1);
});

test('unrelated invalid target stock does not block selected variants', async () => {
    const { api, read } = setup(false, db => { db.products.find(p => p.id === 6).stock = 'invalid'; });
    await api.transferMissingSizes([1], ['Depo'], null, { stockPriority: true, targetOrder: true });
    assert.equal(read().products.find(p => p.id === 6).stock, 'invalid');
});

test('invalid selected target stock reports the variant without partial writes', () => {
    const { api, read } = setup(false, db => { db.products.find(p => p.id === 5).stock = 'invalid'; });
    const before = read();
    assert.throws(() => api.transferMissingSizes([1], ['Depo'], null, { stockPriority: true, targetOrder: true }), /Depo \/ K26101 \/ Siyah \/ 0/);
    assert.deepEqual(read(), before);
});
test('target order rotates through selected stores without requiring sales or dates', async () => {
    const { api, read } = setup(true);
    const records = await api.transferMissingSizes([1, 2, 3], ['Depo', 'B'], null, { stockPriority: true, targetOrder: true });
    assert.deepEqual(Array.from(records, r => r.to), ['Depo', 'B', 'Depo']);
    assert.deepEqual(Array.from(records, r => r.quantity), [4, 3, 2]);
    assert.equal(read().transferTasks[0].quantity, 9);
});
test('stock priority includes zero-sales targets and records unavailable sales honestly', async () => {
    const { api, read } = setup();
    const records = await api.transferMissingSizes([1], ['Depo'], { start: '2026-09-01', end: '2026-09-30' }, { stockPriority: true });
    assert.equal(records[0].quantity, 4);
    assert.equal(records[0].targetSales, null);
    assert.match(records[0].reason, /seçim sırası/);
    assert.equal(read().transferTasks.length, 1);
    const second = setup(true, db => { db.sales = []; });
    const zeroSales = await second.api.transferMissingSizes([1], ['B'], { start: '2026-09-01', end: '2026-09-30' }, { stockPriority: true });
    assert.equal(zeroSales[0].targetSales, 0);
});
function setup(ranked = false, modify = () => {}) {
    const product = (id, store, size, stock, fabric = 'Pamuk') => ({ id, code: 'K26101', name: 'Ürün', color: 'Siyah', fabric, size, stock, store });
    let stored = JSON.stringify({ products: [product(1, 'A', '0', 4), product(2, 'A', '1', 3), product(3, 'A', '2', 2), product(4, 'Depo', '1', 1), product(5, 'Depo', '0', 0), product(6, 'Depo', '2', 5, 'Keten')], stores: [{ name: 'A' }, { name: 'Depo', type: 'finished_goods' }], transfers: [] });
    if (ranked) {
        const db = JSON.parse(stored);
        db.stores.push({ name: 'B' });
        db.meta = { salesCoverage: { start: '2026-09-01', end: '2026-09-30', stores: ['A', 'B', 'Depo'] } };
        db.sales = [
            { ...db.products[0], store: 'B', date: '2026-09-10', quantity: 8 },
            { ...db.products[0], store: 'Depo', date: '2026-09-10', quantity: 3 },
            { ...db.products[2], store: 'A', date: '2026-09-10', quantity: 1 }
        ];
        stored = JSON.stringify(db);
    }
    const initial = JSON.parse(stored); modify(initial); stored = JSON.stringify(initial);
    const env = { window: {}, localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } } };
    vm.runInNewContext(fs.readFileSync(require.resolve('../public/js/nebim-adapter'), 'utf8'), env);
    return { api: env.window.NebimAdapter, read: () => JSON.parse(stored) };
}
test('highest-selling zero-stock target wins; source sales and missing coverage block allocation', async () => {
    const { api, read } = setup(true);
    const before = read();
    assert.throws(() => api.transferMissingSizes([1, 2, 3], ['Depo', 'B'], { start: '2026-08-01', end: '2026-09-30' }), /satış geçmişi/);
    assert.deepEqual(read(), before);
    const records = await api.transferMissingSizes([1, 2, 3], ['Depo', 'B'], { start: '2026-09-01', end: '2026-09-30' });
    assert.equal(records.length, 1);
    assert.equal(records[0].to, 'B');
    assert.equal(records[0].quantity, 4);
    assert.equal(records[0].sourceSales, 0);
    assert.equal(records[0].targetSales, 8);
    assert.equal(read().products.find(p => p.id === 3).stock, 2);
});
test('positive source sales or zero target sales reject transfers without saving', () => {
    for (const modify of [
        db => db.sales.push({ ...db.sales[0], store: 'A', quantity: 1 }),
        db => { db.sales = []; }
    ]) {
        const { api, read } = setup(true, modify), before = read();
        assert.throws(() => api.transferMissingSizes([1], ['B', 'Depo'], { start: '2026-09-01', end: '2026-09-30' }), /koşullara uyan/);
        assert.deepEqual(read(), before);
    }
});

test('stocked best seller is skipped in favor of a selected zero-stock seller', async () => {
    const { api } = setup(true, db => db.products.push({ ...db.products[0], id: 7, store: 'B', stock: 1 }));
    const records = await api.transferMissingSizes([1], ['B', 'Depo'], { start: '2026-09-01', end: '2026-09-30' });
    assert.equal(records[0].to, 'Depo');
});

test('only selected destinations participate even if an unselected store sold more', async () => {
    const { api } = setup(true);
    const records = await api.transferMissingSizes([1], ['Depo'], { start: '2026-09-01', end: '2026-09-30' });
    assert.equal(records.length, 1);
    assert.equal(records[0].to, 'Depo');
});

test('destination imported with stock creates a task even without a store directory entry', async () => {
    const { api, read } = setup(true, db => {
        db.stores = db.stores.filter(s => s.name !== 'B');
        db.products.push({ ...db.products[0], id: 7, store: 'B', stock: 0 });
    });
    const records = await api.transferMissingSizes([1], ['B', 'Depo'], { start: '2026-09-01', end: '2026-09-30' });
    assert.equal(records[0].to, 'B');
    assert.equal(records[0].targetSales, 8);
    const db = read();
    assert.equal(db.transferTasks.length, 1);
    assert.equal(db.transferTasks[0].orderId, records[0].orderId);
    assert.equal(db.transferTasks[0].quantity, 4);
    assert.equal(db.products.find(p => p.id === 7).stock, 4);
});

test('equal sales preserve the selected destination order', async () => {
    for (const targets of [['Depo', 'B'], ['B', 'Depo']]) {
        const { api } = setup(true, db => { db.sales[1].quantity = 8; });
        const records = await api.transferMissingSizes([1], targets, { start: '2026-09-01', end: '2026-09-30' });
        assert.equal(records[0].to, targets[0]);
        assert.equal(records[0].targetSales, 8);
    }
});

test('sales include both date boundaries and ignore sales outside the period', async () => {
    const { api } = setup(true, db => {
        db.sales = [
            { ...db.sales[0], date: '2026-09-01', quantity: 2 },
            { ...db.sales[0], date: '2026-09-30', quantity: 3 },
            { ...db.sales[1], date: '2026-08-31', quantity: 100 },
            { ...db.sales[0], store: 'A', date: '2026-10-01', quantity: 1 }
        ];
    });
    const records = await api.transferMissingSizes([1], ['Depo', 'B'], { start: '2026-09-01', end: '2026-09-30' });
    assert.equal(records[0].to, 'B');
    assert.equal(records[0].targetSales, 5);
    assert.equal(records[0].sourceSales, 0);
});

test('filtered missing sizes move all stock; stocked sizes and different fabrics stay separate', async () => {
    const { api, read } = setup();
    const records = await api.transferMissingSizes([1, 2, 3], 'Depo');
    const db = read();
    assert.deepEqual(Array.from(records, r => r.quantity), [4, 2]);
    assert.deepEqual(db.products.filter(p => p.store === 'A').map(p => p.stock), [0, 3, 0]);
    assert.equal(db.products.find(p => p.id === 4).stock, 1);
    assert.equal(db.products.find(p => p.id === 6).stock, 5);
    assert.equal(db.transferTasks.length, 1);
    assert.equal(db.transferTasks[0].quantity, 6);
    assert.equal(db.products.reduce((n, p) => n + p.stock, 0), 15);
});
test('invalid batch saves nothing and unselected products are untouched', async () => {
    const { api, read } = setup(); const before = read();
    assert.throws(() => api.transferMissingSizes([1, 999], 'Depo'));
    assert.deepEqual(read(), before);
    await api.transferMissingSizes([1], 'Depo');
    assert.equal(read().products.find(p => p.id === 3).stock, 2);
});

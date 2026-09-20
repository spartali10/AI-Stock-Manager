const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const root = require('path').join(__dirname, '..');
const files = ['distribution-engine.js', 'warehouse-matrix.js', 'nebim-adapter.js'].map(f => fs.readFileSync(root + '/js/' + f, 'utf8'));
const fixture = () => ({ stores: [{ id: 1, name: 'Main', type: 'finished_goods' }, { id: 2, name: 'A' }, { id: 3, name: 'B' }],
    products: [
        { id: 1, store: 'Main', code: '01', color: 'Red', size: 'M', fabric: 'Cotton', stock: 4 },
        { id: 2, store: 'Main', code: '01', color: 'Red', size: 'M', fabric: 'Cotton', stock: 2 },
        { id: 3, store: 'Main', code: '01', color: 'Red', size: 'L', fabric: 'Cotton', stock: 3 },
        { id: 4, store: 'A', code: '01', color: 'Red', size: 'M', stock: 1 },
        { id: 5, store: 'A', code: '01', color: 'Blue', size: 'M', stock: 10 },
        { id: 6, store: 'Main', code: '02', stock: 7 }
    ], transfers: [], meta: {} });
let stored = JSON.stringify(fixture());
const ctx = { window: {}, localStorage: { getItem: () => stored, setItem: (k, v) => { stored = v; } } };
files.forEach(code => vm.runInNewContext(code, ctx));
const M = ctx.window.WarehouseMatrix, api = ctx.window.NebimAdapter;
const rows = M.rows(fixture(), 'Main'), row = rows.find(r => r.code === '01');
assert.equal(row.sizes.M.stock, 6); assert.equal(row.sizes.L.stock, 3);
assert.equal(rows.find(r => r.code === '02').sizes['Tanımsız'].valid, false);
assert.throws(() => M.rows(fixture(), 'A'));
const entry = (size, to, quantity) => ({ row: row.key, size, to, quantity });
assert.throws(() => M.plan(fixture(), 'Main', [entry('M', 'A', 4), entry('M', 'B', 3)]));
assert.throws(() => M.plan(fixture(), 'Main', [entry('M', 'Main', 1)]));
assert.throws(() => M.plan(fixture(), 'Main', [entry('M', 'Unknown', 1)]));
assert.throws(() => M.plan(fixture(), 'Main', [entry('M', 'A', -1)]));
assert.throws(() => M.plan(fixture(), 'Main', [entry('M', 'A', 1.5)]));
assert.equal(M.plan(fixture(), 'Main', [entry('M', 'A', 5)]).length, 2);
(async () => {
    const snapshot = await api.getWarehouseMatrixData();
    const before = JSON.parse(stored).products.reduce((n, p) => n + p.stock, 0);
    await api.applyWarehouseMatrix('Main', [entry('M', 'A', 5), entry('L', 'B', 2)], snapshot.token);
    const db = JSON.parse(stored);
    assert.equal(db.products.reduce((n, p) => n + p.stock, 0), before);
    assert.equal(db.products.find(p => p.id === 4).stock, 6);
    assert.equal(db.products.find(p => p.id === 5).stock, 10);
    assert.equal(db.products.find(p => p.store === 'B').stock, 2);
    assert.throws(() => api.applyWarehouseMatrix('Main', [entry('M', 'A', 1)], snapshot.token));
    stored = JSON.stringify(fixture());
    const fresh = await api.getWarehouseMatrixData(), original = stored;
    ctx.localStorage.setItem = () => { throw Error('quota'); };
    assert.throws(() => api.applyWarehouseMatrix('Main', [entry('M', 'B', 1)], fresh.token));
    assert.equal(stored, original);
    console.log('PASS: warehouse restriction, size grouping, missing variants, shared allocation budget, validation, variant-safe stock transfer, stale data and atomic failure.');
})();

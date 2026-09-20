const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const root = require('path').join(__dirname, '..');
const engine = fs.readFileSync(root + '/public/js/distribution-engine.js', 'utf8');
const adapter = fs.readFileSync(root + '/public/js/nebim-adapter.js', 'utf8');
const ctx = { window: {} }; vm.runInNewContext(engine, ctx);
const build = ctx.window.DistributionEngine.build;
const product = (id, store, stock, color = 'Red') => ({ id, store, stock, code: 'SKU', color, size: 'M', hierarchy: { Sezon: ['YAZ'] } });
const fixture = () => ({
    products: [product(1, 'Source', 5), product(2, 'A', 0), product(3, 'B', 2), product(4, 'C', 0), product(5, 'Source2', 3)],
    stores: ['Source', 'Source2', 'A', 'B', 'C', 'Remainder'].map((name, id) => ({ id, name })), transfers: [], movements: [],
    sales: [{ ...product(8, 'A', 0), date: '2026-09-05', quantity: 3 }, { ...product(9, 'C', 0), date: '2026-09-05', quantity: 8 }],
    meta: { movementHistoryComplete: true, salesCoverage: { start: '2026-09-01', end: '2026-09-07', stores: ['Source', 'A', 'B', 'C'] } }
});
const config = { mode: 'sweep', sources: ['Source', 'Source2'], targets: ['A', 'B', 'C'], filters: [], sendRemainder: true, remainderStore: 'Remainder', dateRange: { start: '2026-09-01', end: '2026-09-07' } };
let plan = build(fixture(), config);
assert.equal(plan.routes.filter(r => r.to === 'A').length, 1);
assert.equal(plan.routes.filter(r => r.to === 'C').length, 1);
assert.equal(plan.routes.filter(r => r.to === 'B').length, 0);
assert.equal(plan.routes.filter(r => r.to === 'Remainder').reduce((s, r) => s + r.quantity, 0), 6);
assert.equal(build(fixture(), { ...config, remainderStore: 'Source' }).blocked, true);
assert.equal(build(fixture(), { ...config, filters: [{ type: 'hierarchy', key: 'Sezon', selected: ['YAZ'], exclude: true }] }).routes.length, 0);
const winner = { ...config, mode: 'winner', sources: ['Source'], sendRemainder: false };
for (const mode of ['sweep', 'winner']) {
    const settings = { ...winner, mode, minimumQuantity: 2 };
    const limited = build(fixture(), settings);
    assert.deepEqual(Array.from(limited.routes, r => r.quantity), [2, 2]);
    assert.deepEqual(Array.from(build(fixture(), { ...settings, minimumQuantity: 6 }).routes, r => r.quantity), [5]);
    const single = fixture(); single.products[0].stock = 1;
    assert.deepEqual(Array.from(build(single, settings).routes, r => r.quantity), [1]);
    assert.equal(build(fixture(), { ...settings, minimumQuantity: 0 }).blocked, true);
    const all = build(fixture(), { ...settings, sendAllStock: true, minimumQuantity: 0 });
    assert.equal(all.routes.length, 1);
    assert.equal(all.routes[0].quantity, 5);
    assert.equal(all.routes[0].to, mode === 'winner' ? 'C' : 'A');
}
plan = build(fixture(), winner);
assert.equal(plan.routes[0].to, 'C'); assert.equal(plan.routes[1].to, 'A');
assert.equal(plan.routes.reduce((n, r) => n + r.quantity, 0), 2);
const thresholdData = fixture();
thresholdData.products[0].stock = 1;
assert.equal(build(thresholdData, { ...winner, minTwoStock: true }).routes.length, 0);
assert.equal(build(thresholdData, { ...winner, minTwoStock: false }).routes.length, 1);
thresholdData.products[0].stock = 2;
let thresholdPlan = build(thresholdData, { ...winner, minTwoStock: true });
assert.deepEqual(Array.from(thresholdPlan.routes, r => r.to), ['C', 'A']);
thresholdData.products.push({ ...product(20, 'Source', 2), code: 'OTHER' });
thresholdData.sales.push({ ...product(21, 'A', 0), code: 'OTHER', date: '2026-09-05', quantity: 12 });
thresholdPlan = build(thresholdData, { ...winner, minTwoStock: true });
assert(thresholdPlan.routes.some(r => r.code === 'SKU'));
assert(thresholdPlan.routes.some(r => r.code === 'OTHER' && r.to === 'A'));
assert.equal(build(thresholdData, { ...config, minTwoStock: true }).routes.length, build(thresholdData, config).routes.length);
let data = fixture(); data.sales.push({ ...product(10, 'Source', 0), date: '2026-09-03', quantity: 1 });
assert.equal(build(data, winner).routes.length, 0);
data = fixture(); data.meta = {}; assert(build(data, winner).blocked);
data = fixture(); data.products = [product(1, 'Source', 5)];
const chance = { ...config, mode: 'chance', sources: ['Source'], mainWarehouse: 'Source', sendRemainder: false };
assert.equal(build(data, chance).candidates.length, 1);
data.movements.push({ code: 'SKU', color: 'Red', size: 'M', to: 'A', quantity: 1 });
assert.equal(build(data, chance).candidates.length, 0);
data = fixture(); delete data.products[0].color;
assert(build(data, { ...config, sources: ['Source'] }).notes.some(n => n.includes('1')));
data = fixture(); data.products[1].color = 'Blue'; data.products[1].stock = 2;
assert(build(data, config).routes.some(r => r.to === 'A')); // different color must not prevent replenishment

async function persistence() {
    let stored = JSON.stringify(fixture());
    const env = { window: {}, localStorage: { getItem: () => stored, setItem: (k, v) => { stored = v; } } };
    vm.runInNewContext(engine, env); vm.runInNewContext(adapter, env);
    const api = env.window.NebimAdapter;
    const preview = await api.previewDistribution(config);
    const before = JSON.parse(stored).products.reduce((n, p) => n + p.stock, 0);
    await api.applyDistribution(config, preview.token);
    const db = JSON.parse(stored);
    assert.equal(db.products.reduce((n, p) => n + p.stock, 0), before);
    assert.equal(db.products.find(p => p.id === 1).stock, 0);
    assert.equal(db.products.find(p => p.store === 'Remainder').stock, 6);
    assert.equal(db.transfers.length, 4);
    assert.throws(() => api.applyDistribution(config, preview.token));
    stored = JSON.stringify(fixture());
    const another = await api.previewDistribution(config);
    const saved = stored; env.localStorage.setItem = () => { throw Error('quota'); };
    assert.throws(() => api.applyDistribution(config, another.token)); assert.equal(stored, saved);
}
persistence().then(() => console.log('PASS: variant matching, filters, multi-source allocation, zero-stock rule, remainder, ranking, history requirements, atomic updates, conservation and stale preview.'));

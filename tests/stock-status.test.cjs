const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
require('../public/js/stock-size-view');

const variants = (amounts, store = 'A', color = 'Red') => amounts.map((stock, index) => ({ code: 'SKU', store, color, size: String(index), stock, min: 100, excelStatus: 'normal' }));

test('series status depends only on missing sizes, including sold-out series', () => {
    for (const [amounts, expected] of [
        [[1, 1, 1, 1], 'normal'], [[2, 2, 2, 2], 'normal'],
        [[2, 1, 2, 1], 'normal'], [[1, 0, 1, 1], 'low'],
        [[2, 0, 2, 1], 'low'], [[0, 3, 4, 3], 'low'],
        [[1, 0, 0, 1], 'critical'], [[2, 0, 0, 1], 'critical'],
        [[0, 0, 0, 1], 'critical'], [[0, 0, 0, 0], 'depleted']
    ]) assert.equal(StockSizeView.status({ members: variants(amounts) }), expected, amounts.join('/'));
    assert.equal(StockSizeView.status({ members: variants([1, 1]) }), 'critical');
});

test('ONE SIZE uses total quantity without numbered-size checks', () => {
    for (const size of ['ONE SIZE', 'ONE', 'ONESIZE']) {
        for (const stock of [0, 1, 2, 10]) {
            assert.equal(StockSizeView.status({ size, stock, min: 100 }), stock ? 'normal' : 'depleted');
        }
    }
});

test('table updates preserve series status and depleted label instead of applying minimum thresholds', () => {
    const source = fs.readFileSync(require.resolve('../public/js/pages/stok-1'), 'utf8');
    const update = source.match(/        function updateRow\([\s\S]*?\n        }/)[0];
    for (const [amounts, expected, label] of [[[2, 1, 2, 1], 'normal', 'Normal'], [[1, 0, 1, 1], 'low', 'Düşük'], [[1, 0, 0, 1], 'critical', 'Kritik'], [[0, 0, 0, 0], 'depleted', 'Tükendi']]) {
        const badge = {};
        const row = { dataset: { productId: '1', stock: amounts.reduce((a, b) => a + b, 0), min: 100 }, querySelector: selector => selector === '.status' ? badge : null };
        vm.runInNewContext(update + '\nupdateRow(row);', { row, StockSizeView, stockGroups: new Map([['1', variants(amounts)]]) });
        assert.equal(row.dataset.status, expected);
        assert.equal(badge.textContent, label);
    }
});

test('dashboard counts groups independently by store and color and follows stock changes', async () => {
    const products = [...variants([2, 1, 2, 1]), ...variants([1, 0, 1, 1], 'B'), ...variants([1, 0, 0, 1], 'A', 'Blue'), ...variants([0, 0, 0, 0], 'C')];
    const db = { products, notifications: [], stores: [], users: [], transfers: [] };
    const window = { StockSizeView };
    vm.runInNewContext(fs.readFileSync(require.resolve('../public/js/nebim-adapter'), 'utf8'), { window, localStorage: { getItem: () => JSON.stringify(db) } });
    let stats = await window.NebimAdapter.getStats();
    assert.deepEqual([stats.normalStock, stats.lowStock, stats.criticalStock, stats.depletedStock], [1, 1, 1, 1]);
    products[0].stock = 0;
    stats = await window.NebimAdapter.getStats();
    assert.deepEqual([stats.normalStock, stats.lowStock, stats.criticalStock, stats.depletedStock], [0, 2, 1, 1]);
});

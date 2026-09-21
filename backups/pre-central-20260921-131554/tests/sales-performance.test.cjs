const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../public/js/stock-size-view');
require('../public/js/sales-performance');
const today = new Date(2026, 8, 16);
const products = [
    { code: 'A', name: 'Ürün', store: 'Mağaza', color: 'Red', size: '0', stock: 1 },
    { code: 'A', name: 'Ürün', store: 'Mağaza', color: 'Red', size: '1', stock: 2 },
    { code: 'A', name: 'Ürün', store: 'Diğer', color: 'Red', size: '0', stock: 4 },
    { code: 'A', name: 'Ürün', store: 'Mağaza', color: 'Blue', size: '0', stock: 0 }
];
test('current stock is grouped and missing sales are never inferred from inventory', () => {
    const result = SalesPerformance.build({ products }, 7, today);
    assert.equal(result.length, 3);
    assert.equal(result[0].stock, 3);
    for (const row of result) {
        assert.equal(row.sold, null); assert.equal(row.revenue, null);
        assert.equal(row.performance, null); assert.equal(row.trend, null);
    }
});
test('period sales, revenue, trend and stock ratio isolate store and color', () => {
    const sale = { code: 'A', store: 'Mağaza', color: 'Red', size: '0' };
    const context = { products, meta: { salesCoverage: { start: '2026-09-03', end: '2026-09-16' } }, sales: [
        { ...sale, date: '2026-09-10', quantity: 3, revenue: 300 },
        { ...sale, date: '2026-09-09', quantity: 1, revenue: 100 },
        { ...sale, date: '2026-09-17', quantity: 50, revenue: 5000 }
    ] };
    const rows = SalesPerformance.build(context, 7, today);
    assert.equal(rows[0].sold, 3); assert.equal(rows[0].revenue, 300);
    assert.equal(rows[0].performance, 50); assert.equal(rows[0].trend, 200);
    assert.equal(rows[1].sold, 0);
    assert.equal(rows[2].performance, null);
    context.sales[0].revenue = undefined;
    assert.equal(SalesPerformance.build(context, 7, today)[0].revenue, null);
    assert.equal(SalesPerformance.build(context, 30, today)[0].sold, null);
});

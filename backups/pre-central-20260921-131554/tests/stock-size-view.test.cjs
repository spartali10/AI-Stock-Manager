const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../public/js/stock-size-view');
test('size matrix combines sizes but isolates stores/colors and preserves operation product IDs', () => {
    const products = [
        { id: 1, code: '01', name: 'Shirt', store: 'A', color: 'Red', size: '0', stock: 3 },
        { id: 2, code: '01', name: 'Shirt', store: 'A', color: 'Red', size: '1', stock: 10 },
        { id: 3, code: '01', name: 'Shirt', store: 'A', color: 'Red', size: 'ONE', stock: 2 },
        { id: 4, code: '01', name: 'Shirt', store: 'B', color: 'Red', size: '1', stock: 7 },
        { id: 5, code: '01', name: 'Shirt', store: 'A', color: 'Blue', size: '1', stock: 4 },
        { id: 6, code: '02', name: 'Other', store: 'A', stock: 8 }
    ];
    const before = JSON.stringify(products), rows = StockSizeView.group(products);
    assert.equal(rows.length, 4); assert.equal(rows[0].stock, 15);
    assert.deepEqual(rows[0].members.map(p => p.id), [1, 2, 3]);
    assert.equal(rows.reduce((n, row) => n + row.stock, 0), 34);
    assert.deepEqual(StockSizeView.columns(products), ['0', '1', '2', '3', '4', 'ONE SIZE', 'BELİRTİLMEMİŞ']);
    assert.equal(StockSizeView.size({ attributes: { Beden: ['ONE SIZE'] } }), 'ONE SIZE');
    assert.equal(StockSizeView.size({ size: 0 }), '0');
    assert.equal(JSON.stringify(products), before);
});

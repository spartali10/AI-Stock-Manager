const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../public/js/transfer-order-matrix');

test('order matrix sorts products, separates colors and adds repeated size quantities without changing records', () => {
    const records = [
        { from: 'S8', to: 'N34', product: 'P10', color: 'Black', size: 'One Sıze', quantity: 2 },
        { from: 'S8', to: 'N34', product: 'P2', color: 'White', size: '1', quantity: 4 },
        { from: 'S8', to: 'N34', product: 'P2', color: 'Black', size: 0, quantity: 3 },
        { from: 'S8', to: 'N34', product: 'P2', color: 'Black', size: '1', quantity: 5 },
        { from: 'S8', to: 'N34', product: 'P2', color: 'Black', size: '1', quantity: 2 }
    ];
    const before = JSON.stringify(records), matrix = TransferOrderMatrix.build(records);
    assert.deepEqual(matrix.sizes, ['0', '1', '2', '3', 'ONE SIZE']);
    assert.deepEqual(matrix.rows.map(row => [row.product, row.color]), [['P2', 'Black'], ['P2', 'White'], ['P10', 'Black']]);
    assert.deepEqual(matrix.rows[0].quantities, { '0': 3, '1': 7 });
    assert.equal(matrix.rows[0].quantity, 10);
    assert.equal(matrix.rows[2].quantities['ONE SIZE'], 2);
    assert.equal(matrix.total, 16);
    assert.equal(matrix.rows.reduce((n, row) => n + row.quantity, 0), matrix.total);
    assert.equal(JSON.stringify(records), before);
});

test('order matrix preserves extra and missing sizes and isolates depot routes', () => {
    const matrix = TransferOrderMatrix.build([
        { from: 'A', to: 'B', product: 'P', size: 'XL', quantity: 2 },
        { from: 'A', to: 'B', product: 'P', quantity: 3 },
        { from: 'A', to: 'C', product: 'P', size: 'ONE_SIZE', quantity: 4 }
    ]);
    assert.equal(matrix.rows.length, 2);
    assert(matrix.sizes.includes('XL'));
    assert(matrix.sizes.includes('BELİRTİLMEMİŞ'));
    assert.equal(matrix.rows[0].quantities['BELİRTİLMEMİŞ'], 3);
    assert.equal(matrix.total, 9);
});

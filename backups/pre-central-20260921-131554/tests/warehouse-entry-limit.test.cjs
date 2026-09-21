const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/js/warehouse-matrix.js'), 'utf8'), context);
const M = context.window.WarehouseMatrix;
const row = { key: 'product-white', code: 'Y26 11011', color: '101 Off White', sizes: { '1': { stock: 3 } } };
const ui = fs.readFileSync(path.join(__dirname, '../public/js/warehouse-matrix-ui.js'), 'utf8');
const handler = ui.split("input.addEventListener('input', () => {")[1].split('\n                    });')[0];

test('manual entry is capped immediately and shares the size stock across stores', () => {
    for (const [reserved, expected] of [[0, 3], [2, 1], [3, 0]]) {
        const edits = new Map([[M.cellKey(row.key, '1', 'B'), String(reserved)]]);
        const input = { value: '50', validity: { badInput: false }, setAttribute() {} };
        const status = {};
        const key = M.cellKey(row.key, '1', 'A');
        vm.runInNewContext(handler, {
            M, row, size: '1', store: 'A', key, edits, input, existing: 1,
            entries: () => [...edits].map(([key, value]) => { const [row, size, to] = JSON.parse(key); return { row, size, to, quantity: Number(value) }; }),
            updateColor() {}, recalculate() {}, indicator: {}, number: String, signed: String, get: () => status
        });
        assert.equal(input.value, String(expected));
        assert.equal(Number(edits.get(key)), expected);
        assert.match(status.textContent, /Mamül Depo/);
    }
});

test('editing a cell excludes its previous quantity and isolates other variants', () => {
    const entries = [
        { row: row.key, size: '1', to: 'A', quantity: 3 },
        { row: row.key, size: '2', to: 'B', quantity: 50 },
        { row: 'product-blue', size: '1', to: 'B', quantity: 50 }
    ];
    assert.equal(M.entryLimit(row, '1', 'A', entries), 3);
    assert.equal(M.entryLimit(row, '1', 'B', entries), 0);
    assert.equal(M.entryLimit(row, 'missing', 'A', entries), 0);
});

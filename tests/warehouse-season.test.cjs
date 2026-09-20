const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('warehouse season filters use product code, name and fabric fallback', () => {
    const source = fs.readFileSync(require.resolve('../public/js/warehouse-matrix-ui.js'), 'utf8');
    const catalog = [
        { code: 'K26101', name: 'Winter', fabric: 'Pamuk' },
        { code: 'Y26102', name: 'Summer', fabric: 'Keten' },
        { code: 'ABC', name: 'K26 11011', fabric: 'Denim' },
        { code: 'DEF', name: 'Basic', fabric: '847 CAPSULE 1 AW26' },
        { code: 'GHI', name: 'Basic', fabric: 'Unknown' }
    ];
    const select = { value: 'AW' };
    const context = { catalog, get: () => select };
    vm.runInNewContext(source.slice(source.indexOf('    function seasonRows()'), source.indexOf('    function filters()')), context);
    const fabrics = () => Array.from(context.seasonRows(), row => row.fabric);
    assert.deepEqual(fabrics(), ['Pamuk', 'Denim', '847 CAPSULE 1 AW26']);
    select.value = 'SS'; assert.deepEqual(fabrics(), ['Keten']);
    select.value = 'other'; assert.deepEqual(fabrics(), ['Unknown']);
    select.value = ''; assert.equal(fabrics().length, 5);
});

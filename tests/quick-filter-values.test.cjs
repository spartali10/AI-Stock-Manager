const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../public/js/quick-transfer.js'), 'utf8');
const context = { norm: value => String(value ?? '').trim().toLocaleLowerCase('tr-TR') };
vm.runInNewContext(source.slice(source.indexOf('    function values('), source.indexOf('    function keys(')), context);
const read = (product, type, key) => Array.from(context.values(product, type, key));
test('fabric choices follow selected seasons and year, including exclusions', () => {
    context.products = [
        { code: 'Y26101', fabric: 'Yazlık' }, { code: 'K26102', fabric: 'Kışlık' }, { code: 'Y25103', fabric: 'Eski yazlık' }
    ];
    context.unique = items => [...new Set(items)];
    const season = { type: 'hierarchy', key: 'Sezon', selected: ['Yaz'] };
    context.filters = [season, { type: 'hierarchy', key: 'Yıl', selected: ['2026'] }];
    vm.runInNewContext(source.slice(source.indexOf('    function filterChoices('), source.indexOf('    function renderFilters(')), context);
    const choices = () => Array.from(context.filterChoices({ type: 'attributes', key: 'KUMAŞ CİNSİ' }));
    assert.deepEqual(choices(), ['Yazlık']);
    season.selected = ['Kış']; assert.deepEqual(choices(), ['Kışlık']);
    season.selected = ['Yaz', 'Kış']; assert.deepEqual(choices(), ['Yazlık', 'Kışlık']);
    season.selected = ['Yaz']; season.exclude = true; assert.deepEqual(choices(), ['Kışlık']);
    context.filters = []; assert.deepEqual(choices(), ['Yazlık', 'Kışlık', 'Eski yazlık']);
});
test('fabric choices use imported fabric and retain legacy attribute support', () => {
    assert.deepEqual(read({ fabric: '847 CAPSULE 1 AW26' }, 'attributes', 'KUMAŞ CİNSİ'), ['847 CAPSULE 1 AW26']);
    assert.deepEqual(read({ fabricType: 'Keten' }, 'attributes', 'KUMAŞ CİNSİ'), ['Keten']);
    assert.deepEqual(read({ attributes: { 'Kumaş Cinsi': ['Pamuk'] } }, 'attributes', 'KUMAŞ CİNSİ'), ['Pamuk']);
});
test('product code supplies season and year with product name fallback', () => {
    for (const [product, season, year] of [[{ code: 'K26101011' }, 'Kış', '2026'], [{ name: 'Y26 11012' }, 'Yaz', '2026'], [{ code: 'Y27101', season: 'Kış' }, 'Yaz', '2027']]) {
        assert.deepEqual(read(product, 'hierarchy', 'Sezon'), [season]);
        assert.deepEqual(read(product, 'hierarchy', 'Yıl'), [year]);
    }
    assert.deepEqual(read({ code: 'ABC', year: 2025 }, 'hierarchy', 'Yıl'), ['2025']);
    assert.deepEqual(read({ code: 'ABC' }, 'hierarchy', 'Sezon'), []);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
require('../public/js/distribution-excel');
require('../public/js/warehouse-matrix');

test('plan order survives export and visible identifiers support import without hidden codes', async () => {
    const rows = ['B', 'A', 'B'].map((fabric, index) => ({ key: String(index), code: String(index), name: `Ürün ${index}`, fabric, color: 'Siyah', sizes: { '0': { stock: 10, valid: true } } }));
    const model = { screenLayout: true, rows, sizes: ['0'], targets: ['A'], quantity: (key, size) => size === '0' ? 2 : 0 };
    const book = await DistributionExcel.build(model, ExcelJS);
    const sheet = book.worksheets[0];
    assert.deepEqual([3, 4, 5].map(r => sheet.getCell(r, 2).value), rows.map(r => r.name));
    const codes = sheet.columnCount;
    sheet.getColumn(codes).eachCell(cell => { cell.value = null; });
    const buffer = await book.xlsx.writeBuffer();
    assert.deepEqual(await DistributionExcel.read(buffer, model, ExcelJS), rows.map(row => ({ row: row.key, size: '0', to: 'A', quantity: 2 })));
    await assert.rejects(DistributionExcel.read(buffer, { ...model, rows: [...rows, { ...rows[0], key: 'duplicate', code: 'other' }] }, ExcelJS), /eşleşmesi yok veya tekrarlı/);
});

test('existing store stock stays orange and visible without changing allocation totals or import', async () => {
    const row = { key: 'r', code: '01', name: 'Ürün', fabric: 'Cotton', color: 'BLACK', sizes: { '0': { stock: 10, valid: true }, '1': { stock: 5, valid: true } } };
    const model = { screenLayout: true, rows: [row], sizes: ['0', '1'], targets: ['A', 'B'],
        quantity: (key, size) => size === '0' ? 2 : 0,
        currentStock: (product, size, store) => store === 'A' && ['0', '1', 'ONE'].includes(size) ? 3 : 0 };
    const book = await DistributionExcel.build(model, ExcelJS);
    const restored = new ExcelJS.Workbook(); await restored.xlsx.load(await book.xlsx.writeBuffer());
    const sheet = restored.worksheets[0];
    for (const address of ['J3', 'K3', 'N3']) {
        const cell = sheet.getCell(address);
        assert.equal(cell.fill.fgColor.argb, 'FFC65D0A');
        assert.equal(cell.font.color.argb, 'FFFFFFFF');
        assert.equal(cell.numFmt, '"3";"3";"3"');
        assert(!sheet.conditionalFormattings.some(rule => rule.ref === address));
        assert.equal(sheet.getColumn(cell.col).width ?? 9, address === 'N3' ? 9 : 4);
    }
    assert.equal(sheet.getCell('J3').value, 2);
    assert.equal(sheet.getCell('K3').value, 0);
    assert.equal(sheet.getCell('P3').fill.fgColor.argb, 'FFA3DBB8');
    assert.equal(sheet.getCell('V3').value.result, 4);
    assert.equal(sheet.getCell('W3').value.result, 6);
    sheet.getCell('J3').value = 1;
    assert.deepEqual(await DistributionExcel.read(await restored.xlsx.writeBuffer(), model, ExcelJS), [
        { row: 'r', size: '0', to: 'A', quantity: 1 }, { row: 'r', size: '0', to: 'B', quantity: 2 }
    ]);
});

test('one trailing entry row follows contiguous products while formulas, cached totals and import keep their product references', async () => {
    const rows = ['01', '02'].map((code, index) => ({ key: code, code, name: `Ürün ${code}`, fabric: 'Cotton', color: 'BLACK', sizes: { '0': { stock: 10 + index, valid: true } } }));
    const model = { screenLayout: true, rows, sizes: ['0'], targets: ['A'], quantity: (key, size) => size === '0' ? Number(key) : 0 };
    const book = await DistributionExcel.build(model, ExcelJS);
    const restored = new ExcelJS.Workbook(); await restored.xlsx.load(await book.xlsx.writeBuffer());
    const sheet = restored.worksheets[0];
    for (const address of ['J3', 'J4', 'N5', 'J5']) {
        const entry = sheet.conditionalFormattings.find(format => format.ref === address);
        assert(entry, `${address}: manual entry color rule`);
        assert.equal(entry.rules[0].operator, 'greaterThan');
        assert.equal(entry.rules[0].style.fill.fgColor.argb, 'FFA3DBB8');
        assert.equal(entry.rules[0].style.fill.bgColor.argb, 'FFA3DBB8');
        assert.equal(entry.rules[1].style.fill.bgColor.argb, 'FFFFFFFF');
    }
    const negative = sheet.conditionalFormattings.find(format => format.ref === 'Q3:V6');
    assert(negative, 'Remaining sizes, extra rows, TOTAL and footer must have the negative-stock rule');
    assert.equal(negative.rules[0].operator, 'lessThan');
    assert.equal(Number(negative.rules[0].formulae[0]), 0);
    assert.equal(negative.rules[0].style.fill.fgColor.argb, 'FF9C0006');
    assert.equal(negative.rules[0].style.fill.bgColor.argb, 'FF9C0006');
    assert.equal(negative.rules[0].style.font.color.argb, 'FFFFFFFF');
    assert.equal(negative.rules[0].style.numFmt.formatCode, '0;-0;0');
    assert.equal(sheet.getCell('Q4').numFmt, '0;-0;0');
    assert.equal(sheet.getCell('Q6').numFmt, '0;-0;0');
    assert.equal(sheet.getCell('B3').value, 'Ürün 01');
    assert.equal(sheet.getCell('B4').value, 'Ürün 02');
    for (const index of [5]) {
        for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J']) assert.equal(sheet.getCell(`${column}${index}`).value, null);
        assert.equal(sheet.getCell(`I${index}`).value.formula, `SUM(D${index}:H${index})`);
        assert.equal(sheet.getCell(`Q${index}`).value.formula, `D${index}-J${index}`);
    }
    assert.equal(sheet.getCell('I6').value.formula, 'SUM(D6:H6)');
    assert.equal(sheet.getCell('Q4').value.formula, 'D4-J4');
    assert.equal(sheet.getCell('Q4').value.result, 9);
    assert.equal(sheet.getCell('J3').value, 1);
    assert.equal(sheet.getCell('K3').value, 0);
    assert.equal(sheet.getCell('K3').numFmt, '0');
    assert.equal(sheet.getCell('J3').alignment.shrinkToFit, true);
    assert.equal(sheet.getCell('D6').value.formula, 'SUM(D3:D5)');
    assert.equal(sheet.getCell('D6').value.result, 21);
    assert.deepEqual(await DistributionExcel.read(await restored.xlsx.writeBuffer(), model, ExcelJS), [
        { row: '01', size: '0', to: 'A', quantity: 1 },
        { row: '02', size: '0', to: 'A', quantity: 2 }
    ]);
});
test('screen distribution plan exports and imports the same store allocations with distributed and remaining totals', async () => {
    const row = { key: 'r', name: 'Örnek Ürün', collection: 'Collection', fabric: 'Cotton', code: '001', color: 'BLACK', sizes: { '0': { stock: 10, valid: true }, '1': { stock: 5, valid: true } } };
    const model = { screenLayout: true, rows: [row], sizes: ['0', '1'], targets: ['A', 'B'], quantity: (key, size, store) => size === '0' ? store === 'A' ? 2 : 3 : 0 };
    const book = await DistributionExcel.build(model, ExcelJS);
    const sheet = book.getWorksheet('Akıllı Dağıtım');
    assert.equal(sheet.getCell('A2').value, 'Kumaş cinsi');
    assert.equal(sheet.getCell('B2').value, 'Ürün Adı');
    assert.equal(sheet.getCell('B3').value, row.name);
    assert.equal(sheet.getCell('A3').value, 'Cotton');
    assert.equal(sheet.getCell('D1').value, 'MAMÜL DEPO · MEVCUT');
    assert.equal(sheet.getCell('V1').value, 'DAĞITILAN');
    assert.equal(sheet.getCell('W1').value, 'MAMÜL DEPO · KALAN');
    assert.equal(sheet.getCell('V3').value.result, 5);
    assert.equal(sheet.getCell('W3').value.result, 5);
    assert.equal(sheet.getCell('AB5').value.result, 10);
    const entries = await DistributionExcel.read(await book.xlsx.writeBuffer(), model, ExcelJS);
    assert.deepEqual(entries, [{ row: 'r', size: '0', to: 'A', quantity: 2 }, { row: 'r', size: '0', to: 'B', quantity: 3 }]);
    sheet.getCell('J3').value = 4;
    assert.equal((await DistributionExcel.read(await book.xlsx.writeBuffer(), model, ExcelJS))[0].quantity, 4);
});
test('matrix workbook keeps merged store headers, colors, formulas, codes and editable quantities through xlsx round trip', async () => {
    const row = { key: 'r', name: 'Örnek Ürün', collection: 'CRUDE 1', fabric: 'Cotton', code: '0014036', color: '101 OFF WHITE', sizes: { '0': { stock: 10, valid: true }, ONE: { stock: 4, valid: true } } };
    const model = { rows: [row], sizes: ['0', 'ONE'], targets: ['ISTINYE', 'LONDON'], quantity: (key, size, store) => size === '0' && store === 'ISTINYE' ? 2 : 0 };
    const book = await DistributionExcel.build(model, ExcelJS);
    const buffer = await book.xlsx.writeBuffer();
    const read = new ExcelJS.Workbook(); await read.xlsx.load(buffer);
    const sheet = read.getWorksheet('Akıllı Dağıtım');
    assert.equal(sheet.getCell('D1').value, 'KALAN');
    assert.equal(sheet.getCell('J1').value, 'ISTINYE');
    assert.equal(sheet.getCell('P1').value, 'LONDON');
    assert.equal(sheet.getCell('V1').value, 'KALAN');
    assert.equal(sheet.getCell('B3').value, 'Örnek Ürün');
    assert.equal(sheet.getCell('I3').value.result, 14);
    assert.equal(sheet.getCell('V3').value.result, 8);
    assert.equal(sheet.getCell('AA3').value.result, 12);
    assert.equal(sheet.getCell('AA5').value.result, 12);
    assert.equal(sheet.getCell('K3').fill.fgColor.argb, 'FFF3A6B3');
    assert.equal(sheet.getCell('I3').fill.fgColor.argb, 'FFFFFF00');
    assert.equal(sheet.getCell('J3').dataValidation.type, 'custom');
    assert.deepEqual(sheet.getCell('J3').dataValidation.formulae, ['OR($J$3="",AND(ISNUMBER($J$3),$J$3>=0,MOD($J$3,1)=0,$J$3<=MAX(0,$D$3-SUM($P$3))))']);
    assert(sheet.getCell('P3').dataValidation.formulae[0].includes('MAX(0,$D$3-SUM($J$3))'));
    assert(sheet.getCell('K3').dataValidation.formulae[0].includes('MAX(0,$E$3-SUM($Q$3))'));
    assert.deepEqual(await DistributionExcel.read(buffer, model, ExcelJS), [{ row: 'r', size: '0', to: 'ISTINYE', quantity: 2 }]);
    sheet.getCell('J3').value = 4;
    assert.equal((await DistributionExcel.read(await read.xlsx.writeBuffer(), model, ExcelJS))[0].quantity, 4);
    sheet.getCell('J3').value = -1;
    await assert.rejects(DistributionExcel.read(await read.xlsx.writeBuffer(), model, ExcelJS), /Geçersiz/);
    sheet.getCell('J3').value = { formula: '1+1', result: 2 };
    await assert.rejects(DistributionExcel.read(await read.xlsx.writeBuffer(), model, ExcelJS), /formül/);
    sheet.getCell('J3').value = 2; sheet.getCell('J1').value = 'WRONG STORE';
    await assert.rejects(DistributionExcel.read(await read.xlsx.writeBuffer(), model, ExcelJS), /başlıkları/);
});

test('undefined size is excluded, ONE SIZE is a single column and subtotals stay consistent', async () => {
    const row = { key: 'r', fabric: 'Tanımsız', code: '01', color: 'BLACK', sizes: { '0': { stock: 10, valid: true }, 'ONE SIZE': { stock: 4, valid: true }, 'Tanımsız': { stock: 99, valid: false } } };
    const model = { rows: [row], sizes: ['0', 'ONE SIZE', 'Tanımsız'], targets: ['A', 'B'], quantity: (key, size, store) => size === 'ONE SIZE' && store === 'A' ? 2 : 0 };
    const book = await DistributionExcel.build(model, ExcelJS);
    const sheet = book.getWorksheet('Akıllı Dağıtım');
    assert.equal(sheet.columnCount, 28);
    assert.equal(sheet.getColumn(28).hidden, true);
    assert.equal(sheet.getCell(3, 28).value, '01');
    assert.deepEqual(sheet.getRow(2).values.slice(4, 10), ['0', '1', '2', '3', 'ONE SIZE', 'TOTAL']);
    assert(!sheet.getRow(2).values.includes('Tanımsız'));
    assert.equal(sheet.getCell('A5').value, 'GENEL TOPLAM');
    assert.equal(sheet.getCell('I3').value.result, 14);
    assert.equal(sheet.getCell('AA5').value.result, 12);
    assert.deepEqual(await DistributionExcel.read(await book.xlsx.writeBuffer(), model, ExcelJS), [{ row: 'r', size: 'ONE SIZE', to: 'A', quantity: 2 }]);
    sheet.getCell('H3').value = 999; // Untrusted source/total cells never override live inventory.
    sheet.getCell('N3').value = 3; sheet.getCell('T3').value = 2;
    await assert.rejects(DistributionExcel.read(await book.xlsx.writeBuffer(), model, ExcelJS), /kaynak stoğunu/);
    sheet.getCell('N3').value = true; sheet.getCell('T3').value = null;
    await assert.rejects(DistributionExcel.read(await book.xlsx.writeBuffer(), model, ExcelJS), /Geçersiz/);
    await assert.rejects(DistributionExcel.build({ ...model, sizes: ['ONE', 'ONE SIZE'] }, ExcelJS), /aynı anda/);
});

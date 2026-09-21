(function (root) {
    const baseSizes = ['0', '1', '2', '3', 'ONE'];
    const fill = color => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: color } });
    const value = cell => cell.value?.result ?? cell.value ?? '';
    const undefinedSize = size => ['', 'tanımsız', 'tanimsiz', 'belirtilmemiş'].includes(String(size).trim().toLocaleLowerCase('tr-TR'));
    const sizeLabel = size => /^(ONE|ONE SIZE)$/i.test(size) ? 'ONE SIZE' : size;
    function layout(model) {
        const available = [...new Set(model.sizes)].filter(size => !undefinedSize(size));
        const one = available.includes('ONE SIZE') && !available.includes('ONE') ? 'ONE SIZE' : 'ONE';
        if (available.includes('ONE') && available.includes('ONE SIZE')) throw Error('ONE ve ONE SIZE bedenleri aynı anda mevcut. Stok beden kodlarını tek biçime getirin.');
        return { sizes: [...new Set([...baseSizes.slice(0, 4), one, ...available])], groups: [model.screenLayout ? 'MAMÜL DEPO · MEVCUT' : 'KALAN', ...model.targets, model.screenLayout ? 'MAMÜL DEPO · KALAN' : 'KALAN'] };
    }
    async function build(model, ExcelJS) {
        const book = new ExcelJS.Workbook(); book.calcProperties.fullCalcOnLoad = true;
        const sheet = book.addWorksheet('Akıllı Dağıtım', { views: [{ state: 'frozen', xSplit: 3, ySplit: 2 }] });
        const existingStockCells = [];
        const manualEntryColor = cell => sheet.addConditionalFormatting({
            ref: cell.address,
            rules: [
                { type: 'cellIs', operator: 'greaterThan', formulae: [0], priority: 1, style: { fill: { ...fill('FFA3DBB8'), bgColor: { argb: 'FFA3DBB8' } }, font: { color: { argb: 'FF145C34' } } } },
                { type: 'expression', formulae: [`OR(${cell.address}="",${cell.address}=0)`], priority: 2, style: { fill: { ...fill('FFFFFFFF'), bgColor: { argb: 'FFFFFFFF' } } } }
            ]
        });
        const { sizes, groups } = layout(model), width = sizes.length + 1;
        const groupStart = g => 4 + g * width + (model.screenLayout && g === groups.length - 1 ? 1 : 0);
        (model.screenLayout ? ['Kumaş cinsi', 'Ürün Adı', 'Renk'] : ['COLLECTION', 'Ürün Adı', 'Color']).forEach((label, i) => { sheet.getCell(2, i + 1).value = label; sheet.getCell(2, i + 1).fill = fill('FF58BDD5'); sheet.getColumn(i + 1).width = [14, 20, 16][i]; });
        const codeColumn = 4 + groups.length * width + (model.screenLayout ? 1 : 0);
        sheet.getColumn(codeColumn).hidden = true;
        sheet.getColumn(codeColumn).numFmt = '@';
        sheet.getCell(2, codeColumn).value = 'Ürün Kodu';
        const sentColumn = 4 + (groups.length - 1) * width;
        sheet.getColumn(2).numFmt = '@';
        if (model.screenLayout) {
            sheet.mergeCells(1, sentColumn, 2, sentColumn); sheet.getCell(1, sentColumn).value = 'DAĞITILAN'; sheet.getCell(1, sentColumn).fill = fill('FFFFFF00'); sheet.getColumn(sentColumn).width = 10;
        }
        groups.forEach((name, g) => {
            const start = groupStart(g);
            sheet.mergeCells(1, start, 1, start + width - 1);
            sheet.getCell(1, start).value = name;
            sheet.getCell(1, start).fill = fill(g === 0 || g === groups.length - 1 ? 'FFFFC000' : /LONDON|TIRAN/i.test(name) ? 'FF92D050' : 'FFFFFF00');
            [...sizes, 'TOTAL'].forEach((s, i) => { sheet.getCell(2, start + i).value = sizeLabel(s); sheet.getColumn(start + i).width = i === sizes.length ? 7 : sizeLabel(s) === 'ONE SIZE' ? 9 : 4; });
        });
        let rowIndex = 3;
        const identity = row => model.screenLayout ? row.fabric : row.collection || row.fabric;
        {
            for (const row of model.rows) {
                const collection = identity(row);
                sheet.getCell(rowIndex, 1).value = collection; sheet.getCell(rowIndex, 2).value = row.name || 'Tanımsız ürün'; sheet.getCell(rowIndex, 3).value = row.color;
                sheet.getCell(rowIndex, codeColumn).value = String(row.code);
                groups.forEach((group, g) => {
                    const start = groupStart(g);
                    sizes.forEach((size, i) => {
                        const cell = sheet.getCell(rowIndex, start + i), stock = row.sizes[size]?.stock || 0;
                        if (g === 0) cell.value = stock;
                        else if (g === groups.length - 1) {
                            const refs = model.targets.map((_, t) => sheet.getCell(rowIndex, 4 + (t + 1) * width + i).address);
                            cell.value = { formula: `${sheet.getCell(rowIndex, 4 + i).address}${refs.map(ref => '-' + ref).join('')}`, result: stock - model.targets.reduce((n, s) => n + model.quantity(row.key, size, s), 0) };
                        } else {
                            cell.value = Number(model.quantity(row.key, size, group) || 0);
                            const absolute = col => sheet.getCell(rowIndex, col).address.replace(/^([A-Z]+)(\d+)$/, '$$$1$$$2');
                            const sourceRef = absolute(4 + i);
                            const otherStores = model.targets.map((_, t) => t + 1).filter(t => t !== g).map(t => absolute(4 + t * width + i));
                            const limit = `MAX(0,${sourceRef}${otherStores.length ? '-SUM(' + otherStores.join(',') + ')' : ''})`;
                            const ownRef = absolute(start + i);
                            cell.dataValidation = { type: 'custom', formulae: [`OR(${ownRef}="",AND(ISNUMBER(${ownRef}),${ownRef}>=0,MOD(${ownRef},1)=0,${ownRef}<=${limit}))`], allowBlank: true, showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Geçersiz dağıtım adedi', error: 'Sıfır veya pozitif tam sayı girin. Bu beden için tüm mağazalara dağıtılan toplam, soldaki kaynak stok adedini aşamaz.' };
                            cell.fill = fill(!row.sizes[size]?.valid ? 'FFF3A6B3' : Number(cell.value) > 0 ? 'FFA3DBB8' : 'FFFFFFFF');
                            const existing = Number(model.currentStock?.(row, size, group) || 0);
                            if (existing > 0) existingStockCells.push({ cell, existing });
                            else if (row.sizes[size]?.valid) manualEntryColor(cell);
                        }
                    });
                    const total = sheet.getCell(rowIndex, start + sizes.length);
                    const result = sizes.reduce((n, size) => n + (g === 0 ? row.sizes[size]?.stock || 0 : g === groups.length - 1 ? (row.sizes[size]?.stock || 0) - model.targets.reduce((sum, s) => sum + model.quantity(row.key, size, s), 0) : model.quantity(row.key, size, group)), 0);
                    total.value = { formula: `SUM(${sheet.getCell(rowIndex, start).address}:${sheet.getCell(rowIndex, start + sizes.length - 1).address})`, result };
                    total.fill = fill('FFFFFF00');
                });
                if (model.screenLayout) {
                    const refs = model.targets.map((store, t) => sheet.getCell(rowIndex, groupStart(t + 1) + sizes.length).address);
                    sheet.getCell(rowIndex, sentColumn).value = { formula: refs.length ? `SUM(${refs.join(',')})` : '0', result: sizes.reduce((sum, size) => sum + model.targets.reduce((n, store) => n + model.quantity(row.key, size, store), 0), 0) };
                    sheet.getCell(rowIndex, sentColumn).fill = fill('FFFFFF00');
                }
                rowIndex++;
            }
        }
                const extraRow = rowIndex;
                groups.forEach((_, g) => {
                    const start = groupStart(g);
                    if (g > 0 && g < groups.length - 1) sizes.forEach((_, i) => manualEntryColor(sheet.getCell(extraRow, start + i)));
                    if (g === groups.length - 1) sizes.forEach((size, i) => {
                        const source = sheet.getCell(extraRow, 4 + i).address;
                        const destinations = model.targets.map((_, t) => sheet.getCell(extraRow, groupStart(t + 1) + i).address);
                        sheet.getCell(extraRow, start + i).value = { formula: `${source}${destinations.map(ref => '-' + ref).join('')}`, result: 0 };
                    });
                    const total = sheet.getCell(extraRow, start + sizes.length);
                    total.value = { formula: `SUM(${sheet.getCell(extraRow, start).address}:${sheet.getCell(extraRow, start + sizes.length - 1).address})`, result: 0 };
                    total.fill = fill('FFFFFF00');
                });
                if (model.screenLayout) {
                    const refs = model.targets.map((_, t) => sheet.getCell(extraRow, groupStart(t + 1) + sizes.length).address);
                    sheet.getCell(extraRow, sentColumn).value = { formula: refs.length ? `SUM(${refs.join(',')})` : '0', result: 0 };
                    sheet.getCell(extraRow, sentColumn).fill = fill('FFFFFF00');
                }
                sheet.getRow(extraRow).height = 19;
                rowIndex++;
        sheet.getCell(rowIndex, 1).value = 'GENEL TOPLAM';
        for (let col = 4; col < 4 + groups.length * width + (model.screenLayout ? 1 : 0); col++) {
            const cell = sheet.getCell(rowIndex, col);
            let result = 0; for (let r = 3; r < rowIndex; r++) result += Number(value(sheet.getCell(r, col))) || 0;
            cell.value = { formula: rowIndex > 3 ? `SUM(${sheet.getCell(3, col).address}:${sheet.getCell(rowIndex - 1, col).address})` : '0', result }; cell.fill = fill('FFFFFF00');
        }
        // TOTAL always reconciles with the size subtotals, including additional rows.
        groups.forEach((_, g) => {
            const start = groupStart(g), total = sheet.getCell(rowIndex, start + sizes.length);
            total.value = { formula: `SUM(${sheet.getCell(rowIndex, start).address}:${sheet.getCell(rowIndex, start + sizes.length - 1).address})`, result: sizes.reduce((sum, _, i) => sum + (Number(value(sheet.getCell(rowIndex, start + i))) || 0), 0) };
        });
        sheet.eachRow(row => { row.height = 19; row.eachCell({ includeEmpty: true }, cell => { cell.font = { name: 'Arial', size: 10, bold: cell.row <= 2 || cell.row === rowIndex }; cell.alignment = { horizontal: cell.col <= 3 ? 'left' : 'center', vertical: 'middle' }; cell.border = Object.fromEntries(['top', 'left', 'bottom', 'right'].map(side => [side, { style: 'thin', color: { argb: 'FF000000' } }])); }); });
        sheet.eachRow((row, index) => {
            if (index < 3) return;
            row.eachCell(cell => {
                if (cell.col < 4 || cell.col >= codeColumn) return;
                cell.numFmt = '0';
                cell.alignment = { ...cell.alignment, shrinkToFit: true };
            });
        });
        const remainingStart = groupStart(groups.length - 1);
        // Keep the underlying value numeric: only the allocation is imported or summed.
        for (const { cell, existing } of existingStockCells) {
            cell.fill = fill('FFC65D0A');
            cell.font = { ...cell.font, color: { argb: 'FFFFFFFF' } };
            // Display existing stock only; retain allocation values for totals and re-import.
            cell.numFmt = `"${existing}";"${existing}";"${existing}"`;
        }
        for (let r = 3; r <= rowIndex; r++) {
            for (let c = remainingStart; c <= remainingStart + sizes.length; c++) {
                sheet.getCell(r, c).numFmt = '0;-0;0';
            }
        }
        sheet.addConditionalFormatting({
            ref: `${sheet.getCell(3, remainingStart).address}:${sheet.getCell(rowIndex, remainingStart + sizes.length).address}`,
            rules: [{ type: 'cellIs', operator: 'lessThan', formulae: [0], priority: 1,
                style: { fill: { ...fill('FF9C0006'), bgColor: { argb: 'FF9C0006' } }, font: { color: { argb: 'FFFFFFFF' }, bold: true }, numFmt: '0;-0;0' }
            }]
        });
        sheet.pageSetup = { orientation: 'landscape', paperSize: 8, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:2' };
        return book;
    }
    async function read(buffer, model, ExcelJS) {
        const book = new ExcelJS.Workbook(); await book.xlsx.load(buffer);
        const sheet = book.getWorksheet('Akıllı Dağıtım');
        const headers = model.screenLayout ? ['Kumaş cinsi', 'Ürün Kodu', 'Renk'] : ['COLLECTION', 'Ürün Kodu', 'Color'];
        if (!sheet || headers.some((v, i) => {
            const actual = value(sheet.getCell(2, i + 1));
            return i === 1 ? !['Ürün Adı', 'Ürün Kodu', 'Ürün kodu', 'ItemDesc'].includes(actual) : actual !== v;
        })) throw Error('Akıllı Dağıtım Excel şablonunu kullanın.');
        const { sizes, groups } = layout(model), width = sizes.length + 1;
        const usesName = value(sheet.getCell(2, 2)) === 'Ürün Adı';
        const codeColumn = 4 + groups.length * width + (model.screenLayout ? 1 : 0);
        const hasCodeColumn = value(sheet.getCell(2, codeColumn)) === 'Ürün Kodu';
        groups.forEach((group, g) => {
            const start = 4 + g * width + (model.screenLayout && g === groups.length - 1 ? 1 : 0);
            if (value(sheet.getCell(1, start)) !== group || [...sizes, 'TOTAL'].some((s, i) => String(value(sheet.getCell(2, start + i))) !== sizeLabel(s))) throw Error('Mağaza/beden başlıkları değişmiş. Güncel şablonu indirin.');
        });
        const entries = [], seen = new Set();
        if (model.screenLayout && value(sheet.getCell(1, 4 + (groups.length - 1) * width)) !== 'DAĞITILAN') throw Error('DAĞITILAN sütunu değişmiş. Güncel şablonu kullanın.');
        for (let index = 3; index <= sheet.rowCount; index++) {
            const code = String(value(sheet.getCell(index, usesName ? codeColumn : 2))).trim();
            const name = String(value(sheet.getCell(index, 2))).trim();
            if (!code && (!usesName || !name)) {
                continue;
            }
            if (usesName && hasCodeColumn && !code) throw Error(`Satır ${index}: Ürün kodu eksik.`);
            const matches = model.rows.filter(r => (usesName && !hasCodeColumn ? (r.name || 'Tanımsız ürün') === name : r.code === code) && r.color === String(value(sheet.getCell(index, 3))) && (model.screenLayout ? r.fabric : r.collection || r.fabric) === String(value(sheet.getCell(index, 1))));
            if (matches.length !== 1 || seen.has(matches[0]?.key)) throw Error(`Satır ${index}: Ürün eşleşmesi yok veya tekrarlı.`);
            const row = matches[0]; seen.add(row.key);
            if (usesName && String(value(sheet.getCell(index, 2))) !== (row.name || 'Tanımsız ürün')) throw Error(`Satır ${index}: Ürün adı ve kodu eşleşmiyor.`);
            const allocated = new Map();
            model.targets.forEach((store, t) => sizes.forEach((size, i) => {
                const cell = sheet.getCell(index, 4 + (t + 1) * width + i);
                if (cell.type === ExcelJS.ValueType.Formula) throw Error(`Satır ${index}: Dağıtım adetlerini formül yerine sayı olarak girin.`);
                const raw = value(cell);
                if (typeof raw !== 'number' && typeof raw !== 'string') throw Error(`Satır ${index}: Geçersiz adet.`);
                const amount = Number(raw);
                if (!Number.isSafeInteger(amount) || amount < 0) throw Error(`Satır ${index}: Geçersiz adet.`);
                allocated.set(size, (allocated.get(size) || 0) + amount);
                if (amount && (!row.sizes[size]?.valid || allocated.get(size) > row.sizes[size].stock)) throw Error(`Satır ${index}: Dağıtılan adet kaynak stoğunu aşıyor veya beden geçersiz.`);
                if (amount) entries.push({ row: row.key, size, to: store, quantity: amount });
            }));
        }
        if (!seen.size) throw Error('Excel içinde ürün satırı bulunamadı.');
        return entries;
    }
    root.DistributionExcel = { build, read };
})(typeof window !== 'undefined' ? window : globalThis);

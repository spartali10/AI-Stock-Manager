(function (root) {
    const baseSizes = ['0', '1', '2', '3', '4', 'ONE SIZE'];
    const headers = ['Ürün Kodu', 'Ürün Adı', 'Renk', 'Mağaza', 'Kumaş Cinsi', ...baseSizes, 'Durum'];
    const detailName = 'Beden Detayı';
    const detailHeaders = ['Kumaş Cinsi', 'Ürün Adı', 'Renk', 'Beden', 'Mağaza', 'Stok', 'Ürün Kodu', 'Durum'];
    function parseDetails(rows) {
        const grouped = new Map(), seen = new Set();
        rows.forEach((row, index) => {
            if (detailHeaders.some(h => h !== 'Durum' && !Object.hasOwn(row, h))) throw Error('Excel başlıkları: ' + detailHeaders.join(', '));
            const size = String(row.Beden ?? '').trim();
            if (!baseSizes.includes(size) && size !== '') throw Error(`Satır ${index + 2}: Geçersiz beden: ${size}`);
            const raw = row.Stok;
            if (!['number', 'string'].includes(typeof raw) || !/^-?\d+$/.test(String(raw).trim()) || !Number.isSafeInteger(Number(raw))) throw Error(`Satır ${index + 2}: Stok tam sayı olmalıdır (negatif olabilir).`);
            if (!size && Number(raw) !== 0) throw Error(`Satır ${index + 2}: Sıfırdan farklı stok için beden zorunludur.`);
            const key = JSON.stringify(['Ürün Kodu', 'Renk', 'Mağaza', 'Kumaş Cinsi'].map(h => String(row[h] ?? '').trim()));
            const variant = JSON.stringify([key, size]);
            if (seen.has(variant)) throw Error(`Satır ${index + 2}: Aynı ürün, renk, mağaza, kumaş ve beden tekrar ediyor.`);
            seen.add(variant);
            const name = String(row['Ürün Adı'] ?? '').trim(), status = String(row.Durum ?? '').trim();
            if (!grouped.has(key)) grouped.set(key, { ...Object.fromEntries(headers.map(h => [h, ''])), ...Object.fromEntries(['Ürün Kodu', 'Renk', 'Mağaza', 'Kumaş Cinsi'].map(h => [h, row[h]])), 'Ürün Adı': name, Durum: status });
            const target = grouped.get(key);
            if (target['Ürün Adı'] !== name || target.Durum !== status) throw Error(`Satır ${index + 2}: Aynı ürünün adı ve durumu beden satırlarında tutarlı olmalıdır.`);
            if (size) target[size] = Number(raw);
        });
        return parse([...grouped.values()]);
    }
    function readWorkbook(workbook, XLSX) {
        const name = workbook.SheetNames.includes(detailName) ? detailName : workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '' });
        if (name === detailName) return parseDetails(rows);
        return parse(rows);
    }
    function parse(rows) {
        if (rows.some(row => Object.hasOwn(row, 'Beden') || Object.hasOwn(row, 'Stok'))) return parseDetails(rows);
        const products = [], seen = new Set();
        for (const [index, row] of rows.entries()) {
            if (headers.some(header => header !== 'Kumaş Cinsi' && header !== '4' && !Object.hasOwn(row, header))) throw Error('Excel başlıkları: ' + headers.join(', '));
            const code = String(row['Ürün Kodu']).trim(), name = String(row['Ürün Adı']).trim(), store = String(row['Mağaza']).trim();
            if (!code || !name || !store) throw Error(`Satır ${index + 2}: Ürün kodu, adı ve mağaza zorunludur.`);
            const color = String(row.Renk ?? '').trim();
            const fabric = String(row['Kumaş Cinsi'] ?? '').trim();
            const key = JSON.stringify([code, color, store, fabric]);
            if (seen.has(key)) throw Error(`Satır ${index + 2}: Aynı ürün, renk, mağaza ve kumaş cinsi tekrar ediyor.`);
            seen.add(key);
            const status = { Normal: 'normal', 'Düşük': 'low', Kritik: 'critical', Tükendi: 'depleted' }[String(row.Durum).trim()];
            if (!status && String(row.Durum).trim()) throw Error(`Satır ${index + 2}: Durum Normal, Düşük, Kritik veya Tükendi olmalıdır.`);
            const variants = [];
            for (const size of baseSizes) {
                const raw = row[size];
                if (raw === '' || raw == null || ['-', '—'].includes(String(raw).trim())) continue;
                if (!['number', 'string'].includes(typeof raw) || !/^-?\d+$/.test(String(raw).trim()) || !Number.isSafeInteger(Number(raw))) throw Error(`Satır ${index + 2}, ${size}: Adet tam sayı olmalıdır (negatif olabilir).`);
                variants.push({ size, stock: Number(raw) });
            }
            if (!variants.length) variants.push({ size: '', stock: 0 });
            const total = variants.reduce((sum, v) => sum + v.stock, 0);
            products.push(...variants.map(v => ({ code, name, color, store, fabric, ...v, min: 0, capacity: Math.max(1, v.stock), category: 'Genel', excelStatus: status, excelStock: total })));
        }
        if (!products.length) throw Error('Excel içinde ürün satırı bulunamadı.');
        return products;
    }
    function build(records, sizes, ExcelJS) {
        const book = new ExcelJS.Workbook();
        const sheet = book.addWorksheet('Stok Listesi', { views: [{ state: 'frozen', ySplit: 1, xSplit: 5, showGridLines: false }] });
        sheet.addRow(headers);
        sheet.getColumn(1).numFmt = '@';
        const fill = color => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: color } });
        const states = { depleted: ['Tükendi', 'FF222222', 'FFF0F0F0'], normal: ['Normal', 'FF00A96B', 'FFEAFBF3'], low: ['Düşük', 'FFC28D00', 'FFFFF9E5'], critical: ['Kritik', 'FFFF3D65', 'FFFFEEF2'] };
        const grouped = new Map();
        for (const record of records) {
            const key = JSON.stringify([record.code, record.color || '', record.store, record.fabric || '']);
            if (!grouped.has(key)) grouped.set(key, { ...record, quantities: baseSizes.map(() => null) });
            const target = grouped.get(key);
            sizes.forEach((size, i) => {
                const col = baseSizes.indexOf(size);
                if (col < 0 && record.quantities[i] != null) throw Error(`${size} bedeni bu Excel formatında yok. Aktarım durduruldu.`);
                if (col >= 0 && record.quantities[i] != null) target.quantities[col] = (target.quantities[col] || 0) + record.quantities[i];
            });
            if (record.status === 'critical' || (record.status === 'low' && target.status !== 'critical')) target.status = record.status;
        }
        for (const record of grouped.values()) {
            const state = states[record.status] || ['', 'FF999999', 'FFF5F5F8'];
            const row = sheet.addRow([String(record.code || ''), record.name || '', record.color || '', record.store, record.fabric || '', ...record.quantities.map(n => n == null ? '-' : n), state[0]]);
            row.height = 24;
            row.eachCell(cell => {
                cell.font = { name: 'Arial', size: 11, color: { argb: 'FF555560' } };
                cell.alignment = { vertical: 'middle', horizontal: cell.col <= 5 ? 'left' : 'center', wrapText: true };
                cell.fill = fill(row.number % 2 ? 'FFFAFAFC' : 'FFFFFFFF');
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E5EB' } } };
                if (cell.col > 5 && cell.col < headers.length) cell.numFmt = '#,##0';
            });
            row.getCell(1).font = { name: 'Arial', size: 11, bold: true };
            const status = row.getCell(headers.length);
            status.font = { name: 'Arial', size: 11, color: { argb: state[1] } }; status.fill = fill(state[2]);
            for (let column = 6; column < headers.length; column++) {
                const cell = row.getCell(column);
                cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF888888' } };
                cell.fill = fill('FFF5F5F8');
            }
        }
        if (grouped.size) sheet.addConditionalFormatting({
            ref: `F2:K${grouped.size + 1}`,
            rules: [
                { type: 'expression', formulae: ['AND(ISNUMBER(F2),F2=0)'], style: { font: { bold: true, color: { argb: 'FFFF2864' } }, fill: fill('FFFFEEF2') } },
                { type: 'expression', formulae: ['AND(ISNUMBER(F2),F2>0)'], style: { font: { bold: true, color: { argb: 'FF00783D' } }, fill: fill('FFEAFBF3') } }
            ]
        });
        sheet.getRow(1).height = 32;
        sheet.getRow(1).eachCell(cell => {
            cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF9999A3' } };
            cell.fill = fill('FFFAFAFC'); cell.alignment = { vertical: 'middle', horizontal: cell.col <= 5 ? 'left' : 'center' };
        });
        headers.forEach((_, i) => { sheet.getColumn(i + 1).width = i === 0 ? 18 : i === 1 ? 32 : i === 2 ? 24 : i === 3 ? 30 : i === 4 ? 24 : 14; });
        sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: grouped.size + 1, column: headers.length } };
        sheet.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:1' };
        const detail = book.addWorksheet(detailName, { views: [{ state: 'frozen', ySplit: 1, showGridLines: false }] });
        detail.addRow(detailHeaders);
        for (const record of grouped.values()) {
            const variants = baseSizes.flatMap((size, i) => record.quantities[i] == null ? [] : [[size, record.quantities[i]]]);
            if (!variants.length) variants.push(['', 0]);
            for (const [size, quantity] of variants) detail.addRow([record.fabric || '', record.name || '', record.color || '', size, record.store, quantity, String(record.code || ''), (states[record.status] || [''])[0]]);
        }
        detail.columns.forEach((column, i) => { column.width = [32, 30, 26, 14, 30, 14, 20, 16][i]; });
        detail.getColumn(4).numFmt = '@';
        detail.getColumn(7).numFmt = '@';
        detail.getColumn(6).numFmt = '#,##0';
        detail.eachRow((row, number) => {
            row.height = 32;
            row.eachCell(cell => {
                cell.font = { name: 'Arial', size: 11, bold: number === 1, color: { argb: number === 1 ? 'FFFFFFFF' : 'FF333344' } };
                cell.fill = fill(number === 1 ? 'FF6030A0' : number % 2 ? 'FFF5F2FA' : 'FFFFFFFF');
                cell.alignment = { vertical: 'middle', wrapText: true, horizontal: cell.col === 6 ? 'right' : 'left' };
            });
        });
        detail.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, detail.rowCount), column: detailHeaders.length } };
        detail.pageSetup = { ...sheet.pageSetup };
        return book;
    }
    root.StockExcel = { build, parse, readWorkbook, headers, detailHeaders, detailName, sizes: baseSizes };
})(typeof window !== 'undefined' ? window : globalThis);

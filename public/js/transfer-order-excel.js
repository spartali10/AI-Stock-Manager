(function (root) {
    function build(records, context, columns, hidden, ExcelJS) {
        const matrix = root.TransferOrderMatrix.build(records, context);
        const visible = columns.filter(([key]) => !hidden.has(key)).flatMap(([key, label]) => key === 'size' ? matrix.sizes.map(size => [`size:${size}`, size]) : [[key, label]]);
        if (!visible.length) throw new Error('Excel aktarımı için en az bir kolon seçin.');
        const book = new ExcelJS.Workbook(), sheet = book.addWorksheet('Transfer Edilen Ürünler', { views: [{ state: 'frozen', ySplit: 1 }] });
        const widths = { from: 14, to: 14, product: 15, productName: 20, color: 13, sourceInventory: 12, sourceSales: 11, targetInventory: 12, targetSales: 11, quantity: 10 };
        sheet.columns = visible.map(([key, header]) => ({ header, key, width: key.startsWith('size:') ? (key === 'size:ONE SIZE' ? 9 : 6) : widths[key] || 14 }));
        matrix.rows.forEach(row => {
            const cells = sheet.addRow(visible.map(([key]) => key.startsWith('size:') ? row.quantities[key.slice(5)] || 0 : row[key] ?? (key === 'productName' ? row.product : '—')));
            cells.eachCell((cell, index) => {
                const key = visible[index - 1][0], isSize = key.startsWith('size:');
                const fill = isSize ? cell.value > 0 ? 'FFE5F7EE' : 'FFFFE8EC' : key.startsWith('source') ? 'FFE3F1FF' : key.startsWith('target') ? 'FFE5F7EE' : 'FFF8FAFC';
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
                cell.font = { name: 'Calibri', size: 9, bold: isSize, color: { argb: isSize ? cell.value > 0 ? 'FF197342' : 'FFBD2342' : 'FF233044' } };
                if (['product', 'color'].includes(key)) cell.numFmt = '@';
            });
        });
        const end = sheet.rowCount;
        sheet.addRow(visible.map(([key], index) => key === 'quantity' || key.startsWith('size:') ? end > 1 ? { formula: `SUM(${sheet.getColumn(index + 1).letter}2:${sheet.getColumn(index + 1).letter}${end})`, result: matrix.rows.reduce((n, row) => n + (key === 'quantity' ? row.quantity : row.quantities[key.slice(5)] || 0), 0) } : 0 : index === 0 ? 'Toplam Sevk Adet:' : ''));
        sheet.getRow(1).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF385675' } }; cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; });
        sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: end, column: visible.length } };
        sheet.eachRow(row => { row.height = 22; row.eachCell(cell => { cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; }); });
        sheet.getRow(1).height = 30;
        sheet.addRow(['Yeşil: transfere dahil; kırmızı: dahil değil. Envanter transfer edilen bedenin işlem öncesi stoğudur; eski emirlerde anlık kayıt yoksa — gösterilir. Satış emir dönemidir; dönem yoksa kayıtlı tüm satışlar. —: veri / kapsam eksik.']);
        sheet.mergeCells(sheet.rowCount, 1, sheet.rowCount, Math.max(1, visible.length));
        sheet.lastRow.height = 30;
        sheet.lastRow.getCell(1).alignment = { wrapText: true, vertical: 'middle' };
        sheet.eachRow(row => row.eachCell(cell => { cell.font = { ...cell.font, name: 'Calibri', size: 9 }; }));
        sheet.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
        return book;
    }
    root.TransferOrderExcel = { build };
})(typeof window !== 'undefined' ? window : globalThis);

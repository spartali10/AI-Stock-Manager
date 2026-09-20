(function (root) {
    const date = value => value ? new Date(value).toLocaleString('tr-TR') : '—';
    function build(tasks, ExcelJS) {
        const book = new ExcelJS.Workbook();
        book.creator = 'AI Stock Manager';
        function sheet(name, headers, widths, rows) {
            const ws = book.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
            ws.columns = headers.map((header, i) => ({ header, width: widths[i] }));
            rows.forEach(row => ws.addRow(row));
            ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, ws.rowCount), column: headers.length } };
            ws.eachRow((row, index) => {
                row.height = index === 1 ? 30 : 42;
                row.eachCell({ includeEmpty: true }, cell => {
                    cell.font = { name: 'Calibri', size: 11, bold: index === 1, color: { argb: index === 1 ? 'FFFFFFFF' : 'FF233044' } };
                    cell.alignment = { vertical: 'middle', wrapText: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index === 1 ? 'FF7054A5' : index % 2 ? 'FFF0EDF8' : 'FFFFFFFF' } };
                });
            });
            ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:1' };
            return ws;
        }
        const summary = sheet('Görev Listesi',
            ['ID', 'Şablon Adı', 'Kullanıcı', 'Durum', 'Başlangıç', 'Bitiş', 'İlerleme', 'Son Mesaj', 'Emir No', 'Toplam Adet'],
            [10, 32, 22, 18, 24, 24, 14, 35, 12, 15],
            tasks.map(t => [t.id, t.templateName, t.user, t.status, date(t.startedAt), date(t.finishedAt), t.progress / 100, t.lastMessage, t.orderId, t.quantity]));
        summary.getColumn(7).numFmt = '0%';
        const details = sheet('Emir Detayları',
            ['Emir No', 'Görev ID', 'Şablon Adı', 'Kullanıcı', 'Transfer ID', 'Ürün Kodu', 'Ürün Adı', 'Renk', 'Beden', 'Kaynak', 'Hedef', 'Adet'],
            [12, 12, 32, 22, 14, 22, 32, 20, 12, 28, 28, 12],
            tasks.flatMap(t => t.records.map(r => [t.orderId, t.id, t.templateName, t.user, r.id, String(r.product), r.productName || r.product, r.color || '—', r.size || '—', r.from, r.to, r.quantity])));
        details.getColumn(6).numFmt = '@';
        details.getColumn(9).numFmt = '@';
        return book;
    }
    root.TransferTasksExcel = { build };
})(typeof window !== 'undefined' ? window : globalThis);

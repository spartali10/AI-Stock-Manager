(() => {
    const get = id => document.getElementById(id);
    const el = (tag, text, cls) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (cls) node.className = cls; return node; };
    const columns = [['from', 'Kaynak'], ['to', 'Hedef'], ['fabric', 'Kumaş Cinsi'], ['product', 'Ürün Kodu'], ['productName', 'Ürün Adı'], ['color', 'Renk'], ['size', 'Bedenler'], ['sourceInventory', 'Kaynak Envanter'], ['sourceSales', 'Kaynak Satış'], ['targetInventory', 'Hedef Envanter'], ['targetSales', 'Hedef Satış'], ['quantity', 'Sevk Adet']];
    const hidden = new Set(), opened = new Map();
    let task, context = {};
    const norm = value => String(value ?? '').toLocaleLowerCase('tr-TR');
    const sum = rows => rows.reduce((total, row) => total + Number(row.quantity || 0), 0);
    function group(rows, key) { const map = new Map(); rows.forEach(row => { if (!map.has(row[key])) map.set(row[key], []); map.get(row[key]).push(row); }); return map; }
    function visible() { const query = norm(get('search').value.trim()); return task.records.filter(row => (!get('target').value || row.to === get('target').value) && (!query || [row.from, row.to, row.product, row.productName, row.fabric, row.color, row.size].some(value => norm(value).includes(query)))); }
    function details(key, cls, defaultOpen) { const node = el('details', null, cls); node.open = opened.get(key) ?? defaultOpen; node.addEventListener('toggle', () => opened.set(key, node.open)); return node; }
    function pill(label, name) { const node = el('span', null, 'pill'); node.append(document.createTextNode(label), el('strong', name)); return node; }
    function unavailable(text, cls, reason) { const button = el('button', text, cls); button.type = 'button'; button.disabled = true; button.title = reason; return button; }
    function render() {
        if (!task) return;
        const rows = visible();
        get('groups').replaceChildren();
        get('status').textContent = rows.length ? '' : 'Bu seçimde gösterilecek ürün bulunamadı.';
        get('export').disabled = !rows.length;
        for (const [source, sourceRows] of group(rows, 'from')) {
            const section = details(JSON.stringify([source]), 'source', true), summary = el('summary');
            summary.append(pill('Kaynak Depo: ', source), el('span', `Toplam: ${sum(sourceRows)}`, 'total')); section.append(summary);
            for (const [target, targetRows] of group(sourceRows, 'to')) {
                const destination = details(JSON.stringify([source, target]), 'destination', false), heading = el('summary');
                heading.append(pill('Hedef Depo: ', target), el('span', `Toplam: ${sum(targetRows)}`, 'total'), unavailable('▣ Fiş Sil', 'delete', 'Tamamlanmış transferlerin fiş silme entegrasyonu bağlı değil'), unavailable('➤ Fiş Gönder', 'send', 'Fiş gönderme entegrasyonu henüz bağlı değil'));
                const wrap = el('div', null, 'table-wrap'), table = el('table'), head = el('thead'), tr = el('tr'), body = el('tbody');
                table.setAttribute('aria-label', `${source} → ${target} ürünleri`);
                const matrix = window.TransferOrderMatrix.build(targetRows, context);
                const shownColumns = columns.filter(([key]) => !hidden.has(key)).flatMap(([key, label]) => key === 'size' ? matrix.sizes.map(size => [`size:${size}`, size]) : [[key, label]]);
                const indexHeader = el('th', '#'); indexHeader.scope = 'col'; tr.append(indexHeader);
                shownColumns.forEach(([key, label]) => { const th = el('th', label, key.startsWith('size:') ? 'size-cell' : key === 'quantity' ? 'shipment-cell' : ''); th.scope = 'col'; tr.append(th); }); head.append(tr);
                matrix.rows.forEach((row, index) => {
                    const line = el('tr'); line.append(el('td', index + 1, 'row-number'));
                    shownColumns.forEach(([key]) => {
                        const isSize = key.startsWith('size:');
                        const value = isSize ? row.quantities[key.slice(5)] || 0 : row[key] ?? (key === 'productName' ? row.product : '—');
                        const cell = el('td', value, isSize ? `size-cell ${value > 0 ? 'included' : 'excluded'}` : key === 'quantity' ? 'shipment-cell' : key.startsWith('source') ? 'source-metric' : key.startsWith('target') ? 'target-metric' : '');
                        if (isSize) cell.title = value > 0 ? 'Transfere dahil' : 'Transfere dahil değil';
                        line.append(cell);
                    }); body.append(line);
                });
                const foot = el('tfoot'), totalRow = el('tr');
                const totalLabel = el('th', 'Toplam Sevk Adet:'); totalLabel.scope = 'row'; totalRow.append(totalLabel);
                shownColumns.forEach(([key]) => totalRow.append(el('td', key === 'quantity' ? matrix.total : key.startsWith('size:') ? matrix.rows.reduce((n, row) => n + (row.quantities[key.slice(5)] || 0), 0) : '', key.startsWith('size:') ? 'size-cell' : key === 'quantity' ? 'shipment-cell' : '')));
                foot.append(totalRow);
                table.append(head, body, foot); wrap.append(table); destination.append(heading, wrap); section.append(destination);
            }
            get('groups').append(section);
        }
    }
    columns.forEach(([key, name]) => { const label = el('label'), box = el('input'); box.type = 'checkbox'; box.checked = true; box.addEventListener('change', () => { if (box.checked) hidden.delete(key); else hidden.add(key); render(); }); label.append(box, document.createTextNode(name)); get('columnOptions').append(label); });
    get('search').addEventListener('input', render);
    get('target').addEventListener('change', render);
    async function refreshInventory() {
        const button = get('refreshInventory');
        button.disabled = true;
        try {
            context = await window.NebimAdapter.getTransferOrderContext();
            render();
            button.title = `Ürün stoklarından son okuma: ${new Date().toLocaleString('tr-TR')}`;
        } finally { button.disabled = false; }
    }
    get('refreshInventory').addEventListener('click', async () => {
        try { await refreshInventory(); } catch (error) { get('status').textContent = 'Stoklar yenilenemedi: ' + error.message; }
    });
    get('special').addEventListener('change', event => document.body.classList.toggle('compact', event.target.checked));
    get('saveNotes').addEventListener('click', () => {
        if (!task) return;
        try {
            window.StockAuth.require('transfers');
            localStorage.setItem(`transfer-order-note:${task.id}`, get('orderNotes').value);
            get('notesStatus').textContent = 'Not bu tarayıcıya kaydedildi.';
        } catch (error) { get('notesStatus').textContent = 'Not kaydedilemedi: ' + error.message; }
    });
    for (const [id, open] of [['expand', true], ['collapse', false]]) get(id).addEventListener('click', () => { get('groups').querySelectorAll('details').forEach(node => { node.open = open; }); });
    get('export').addEventListener('click', async () => {
        get('export').disabled = true;
        try {
            context = await window.NebimAdapter.getTransferOrderContext();
            render();
            get('export').disabled = true;
            const records = visible(), book = window.TransferOrderExcel.build(records, context, columns, hidden, window.ExcelJS);
            const url = URL.createObjectURL(new Blob([await book.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = el('a'); link.href = url; link.download = `transfer-emri-${task.orderId}.xlsx`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) { get('status').textContent = error.message; }
        finally { get('export').disabled = !task || !visible().length; }
    });
    async function load() {
        try {
            const id = Number(new URLSearchParams(location.search).get('id'));
            task = (await window.NebimAdapter.getTransferTasks()).find(item => item.id === id);
            context = await window.NebimAdapter.getTransferOrderContext();
            if (!task) { get('groups').replaceChildren(); get('export').disabled = true; get('status').textContent = 'Transfer emri bulunamadı. Görev listesine dönerek bir emir seçin.'; return; }
            get('orderLabel').textContent = `${task.orderId} nolu Emir · ${task.quantity} adet`;
            const date = value => value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
            for (const [id, value] of Object.entries({ metaNumber: `${task.orderId} nolu Emir`, metaTemplate: task.templateName || '—', metaUser: task.user || '—', metaCreated: date(task.startedAt), metaStatus: task.status || '—', metaUpdated: date(task.finishedAt), summaryProducts: new Set(task.records.map(row => row.product)).size, summaryQuantity: sum(task.records), summaryTargets: new Set(task.records.map(row => row.to)).size, summaryVariants: new Set(task.records.map(row => JSON.stringify([row.product, row.color]))).size })) get(id).textContent = value;
            if (document.activeElement !== get('orderNotes')) get('orderNotes').value = localStorage.getItem(`transfer-order-note:${task.id}`) || '';
            get('saveNotes').disabled = false;
            document.title = `${task.orderId} nolu Emir | Transfer Edilen Ürünler`;
            const selected = get('target').value;
            get('target').replaceChildren(new Option('Tümü', ''), ...[...new Set(task.records.map(row => row.to))].map(name => new Option(name, name)));
            if ([...get('target').options].some(option => option.value === selected)) get('target').value = selected;
            render();
        } catch (error) { get('groups').replaceChildren(); get('export').disabled = true; get('status').textContent = error.message; }
    }
    window.addEventListener('storage', event => { if (event.key === 'aiStockNebimData' || event.key === null) load(); });
    load();
})();

(() => {
    const get = id => document.getElementById(id), M = window.WarehouseMatrix;
    let snapshot = null, inventory = [], targets = [], sizes = [], edits = new Map(), busy = false, stale = false;
    const totals = new Map();
    let stockIndex = new Map(), warehouseSelection = '';
    const el = (tag, value, cls) => { const n = document.createElement(tag); if (value !== undefined) n.textContent = value; if (cls) n.className = cls; return n; };
    const number = n => Number.isFinite(n) ? n.toLocaleString('tr-TR') : 'Geçersiz';
    const signed = n => (n > 0 ? '+' : '') + number(n);
    const unique = list => [...new Set(list)].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
    const quantity = (row, size, store) => Number(edits.get(M.cellKey(row, size, store)) || 0);
    function entries() {
        return [...edits].filter(([, value]) => Number(value) !== 0).map(([key, value]) => { const [row, size, to] = JSON.parse(key); return { row, size, to, quantity: Number(value) }; });
    }
    function clearPlan() { edits.clear(); stale = false; get('wmApply').disabled = true; }
    function filters() {
        [['wmFabric', inventory.map(r => r.fabric)], ['wmCode', inventory.map(r => r.code)], ['wmColor', inventory.map(r => r.color || 'Tanımsız')], ['wmSize', sizes]].forEach(([id, values]) => {
            const select = get(id), old = select.value;
            select.replaceChildren(new Option('Tümü', ''), ...unique(values).map(v => new Option(v, v)));
            if (values.includes(old)) select.value = old;
        });
    }
    function visibleRows() {
        return inventory.filter(r => (!get('wmFabric').value || r.fabric === get('wmFabric').value) && (!get('wmCode').value || r.code === get('wmCode').value) && (!get('wmColor').value || (r.color || 'Tanımsız') === get('wmColor').value) && (!get('wmSize').value || Object.hasOwn(r.sizes, get('wmSize').value)));
    }
    function currentStock(row, size, store) {
        return stockIndex.get(JSON.stringify([store, row.code, row.color, size].map(v => String(v).trim().toLocaleLowerCase('tr-TR')))) || 0;
    }
    function recalculate() {
        let stock = 0, allocated = 0, invalid = false;
        for (const row of inventory) {
            const ref = totals.get(row.key); let rowStock = 0, rowSent = 0;
            for (const [size, cell] of Object.entries(row.sizes)) {
                const sent = targets.reduce((sum, store) => sum + quantity(row.key, size, store), 0);
                rowStock += cell.stock; rowSent += sent;
                if (!Number.isSafeInteger(sent) || sent > cell.stock || sent < 0) invalid = true;
                if (ref?.remaining.has(size)) { const target = ref.remaining.get(size); target.textContent = signed(cell.stock - sent); target.classList.toggle('wm-negative', sent > cell.stock); }
            }
            if (ref) {
                ref.sent.textContent = signed(rowSent); ref.balance.textContent = signed(rowStock - rowSent);
                ref.balance.classList.toggle('wm-negative', rowStock < rowSent);
                for (const [store, target] of ref.storeTotals) target.textContent = signed(Object.keys(row.sizes).reduce((sum, size) => sum + quantity(row.key, size, store), 0));
            }
            stock += rowStock; allocated += rowSent;
        }
        for (const value of edits.values()) if (!Number.isSafeInteger(Number(value)) || Number(value) < 0) invalid = true;
        get('wmStock').textContent = number(stock);
        get('wmAllocated').textContent = signed(allocated);
        get('wmBalance').textContent = signed(stock - allocated);
        get('wmBalance').classList.toggle('wm-negative', stock < allocated);
        get('wmApply').disabled = busy || stale || invalid || allocated <= 0;
        get('wmValidation').textContent = stale ? 'Stok değişti. Güncel veriyi yeniden çekmeden dağıtım uygulanamaz.' : invalid ? 'Kırmızı/eksi kalanları veya geçersiz adetleri düzeltin. Dağıtım uygulanamaz.' : allocated ? 'Girişler taslaktır. Dağıtımı Uygula ile stoklara işlenir. Filtre dışında kalan girişler de toplama dahildir.' : 'Mağaza beden hücrelerine gönderilecek adetleri girin.';
    }
    function render() {
        totals.clear();
        const head = get('wmHead'), body = get('wmRows'); head.replaceChildren(); body.replaceChildren();
        const shownSizes = get('wmSize').value ? [get('wmSize').value] : sizes;
        const row1 = el('tr'), row2 = el('tr');
        ['Kumaş cinsi', 'Ürün kodu', 'Renk'].forEach(label => { const th = el('th', label, 'wm-identity'); th.rowSpan = 2; th.scope = 'col'; row1.append(th); });
        const group = (name, cls) => {
            const th = el('th', name, cls); th.colSpan = shownSizes.length + 1; th.scope = 'colgroup'; row1.append(th);
            [...shownSizes, 'TOPLAM'].forEach(label => { const td = el('th', label, cls); td.scope = 'col'; row2.append(td); });
        };
        group('MAMÜL DEPO · MEVCUT', 'wm-depot');
        targets.forEach((store, i) => group(store, i % 2 ? 'wm-store-alt' : 'wm-store'));
        const sent = el('th', 'DAĞITILAN', 'wm-total'); sent.rowSpan = 2; row1.append(sent);
        group('MAMÜL DEPO · KALAN', 'wm-depot'); head.append(row1, row2);
        const visible = visibleRows();
        for (const row of visible) {
            const tr = el('tr'); tr.append(el('td', row.fabric), el('td', row.code), el('td', row.color || 'Tanımsız'));
            const sum = Object.values(row.sizes).reduce((n, cell) => n + cell.stock, 0);
            shownSizes.forEach(size => tr.append(el('td', number(row.sizes[size]?.stock || 0), 'wm-depot-cell')));
            tr.append(el('td', number(sum), 'wm-total'));
            const ref = { remaining: new Map(), storeTotals: new Map() };
            for (const store of targets) {
                shownSizes.forEach(size => {
                    const td = el('td', undefined, 'wm-edit-cell'); const input = el('input');
                    input.type = 'number'; input.min = '0'; input.step = '1'; input.placeholder = '0'; input.inputMode = 'numeric';
                    input.disabled = !row.sizes[size]?.valid || row.sizes[size].stock === 0 || busy;
                    const key = M.cellKey(row.key, size, store); input.value = edits.get(key) ?? '';
                    input.setAttribute('aria-label', `${row.code} ${row.color} ${size} · ${store} gönderilecek adet`);
                    const existing = currentStock(row, size, store);
                    td.classList.toggle('wm-zero', existing === 0);
                    const indicator = el('small', `Stok ${number(existing)} → ${number(existing + Number(input.value || 0))}`);
                    input.addEventListener('input', () => {
                        if (input.validity.badInput) edits.set(key, 'invalid');
                        else if (!input.value) edits.delete(key); else edits.set(key, input.value);
                        const amount = Number(input.value || 0);
                        indicator.textContent = `Stok ${number(existing)} → ${number(existing + amount)} (${signed(amount)})`;
                        input.setAttribute('aria-invalid', String(input.validity.badInput || !Number.isSafeInteger(amount) || amount < 0)); recalculate();
                    });
                    td.append(input, indicator); tr.append(td);
                });
                const total = el('td', '0', 'wm-total'); ref.storeTotals.set(store, total); tr.append(total);
            }
            ref.sent = el('td', '0', 'wm-total'); tr.append(ref.sent);
            shownSizes.forEach(size => { const td = el('td', '0', 'wm-depot-cell'); ref.remaining.set(size, td); tr.append(td); });
            ref.balance = el('td', '0', 'wm-total'); tr.append(ref.balance); totals.set(row.key, ref); body.append(tr);
        }
        get('wmEmpty').hidden = visible.length > 0;
        get('wmCount').textContent = `${inventory.length} satırdan ${visible.length} satır gösteriliyor. ${targets.length} mağaza yan yana.`;
        recalculate();
    }
    function prepare() {
        clearPlan(); inventory = []; targets = []; sizes = [];
        const warehouse = get('distMain').value;
        warehouseSelection = warehouse;
        stockIndex = new Map();
        for (const p of snapshot?.products || []) {
            const key = JSON.stringify([p.store, p.code, M.attribute(p, 'color', 'Renk'), M.attribute(p, 'size', 'Beden')].map(v => String(v ?? '').trim().toLocaleLowerCase('tr-TR')));
            stockIndex.set(key, (stockIndex.get(key) || 0) + Number(p.stock || 0));
        }
        if (snapshot && warehouse) {
            inventory = M.rows(snapshot, warehouse);
            const depotNames = new Set(M.warehouses(snapshot).map(s => s.name));
            targets = [...new Set(snapshot.stores.filter(s => !depotNames.has(s.name)).map(s => s.name))];
            sizes = unique(inventory.flatMap(row => Object.keys(row.sizes)));
        }
        filters(); render();
    }
    async function refresh() {
        if (busy) return;
        if (edits.size && !window.confirm('Güncel stok çekildiğinde kaydedilmemiş dağıtım girişleri temizlenecek. Devam edilsin mi?')) return;
        busy = true; get('wmRefresh').disabled = true; get('wmApply').disabled = true;
        try {
            const result = await window.NebimAdapter.getWarehouseMatrixData();
            const previous = get('distMain').value, warehouses = M.warehouses(result);
            snapshot = result;
            get('distMain').replaceChildren(new Option('Mamül Depo seçin', ''), ...warehouses.map(s => new Option(s.name, s.name)));
            get('distMain').value = warehouses.some(s => s.name === previous) ? previous : warehouses.length === 1 ? warehouses[0].name : '';
            prepare();
            get('wmSource').textContent = warehouses.length ? `Son okuma: ${new Date(result.fetchedAt).toLocaleString('tr-TR')} · ${result.sourceLabel || 'Yerel kayıtlar; canlı Nebim bağlantısı henüz yok.'}` : 'Mamül Depo verisi bekleniyor. Entegrasyon tamamlandığında depo ve tüm stokları burada listelenecek.';
        } catch (error) { stale = true; get('wmSource').textContent = 'Veri alınamadı: ' + error.message; }
        finally { busy = false; get('wmRefresh').disabled = false; render(); }
    }
    ['wmFabric', 'wmCode', 'wmColor', 'wmSize'].forEach(id => get(id).addEventListener('change', render));
    get('wmFilterReset').addEventListener('click', () => { ['wmFabric', 'wmCode', 'wmColor', 'wmSize'].forEach(id => { get(id).value = ''; }); render(); });
    get('wmClear').addEventListener('click', () => { if (edits.size && !window.confirm('Tüm dağıtım girişleri temizlensin mi?')) return; edits.clear(); render(); });
    get('distMain').addEventListener('change', () => {
        if (edits.size && !window.confirm('Depo değiştiğinde kaydedilmemiş adet girişleri temizlenecek. Devam edilsin mi?')) { get('distMain').value = warehouseSelection; return; }
        prepare();
    });
    get('wmRefresh').addEventListener('click', refresh);
    get('wmExport').addEventListener('click', () => {
        const escape = value => '"' + String(value).replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
        const header = ['Kumaş cinsi', 'Ürün kodu', 'Renk', 'Beden', 'Mamül Depo stok', ...targets.flatMap(s => [s + ' mevcut', s + ' gönderilecek']), 'Dağıtılan', 'Kalan'];
        const records = visibleRows().flatMap(row => Object.entries(row.sizes).filter(([size]) => !get('wmSize').value || size === get('wmSize').value).map(([size, cell]) => {
            const sent = targets.reduce((sum, store) => sum + quantity(row.key, size, store), 0);
            return [row.fabric, row.code, row.color, size, cell.stock, ...targets.flatMap(store => [currentStock(row, size, store), quantity(row.key, size, store)]), sent, cell.stock - sent];
        }));
        const csv = '\uFEFF' + [header, ...records].map(row => row.map(escape).join(';')).join('\r\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = el('a'); link.href = url; link.download = 'mamul-depo-dagitim.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    get('wmApply').addEventListener('click', async () => {
        if (busy || stale || get('wmApply').disabled) return;
        if (!window.confirm(`${get('wmAllocated').textContent} adetlik dağıtım, filtre dışında kalan girişler dahil stoklara uygulansın mı?`)) return;
        busy = true; render();
        try {
            const count = await window.NebimAdapter.applyWarehouseMatrix(get('distMain').value, entries(), snapshot.token);
            clearPlan(); snapshot = await window.NebimAdapter.getWarehouseMatrixData(); prepare();
            get('wmSource').textContent = `${count} stok hareketi uygulandı. Mamül Depo ve mağaza stokları güncellendi.`;
            await window.QuickTransferContext.reload();
        } catch (error) { stale = true; get('wmSource').textContent = error.message; }
        finally { busy = false; render(); }
    });
    window.addEventListener('storage', e => { if (e.key === 'aiStockNebimData') { stale = true; recalculate(); } });
    refresh();
})();

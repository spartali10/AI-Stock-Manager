(() => {
    const get = id => document.getElementById(id), M = window.WarehouseMatrix;
    let snapshot = null, inventory = [], targets = [], sizes = [], edits = new Map(), busy = false, stale = false;
    const totals = new Map();
    const inputs = [];
    let catalog = [], pendingFilters = false;
    let stockIndex = new Map(), warehouseSelection = '';
    const el = (tag, value, cls) => { const n = document.createElement(tag); if (value !== undefined) n.textContent = value; if (cls) n.className = cls; return n; };
    const number = n => Number.isFinite(n) ? n.toLocaleString('tr-TR') : 'Geçersiz';
    const signed = n => n < 0 ? number(n) + ' !' : number(n);
    const unique = list => [...new Set(list)].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
    const quantity = (row, size, store) => Number(edits.get(M.cellKey(row, size, store)) || 0);
    const filterPickers = new Map(['wmFabric', 'wmCode', 'wmColor'].map(id => {
        const select = get(id);
        select.multiple = true;
        return [id, window.StoreMultiSelect(select, select.parentElement.textContent.trim(), {
            search: 'Seçenek ara…', all: 'Tümünü seç', placeholder: 'Seçim yapın', empty: 'Seçenek bulunamadı.', optionOrder: true, large: true
        })];
    }));
    const selectedFilters = id => [...get(id).selectedOptions].map(option => option.value).filter(Boolean);
    function entries() {
        return [...edits].filter(([, value]) => Number(value) !== 0).map(([key, value]) => { const [row, size, to] = JSON.parse(key); return { row, size, to, quantity: Number(value) }; });
    }
    function clearPlan() { edits.clear(); stale = false; get('wmApply').disabled = true; }
    function seasonRows() {
        const season = get('wmSeason').value;
        return catalog.filter(row => {
            const productSeason = [row.code, row.name].map(value => String(value ?? '').trim().toUpperCase().match(/^([KY])\s*\d{2}/)).find(Boolean);
            const code = productSeason ? (productSeason[1] === 'K' ? 'AW' : 'SS') : String(row.fabric).toUpperCase().match(/\b(SS|AW)\s*\d{2}(?:\d{2})?\b/)?.[1] || 'other';
            return !season || code === season;
        });
    }
    function filters() {
        [['wmFabric', seasonRows().map(r => r.fabric)], ['wmSize', sizes]].forEach(([id, values]) => {
            const select = get(id), old = selectedFilters(id);
            select.replaceChildren(...(select.multiple ? [] : [new Option('Tümü', '')]), ...unique(values).map(v => new Option(v, v, false, old.includes(v))));
            filterPickers.get(id)?.refresh(true);
        });
        syncRelatedFilters(false);
    }
    function syncRelatedFilters(selectAll) {
        const fabric = selectedFilters('wmFabric');
        const related = seasonRows().filter(row => !fabric.length || fabric.includes(row.fabric));
        [['wmCode', related.map(row => row.name)]].forEach(([id, values]) => {
            const old = selectedFilters(id);
            get(id).replaceChildren(...unique(values).map(value => new Option(value, value, false, selectAll ? fabric.length > 0 : old.includes(value))));
            filterPickers.get(id).refresh(true);
        });
        syncProductColors(selectAll);
    }
    const colorKey = row => JSON.stringify([row.name, row.color || 'Tanımsız']);
    function syncProductColors(selectAll = false, selectNew = false) {
        const fabric = selectedFilters('wmFabric'), names = selectedFilters('wmCode');
        const old = selectedFilters('wmColor');
        const previous = new Set([...get('wmColor').options].map(option => option.value));
        const related = seasonRows().filter(row => (!fabric.length || fabric.includes(row.fabric)) && names.includes(row.name));
        const options = unique(related.map(row => row.name)).flatMap(name =>
            unique(related.filter(row => row.name === name).map(row => row.color || 'Tanımsız')).map(color => {
                const value = JSON.stringify([name, color]);
                return new Option(`${name} · ${color}`, value, false, selectAll || old.includes(value) || (selectNew && !previous.has(value)));
            }));
        get('wmColor').replaceChildren(...options);
        filterPickers.get('wmColor').refresh(true);
    }
    function selectedRows() {
        const fabric = selectedFilters('wmFabric'), names = selectedFilters('wmCode'), colors = selectedFilters('wmColor');
        return seasonRows().filter(r => (!fabric.length || fabric.includes(r.fabric)) && names.includes(r.name) && colors.includes(colorKey(r)));
    }
    function visibleRows() {
        return inventory.filter(r => !get('wmSize').value || Object.hasOwn(r.sizes, get('wmSize').value));
    }
    function currentStock(row, size, store) {
        return stockIndex.get(JSON.stringify([store, row.code, row.color, size].map(v => String(v).trim().toLocaleLowerCase('tr-TR')))) || 0;
    }
    function recalculate() {
        const planned = entries();
        inputs.forEach(({ input, row, size, store }) => {
            input.max = String(M.entryLimit(row, size, store, planned));
        });
        ['wmSmart', 'wmExport', 'wmTemplate', 'wmImport'].forEach(id => { get(id).disabled = busy || stale || pendingFilters || !inventory.length || !targets.length; });
        get('wmClear').disabled = busy;
        get('distMain').disabled = busy;
        let stock = 0, allocated = 0, invalid = false;
        for (const row of inventory) {
            const ref = totals.get(row.key); let rowStock = 0, rowSent = 0;
            for (const [size, cell] of Object.entries(row.sizes)) {
                const sent = targets.reduce((sum, store) => sum + quantity(row.key, size, store), 0);
                rowStock += cell.stock; rowSent += sent;
                if (!Number.isSafeInteger(sent) || (sent > 0 && sent > cell.stock) || sent < 0) invalid = true;
                if (ref?.remaining.has(size)) { const target = ref.remaining.get(size); target.textContent = signed(cell.stock - sent); target.classList.toggle('wm-negative', sent > cell.stock); }
            }
            if (ref) {
                const shown = get('wmSize').value ? [get('wmSize').value] : sizes;
                const shownStock = shown.reduce((sum, size) => sum + (row.sizes[size]?.stock || 0), 0);
                const shownSent = shown.reduce((sum, size) => sum + targets.reduce((n, store) => n + quantity(row.key, size, store), 0), 0);
                ref.sent.textContent = signed(shownSent); ref.balance.textContent = signed(shownStock - shownSent);
                ref.balance.classList.toggle('wm-negative', rowStock < rowSent);
                for (const [store, target] of ref.storeTotals) target.textContent = signed(shown.reduce((sum, size) => sum + quantity(row.key, size, store), 0));
            }
            stock += rowStock; allocated += rowSent;
        }
        for (const value of edits.values()) if (!Number.isSafeInteger(Number(value)) || Number(value) < 0) invalid = true;
        get('wmStock').textContent = number(stock);
        get('wmAllocated').textContent = signed(allocated);
        get('wmBalance').textContent = signed(stock - allocated);
        get('wmBalance').classList.toggle('wm-negative', stock < allocated);
        get('wmApply').disabled = busy || stale || pendingFilters || invalid || allocated <= 0;
        get('wmReceipt').disabled = get('wmApply').disabled;
        renderFooter();
        get('wmValidation').textContent = stale ? 'Stok değişti. Güncel veriyi yeniden çekmeden dağıtım uygulanamaz.' : invalid ? 'Kırmızı/eksi kalanları veya geçersiz adetleri düzeltin. Dağıtım uygulanamaz.' : allocated ? 'Girişler taslaktır. Dağıtımı Uygula ile stoklara işlenir. Filtre dışında kalan girişler de toplama dahildir.' : 'Mağaza beden hücrelerine gönderilecek adetleri girin.';
        if (pendingFilters) get('wmValidation').textContent = 'Seçimler hazır. Seçili ürünleri dağıtım planına getirmek için Güncel Veriyi Çek düğmesine basın.';
    }
    function renderFooter() {
        const table = get('wmHead').closest('table'), footer = table.tFoot || table.createTFoot();
        const row = el('tr'), label = el('th', 'GÖRÜNEN TOPLAM'); label.colSpan = 3; row.append(label);
        const shown = get('wmSize').value ? [get('wmSize').value] : sizes, visible = visibleRows();
        const block = mode => {
            const values = shown.map(size => visible.reduce((sum, item) => {
                const initial = item.sizes[size]?.stock || 0;
                const sent = targets.reduce((n, store) => n + quantity(item.key, size, store), 0);
                return sum + (mode === 'source' ? initial : mode === 'remaining' ? initial - sent : quantity(item.key, size, mode));
            }, 0));
            [...values, values.reduce((a, b) => a + b, 0)].forEach(n => row.append(el('td', number(n), 'wm-total')));
        };
        block('source'); targets.forEach(block);
        row.append(el('td', number(visible.reduce((sum, item) => sum + shown.reduce((n, size) => n + targets.reduce((s, store) => s + quantity(item.key, size, store), 0), 0), 0)), 'wm-total'));
        block('remaining'); footer.replaceChildren(row);
    }
    function render() {
        totals.clear();
        inputs.length = 0;
        const head = get('wmHead'), body = get('wmRows'); head.replaceChildren(); body.replaceChildren();
        const shownSizes = get('wmSize').value ? [get('wmSize').value] : sizes;
        const row1 = el('tr'), row2 = el('tr');
        ['Kumaş cinsi', 'Ürün Adı', 'Renk'].forEach(label => { const th = el('th', label, 'wm-identity'); th.rowSpan = 2; th.scope = 'col'; row1.append(th); });
        const group = (name, cls) => {
            const th = el('th', name, cls); th.colSpan = shownSizes.length + 1; th.scope = 'colgroup'; row1.append(th);
            [...shownSizes, 'TOTAL'].forEach(label => { const td = el('th', label === 'ONE' ? 'ONE SIZE' : label, label === 'TOTAL' ? 'wm-total' : cls); td.scope = 'col'; row2.append(td); });
        };
        group('MAMÜL DEPO · MEVCUT', 'wm-depot');
        targets.forEach((store, i) => group(store, i % 2 ? 'wm-store-alt' : 'wm-store'));
        const sent = el('th', 'DAĞITILAN', 'wm-total'); sent.rowSpan = 2; row1.append(sent);
        group('MAMÜL DEPO · KALAN', 'wm-depot'); head.append(row1, row2);
        const visible = visibleRows();
        for (const row of visible) {
            const tr = el('tr'); tr.append(el('td', row.fabric), el('td', row.name), el('td', row.color || 'Tanımsız'));
            const sum = shownSizes.reduce((n, size) => n + (row.sizes[size]?.stock || 0), 0);
            shownSizes.forEach(size => { const stock = row.sizes[size]?.stock || 0; tr.append(el('td', signed(stock), 'wm-depot-cell' + (stock < 0 ? ' wm-negative' : ''))); });
            tr.append(el('td', number(sum), 'wm-total'));
            const ref = { remaining: new Map(), storeTotals: new Map() };
            for (const store of targets) {
                shownSizes.forEach(size => {
                    const td = el('td', undefined, 'wm-edit-cell'); const input = el('input');
                    input.type = 'number'; input.min = '0'; input.step = '1'; input.placeholder = '0'; input.inputMode = 'numeric';
                    input.disabled = !row.sizes[size]?.valid || row.sizes[size].stock <= 0 || busy;
                    const key = M.cellKey(row.key, size, store); input.value = edits.get(key) ?? '';
                    inputs.push({ input, row, size, store });
                    input.setAttribute('aria-label', `${row.code} ${row.color} ${size} · ${store} gönderilecek adet`);
                    const existing = currentStock(row, size, store);
                    td.classList.toggle('wm-existing-stock', existing > 0);
                    if (existing > 0) td.title = 'Bu ürün ve bedende mağazanın mevcut stoğu var.';
                    const updateColor = () => {
                        const amount = Number(input.value || 0);
                        td.classList.toggle('wm-zero', !row.sizes[size]?.valid);
                        td.classList.toggle('wm-out-of-stock', !!row.sizes[size]?.valid && row.sizes[size].stock <= 0);
                        td.classList.toggle('wm-allocated', !!row.sizes[size]?.valid && !input.validity.badInput && Number.isSafeInteger(amount) && amount > 0);
                    };
                    updateColor();
                    const indicator = el('small', `Stok ${number(existing)} → ${number(existing + Number(input.value || 0))}`);
                    input.addEventListener('input', () => {
                        const limit = M.entryLimit(row, size, store, entries());
                        const exceeded = !input.validity.badInput && Number(input.value) > limit;
                        if (exceeded) input.value = String(limit);
                        if (input.validity.badInput) edits.set(key, 'invalid');
                        else if (!input.value) edits.delete(key); else edits.set(key, input.value);
                        const amount = Number(input.value || 0);
                        updateColor();
                        indicator.textContent = `Stok ${number(existing)} → ${number(existing + amount)} (${signed(amount)})`;
                        input.setAttribute('aria-invalid', String(input.validity.badInput || !Number.isSafeInteger(amount) || amount < 0)); recalculate();
                        if (exceeded) get('wmValidation').textContent = `${row.code} / ${row.color} / ${size}: Mamül Depo stoğu ${number(row.sizes[size]?.stock || 0)} adet. Diğer mağazalara ayrılan miktar nedeniyle bu hücreye en fazla ${number(limit)} adet girilebilir. Giriş ${number(limit)} olarak düzeltildi.`;
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
    function prepare(applyFilters = false) {
        clearPlan(); inventory = []; catalog = []; targets = []; sizes = [];
        const warehouse = get('distMain').value;
        warehouseSelection = warehouse;
        stockIndex = new Map();
        for (const p of snapshot?.products || []) {
            const key = JSON.stringify([p.store, p.code, M.attribute(p, 'color', 'Renk'), M.attribute(p, 'size', 'Beden')].map(v => String(v ?? '').trim().toLocaleLowerCase('tr-TR')));
            stockIndex.set(key, (stockIndex.get(key) || 0) + Number(p.stock || 0));
        }
        if (snapshot && warehouse) {
            catalog = M.rows(snapshot, warehouse).filter(row => Object.values(row.sizes).some(cell => cell.stock > 0));
            const depotNames = new Set(M.warehouses(snapshot).map(s => s.name));
            targets = [...new Set(snapshot.stores.filter(s => !depotNames.has(s.name)).map(s => s.name))];
            const available = unique(catalog.flatMap(row => Object.keys(row.sizes))).filter(size => size.trim().toLocaleLowerCase('tr-TR') !== 'tanımsız');
            sizes = [...new Set(['0', '1', '2', '3', '4', available.includes('ONE SIZE') && !available.includes('ONE') ? 'ONE SIZE' : 'ONE', ...available])];
        }
        filters();
        inventory = applyFilters ? selectedRows() : [];
        pendingFilters = !applyFilters && !!warehouse;
        render();
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
            prepare(true);
            get('wmSource').textContent = warehouses.length ? `Son okuma: ${new Date(result.fetchedAt).toLocaleString('tr-TR')} · ${result.sourceLabel || 'Merkezi veritabanı; canlı Nebim bağlantısı henüz yok.'}` : 'Mamül Depo kaydı bulunamadı. Merkezi sisteme Excel veya veri yedeği yükleyin.';
        } catch (error) { stale = true; get('wmSource').textContent = 'Veri alınamadı: ' + error.message; }
        finally { busy = false; get('wmRefresh').disabled = false; render(); }
    }
    ['wmSeason', 'wmFabric', 'wmCode', 'wmColor'].forEach(id => get(id).addEventListener('change', () => {
        if (id === 'wmSeason') {
            ['wmFabric', 'wmCode', 'wmColor'].forEach(filter => { get(filter).value = ''; });
            filters();
        }
        filterPickers.get(id)?.refresh();
        if (id === 'wmFabric') syncRelatedFilters(true);
        if (id === 'wmCode') syncProductColors(false, true);
        if (id === 'wmColor') {
            const namesWithColors = new Set(selectedFilters('wmColor').map(value => JSON.parse(value)[0]));
            for (const option of get('wmCode').options) option.selected = namesWithColors.has(option.value);
            filterPickers.get('wmCode').refresh();
        }
        const selected = new Set(selectedRows().map(row => row.key));
        inventory = inventory.filter(row => selected.has(row.key));
        const retained = new Set(inventory.map(row => row.key));
        for (const key of edits.keys()) if (!retained.has(JSON.parse(key)[0])) edits.delete(key);
        pendingFilters = [...selected].some(key => !retained.has(key));
        render();
    }));
    get('wmSize').addEventListener('change', render);
    get('wmFilterReset').addEventListener('click', () => {
        if (busy) return;
        ['wmSeason', 'wmFabric', 'wmCode', 'wmColor', 'wmSize'].forEach(id => { get(id).value = ''; filterPickers.get(id)?.refresh(); });
        filters();
        edits.clear(); inventory = []; pendingFilters = false;
        render();
        get('wmValidation').textContent = 'Filtreler ve dağıtım planındaki taslak adetler temizlendi. Ürün seçip Güncel Veriyi Çek düğmesine basın.';
    });
    get('wmClear').addEventListener('click', () => {
        if (busy) return;
        if (!edits.size) {
            get('wmSource').textContent = 'Temizlenecek adet girişi yok.';
            return;
        }
        if (!window.confirm('Filtre dışında kalanlar dahil tüm dağıtım girişleri temizlensin mi?')) return;
        edits.clear();
        render();
        get('wmSource').textContent = 'Tüm taslak adet girişleri temizlendi. Mevcut stoklar değiştirilmedi.';
    });
    get('distMain').addEventListener('change', () => {
        if (edits.size && !window.confirm('Depo değiştiğinde kaydedilmemiş adet girişleri temizlenecek. Devam edilsin mi?')) { get('distMain').value = warehouseSelection; return; }
        prepare();
    });
    get('wmRefresh').addEventListener('click', refresh);
    get('wmSmart').addEventListener('click', () => {
        try {
            if (busy || stale || !inventory.length || !targets.length) return;
            window.StockAuth.require('transfers');
            const planned = M.allocate(visibleRows(), targets, Number(get('wmTargetStock').value), get('wmSize').value);
            const next = new Map(edits);
            for (const row of visibleRows()) for (const size of Object.keys(row.sizes)) {
                if (get('wmSize').value && size !== get('wmSize').value) continue;
                for (const store of targets) next.delete(M.cellKey(row.key, size, store));
            }
            planned.forEach(e => next.set(M.cellKey(e.row, e.size, e.to), e.quantity));
            edits = next; render();
            get('wmSource').textContent = `Akıllı dağıtım hazır: ${planned.reduce((sum, e) => sum + e.quantity, 0)} adet. Görünen ürün/beden girişleri yenilendi; mağaza sütun sırası önceliklidir. Stoklara işlemek için Dağıtımı Uygula'yı kullanın.`;
        } catch (error) { get('wmSource').textContent = error.message; }
    });
    const excelModel = () => ({ rows: inventory, targets, sizes, quantity, currentStock, screenLayout: true });
    get('wmTemplate').addEventListener('click', async () => {
        if (busy || stale || !inventory.length) return;
        try {
            const book = await window.DistributionExcel.build({ ...excelModel(), quantity: () => 0 }, window.ExcelJS);
            download(await book.xlsx.writeBuffer(), 'akilli-dagitim-sablonu.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        } catch (error) { get('wmSource').textContent = error.message; }
    });
    function download(content, name, type) {
        const url = URL.createObjectURL(new Blob([content], { type }));
        const link = el('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    get('wmExport').addEventListener('click', async () => {
        try {
            if (!inventory.length) throw Error('Önce Mamül Depo ve güncel stokları seçin.');
            M.plan(snapshot, warehouseSelection, entries());
            const book = await window.DistributionExcel.build(excelModel(), window.ExcelJS);
            download(await book.xlsx.writeBuffer(), 'akilli-dagitim.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        } catch (error) { get('wmSource').textContent = error.message; }
    });
    get('wmImport').addEventListener('click', () => get('wmImportFile').click());
    get('wmImportFile').addEventListener('change', async event => {
        const file = event.target.files[0]; if (!file || busy) return;
        try {
            window.StockAuth.require('transfers');
            if (stale || pendingFilters || !inventory.length) throw Error('Önce güncel stokları çekin.');
            if (file.size > 10 * 1024 * 1024) throw Error('Excel dosyası en fazla 10 MB olabilir.');
            const token = snapshot.token, warehouse = warehouseSelection;
            busy = true; render();
            const imported = await window.DistributionExcel.read(await file.arrayBuffer(), excelModel(), window.ExcelJS);
            if (stale || token !== snapshot.token || warehouse !== warehouseSelection) throw Error('Stok/depo değişti. Dosyayı güncel stoklarla tekrar yükleyin.');
            M.plan(snapshot, warehouse, imported);
            if (edits.size && !window.confirm('Mevcut girişler Excel içindeki dağıtım adetleriyle değiştirilsin mi?')) return;
            edits = new Map(imported.map(e => [M.cellKey(e.row, e.size, e.to), e.quantity]));
            get('wmSource').textContent = 'Excel girişleri yüklendi. Henüz stoklara uygulanmadı veya Nebim’e gönderilmedi.';
        } catch (error) { get('wmSource').textContent = error.message; }
        finally { busy = false; event.target.value = ''; render(); }
    });
    let receipt = null;
    get('wmReceipt').addEventListener('click', async () => {
        try {
            window.StockAuth.require('transfers');
            if (busy || stale || get('wmReceipt').disabled) return;
            const current = await window.NebimAdapter.getWarehouseMatrixData();
            if (current.token !== snapshot.token) { stale = true; recalculate(); throw Error('Stok değişti. Fiş hazırlamadan önce güncel veriyi çekin.'); }
            const lines = M.plan(snapshot, warehouseSelection, entries());
            if (!lines.length) throw Error('Fiş için dağıtım adedi girin.');
            receipt = { id: crypto.randomUUID(), status: 'draft', createdAt: new Date().toISOString(), sourceWarehouse: warehouseSelection, documents: targets.map(to => ({ to, lines: lines.filter(line => line.to === to) })).filter(doc => doc.lines.length) };
            get('wmReceiptPreview').textContent = receipt.documents.map(doc => `${receipt.sourceWarehouse} → ${doc.to}\n` + doc.lines.map(line => `${line.code} / ${line.color} / ${line.size}: ${line.quantity}`).join('\n')).join('\n\n');
            get('wmReceiptDialog').showModal();
        } catch (error) { get('wmSource').textContent = error.message; }
    });
    get('wmReceiptDownload').addEventListener('click', () => {
        if (receipt) download(JSON.stringify(receipt, null, 2), `nebim-fis-taslagi-${receipt.id}.json`, 'application/json');
    });
    get('wmApply').addEventListener('click', async () => {
        if (busy || stale || get('wmApply').disabled) return;
        if (!window.confirm(`${get('wmAllocated').textContent} adetlik dağıtım, filtre dışında kalan girişler dahil stoklara uygulansın mı?`)) return;
        busy = true; render();
        try {
            const count = await window.NebimAdapter.applyWarehouseMatrix(get('distMain').value, entries(), snapshot.token);
            clearPlan(); snapshot = await window.NebimAdapter.getWarehouseMatrixData(); prepare(true);
            get('wmSource').textContent = `${count} stok hareketi uygulandı. Mamül Depo ve mağaza stokları güncellendi.`;
            await window.QuickTransferContext.reload();
        } catch (error) { stale = true; get('wmSource').textContent = error.message; }
        finally { busy = false; render(); }
    });
    window.addEventListener('stock:data-changed', e => { if (e.key === 'aiStockNebimData') { stale = true; recalculate(); } });
    refresh();
})();

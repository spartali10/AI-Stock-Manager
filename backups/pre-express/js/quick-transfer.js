(() => {
    const get = id => document.getElementById(id);
    const norm = value => String(value ?? '').trim().toLocaleLowerCase('tr-TR');
    const fields = { hierarchy: ['Kategori', 'Sezon', 'Yıl'], attributes: ['Marka', 'Renk', 'Beden'] };
    let products = [], stores = [], filters = [], busy = false;
    const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    const option = (value, label) => { const n = el('option', label); n.value = value; return n; };
    const unique = items => [...new Set(items.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'tr'));
    const selectedStores = id => {
        const current = [...get(id).selectedOptions].map(o => o.value).filter(Boolean);
        return [...(get(id).selectionOrder || []).filter(v => current.includes(v)), ...current.filter(v => !(get(id).selectionOrder || []).includes(v))];
    };
    const sourcePicker = window.StoreMultiSelect(get('quickFrom'), 'Kaynak mağaza');
    const targetPicker = window.StoreMultiSelect(get('quickTo'), 'Hedef mağaza');
    function values(product, type, key) {
        const object = product[type] || {};
        const actualKey = Object.keys(object).find(item => norm(item) === norm(key));
        let value = actualKey ? object[actualKey] : undefined;
        if (value === undefined) {
            const aliases = { 'kategori': 'category', 'sezon': 'season', 'yıl': 'year', 'marka': 'brand', 'renk': 'color', 'beden': 'size' };
            value = product[aliases[norm(key)]];
        }
        return (Array.isArray(value) ? value : [value]).filter(v => v !== undefined && v !== null && String(v).trim()).map(String);
    }
    function keys(type) { return unique([...fields[type], ...products.flatMap(p => Object.keys(p[type] || {}))]); }
    function sourceProducts() { return products.filter(p => selectedStores('quickFrom').some(name => norm(p.store) === norm(name))); }
    function matches(product) {
        return filters.every(f => {
            if (!f.selected.length) return true;
            const hit = values(product, f.type, f.key).some(v => f.selected.some(s => norm(s) === norm(v)));
            return f.exclude ? !hit : hit;
        });
    }
    function updateProducts() {
        window.dispatchEvent(new Event('distribution-settings-changed'));
        const select = get('quickProduct'), previous = select.value;
        const source = sourceProducts(), available = source.filter(matches);
        select.replaceChildren(option('', 'Ürün seçin'), ...available.map(p => option(String(p.id), `${p.code} · ${p.name} · ${p.store} (${p.stock} adet)`)));
        if (available.some(p => String(p.id) === previous)) select.value = previous;
        get('qfCount').textContent = `${source.length} kaynak mağaza ürününden ${available.length} tanesi eşleşiyor.`;
        get('qfEmpty').hidden = available.length > 0;
        const editor = get('qfEditProduct'), old = editor.value;
        editor.replaceChildren(option('', 'Özellik tanımlanacak ürünü seçin'), ...source.map(p => option(String(p.id), `${p.code} · ${p.name} · ${p.store}`)));
        if (source.some(p => String(p.id) === old)) editor.value = old;
    }
    function renderFilters() {
        get('qfRows').replaceChildren();
        filters.forEach((filter, index) => {
            const row = el('div', undefined, 'qf-row'), top = el('div', undefined, 'qf-row-top');
            const label = (title, control) => { const l = el('label', title); l.append(control); return l; };
            const type = el('select'); type.append(option('hierarchy', 'Hierarchy'), option('attributes', 'Ürün özelliği')); type.value = filter.type;
            type.addEventListener('change', () => { filter.type = type.value; filter.key = fields[type.value][0]; filter.selected = []; renderFilters(); });
            const key = el('select'); key.append(...keys(filter.type).map(k => option(k, k))); key.value = filter.key;
            key.addEventListener('change', () => { filter.key = key.value; filter.selected = []; renderFilters(); });
            const exclude = el('input'); exclude.type = 'checkbox'; exclude.checked = filter.exclude;
            const excludeLabel = el('label', undefined, 'qf-exclude'); excludeLabel.append(exclude, el('span', 'Seçilenleri hariç tut'));
            exclude.addEventListener('change', () => { filter.exclude = exclude.checked; updateProducts(); });
            const remove = el('button', '×', 'qf-remove'); remove.type = 'button'; remove.setAttribute('aria-label', `${index + 1}. filtreyi kaldır`);
            remove.addEventListener('click', () => { filters.splice(index, 1); renderFilters(); });
            top.append(label('Filtre tipi', type), label('Özellik', key), excludeLabel, remove);
            const picker = el('details', undefined, 'qf-picker');
            picker.append(el('summary', filter.selected.length ? filter.selected.join(' · ') : 'Değer seçin (çoklu seçim)'));
            const choices = unique(products.flatMap(p => values(p, filter.type, filter.key)));
            if (!choices.length) picker.append(el('p', 'Tanımlı değer yok. Aşağıdaki Özellik Tanımla alanından ürünlere değer ekleyin.', 'qf-note'));
            choices.forEach(value => {
                const check = el('input'); check.type = 'checkbox'; check.checked = filter.selected.includes(value);
                const item = el('label', undefined, 'qf-choice'); item.append(check, el('span', value));
                check.addEventListener('change', () => { filter.selected = check.checked ? [...filter.selected, value] : filter.selected.filter(v => v !== value); picker.querySelector('summary').textContent = filter.selected.join(' · ') || 'Değer seçin (çoklu seçim)'; updateProducts(); });
                picker.append(item);
            });
            row.append(top, el('p', 'Değerler', 'qf-value-label'), picker); get('qfRows').append(row);
        });
        get('qfClear').disabled = !filters.length;
        updateProducts();
    }
    get('qfAdd').addEventListener('click', () => { filters.push({ type: 'hierarchy', key: 'Sezon', selected: [], exclude: false }); renderFilters(); });
    get('qfClear').addEventListener('click', () => { filters = []; renderFilters(); });
    function syncTargets() {
        [...get('quickTo').options].forEach(o => { o.disabled = false; });
        sourcePicker.refresh(); targetPicker.refresh();
        updateProducts();
    }
    get('quickFrom').addEventListener('change', syncTargets);
    get('quickTo').addEventListener('change', () => { targetPicker.refresh(); window.dispatchEvent(new Event('distribution-settings-changed')); });
    get('qfSave').addEventListener('click', async () => {
        const product = products.find(p => String(p.id) === get('qfEditProduct').value);
        const type = get('qfEditType').value, key = get('qfEditKey').value.trim();
        const entries = unique(get('qfEditValues').value.split(',').map(v => v.trim()));
        if (!product || !key || !entries.length) { get('qfEditStatus').textContent = 'Ürün, özellik adı ve en az bir değer girin.'; return; }
        if (['__proto__', 'prototype', 'constructor'].includes(key)) { get('qfEditStatus').textContent = 'Başka bir özellik adı girin.'; return; }
        get('qfSave').disabled = true;
        try {
            const properties = { ...(product[type] || {}) };
            const existing = Object.keys(properties).find(k => norm(k) === norm(key));
            properties[existing || key] = entries;
            await window.NebimAdapter.updateProduct(product.id, { [type]: properties });
            product[type] = properties;
            renderFilters();
            get('qfEditStatus').textContent = 'Özellik kaydedildi. Aynı özellik için girilen değerler mevcut değerlerin yerini alır.';
        } catch (error) { get('qfEditStatus').textContent = 'Özellik kaydedilemedi. Tekrar deneyin.'; }
        finally { get('qfSave').disabled = false; }
    });
    get('quickCreate').addEventListener('click', async () => {
        if (busy) return;
        const salesDateRange = window.QuickSalesRange.get();
        if (window.QuickSalesRange.isEnabled() && !salesDateRange) return;
        const sources = selectedStores('quickFrom');
        const product = sourceProducts().find(p => String(p.id) === get('quickProduct').value && matches(p));
        const quantity = Number(get('quickQuantity').value);
        const status = get('quickStatus');
        if (!sources.length || !selectedStores('quickTo').length) { status.textContent = 'Kaynak ve hedef mağazaları seçin.'; return; }
        if (!product) { status.textContent = 'Filtrelere uygun bir kaynak mağaza ürünü seçin.'; return; }
        const targets = selectedStores('quickTo').filter(to => norm(to) !== norm(product.store));
        if (!targets.length) { status.textContent = 'Ürünün kaynak mağazasından farklı en az bir hedef seçin.'; return; }
        if (!Number.isSafeInteger(quantity) || quantity < 1 || !Number.isSafeInteger(quantity * targets.length) || quantity * targets.length > Number(product.stock)) { status.textContent = 'Her hedef için miktar pozitif tam sayı olmalı. Toplam miktar kaynak ürün stoğunu aşmamalı.'; return; }
        busy = true; get('quickCreate').disabled = true;
        try {
            await window.NebimAdapter.transferStock(product.id, targets, quantity, salesDateRange);
            products = await window.NebimAdapter.getProducts();
            updateProducts();
            status.textContent = `${product.store} kaynağından ${targets.length} hedefe, hedef başına ${quantity} adet (${quantity * targets.length} toplam) aktarıldı. Kaynak ve hedef stokları güncellendi.`;
            get('quickQuantity').value = '';
        } catch (error) { status.textContent = error.message || 'Transfer kaydedilemedi. Tekrar deneyin.'; }
        finally { busy = false; get('quickCreate').disabled = false; }
    });
    async function load() {
        get('quickCreate').disabled = true;
        try {
            [stores, products] = await Promise.all([window.NebimAdapter.getStores(), window.NebimAdapter.getProducts()]);
            const names = unique([...stores.map(s => s.name), ...products.map(p => p.store), 'İstanbul Mağaza 01', 'İstanbul Mağaza 02', 'Ankara Mağaza 01', 'Ankara Mağaza 02', 'İzmir Mağaza 01', 'Bursa Mağaza 01']);
            ['quickFrom', 'quickTo'].forEach(id => { const select = get(id), old = selectedStores(id); select.replaceChildren(...names.map(n => { const item = option(n, n); item.selected = old.includes(n); return item; })); });
            syncTargets(); renderFilters();
            get('quickCreate').disabled = false;
        } catch (error) { get('quickStatus').textContent = 'Mağaza ve ürün verileri yüklenemedi. Sayfayı yenileyip tekrar deneyin.'; }
    }
    window.addEventListener('storage', event => { if (event.key === 'aiStockNebimData') load(); });
    window.QuickTransferContext = {
        get: () => ({ sources: selectedStores('quickFrom'), targets: selectedStores('quickTo'), filters: JSON.parse(JSON.stringify(filters)), dateRange: window.QuickSalesRange.get() }),
        reload: load
    };
    load();
})();

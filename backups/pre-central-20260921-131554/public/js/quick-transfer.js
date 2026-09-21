(() => {
    const get = id => document.getElementById(id);
    const norm = value => String(value ?? '').trim().toLocaleLowerCase('tr-TR');
    const fields = { hierarchy: ['Kategori', 'Sezon', 'Yıl'], attributes: ['KUMAŞ CİNSİ', 'KUMAŞ GRUBU', 'CİNSİYET', 'ÜRÜN GRUBU', 'ÜRÜN ALT GRUBU', 'BEDEN', 'ANINDA İNDİRİM KAMPANYA ORANI', 'KOLEKSİYON', 'RIYADH ANINDA İND.KAMP.ORANI', 'KUMAŞ DETAY', 'SATIŞ KONSEPTİ', 'DİKİM PUANI', 'Ürün Modeli', 'AİLE TABLOSU SEVKİYAT', 'AİLE TABLOSU GRUP', 'Üretim Yeri', 'XX GENEL AİLE TABLOSU BİRLEŞTİR', 'London Full-Price & Special Discount', 'Ana Kumaş İçerik', 'Marka', 'Renk'] };
    let products = [], stores = [], filters = [{ type: 'attributes', key: 'KUMAŞ CİNSİ', selected: [], exclude: false }], busy = false;
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
        const field = norm(key);
        if (field === 'kumaş cinsi') {
            const fabricKey = Object.keys(product.attributes || {}).find(item => norm(item) === field);
            const fabric = product.fabric || product.fabricType || product.attributes?.[fabricKey];
            return (Array.isArray(fabric) ? fabric : [fabric]).filter(v => v != null && String(v).trim()).map(v => String(v).trim());
        }
        if (type === 'hierarchy' && ['sezon', 'yıl'].includes(field)) {
            const code = [product.code, product.name].map(v => String(v ?? '').trim().toUpperCase().match(/^([KY])(\d{2})/)).find(Boolean);
            if (code) return [field === 'sezon' ? (code[1] === 'K' ? 'Kış' : 'Yaz') : `20${code[2]}`];
        }
        const object = product[type] || {};
        const actualKey = Object.keys(object).find(item => norm(item) === norm(key));
        let value = actualKey ? object[actualKey] : undefined;
        if (value === undefined) {
            const aliases = { 'kategori': 'category', 'sezon': 'season', 'yıl': 'year', 'marka': 'brand', 'renk': 'color', 'beden': 'size' };
            value = product[aliases[norm(key)]];
        }
        return (Array.isArray(value) ? value : [value]).filter(v => v !== undefined && v !== null && String(v).trim()).map(String);
    }
    function keys(type) { return [...fields[type], ...unique(products.flatMap(p => Object.keys(p[type] || {})))].filter((key, index, all) => all.findIndex(k => norm(k) === norm(key)) === index); }
    function fieldOptions(type, current = '') {
        return [...keys(type), ...(current && !keys(type).some(k => norm(k) === norm(current)) ? [current] : [])].map(key => {
            const number = type === 'attributes' ? fields.attributes.findIndex(k => norm(k) === norm(key)) : -1;
            return option(norm(key) === norm(current) ? current : key, number >= 0 && number < 19 ? `${number + 1} - ${key}` : key);
        });
    }
    function valuePicker(choices, selected, onChange) {
        const wrap = el('div', undefined, 'qf-values'), chips = el('div', undefined, 'qf-chips');
        const picker = el('dialog', undefined, 'qf-picker qf-value-dialog'), summary = el('button', 'Değer seçin (çoklu seçim)');
        summary.type = 'button';
        const heading = el('h2', 'Değer seçimi');
        picker.setAttribute('aria-label', 'Değer seçimi');
        const mode = el('button', 'Yalnızca seçilenleri göster'), done = el('button', 'Seçimleri uygula'), cancel = el('button', 'Vazgeç');
        [mode, done, cancel].forEach(button => { button.type = 'button'; });
        let selectedOnly = false;
        const search = el('input'); search.type = 'search'; search.placeholder = 'Değer ara…'; search.setAttribute('aria-label', 'Değerlerde ara');
        const list = el('div', undefined, 'qf-options'), empty = el('p', 'Tanımlı değer yok. Ürüne Özellik Tanımla alanından değer ekleyin.', 'qf-note');
        let current = [...selected];
        const checks = new Map();
        function refresh() {
            current.sort((a, b) => a.localeCompare(b, 'tr', { numeric: true, sensitivity: 'base' }));
            chips.replaceChildren(...current.map(value => {
                const chip = el('span', undefined, 'qf-chip');
                const remove = el('button', '×'); remove.type = 'button';
                remove.setAttribute('aria-label', `${value} seçimini kaldır`);
                remove.addEventListener('click', () => {
                    current = current.filter(item => item !== value);
                    selected = [...current]; refresh(); onChange([...current]);
                });
                chip.append(el('span', value), remove); return chip;
            }));
            checks.forEach((check, value) => { check.checked = current.includes(value); });
            summary.textContent = 'Değer seç / Düzenle';
            heading.textContent = 'Değer seçimi';
        }
        unique([...choices, ...selected]).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true, sensitivity: 'base' })).forEach(value => {
            const check = el('input'); check.type = 'checkbox'; checks.set(value, check);
            const item = el('label', undefined, 'qf-choice'); item.append(check, el('span', value));
            check.addEventListener('change', () => { current = check.checked ? [...current, value] : current.filter(v => v !== value); refresh(); filterList(); });
            list.append(item);
        });
        search.addEventListener('input', () => { let count = 0; [...list.children].forEach(item => { item.hidden = !norm(item.textContent).includes(norm(search.value)); if (!item.hidden) count++; }); empty.hidden = count > 0; empty.textContent = checks.size ? 'Aramanızla eşleşen değer yok.' : 'Tanımlı değer yok. Ürüne Özellik Tanımla alanından değer ekleyin.'; });
        empty.hidden = checks.size > 0;
        function filterList() {
            let count = 0;
            [...list.children].forEach(item => { item.hidden = !norm(item.textContent).includes(norm(search.value)) || (selectedOnly && !item.querySelector('input').checked); if (!item.hidden) count++; });
            empty.hidden = count > 0; empty.textContent = 'Eşleşen değer yok.';
        }
        search.addEventListener('input', filterList);
        mode.addEventListener('click', () => { selectedOnly = !selectedOnly; mode.textContent = selectedOnly ? 'Tüm değerleri göster' : 'Yalnızca seçilenleri göster'; filterList(); });
        summary.addEventListener('click', () => { current = [...selected]; refresh(); search.value = ''; filterList(); picker.showModal(); search.focus(); });
        done.addEventListener('click', () => { selected = [...current]; picker.close(); summary.focus(); onChange([...current]); });
        const dismiss = () => { current = [...selected]; refresh(); picker.close(); summary.focus(); };
        cancel.addEventListener('click', dismiss);
        picker.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
        const actions = el('div', undefined, 'qf-dialog-actions'); actions.append(done, cancel);
        picker.append(heading, search, mode, list, empty, actions); wrap.append(chips, summary, picker); refresh(); return wrap;
    }
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
        const source = sourceProducts(), available = source.filter(matches);
        get('qfCount').textContent = `${source.length} kaynak mağaza ürününden ${available.length} tanesi eşleşiyor.`;
        get('qfEmpty').hidden = available.length > 0;
        const editor = get('qfEditProduct'), old = editor.value;
        editor.replaceChildren(option('', 'Özellik tanımlanacak ürünü seçin'), ...source.map(p => option(String(p.id), `${p.code} · ${p.name} · ${p.store}`)));
        if (source.some(p => String(p.id) === old)) editor.value = old;
        if (old && editor.value !== old) syncEditorValues();
    }
    function filterChoices(filter) {
        const related = norm(filter.key) === 'kumaş cinsi' ? products.filter(product => filters
            .filter(f => f.type === 'hierarchy' && ['sezon', 'yıl'].includes(norm(f.key)) && f.selected.length)
            .every(f => {
                const hit = values(product, f.type, f.key).some(v => f.selected.some(s => norm(s) === norm(v)));
                return f.exclude ? !hit : hit;
            })) : products;
        return unique(related.flatMap(product => values(product, filter.type, filter.key)));
    }
    function renderFilters() {
        get('qfRows').replaceChildren();
        filters.forEach((filter, index) => {
            const row = el('div', undefined, 'qf-row'), top = el('div', undefined, 'qf-row-top');
            const label = (title, control) => { const l = el('label', title); l.append(control); return l; };
            const type = el('select'); type.append(option('hierarchy', 'Hierarchy'), option('attributes', 'Ürün özelliği')); type.value = filter.type;
            type.addEventListener('change', () => { filter.type = type.value; filter.key = fields[type.value][0]; filter.selected = []; renderFilters(); });
            const key = el('select'); key.append(...fieldOptions(filter.type, filter.key)); key.value = filter.key;
            key.addEventListener('change', () => { filter.key = key.value; filter.selected = []; renderFilters(); });
            const exclude = el('input'); exclude.type = 'checkbox'; exclude.checked = filter.exclude;
            const excludeLabel = el('label', undefined, 'qf-exclude'); excludeLabel.append(exclude, el('span', 'Seçilenleri hariç tut'));
            exclude.addEventListener('change', () => { filter.exclude = exclude.checked; renderFilters(); });
            const remove = el('button', '×', 'qf-remove'); remove.type = 'button'; remove.setAttribute('aria-label', `${index + 1}. filtreyi kaldır`);
            remove.addEventListener('click', () => { filters.splice(index, 1); renderFilters(); });
            top.append(label('Filtre tipi', type), label('Özellik', key), excludeLabel, remove);
            const choices = filterChoices(filter);
            if (norm(filter.key) === 'kumaş cinsi') filter.selected = filter.selected.filter(value => choices.some(choice => norm(choice) === norm(value)));
            const picker = valuePicker(choices, filter.selected, selected => {
                filter.selected = selected;
                if (filter.type === 'hierarchy' && ['sezon', 'yıl'].includes(norm(filter.key))) renderFilters();
                else updateProducts();
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
    let editorValues = [];
    function syncEditorFields() {
        const type = get('qfEditType').value, previous = get('qfEditKey').value;
        get('qfEditKey').replaceChildren(option('', 'Özellik seçiniz…'), ...fieldOptions(type));
        if (keys(type).includes(previous)) get('qfEditKey').value = previous;
        syncEditorValues();
    }
    function syncEditorValues() {
        const type = get('qfEditType').value, key = get('qfEditKey').value;
        const product = products.find(p => String(p.id) === get('qfEditProduct').value);
        editorValues = product && key ? values(product, type, key) : [];
        drawEditorValues();
        get('qfEditStatus').textContent = '';
    }
    function drawEditorValues() {
        const type = get('qfEditType').value, key = get('qfEditKey').value;
        get('qfEditValuePicker').replaceChildren(valuePicker(key ? products.flatMap(p => values(p, type, key)) : [], editorValues, selected => { editorValues = selected; }));
        get('qfEditValues').value = '';
    }
    get('qfEditType').addEventListener('change', syncEditorFields);
    get('qfEditKey').addEventListener('change', syncEditorValues);
    get('qfEditProduct').addEventListener('change', syncEditorValues);
    function addEditorValues() {
        editorValues = unique([...editorValues, ...get('qfEditValues').value.split(',').map(v => v.trim())]);
        drawEditorValues();
    }
    get('qfEditAddValue').addEventListener('click', addEditorValues);
    get('qfEditValues').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addEditorValues(); } });
    get('qfSave').addEventListener('click', async () => {
        const product = products.find(p => String(p.id) === get('qfEditProduct').value);
        const type = get('qfEditType').value, key = get('qfEditKey').value.trim();
        const entries = unique([...editorValues, ...get('qfEditValues').value.split(',').map(v => v.trim())]);
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
            syncEditorValues();
            get('qfEditStatus').textContent = 'Özellik kaydedildi. Aynı özellik için girilen değerler mevcut değerlerin yerini alır.';
        } catch (error) { get('qfEditStatus').textContent = 'Özellik kaydedilemedi. Tekrar deneyin.'; }
        finally { get('qfSave').disabled = false; }
    });
    get('quickCreate').addEventListener('click', async () => {
        if (busy) return;
        const status = get('quickStatus');
        status.textContent = '';
        {
            const targets = selectedStores('quickTo');
            if (!targets.length) { status.textContent = 'Satışları karşılaştırılacak hedef mağazaları seçin.'; return; }
            const dateRange = window.QuickSalesRange.get();
            const candidates = sourceProducts().filter(p => matches(p) && Number(p.stock) > 0);
            if (!candidates.length) { status.textContent = 'Filtrelere uygun, stok bulunan kaynak ürün yok.'; return; }
            busy = true; get('quickCreate').disabled = true;
            try {
                const quantitySettings = !get('distQuantitySettings').hidden;
                const records = await window.NebimAdapter.transferMissingSizes(candidates.map(p => p.id), targets, dateRange, {
                    stockPriority: true, targetOrder: true, draftOnly: true,
                    minTwoStock: !get('distSourceStockRule').hidden && get('distMinTwoStock').checked,
                    minimumQuantity: quantitySettings ? Number(get('distMinimumQuantity').value) : 1,
                    sendAllStock: quantitySettings ? get('distSendAllStock').checked : true
                });
                products = await window.NebimAdapter.getProducts(); updateProducts();
                window.dispatchEvent(new Event('transfer-tasks-changed'));
                status.textContent = `${records.length} beden satırı, toplam ${records.reduce((n, r) => n + r.quantity, 0)} adet için ${records[0].orderId} nolu emir hazırlandı. Gönderilmedi; kaynak ve hedef stokları değiştirilmedi.`;
            } catch (error) { status.textContent = error.message; }
            finally { busy = false; get('quickCreate').disabled = false; }
            return;
        }
    });
    async function load() {
        get('quickCreate').disabled = true;
        try {
            [stores, products] = await Promise.all([window.NebimAdapter.getStores(), window.NebimAdapter.getProducts()]);
            const names = unique([...stores.map(s => s.name), ...products.map(p => p.store)]);
            ['quickFrom', 'quickTo'].forEach(id => { const select = get(id), old = selectedStores(id); select.replaceChildren(...names.map(n => { const depot = window.NebimAdapter.isWarehouse(stores.find(s => s.name === n) || { name: n }); const item = option(n, depot ? `${n} · Ana Dağıtım Deposu` : n); item.selected = old.includes(n); return item; })); });
            syncTargets(); renderFilters(); syncEditorFields();
            get('quickCreate').disabled = false;
        } catch (error) { get('quickStatus').textContent = 'Mağaza ve ürün verileri yüklenemedi. Sayfayı yenileyip tekrar deneyin.'; }
    }
    window.addEventListener('storage', event => { if (event.key === 'aiStockNebimData') load(); });
    window.QuickTransferContext = {
        restore(config) {
            if (busy || get('quickCreate').disabled) throw Error('Mevcut işlemin veya veri yüklemesinin bitmesini bekleyin.');
            const missing = [['quickFrom', config.sources], ['quickTo', config.targets]].flatMap(([id, names]) => names.filter(name => ![...get(id).options].some(o => o.value === name)));
            [['quickFrom', config.sources], ['quickTo', config.targets]].forEach(([id, names]) => {
                [...get(id).options].forEach(o => { o.selected = names.includes(o.value); }); get(id).selectionOrder = [...names];
            });
            filters = JSON.parse(JSON.stringify(config.filters));
            syncTargets(); renderFilters();
            return { missingStores: [...new Set(missing)] };
        },
        get: () => ({ sources: selectedStores('quickFrom'), targets: selectedStores('quickTo'), filters: JSON.parse(JSON.stringify(filters)), dateRange: window.QuickSalesRange.get() }),
        reload: load
    };
    load();
})();

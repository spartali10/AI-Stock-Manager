(() => {
    const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    const format = n => n.toLocaleString('tr-TR');
    window.WarehouseDetails = { create(store, initialProducts) {
        const card = el('article', undefined, 'warehouse-card');
        const metrics = el('div', undefined, 'warehouse-stock-metrics');
        const totalValue = el('strong', '0'), availableValue = el('strong', '0');
        const productCountValue = el('strong', '0'), recordCountValue = el('strong', '0');
        [['Mamül Depo toplam stok', totalValue], ['Dağıtılabilir stok', availableValue], ['Ürün kodu', productCountValue], ['Stok kaydı', recordCountValue]].forEach(([label, value]) => {
            const metric = el('div', undefined, 'warehouse-stock-metric');
            metric.append(el('span', label), value); metrics.append(metric);
        });
        const details = el('details', undefined, 'warehouse-stock-details');
        const toggle = el('summary', 'Depo stok detaylarını göster');
        const search = el('input'); search.type = 'search'; search.placeholder = 'Ürün kodu, adı veya renk ara'; search.setAttribute('aria-label', search.placeholder);
        const status = el('p'); status.setAttribute('role', 'status');
        const scroll = el('div', undefined, 'warehouse-detail-table'); scroll.tabIndex = 0; scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', store.name + ' stok detayları');
        const table = el('table'), head = el('thead'), body = el('tbody'); table.append(head, body); scroll.append(table);
        const link = el('a', 'Akıllı Dağıtıma Git', 'warehouse-distribution-link'); link.href = '/Transfer?view=distribution'; link.hidden = !window.StockAuth.can('transfers');
        details.append(toggle, search, status, scroll, link);
        card.append(el('h3', store.name), el('p', 'Ana depo · Mamül ürünlerin mağazalara dağıtım merkezi'), metrics, details);
        let groups = [], sizes = [], request = 0;
        function render() {
            const term = search.value.trim().toLocaleLowerCase('tr-TR');
            const visible = groups.filter(p => `${p.code} ${p.name} ${p.color}`.toLocaleLowerCase('tr-TR').includes(term));
            body.replaceChildren();
            for (const p of visible) {
                const row = el('tr');
                [p.code, p.name, p.color || '—', ...sizes.map(size => {
                    const members = p.members.filter(m => window.StockSizeView.size(m) === size);
                    return members.length ? format(members.reduce((n, m) => n + (Number(m.stock) || 0), 0)) : '—';
                }), format(p.stock)].forEach(v => row.append(el('td', v)));
                body.append(row);
            }
            status.textContent = groups.length ? `${groups.length} ürün/renk satırından ${visible.length} gösteriliyor.` : 'Bu depoda kayıtlı ürün bulunmuyor.';
        }
        function update(all) {
            const products = all.filter(p => p.store === store.name);
            groups = window.StockSizeView.group(products);
            sizes = window.StockSizeView.columns(products).filter(s => s !== 'BELİRTİLMEMİŞ' || products.some(p => window.StockSizeView.size(p) === s && Number(p.stock) !== 0));
            const total = products.reduce((n, p) => n + (Number(p.stock) || 0), 0);
            const distributable = groups.reduce((n, p) => n + p.members.filter(m => p.code && p.color && window.StockSizeView.size(m) !== 'BELİRTİLMEMİŞ').reduce((s, m) => s + Math.max(0, Number(m.stock) || 0), 0), 0);
            totalValue.textContent = format(total);
            availableValue.textContent = format(distributable);
            productCountValue.textContent = format(new Set(products.map(p => p.code)).size);
            recordCountValue.textContent = format(products.length);
            const row = el('tr'); ['Ürün Kodu', 'Ürün Adı', 'Renk', ...sizes, 'Toplam'].forEach(label => { const th = el('th', label); th.scope = 'col'; row.append(th); }); head.replaceChildren(row); render();
        }
        search.addEventListener('input', render);
        details.addEventListener('toggle', async () => {
            toggle.textContent = details.open ? 'Depo stok detaylarını gizle' : 'Depo stok detaylarını göster';
            const token = ++request; if (!details.open) return;
            status.textContent = 'Güncel depo stokları yükleniyor…';
            try { const products = await window.NebimAdapter.getProducts(); if (token === request) update(products); }
            catch (error) { if (token === request) status.textContent = 'Depo verileri alınamadı: ' + error.message; }
        });
        update(initialProducts); return card;
    } };
})();

(function (root) {
    const norm = value => String(value ?? '').trim().toLocaleLowerCase('tr-TR');
    function dimension(p, field, label) {
        const attribute = Object.keys(p.attributes || {}).find(key => norm(key) === norm(label));
        const value = p[field] ?? p.attributes?.[attribute];
        const list = Array.isArray(value) ? value : [value];
        return list.length === 1 && list[0] != null && String(list[0]).trim() ? String(list[0]).trim() : null;
    }
    function variant(p) {
        const color = dimension(p, 'color', 'Renk'), size = dimension(p, 'size', 'Beden');
        return p.code && color && size ? JSON.stringify([norm(p.code), norm(color), norm(size)]) : null;
    }
    function filterMatch(p, filters = []) {
        const aliases = { kategori: 'category', sezon: 'season', yıl: 'year', renk: 'color', beden: 'size', marka: 'brand' };
        return filters.every(f => {
            if (!f.selected.length) return true;
            const object = p[f.type] || {};
            const key = Object.keys(object).find(k => norm(k) === norm(f.key));
            const value = key ? object[key] : p[aliases[norm(f.key)]];
            const hit = (Array.isArray(value) ? value : [value]).some(v => v != null && f.selected.some(s => norm(s) === norm(v)));
            return f.exclude ? !hit : hit;
        });
    }
    function build(data, config) {
        const result = { routes: [], candidates: [], notes: [], blocked: false };
        const fail = message => { result.blocked = true; result.notes.push(message); return result; };
        if (!['chance', 'sweep', 'winner'].includes(config.mode)) return fail('Dağıtım modu seçin.');
        const sources = [...new Set(config.sources || [])], targets = [...new Set(config.targets || [])];
        if (!sources.length) return fail('Kaynak mağaza seçin.');
        if (config.mode !== 'chance' && !targets.length) return fail('Hedef mağaza seçin.');
        if (config.mode === 'chance' && (!config.mainWarehouse || !sources.includes(config.mainWarehouse))) return fail('Ana depoyu seçin ve kaynak mağazalara ekleyin.');
        if (config.mode === 'chance' && data.meta?.movementHistoryComplete !== true) return fail('Daha önce mağazaya gitmemiş ürünleri doğrulamak için eksiksiz sevkiyat geçmişi gerekli. Mevcut stok tek başına yeterli değil.');
        if (config.mode === 'chance' && (!Array.isArray(data.movements) || data.movements.some(m => !variant(m) || !m.to || !Number.isSafeInteger(m.quantity) || m.quantity < 0))) return fail('Sevkiyat geçmişinde ürün kodu, tekil renk, beden, hedef veya miktar eksik.');
        const range = config.dateRange;
        if (config.mode === 'winner') {
            const coverage = data.meta?.salesCoverage;
            const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
            if (!range || !coverage || ![range.start, range.end, coverage.start, coverage.end].every(date) || range.start > range.end || coverage.start > range.start || coverage.end < range.end || ![...sources, ...targets].every(s => coverage.stores?.includes(s))) return fail('Seçili tarih aralığını ve mağazaları kapsayan eksiksiz satış geçmişi gerekli. Eksik satış kaydı sıfır satış kabul edilmez.');
            if (!Array.isArray(data.sales) || data.sales.some(s => !variant(s) || !s.store || !/^\d{4}-\d{2}-\d{2}$/.test(s.date) || !Number.isSafeInteger(s.quantity) || s.quantity < 0)) return fail('Satış geçmişinde tarih, ürün kodu, tekil renk/beden veya satış adedi eksik.');
        }
        if (config.sendRemainder && (!config.remainderStore || sources.includes(config.remainderStore))) return fail('Kalan ürünler için kaynaklardan farklı bir depo seçin.');
        const products = data.products || [], stocks = new Map();
        const stockKey = (store, key) => JSON.stringify([norm(store), key]);
        for (const p of products) {
            const key = variant(p);
            if (key && (!Number.isSafeInteger(Number(p.stock)) || Number(p.stock) < 0)) return fail('Ürün stokları geçerli, negatif olmayan tam sayılar olmalı.');
            if (key) stocks.set(stockKey(p.store, key), (stocks.get(stockKey(p.store, key)) || 0) + Number(p.stock));
        }
        const sales = (data.sales || []).filter(s => range && s.date >= range.start && s.date <= range.end);
        const salesTotal = (store, key) => sales.filter(s => norm(s.store) === norm(store) && variant(s) === key).reduce((sum, s) => sum + Number(s.quantity), 0);
        const relevant = sources.flatMap(store => products.filter(p => norm(p.store) === norm(store) && Number(p.stock) > 0 && filterMatch(p, config.filters)));
        let missing = 0, remainder = 0;
        for (const p of relevant) {
            if (config.mode === 'winner' && config.minTwoStock && Number(p.stock) < 2) continue;
            const key = variant(p);
            if (!key || !Number.isSafeInteger(Number(p.stock))) { missing++; continue; }
            if (config.mode === 'chance' && norm(p.store) !== norm(config.mainWarehouse)) continue;
            if (config.mode === 'chance') {
                const sent = (data.movements || []).some(m => variant(m) === key && norm(m.to) !== norm(config.mainWarehouse) && Number(m.quantity) > 0) ||
                    (data.transfers || []).some(m => variant({ ...m, code: m.product }) === key && m.status === 'Tamamlandı' && norm(m.to) !== norm(config.mainWarehouse)) ||
                    products.some(other => variant(other) === key && norm(other.store) !== norm(config.mainWarehouse) && Number(other.stock) > 0);
                if (sent) continue;
            }
            if (config.mode === 'winner' && salesTotal(p.store, key) !== 0) continue;
            result.candidates.push({ productId: p.id, code: p.code, color: dimension(p, 'color', 'Renk'), size: dimension(p, 'size', 'Beden'), store: p.store, stock: p.stock });
            if (config.mode === 'chance') continue;
            let remaining = Number(p.stock);
            let ordered = targets.filter(to => norm(to) !== norm(p.store));
            if (config.mode === 'winner') ordered = ordered.filter(to => salesTotal(to, key) > 0).sort((a, b) => salesTotal(b, key) - salesTotal(a, key));
            const add = (to, quantity, reason) => {
                result.routes.push({ productId: p.id, code: p.code, color: dimension(p, 'color', 'Renk'), size: dimension(p, 'size', 'Beden'), from: p.store, to, quantity, reason });
                remaining -= quantity;
                stocks.set(stockKey(to, key), (stocks.get(stockKey(to, key)) || 0) + quantity);
            };
            for (const to of ordered) {
                if (!remaining) break;
                if ((stocks.get(stockKey(to, key)) || 0) !== 0) continue;
                add(to, 1, config.mode === 'winner' ? `Dönem satışı: ${salesTotal(to, key)} · Sıfır stok tamamlama` : 'Sıfır stok tamamlama');
            }
            if (remaining && config.mode === 'sweep' && config.sendRemainder) add(config.remainderStore, remaining, 'Kalan ürünleri depoya çıkar');
            remainder += remaining;
        }
        if (missing) result.notes.push(`${missing} kayıt atlandı: tekil renk/beden veya geçerli stok adedi eksik. Özellik Tanımla alanından tamamlayın.`);
        if (remainder) result.notes.push(`${remainder} adet kaynaklarda kalacak.`);
        if (!result.candidates.length) result.notes.push('Kurallara uygun ürün bulunamadı.');
        if (config.mode === 'winner') result.notes.push('Eşit satışta hedef seçim sırası kullanılır. Her sıfır stoklu hedefe bir adet verilir; kalan kaynakta kalır.');
        if (config.mode === 'winner' && config.minTwoStock) result.notes.push('Tüm ürün kodlarında, kaynak mağaza ve renk/beden bazında başlangıç stoğu 2 ve üzeri olan kayıtlar kullanılır.');
        return result;
    }
    root.DistributionEngine = { build, variant };
})(typeof window !== 'undefined' ? window : globalThis);

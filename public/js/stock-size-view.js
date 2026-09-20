(function (root) {
    const base = ['0', '1', '2', '3', '4', 'ONE SIZE'];
    function size(product) {
        const key = Object.keys(product.attributes || {}).find(k => k.toLocaleLowerCase('tr-TR') === 'beden');
        const raw = product.size ?? product.attributes?.[key];
        const text = String(Array.isArray(raw) ? raw.length === 1 ? raw[0] : '' : raw ?? '').trim();
        return /^(ONE|ONE SIZE|ONESIZE)$/i.test(text) ? 'ONE SIZE' : text || 'BELİRTİLMEMİŞ';
    }
    const columns = products => [...base, ...new Set(products.map(size).filter(s => !base.includes(s)))];
    function group(products) {
        const groups = new Map();
        const productionSizes = new Map();
        for (const product of products) {
            const code = String(product.code ?? '').trim();
            if (!productionSizes.has(code)) productionSizes.set(code, new Set());
            const value = size(product);
            if (!['BELİRTİLMEMİŞ', 'Tanımsız'].includes(value)) productionSizes.get(code).add(value);
        }
        for (const product of products) {
            const colorKey = Object.keys(product.attributes || {}).find(k => k.toLocaleLowerCase('tr-TR') === 'renk');
            const color = product.color ?? product.attributes?.[colorKey] ?? '';
            const key = JSON.stringify([product.store, product.code, color, product.fabric || '']);
            if (!groups.has(key)) groups.set(key, { ...product, color: Array.isArray(color) ? color.join(', ') : String(color), stock: 0, capacity: 0, min: 0, members: [] });
            const row = groups.get(key); row.members.push(product);
            row.stock += Number(product.stock) || 0; row.capacity += Number(product.capacity) || 0; row.min += Number(product.min) || 0;
        }
        return [...groups.values()].map(row => {
            const sizes = productionSizes.get(String(row.code ?? '').trim());
            row.oneSizeOnly = sizes.size === 1 && sizes.has('ONE SIZE');
            row.numberedSizesOnly = sizes.size > 0 && [...sizes].every(size => ['0', '1', '2', '3', '4'].includes(size));
            return row;
        });
    }
    function status(product) {
        const members = product.members || [product];
        const quantities = new Map();
        for (const member of members) {
            const label = size(member);
            quantities.set(label, (quantities.get(label) || 0) + Math.max(0, Number(member.stock) || 0));
        }
        const total = [...quantities.values()].reduce((sum, amount) => sum + amount, 0);
        if (total === 0) return 'depleted';
        // ONE SIZE and legacy records without numbered sizes use available quantity.
        if (!['0', '1', '2', '3'].some(label => quantities.has(label))) return 'normal';
        const missing = ['0', '1', '2', '3'].filter(label => !quantities.get(label)).length;
        return missing === 0 ? 'normal' : missing === 1 ? 'low' : 'critical';
    }
    function counts(products) {
        return group(products).reduce((result, product) => {
            result[status(product)]++;
            return result;
        }, { normal: 0, low: 0, critical: 0, depleted: 0 });
    }
    const statusText = status => ({ normal: 'Normal', low: 'Düşük', critical: 'Kritik', depleted: 'Tükendi' }[status]);
    root.StockSizeView = { size, columns, group, status, counts, statusText };
})(typeof window !== 'undefined' ? window : globalThis);

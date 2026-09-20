(function (root) {
    const baseSizes = ['0', '1', '2', '3', 'ONE SIZE'];
    const text = value => String(value ?? '').trim();
    function size(value) {
        const label = text(value).toLocaleUpperCase('tr-TR').replace(/İ/g, 'I');
        return /^(ONE[\s_-]*SIZE|ONE)$/.test(label) ? 'ONE SIZE' : label || 'BELİRTİLMEMİŞ';
    }
    function build(records, context = {}) {
        const groups = new Map(), extra = new Set();
        records.forEach(record => {
            const product = text(record.product), color = text(record.color);
            const key = JSON.stringify([record.from, record.to, product, color.toLocaleLowerCase('tr-TR'), text(record.fabric).toLocaleLowerCase('tr-TR')]);
            if (!groups.has(key)) groups.set(key, { ...record, product, color, quantities: {}, quantity: 0, inventoryRecords: [] });
            const row = groups.get(key), label = size(record.size), quantity = Number(record.quantity) || 0;
            if (!baseSizes.includes(label)) extra.add(label);
            row.quantities[label] = (row.quantities[label] || 0) + quantity;
            row.quantity += quantity;
            if (quantity > 0) row.inventoryRecords.push(record);
        });
        const compare = (a, b) => text(a).localeCompare(text(b), 'tr', { numeric: true });
        const norm = value => text(value).toLocaleLowerCase('tr-TR');
        const colorOf = item => item.color ?? item.attributes?.[Object.keys(item.attributes || {}).find(key => norm(key) === 'renk')];
        for (const row of groups.values()) {
            const matches = (item, store) => norm(item.store) === norm(store) && norm(item.code) === norm(row.product) && norm(colorOf(item)) === norm(row.color);
            const inventory = side => {
                const entries = row.inventoryRecords.map(record => {
                    const snapshot = record.inventorySnapshot;
                    const value = snapshot?.phase === 'before-transfer' && Number.isFinite(snapshot[side]) ? snapshot[side] : null;
                    return { size: size(record.size), value };
                });
                if (!entries.length) return null;
                if (entries.length === 1) return entries[0].value;
                return entries.map(entry => `${entry.size}: ${entry.value ?? '—'}`).join(' / ');
            };
            const sales = store => {
                if (!Array.isArray(context.sales)) return null;
                const range = row.salesDateRange, coverage = context.meta?.salesCoverage;
                if (range && (!coverage || coverage.start > range.start || coverage.end < range.end)) return null;
                return context.sales.filter(item => matches(item, store) && (!range || item.date >= range.start && item.date <= range.end)).reduce((n, item) => n + (Number(item.quantity) || 0), 0);
            };
            row.sourceInventory = inventory('source'); row.sourceSales = sales(row.from);
            row.targetInventory = inventory('target'); row.targetSales = sales(row.to);
        }
        return {
            sizes: [...baseSizes, ...[...extra].sort(compare)],
            rows: [...groups.values()].sort((a, b) => compare(a.product, b.product) || compare(a.color, b.color)),
            total: records.reduce((total, record) => total + (Number(record.quantity) || 0), 0)
        };
    }
    root.TransferOrderMatrix = { build, size };
})(typeof window !== 'undefined' ? window : globalThis);

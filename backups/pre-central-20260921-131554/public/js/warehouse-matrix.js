(function (root) {
    const norm = value => String(value ?? '').trim().toLocaleLowerCase('tr-TR');
    const text = value => String(value ?? '').trim();
    function attribute(p, field, label) {
        const key = Object.keys(p.attributes || {}).find(k => norm(k) === norm(label));
        const raw = p[field] ?? p.attributes?.[key];
        return Array.isArray(raw) ? (raw.length === 1 ? text(raw[0]) : '') : text(raw);
    }
    function warehouses(data) {
        const stores = [...(data.stores || [])];
        for (const p of data.products || []) if (p.store && !stores.some(s => s.name === p.store)) stores.push({ name: p.store });
        return stores.filter(s => s.isFinishedGoodsWarehouse === true || s.type === 'finished_goods' || /^mam[uü]l\s+depo(?:\s|\(|$)/i.test(s.name));
    }
    function rows(data, warehouse) {
        if (!warehouses(data).some(s => s.name === warehouse)) throw new Error('Yalnızca Mamül Depo seçilebilir.');
        const grouped = new Map();
        for (const p of data.products || []) {
            if (p.store !== warehouse) continue;
            const fabric = attribute(p, 'fabric', 'Kumaş Cinsi') || attribute(p, 'fabricType', 'Kumaş') || 'Tanımsız';
            const color = attribute(p, 'color', 'Renk'), size = attribute(p, 'size', 'Beden');
            const key = JSON.stringify([fabric, text(p.code), color]);
            if (!grouped.has(key)) grouped.set(key, { key, fabric, collection: attribute(p, 'collection', 'Koleksiyon') || fabric, code: text(p.code), name: text(p.name) || 'Tanımsız ürün', color, sizes: {} });
            const row = grouped.get(key), sizeKey = size || 'Tanımsız';
            if (!Object.hasOwn(row.sizes, sizeKey)) Object.defineProperty(row.sizes, sizeKey, { value: { stock: 0, ids: [], valid: !!p.code && !!color && !!size }, enumerable: true });
            const cell = row.sizes[sizeKey];
            if (!Number.isSafeInteger(Number(p.stock))) throw new Error('Mamül Depo stoğunda geçersiz adet var. Stok verisini düzeltin.');
            cell.stock += Number(p.stock); cell.ids.push(p.id);
        }
        return [...grouped.values()].sort((a, b) => a.code.localeCompare(b.code, 'tr', { numeric: true, sensitivity: 'base' }) || a.color.localeCompare(b.color, 'tr', { numeric: true }) || a.fabric.localeCompare(b.fabric, 'tr'));
    }
    const cellKey = (row, size, store) => JSON.stringify([row, size, store]);
    function entryLimit(row, size, store, entries) {
        const stock = row.sizes[size]?.stock || 0;
        const used = entries.filter(entry => entry.row === row.key && entry.size === size && entry.to !== store)
            .reduce((sum, entry) => sum + (Number.isSafeInteger(entry.quantity) && entry.quantity > 0 ? entry.quantity : 0), 0);
        return Math.max(0, stock - used);
    }
    function plan(data, warehouse, entries) {
        const inventory = rows(data, warehouse), map = new Map(inventory.map(row => [row.key, row]));
        const warehouseNames = new Set(warehouses(data).map(s => s.name));
        const targets = new Set([...(data.stores || []).map(s => s.name), ...(data.products || []).map(p => p.store)].filter(name => name && !warehouseNames.has(name)));
        const budgets = new Map(), routes = [];
        for (const entry of entries) {
            const row = map.get(entry.row), cell = row?.sizes[entry.size];
            if (!cell?.valid || !targets.has(entry.to) || !Number.isSafeInteger(entry.quantity) || entry.quantity <= 0) throw new Error('Dağıtımda geçersiz mağaza, varyant veya adet var.');
            const budgetKey = JSON.stringify([entry.row, entry.size]);
            const used = (budgets.get(budgetKey) || 0) + entry.quantity;
            if (used > cell.stock) throw new Error(`${row.code} / ${entry.size}: Dağıtılan miktar Mamül Depo stoğunu aşıyor.`);
            budgets.set(budgetKey, used);
        }
        const available = new Map((data.products || []).map(p => [p.id, Number(p.stock)]));
        for (const entry of entries) {
            const row = map.get(entry.row), cell = row.sizes[entry.size]; let remaining = entry.quantity;
            for (const id of cell.ids) {
                const quantity = Math.min(remaining, available.get(id));
                if (quantity > 0) { routes.push({ productId: id, from: warehouse, to: entry.to, code: row.code, color: row.color, size: entry.size, quantity }); available.set(id, available.get(id) - quantity); remaining -= quantity; }
                if (!remaining) break;
            }
        }
        return routes;
    }
    function allocate(inventory, targets, quantityPerSize, selectedSize = '') {
        if (!Number.isSafeInteger(quantityPerSize) || quantityPerSize < 1) throw Error('Gönderilecek adet için pozitif bir tam sayı girin.');
        const entries = [];
        const order = ['0', '1', '2', '3', '4', 'ONE', 'ONE SIZE'];
        const rank = size => order.includes(size) ? order.indexOf(size) : order.length;
        const prepared = inventory.map(row => ({ row, sizes: Object.keys(row.sizes).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'tr', { numeric: true })), remaining: new Map(Object.entries(row.sizes).map(([size, cell]) => [size, cell.stock])) }));
        for (const store of targets) for (const { row, sizes, remaining } of prepared) {
            for (const size of sizes) {
                const cell = row.sizes[size];
                if (!cell.valid || (selectedSize && size !== selectedSize)) continue;
                const quantity = Math.min(remaining.get(size), quantityPerSize);
                if (quantity > 0) entries.push({ row: row.key, size, to: store, quantity });
                remaining.set(size, remaining.get(size) - quantity);
            }
        }
        return entries;
    }
    root.WarehouseMatrix = { rows, warehouses, cellKey, plan, attribute, allocate, entryLimit };
})(typeof window !== 'undefined' ? window : globalThis);

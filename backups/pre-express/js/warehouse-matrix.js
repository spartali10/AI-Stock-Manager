(function (root) {
    const norm = value => String(value ?? '').trim().toLocaleLowerCase('tr-TR');
    const text = value => String(value ?? '').trim();
    function attribute(p, field, label) {
        const key = Object.keys(p.attributes || {}).find(k => norm(k) === norm(label));
        const raw = p[field] ?? p.attributes?.[key];
        return Array.isArray(raw) ? (raw.length === 1 ? text(raw[0]) : '') : text(raw);
    }
    function warehouses(data) {
        return (data.stores || []).filter(s => s.isFinishedGoodsWarehouse === true || s.type === 'finished_goods' || /^mam[uü]l\s+depo(?:\s|\(|$)/i.test(s.name));
    }
    function rows(data, warehouse) {
        if (!warehouses(data).some(s => s.name === warehouse)) throw new Error('Yalnızca Mamül Depo seçilebilir.');
        const grouped = new Map();
        for (const p of data.products || []) {
            if (p.store !== warehouse) continue;
            const fabric = attribute(p, 'fabric', 'Kumaş Cinsi') || attribute(p, 'fabricType', 'Kumaş') || 'Tanımsız';
            const color = attribute(p, 'color', 'Renk'), size = attribute(p, 'size', 'Beden');
            const key = JSON.stringify([fabric, text(p.code), color]);
            if (!grouped.has(key)) grouped.set(key, { key, fabric, code: text(p.code), color, sizes: {} });
            const row = grouped.get(key), sizeKey = size || 'Tanımsız';
            if (!Object.hasOwn(row.sizes, sizeKey)) Object.defineProperty(row.sizes, sizeKey, { value: { stock: 0, ids: [], valid: !!p.code && !!color && !!size }, enumerable: true });
            const cell = row.sizes[sizeKey];
            if (!Number.isSafeInteger(Number(p.stock)) || Number(p.stock) < 0) throw new Error('Mamül Depo stoğunda geçersiz adet var. Stok verisini düzeltin.');
            cell.stock += Number(p.stock); cell.ids.push(p.id);
        }
        return [...grouped.values()].sort((a, b) => a.fabric.localeCompare(b.fabric, 'tr') || a.code.localeCompare(b.code, 'tr', { numeric: true }) || a.color.localeCompare(b.color, 'tr'));
    }
    const cellKey = (row, size, store) => JSON.stringify([row, size, store]);
    function plan(data, warehouse, entries) {
        const inventory = rows(data, warehouse), map = new Map(inventory.map(row => [row.key, row]));
        const warehouseNames = new Set(warehouses(data).map(s => s.name));
        const targets = new Set((data.stores || []).filter(s => !warehouseNames.has(s.name)).map(s => s.name));
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
    root.WarehouseMatrix = { rows, warehouses, cellKey, plan, attribute };
})(typeof window !== 'undefined' ? window : globalThis);

(function (root) {
    const norm = value => String(value ?? '').trim().toLocaleLowerCase('tr-TR');
    const color = item => item.color ?? item.attributes?.[Object.keys(item.attributes || {}).find(key => norm(key) === 'renk')] ?? '';
    function build(context, days, today = new Date()) {
        const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
        const date = offset => new Date(end.getTime() - offset * 86400000).toISOString().slice(0, 10);
        const start = date(days - 1), finish = date(0), previousStart = date(days * 2 - 1), previousEnd = date(days);
        const coverage = context.meta?.salesCoverage;
        const covered = (a, b) => Array.isArray(context.sales) && coverage?.start <= a && coverage?.end >= b;
        return root.StockSizeView.group(context.products || []).map(product => {
            const matches = (context.sales || []).filter(s => norm(s.code) === norm(product.code) && norm(s.store) === norm(product.store) && norm(color(s)) === norm(product.color));
            const period = (a, b) => matches.filter(s => s.date >= a && s.date <= b);
            const current = period(start, finish), previous = period(previousStart, previousEnd);
            const valid = records => records.every(s => Number.isSafeInteger(s.quantity) && s.quantity >= 0);
            const sum = records => records.reduce((n, s) => n + s.quantity, 0);
            const sold = covered(start, finish) && valid(current) ? sum(current) : null;
            const prior = covered(previousStart, previousEnd) && valid(previous) ? sum(previous) : null;
            const revenue = sold !== null && current.every(s => typeof s.revenue === 'number' && Number.isFinite(s.revenue) && s.revenue >= 0) ? current.reduce((n, s) => n + s.revenue, 0) : null;
            return { ...product, sold, revenue, trend: sold !== null && prior > 0 ? (sold - prior) / prior * 100 : null, performance: sold !== null && sold + product.stock > 0 ? sold / (sold + product.stock) * 100 : null };
        }).sort((a, b) => (b.sold ?? -1) - (a.sold ?? -1) || String(a.name).localeCompare(String(b.name), 'tr'));
    }
    root.SalesPerformance = { build };
})(typeof window !== 'undefined' ? window : globalThis);

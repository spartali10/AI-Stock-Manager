(() => {
    function empty() {
        return { stats: [{ title: 'Toplam Stok', value: '—', icon: '◇' }, { title: 'Bugünkü Satış', value: '—', icon: '↗' }, { title: 'Düşük Stok', value: '—', icon: '!' }, { title: 'Kritik Stok', value: '—', icon: '⚠' }].map(s => ({ ...s, description: 'Merkezi veritabanı', type: '' })), charts: Object.fromEntries([7, 30, 90].map(n => [n, { total: '—', subtitle: 'Satış verisi bulunamadı', change: '—', labels: [], primary: [], secondary: [] }])), stores: [], activities: [], alerts: [] };
    }
    async function load() {
        const raw = await StockApi.call('getDashboardData', []), data = empty(), fmt = n => Number(n).toLocaleString('tr-TR');
        const today = new Date().toISOString().slice(0, 10);
        [raw.stats.totalStock, raw.sales ? raw.sales.filter(s => s.date === today).reduce((n, s) => n + Number(s.quantity || 0), 0) : null, raw.stats.lowStock, raw.stats.criticalStock].forEach((n, i) => { data.stats[i].value = n == null ? '—' : fmt(n); });
        data.stores = raw.stores.filter(s => !NebimAdapter.isWarehouse(s)).map(s => ({ name: s.name, percent: Math.max(0, Math.min(100, Number(s.percent) || 0)), stock: fmt(raw.products.filter(p => p.store === s.name).reduce((n, p) => n + Number(p.stock), 0)) + ' stok', sales: s.sales == null ? 'Satış verisi yok' : '₺ ' + fmt(s.sales) + ' satış', type: 'normal' }));
        data.activities = raw.transfers.slice(-5).reverse().map(t => ({ icon: '↗', color: 'green', title: t.from + ' → ' + t.to, description: t.product + ' · ' + fmt(t.quantity) + ' adet · ' + t.status, time: t.createdAt ? new Date(t.createdAt).toLocaleDateString('tr-TR') : '—' }));
        data.alerts = raw.notifications.filter(n => !n.read).map(n => ({ icon: '!', title: n.title, description: n.description || '', type: 'yellow' }));
        if (raw.sales) for (const period of [7, 30, 90]) {
            const start = new Date(today); start.setUTCDate(start.getUTCDate() - period + 1);
            const totals = new Map();
            for (const s of raw.sales) if (s.date >= start.toISOString().slice(0, 10) && s.date <= today) totals.set(s.date, (totals.get(s.date) || 0) + Number(s.quantity || 0));
            const labels = [...totals.keys()].sort(), values = labels.map(d => totals.get(d)), max = Math.max(1, ...values);
            data.charts[period] = { total: fmt(values.reduce((a, b) => a + b, 0)) + ' adet', subtitle: 'Kayıtlı satış adedi · Son ' + period + ' gün', change: '—', labels, primary: values.map(v => v / max * 100), secondary: values.map(() => 0) };
        }
        return data;
    }
    window.CentralDashboard = { empty, load };
})();

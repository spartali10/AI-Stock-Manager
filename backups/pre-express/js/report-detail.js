(() => {
    const reports = {
        'Aylık Stok Durum Raporu': { metrics: [['Toplam stok', '97.900'], ['Düşük stok', '342'], ['Kritik stok', '28']], chart: 'Mağazalara göre stok dağılımı', unit: 'adet', labels: ['İstanbul 01', 'Ankara 01', 'İzmir 01', 'Bursa 01', 'İstanbul 02'], values: [24820, 21640, 18420, 15680, 17340], columns: ['Mağaza', 'Mevcut stok', 'Durum'], rows: [['İstanbul 01', '24.820', 'Normal'], ['Ankara 01', '21.640', 'Normal'], ['İzmir 01', '18.420', 'Kontrol gerekli'], ['Bursa 01', '15.680', 'Kontrol gerekli'], ['İstanbul 02', '17.340', 'Normal']], note: 'İzmir ve Bursa mağazalarında düşük stoklu ürünlerin kontrol edilmesi önerilir.' },
        'Aylık Satış Performans Raporu': { metrics: [['Toplam ciro', '₺486.240'], ['Önceki aya göre', '+%18,6'], ['En yüksek ciro', 'İstanbul 01']], chart: 'Mağazalara göre satış', unit: '₺', labels: ['İstanbul 01', 'Ankara 01', 'İzmir 01', 'Bursa 01', 'İstanbul 02'], values: [128400, 104820, 86240, 74520, 92260], columns: ['Mağaza', 'Ciro', 'Ciro payı'], rows: [['İstanbul 01', '₺128.400', '%26,4'], ['Ankara 01', '₺104.820', '%21,6'], ['İzmir 01', '₺86.240', '%17,7'], ['Bursa 01', '₺74.520', '%15,3'], ['İstanbul 02', '₺92.260', '%19,0']], note: 'Örnek dağılımda İstanbul 01 en yüksek satış cirosuna sahip mağazadır.' },
        'Mağaza Performans Raporu': { metrics: [['Mağaza sayısı', '5'], ['Ortalama performans', '%82,4'], ['En yüksek performans', '%94']], chart: 'Stok performansı karşılaştırması', unit: '%', labels: ['İstanbul 01', 'Ankara 01', 'İzmir 01', 'Bursa 01', 'İstanbul 02'], values: [94, 88, 76, 71, 83], columns: ['Mağaza', 'Performans', 'Durum'], rows: [['İstanbul 01', '%94', 'İyi'], ['Ankara 01', '%88', 'İyi'], ['İzmir 01', '%76', 'Takip gerekli'], ['Bursa 01', '%71', 'Takip gerekli'], ['İstanbul 02', '%83', 'İyi']], note: 'Bursa ve İzmir mağazalarının stok süreçleri öncelikli olarak incelenebilir.' },
        'AI Stok Tahmin Raporu': { metrics: [['Tahmin ufku', '7 gün'], ['Tahmini talep', '770 adet'], ['Önerilen ikmal', '425 adet']], chart: 'Ürün bazında tahmini talep', unit: 'adet', labels: ['T-Shirt 1023', 'Pantolon 2045', 'Sweatshirt 3021'], values: [420, 210, 140], columns: ['Ürün', 'Tahmini talep', 'Önerilen ikmal'], rows: [['T-Shirt 1023', '420 adet', '180 adet'], ['Pantolon 2045', '210 adet', '115 adet'], ['Sweatshirt 3021', '140 adet', '130 adet']], note: 'Bu değerler tasarım örneğidir; gerçek bir AI modeli tarafından üretilmiş tahminler değildir.' },
        'Kritik Stok Raporu': { metrics: [['Kritik ürün', '3'], ['Etkilenen mağaza', '3'], ['Asgari ikmal', '117 adet']], chart: 'Ürün bazında asgari stok açığı', unit: 'adet', labels: ['Sweatshirt 3021', 'Pantolon 2045', 'T-Shirt 1023'], values: [62, 5, 50], columns: ['Ürün / Mağaza', 'Stok / Alt sınır', 'İkmal ihtiyacı'], rows: [['Sweatshirt 3021 · İzmir 01', '18 / 80', '62 adet'], ['Pantolon 2045 · Ankara 01', '95 / 100', '5 adet'], ['T-Shirt 1023 · Bursa 01', '70 / 120', '50 adet']], note: 'İkmal ihtiyacı, alt sınır ile mevcut stok arasındaki farkı gösterir. Önce en yüksek açığa sahip ürünü kontrol edin.' },
        'Haftalık Satış Özeti': { metrics: [['Haftalık ciro', '₺112.800'], ['Önceki haftaya göre', '+%12,4'], ['En yüksek gün', 'Pazar']], chart: 'Günlere göre satış cirosu', unit: '₺', labels: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'], values: [12400, 13200, 14800, 13600, 16400, 19800, 22600], columns: ['Gün', 'Ciro', 'Satış adedi'], rows: [['Pazartesi', '₺12.400', '62'], ['Salı', '₺13.200', '66'], ['Çarşamba', '₺14.800', '74'], ['Perşembe', '₺13.600', '68'], ['Cuma', '₺16.400', '82'], ['Cumartesi', '₺19.800', '99'], ['Pazar', '₺22.600', '113']], note: 'Örnek haftada satışların yaklaşık %38’i hafta sonunda gerçekleşmiştir.' }
    };
    const dialog = document.getElementById('reportDetail');
    const get = id => document.getElementById(id);
    let trigger;
    const text = (id, value) => { get(id).textContent = value; };
    const node = (tag, value, className) => {
        const element = document.createElement(tag);
        if (value !== undefined) element.textContent = value;
        if (className) element.className = className;
        return element;
    };
    document.querySelectorAll('.report-open, [data-table-report]').forEach(button => {
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-controls', 'reportDetail');
        button.addEventListener('click', () => {
            const name = button.dataset.report || button.dataset.tableReport;
            const data = reports[name];
            const card = [...document.querySelectorAll('.report-card')].find(item => item.dataset.name === name);
            if (!data || !card) return;
            trigger = button;
            text('rdTitle', name);
            text('rdDescription', card.querySelector('.report-description').textContent.trim());
            text('rdType', card.querySelector('.report-type').textContent.trim());
            const row = button.closest('tr');
            text('rdDate', row ? row.cells[3].textContent.trim() : card.querySelector('.report-date').textContent.trim());
            text('rdPeriod', {month: 'Aylık', week: 'Haftalık', today: 'Günlük'}[card.dataset.period]);
            text('rdChartTitle', data.chart);
            text('rdNote', data.note);
            text('rdSource', row ? 'Kayıt durumu: ' + row.querySelector('.table-status').textContent.trim() + ' · Aşağıdaki içerik örnek veridir.' : 'Tasarım önizlemesi · Örnek veri');
            get('rdMetrics').replaceChildren(...data.metrics.map(([label, value]) => {
                const item = node('div', undefined, 'rd-metric');
                item.append(node('dt', label), node('dd', value));
                return item;
            }));
            const max = data.unit === '%' ? 100 : Math.max(...data.values);
            get('rdChart').replaceChildren(...data.labels.map((label, i) => {
                const bar = node('div', undefined, 'rd-bar');
                const track = node('div', undefined, 'rd-track');
                const fill = node('span');
                fill.style.width = (data.values[i] / max * 100) + '%';
                track.setAttribute('aria-hidden', 'true');
                track.append(fill);
                bar.append(node('span', label), track, node('strong', data.values[i].toLocaleString('tr-TR') + ' ' + data.unit));
                return bar;
            }));
            get('rdColumns').replaceChildren(...data.columns.map(label => { const cell = node('th', label); cell.scope = 'col'; return cell; }));
            get('rdRows').replaceChildren(...data.rows.map(values => { const tr = node('tr'); tr.append(...values.map(value => node('td', value))); return tr; }));
            dialog.showModal();
        });
    });
    ['rdClose', 'rdDone'].forEach(id => get(id).addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => {
        const rect = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => trigger?.focus());
})();

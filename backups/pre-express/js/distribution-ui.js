(() => {
    const get = id => document.getElementById(id);
    const buttons = [...document.querySelectorAll('[data-distribution-mode]')];
    let mode = 'chance', preview = null, config = null, running = false;
    const descriptions = {
        chance: 'Mamül Depo stoğunun tamamını güncel veriden getirir. Kumaş, ürün kodu, renk ve beden filtreleriyle mağazalara yan yana adet girişi yapabilirsiniz. Depo kalanı anlık hesaplanır.',
        sweep: 'Tarih aralığına bakmadan, seçili sezon ve gruplara uyan kaynak stoğunun tamamını baz alır. Hedef seçim sırasıyla sıfır stoklu kod/renk/bedenlere birer adet verir. Kalanı seçtiğiniz depoya çıkarır.',
        winner: 'Seçili tarihlerde kaynakta hiç satılmayan ürünleri, aynı kod/renk/bedende satış yapmış ve stoğu sıfır olan hedeflere satış sırasıyla birer adet dağıtır.'
    };
    function invalidate() { preview = null; get('distApply').disabled = true; get('distPreview').hidden = true; }
    function select(value) {
        mode = value; buttons.forEach(b => { b.classList.toggle('active', b.dataset.distributionMode === mode); b.setAttribute('aria-pressed', String(b.dataset.distributionMode === mode)); });
        get('distDescription').textContent = descriptions[mode];
        get('distMainField').hidden = mode !== 'chance'; get('distRemainder').hidden = mode !== 'sweep';
        get('distSourceStockRule').hidden = mode !== 'winner';
        get('distApply').hidden = mode === 'chance';
        get('distBuild').hidden = mode === 'chance';
        get('chanceMatrix').hidden = mode !== 'chance';
        window.QuickSalesRange.setEnabled(mode !== 'sweep');
        get('distStatus').textContent = ''; invalidate();
    }
    function stores() {
        ['distRemainderStore'].forEach(id => {
            const field = get(id), previous = field.value;
            field.replaceChildren(new Option('Depo seçin', ''), ...[...get('quickFrom').options].map(o => new Option(o.textContent, o.value)));
            field.value = previous;
        });
    }
    buttons.forEach(b => b.addEventListener('click', () => select(b.dataset.distributionMode)));
    ['distMain', 'distSendRemainder', 'distRemainderStore'].forEach(id => get(id).addEventListener('change', () => { invalidate(); get('distRemainderStore').disabled = !get('distSendRemainder').checked; }));
    get('distMinTwoStock').addEventListener('change', invalidate);
    window.addEventListener('distribution-settings-changed', () => { invalidate(); stores(); });
    document.querySelectorAll('[data-sales-period], #quickSalesStart, #quickSalesEnd').forEach(input => {
        input.addEventListener('click', invalidate); input.addEventListener('input', invalidate);
    });
    get('distBuild').addEventListener('click', async () => {
        if (running) return;
        invalidate(); running = true; get('distBuild').disabled = true;
        try {
            config = { ...window.QuickTransferContext.get(), mode, minTwoStock: mode === 'winner' && get('distMinTwoStock').checked, mainWarehouse: get('distMain').value, sendRemainder: mode === 'sweep' && get('distSendRemainder').checked, remainderStore: get('distRemainderStore').value };
            if (mode !== 'sweep' && !config.dateRange) throw new Error('Geçerli bir tarih aralığı seçin.');
            preview = await window.NebimAdapter.previewDistribution(config);
            get('distStatus').textContent = preview.notes.join(' ');
            const rows = mode === 'chance' ? preview.candidates.map(p => [p.code, p.color, p.size, p.store, '—', p.stock, 'Daha önce gönderilmemiş']) : preview.routes.map(r => [r.code, r.color, r.size, r.from, r.to, r.quantity, r.reason]);
            get('distRows').replaceChildren(...rows.map(values => {
                const tr = document.createElement('tr'); values.forEach(value => { const td = document.createElement('td'); td.textContent = value; tr.append(td); }); return tr;
            }));
            get('distCount').textContent = mode === 'chance' ? `${rows.length} ürün varyantı` : `${rows.length} hareket · ${preview.routes.reduce((n, r) => n + r.quantity, 0)} adet`;
            get('distPreview').hidden = false;
            get('distApply').disabled = preview.blocked || !preview.routes.length;
        } catch (error) { get('distStatus').textContent = error.message; }
        finally { running = false; get('distBuild').disabled = false; }
    });
    get('distApply').addEventListener('click', async () => {
        if (running || !preview) return;
        running = true; get('distApply').disabled = true;
        try {
            const current = window.QuickTransferContext.get();
            if (JSON.stringify(current) !== JSON.stringify({ sources: config.sources, targets: config.targets, filters: config.filters, dateRange: config.dateRange })) throw new Error('Seçimler veya tarih değişti. Önizlemeyi yeniden oluşturun.');
            const count = await window.NebimAdapter.applyDistribution(config, preview.token);
            invalidate(); await window.QuickTransferContext.reload();
            get('distStatus').textContent = `${count} stok hareketi uygulandı. Kaynak ve hedef stokları güncellendi.`;
        } catch (error) { invalidate(); get('distStatus').textContent = error.message; }
        finally { running = false; }
    });
    stores(); select('chance');
})();

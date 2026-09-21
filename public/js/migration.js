(() => {
    const get = id => document.getElementById(id);
    const status = text => { get('migrationStatus').textContent = text; };
    let payload, preview, busy = false;
    const download = (data, name) => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const run = fn => async () => {
        if (busy) return; busy = true;
        try { StockAuth.require('admin'); await fn(); } catch (e) { status(e.message); }
        finally { busy = false; }
    };
    function ready() { get('import').disabled = !preview?.canImport || !get('backupSaved').checked; }
    get('exportLegacy').addEventListener('click', run(() => {
        const raw = localStorage.getItem('aiStockNebimData');
        if (!raw) throw Error('Bu tarayıcı/adreste aiStockNebimData bulunamadı. Gerçek verinin bulunduğu eski adresi ve tarayıcıyı kullanın.');
        const notes = {};
        for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key.startsWith('transfer-order-note:')) notes[key.slice(20)] = localStorage.getItem(key); }
        const backup = { version: 2, createdAt: new Date().toISOString(), data: JSON.parse(raw), templates: JSON.parse(localStorage.getItem('aiStockQuickTransferTemplates') || '[]'), notes };
        if (get('includeAccounts').checked) backup.accounts = JSON.parse(localStorage.getItem('aiStockUsers') || '[]');
        download(backup, 'ai-stock-legacy-' + Date.now() + '.json'); status('Eski kayıtlar değiştirilmeden yedek indirildi.');
    }));
    get('exportCentral').addEventListener('click', run(async () => { download(await StockApi.request('/backup'), 'ai-stock-central-' + Date.now() + '.json'); status('Merkezi veri yedeği indirildi. Giriş şifreleri dahil değildir.'); }));
    get('migrationFile').addEventListener('change', () => { payload = preview = null; get('previewResult').textContent = ''; ready(); });
    get('backupSaved').addEventListener('change', ready);
    get('preview').addEventListener('click', run(async () => {
        preview = null; ready();
        const file = get('migrationFile').files[0]; if (!file) throw Error('Bir JSON yedeği seçin.');
        payload = JSON.parse(await file.text());
        preview = await StockApi.request('/migration/preview', { method: 'POST', body: JSON.stringify({ payload }) });
        const c = preview.counts;
        get('previewResult').textContent = `Ürün/beden kaydı: ${c.products}\nMağaza/depo: ${c.stores}\nTransfer: ${c.transfers}\nTransfer emri: ${c.transferTasks}\nEski giriş hesabı: ${c.users}\nToplam stok: ${preview.stock}\nKaynak: ${preview.source}\nSHA-256: ${preview.digest}\n${preview.canImport ? 'Boş merkezi veritabanına aktarılabilir.' : 'Merkezi veritabanı boş değil; üzerine yazma engellendi.'}`;
        ready(); status('Önizleme tamamlandı. Henüz veri kaydedilmedi.');
    }));
    get('import').addEventListener('click', run(async () => {
        if (!preview?.canImport || !get('backupSaved').checked) return;
        get('import').disabled = true;
        const result = await StockApi.request('/migration/import', { method: 'POST', body: JSON.stringify({ payload, digest: preview.digest, revision: preview.revision }) });
        preview = null; ready(); StockApi.changed(); status(`${result.result.counts.products} ürün/beden kaydı merkezi veritabanına aktarıldı. Eski tarayıcı kayıtları korunuyor.`);
    }));
})();

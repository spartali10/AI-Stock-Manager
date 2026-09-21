// Run this file's contents in the console on the OLD app's origin/browser.
// It downloads a backup only. It never sends data or removes/changes storage.
(() => {
    const raw = localStorage.getItem('aiStockNebimData');
    if (!raw) throw Error('Bu tarayıcı ve adreste eski veri bulunamadı.');
    const notes = {};
    for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key.startsWith('transfer-order-note:')) notes[key.slice(20)] = localStorage.getItem(key); }
    const backup = { version: 2, createdAt: new Date().toISOString(), data: JSON.parse(raw), templates: JSON.parse(localStorage.getItem('aiStockQuickTransferTemplates') || '[]'), notes };
    if (confirm('Eski giriş hesapları da yedeklensin mi? Dosya şifre hashleri veya eski şifreleri içerebilir.')) backup.accounts = JSON.parse(localStorage.getItem('aiStockUsers') || '[]');
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'ai-stock-legacy-' + Date.now() + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
})();

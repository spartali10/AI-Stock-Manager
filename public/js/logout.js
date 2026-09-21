(() => {
    const sessionKeys = ['aiStockUser', 'aiStockLoginTime', 'aiStockSessionStartedAt', 'aiStockSessionStart', 'aiStockSessionActive', 'aiStockOnlineStart'];
    document.addEventListener('click', async event => {
        const button = event.target.closest?.('#logoutBtn, [data-action="logout"]');
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!window.confirm('Güvenli çıkış yapmak istediğinize emin misiniz?')) return;
        try { await window.StockAuth.logout(); }
        catch (error) { window.alert('Çıkış tamamlanamadı: ' + error.message); return; }
        // Only session keys are removed; inventory and preferences stay intact.
        for (const storageName of ['localStorage', 'sessionStorage']) {
            try {
                for (const key of sessionKeys) window[storageName].removeItem(key);
            } catch (error) {
                console.warn('Oturum depolamasına erişilemedi:', storageName);
            }
        }
        window.location.replace('/Login');
    }, true);
    // Preserve native button activation without toggling the parent account menu.
    document.addEventListener('keydown', event => {
        if ((event.key === 'Enter' || event.key === ' ') && event.target.closest?.('#logoutBtn, [data-action="logout"]')) event.stopPropagation();
    }, true);
})();

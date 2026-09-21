(() => {
    const form = document.getElementById('loginForm'), error = document.getElementById('error');
    const note = document.querySelector('.demo');
    const showNote = session => { note.textContent = session.setupRequired ? session.setupMessage || 'Merkezi yönetici hesabı henüz kurulmadı. Sunucuda ADMIN_PASSWORD ortam değişkenini tanımlayıp yeniden başlatın. Kullanıcı adı: admin.' : 'Merkezi hesabınızın kullanıcı adı ve şifresiyle giriş yapın.'; };
    if (window.StockSession) showNote(window.StockSession);
    else {
        note.textContent = 'Merkezi sunucu bağlantısı kontrol ediliyor…';
        StockAuth.refresh().then(showNote).catch(e => { note.textContent = 'Merkezi sunucuya ulaşılamadığı için hesap kurulum durumu doğrulanamadı.'; error.textContent = e.message; error.classList.add('show'); });
    }
    form.addEventListener('submit', async event => {
        event.preventDefault(); const button = form.querySelector('button[type="submit"]') || form.querySelector('button');
        if (button.disabled) return; button.disabled = true;
        try { location.replace(await StockAuth.login(document.getElementById('username').value.trim(), document.getElementById('password').value)); }
        catch (e) { error.textContent = e.message; error.classList.add('show'); }
        finally { button.disabled = false; }
    });
})();

(() => {
    const form = document.getElementById('loginForm'), error = document.getElementById('error');
    const note = document.querySelector('.demo');
    note.textContent = StockAuth.isSetup() ? 'Merkezi yönetici hesabı henüz kurulmadı. Sunucuda ADMIN_PASSWORD ortam değişkenini tanımlayıp sunucuyu yeniden başlatın.' : 'Merkezi hesabınızın kullanıcı adı ve şifresiyle giriş yapın.';
    form.addEventListener('submit', async event => {
        event.preventDefault(); const button = form.querySelector('button[type="submit"]') || form.querySelector('button');
        if (button.disabled) return; button.disabled = true;
        try { location.replace(await StockAuth.login(document.getElementById('username').value.trim(), document.getElementById('password').value)); }
        catch (e) { error.textContent = e.message; error.classList.add('show'); }
        finally { button.disabled = false; }
    });
})();

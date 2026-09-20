(() => {
    const form = document.getElementById('loginForm'), error = document.getElementById('error');
    const note = document.querySelector('.demo');
    note.textContent = StockAuth.isSetup() ? 'İlk kurulum: Kullanıcı adı Admin. En az 8 karakterli bir şifre belirleyerek tam yetkili hesabı oluşturun.' : 'Admin veya size atanmış kullanıcı adı ve şifreyle giriş yapın.';
    form.addEventListener('submit', async event => {
        event.preventDefault(); const button = form.querySelector('button[type="submit"]') || form.querySelector('button');
        if (button.disabled) return; button.disabled = true;
        try { location.replace(await StockAuth.login(document.getElementById('username').value.trim(), document.getElementById('password').value)); }
        catch (e) { error.textContent = e.message; error.classList.add('show'); }
        finally { button.disabled = false; }
    });
})();

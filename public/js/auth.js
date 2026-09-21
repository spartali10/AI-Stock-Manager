(() => {
    const pagePermissions = { '/Migration': 'admin', '/Stok': 'stock', '/StokYonetimi': 'stock', '/Magazalar': 'stores', '/SatisAnalizi': 'sales', '/Raporlar': 'reports', '/Transfer': 'transfers', '/TransferEmri': 'transfers', '/AkilliDagitim': 'transfers', '/AiOnerileri': 'ai', '/Bildirimler': 'notifications', '/Kullanicilar': 'admin', '/Ayarlar': 'admin', '/Entegrasyon': 'admin', '/Home': 'dashboard', '/Index': 'dashboard' };
    const roles = { admin: 'Admin', supervisor: 'Yönetici', manager: 'Müdür', editor: 'Operasyon', viewer: 'Görüntüleyici' };

    let session = window.StockSession || { user: null, csrf: '', users: [], setupRequired: true };
    let revision = null, polling = false;
    function current() { return session.user; }
    function can(permission) { const u = current(); return !!u && (u.role === 'admin' || permission !== 'admin' && u.permissions?.includes(permission)); }
    function requirePermission(permission) { if (!can(permission)) throw new Error('Bu işlem için yetkiniz yok.'); }
    function landing() { return Object.keys(pagePermissions).find(page => page !== '/Migration' && can(pagePermissions[page])) || '/ErisimYok'; }
    function changed() { window.dispatchEvent(Object.assign(new Event('stock:data-changed'), { key: 'aiStockNebimData' })); }
    async function request(path, options = {}) {
        const response = await fetch('/api' + path, { ...options, credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Stock-Request': '1', 'X-CSRF-Token': session.csrf || '', ...options.headers } });
        const data = await response.json();
        if (!response.ok) { if (response.status === 401 && !['/login', '/logout'].includes(path)) location.replace('/Login'); throw new Error(data.error || 'Merkezi sunucu isteği başarısız.'); }
        return data;
    }
    async function call(method, args, write = false) {
        if (method === 'replaceProductsFromExcel' && revision === null) throw new Error('Önce güncel stokları yükleyin.');
        const headers = write ? { 'Idempotency-Key': crypto.randomUUID(), ...(method === 'replaceProductsFromExcel' ? { 'If-Match': String(revision) } : {}) } : {};
        const data = await request('/data/' + method, { method: 'POST', headers, body: JSON.stringify({ args }) });
        const newer = revision !== null && data.revision > revision;
        revision = Math.max(revision ?? 0, data.revision);
        if (write || newer) changed();
        return data.result;
    }
    async function refreshSession() { session = { ...session, ...await request('/session') }; guard(); applyUI(); }
    async function login(username, password) { session = { ...session, ...await request('/login', { method: 'POST', body: JSON.stringify({ username, password }) }) }; return landing(); }
    async function usersAction(action, values) { requirePermission('admin'); const data = await request('/users/' + action, { method: 'POST', body: JSON.stringify(values) }); session.users = data.users; }
    function canonicalPage(value) {
        const pathname = value.split(/[?#]/)[0].replace(/\/+$/, '') || '/Home';
        return [...Object.keys(pagePermissions), '/Login', '/ErisimYok'].find(p => p.toLowerCase() === pathname.toLowerCase()) || pathname;
    }
    function guard() {
        const page = canonicalPage(location.pathname);
        if (page === '/Login') return;
        const u = current();
        if (!u || pagePermissions[page] && !can(pagePermissions[page])) {
            document.documentElement.style.visibility = 'hidden';
            location.replace(u ? landing() : '/Login'); return;
        }

    }
    function applyUI() {
        const u = current(); if (!u) return;
        document.documentElement.classList.toggle('auth-stock-readonly', !can('stockWrite'));
        document.documentElement.classList.toggle('auth-not-admin', !can('admin'));
        document.querySelectorAll('a[href]').forEach(a => { const page = canonicalPage(a.getAttribute('href')); if (pagePermissions[page]) a.hidden = !can(pagePermissions[page]); });
        document.querySelectorAll('#userName, #accountName, .user-area .user-name, .user-area .account-name').forEach(n => n.textContent = u.name);
        document.querySelectorAll('.user-area .account-role').forEach(n => n.textContent = roles[u.role]);
        document.querySelectorAll('.user-area .avatar').forEach(n => n.textContent = u.name.slice(0, 1).toLocaleUpperCase('tr-TR'));
    }

    window.StockApi = { request, call, changed };
    window.StockAuth = { login, can, require: requirePermission, current, listUsers: () => { requirePermission('admin'); return session.users; },
        saveUser: (input, id) => usersAction('save', { input, id }), removeUser: id => usersAction('remove', { id }), setPermissions: (id, permissions) => usersAction('permissions', { id, permissions }),
        logout: () => request('/logout', { method: 'POST', body: '{}' }), landing, roles, isSetup: () => session.setupRequired, refresh: refreshSession };
    guard();
    document.addEventListener('DOMContentLoaded', applyUI);
    document.addEventListener('click', event => {
        const target = event.target.closest?.('#addStockBtn, #importBtn, #saveOperationBtn, #detailOperationBtn, [onclick*="openOperationFromRow"]');
        if (target && !can('stockWrite')) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);

    async function poll() {
        if (!current() || document.hidden || polling) return;
        polling = true;
        try {
            const data = await request('/revision');
            if (revision !== null && data.revision > revision) { revision = data.revision; changed(); }
            else if (revision === null) revision = data.revision;
            await refreshSession();
        } catch (error) { console.warn(error.message); }
        finally { polling = false; }
    }
    setInterval(poll, 10000);
    window.addEventListener('focus', poll);
})();

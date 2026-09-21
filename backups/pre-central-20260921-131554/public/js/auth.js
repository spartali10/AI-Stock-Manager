(() => {
    const KEY = 'aiStockUsers';
    const pagePermissions = { '/Stok': 'stock', '/StokYonetimi': 'stock', '/Magazalar': 'stores', '/SatisAnalizi': 'sales', '/Raporlar': 'reports', '/Transfer': 'transfers', '/TransferEmri': 'transfers', '/AkilliDagitim': 'transfers', '/AiOnerileri': 'ai', '/Bildirimler': 'notifications', '/Kullanicilar': 'admin', '/Ayarlar': 'admin', '/Entegrasyon': 'admin', '/Home': 'dashboard', '/Index': 'dashboard' };
    const roles = { admin: 'Admin', supervisor: 'Yönetici', manager: 'Müdür', editor: 'Operasyon', viewer: 'Görüntüleyici' };
    const defaults = { admin: [], supervisor: ['stock', 'stores'], manager: ['stock', 'stores'], editor: ['stock'], viewer: ['stock'] };
    function users() {
        const data = JSON.parse(localStorage.getItem(KEY) || '[]');
        if (!Array.isArray(data)) throw new Error('Kullanıcı kayıtları okunamadı.');
        return data;
    }
    function migrate() {
        const all = users(); let changed = false;
        all.forEach(u => {
            if (String(u.username).toLowerCase() === 'admin' && (u.name !== 'Admin' || u.role !== 'admin')) { u.name = 'Admin'; u.role = 'admin'; changed = true; }
            if (!roles[u.role]) { u.role = u.role === 'Sistem Yöneticisi' ? 'admin' : u.role === 'Yönetici' ? 'supervisor' : 'viewer'; changed = true; }
            if (!Array.isArray(u.permissions)) { u.permissions = [...defaults[u.role]]; changed = true; }
        });
        if (changed) localStorage.setItem(KEY, JSON.stringify(all));
    }
    function current() {
        const session = JSON.parse(localStorage.getItem('aiStockUser') || 'null');
        return session && users().find(u => u.id === session.id && u.username === session.username && u.status === 'active') || null;
    }
    function can(permission) { const u = current(); return !!u && (u.role === 'admin' || permission !== 'admin' && u.permissions?.includes(permission)); }
    function requirePermission(permission) { if (!can(permission)) throw new Error('Bu işlem için yetkiniz yok.'); }
    const clean = u => { const { password, passwordHash, salt, ...safe } = u; return safe; };
    function landing() { return Object.keys(pagePermissions).find(page => can(pagePermissions[page])) || '/ErisimYok'; }
    async function hash(password, salt) {
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
        const bytes = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Uint8Array.from(salt.match(/../g).map(x => parseInt(x, 16))), iterations: 150000, hash: 'SHA-256' }, key, 256);
        return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
    }
    async function credentials(password) {
        if (password.length < 8) throw new Error('Şifre en az 8 karakter olmalı.');
        const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
        return { salt, passwordHash: await hash(password, salt) };
    }
    async function login(username, password) {
        let all = users();
        if (!all.length) {
            if (username.toLowerCase() !== 'admin') throw new Error('İlk kurulumda kullanıcı adı Admin olmalı.');
            const creds = await credentials(password);
            if (users().length) throw new Error('Kurulum başka bir sekmede tamamlandı. Tekrar giriş yapın.');
            all = [{ id: 1, name: 'Admin', username: 'admin', role: 'admin', status: 'active', permissions: [], ...creds }];
            localStorage.setItem(KEY, JSON.stringify(all));
        }
        const u = all.find(u => u.username.toLowerCase() === username.toLowerCase() && u.status === 'active');
        if (!u || !(u.passwordHash ? await hash(password, u.salt) === u.passwordHash : u.password === password)) throw new Error('Kullanıcı adı veya şifre hatalı.');
        const latest = users().find(item => item.id === u.id);
        if (!latest || latest.status !== 'active') throw new Error('Kullanıcı aktif değil.');
        if (!u.passwordHash) {
            const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
            u.salt = salt; u.passwordHash = await hash(password, salt); delete u.password;
            localStorage.setItem(KEY, JSON.stringify(all));
        }
        localStorage.setItem('aiStockUser', JSON.stringify(clean(u)));
        localStorage.setItem('aiStockLoginTime', String(Date.now()));
        return landing();
    }
    async function saveUser(input, id) {
        requirePermission('admin');
        const creds = input.password ? await credentials(input.password) : null;
        requirePermission('admin');
        const all = users(), old = all.find(u => u.id === id);
        if (id && !old) throw new Error('Kullanıcı bulunamadı.');
        const username = input.username.trim();
        if (!username || !input.name.trim() || !roles[input.role] || !['active', 'passive'].includes(input.status)) throw new Error('Kullanıcı bilgilerini kontrol edin.');
        if (all.some(u => u.id !== id && u.username.toLowerCase() === username.toLowerCase())) throw new Error('Bu kullanıcı adı zaten var.');
        if (!old && !creds) throw new Error('Yeni kullanıcı için şifre girin.');
        if (old && (old.username.toLowerCase() === 'admin' || old.id === current().id) && (input.role !== 'admin' || input.status !== 'active' || username.toLowerCase() !== old.username.toLowerCase())) throw new Error('Ana Admin veya kendi yönetici oturumunuz pasifleştirilemez ve yetkisi düşürülemez.');
        const record = { ...old, id: old?.id || Math.max(0, ...all.map(u => u.id)) + 1, name: username.toLowerCase() === 'admin' ? 'Admin' : input.name.trim(), username, email: input.email.trim(), store: input.store, role: input.role, status: input.status, permissions: old?.role === input.role ? old.permissions : [...defaults[input.role]], ...(creds || {}) };
        if (creds) delete record.password;
        localStorage.setItem(KEY, JSON.stringify(old ? all.map(u => u.id === id ? record : u) : [...all, record]));
    }
    function removeUser(id) {
        requirePermission('admin'); const all = users(), u = all.find(u => u.id === id);
        if (!u) throw new Error('Kullanıcı bulunamadı.');
        if (u.username.toLowerCase() === 'admin' || u.id === current().id) throw new Error('Ana Admin ve kendi hesabınız silinemez.');
        localStorage.setItem(KEY, JSON.stringify(all.filter(u => u.id !== id)));
    }
    const known = new Set([...Object.values(pagePermissions), 'stockWrite']);
    function setPermissions(id, permissions) {
        requirePermission('admin'); const all = users(), u = all.find(u => u.id === id);
        if (!u) throw new Error('Kullanıcı bulunamadı.');
        if (u.role === 'admin') throw new Error('Admin tüm yetkilere sahiptir.');
        u.permissions = [...new Set(permissions)].filter(p => known.has(p) && p !== 'admin');
        localStorage.setItem(KEY, JSON.stringify(all));
    }
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
        localStorage.setItem('aiStockUser', JSON.stringify(clean(u)));
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
    window.StockAuth = { login, can, require: requirePermission, current: () => { const u = current(); return u ? clean(u) : null; }, listUsers: () => { requirePermission('admin'); return users().map(clean); }, saveUser, removeUser, setPermissions, landing, roles, isSetup: () => users().length === 0 };
    try { migrate(); guard(); } catch (error) { if (canonicalPage(location.pathname) !== '/Login') { document.documentElement.style.visibility = 'hidden'; location.replace('/Login'); } }
    document.addEventListener('DOMContentLoaded', applyUI);
    document.addEventListener('click', event => {
        const target = event.target.closest?.('#addStockBtn, #importBtn, #saveOperationBtn, #detailOperationBtn, [onclick*="openOperationFromRow"]');
        if (target && !can('stockWrite')) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    window.addEventListener('storage', e => { if (e.key === KEY || e.key === 'aiStockUser') { guard(); applyUI(); } });
})();

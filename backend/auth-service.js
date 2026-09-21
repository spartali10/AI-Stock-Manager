const { randomBytes, pbkdf2Sync, timingSafeEqual, createHash } = require('node:crypto');
const { fail } = require('./state');
const roles = { admin: 'Admin', supervisor: 'Yönetici', manager: 'Müdür', editor: 'Operasyon', viewer: 'Görüntüleyici' };
const defaults = { admin: [], supervisor: ['stock', 'stores'], manager: ['stock', 'stores'], editor: ['stock'], viewer: ['stock'] };
const permissions = new Set(['dashboard', 'stock', 'stockWrite', 'stores', 'sales', 'reports', 'transfers', 'ai', 'notifications']);
const clean = u => u ? Object.fromEntries(Object.entries(u).filter(([k]) => !['password', 'passwordHash', 'salt'].includes(k))) : null;
const can = (u, permission) => !!u && u.status === 'active' && (u.role === 'admin' || permission !== 'admin' && u.permissions?.includes(permission));
function requirePermission(u, permission) { if (!can(u, permission)) fail('Bu işlem için yetkiniz yok.', u ? 403 : 401); }
function credentials(password, minimum = true) {
    if (typeof password !== 'string' || (minimum && password.length < 8) || password.length > 1024) fail('Şifre 8–1024 karakter olmalı.');
    const salt = randomBytes(16).toString('hex');
    return { salt, passwordHash: pbkdf2Sync(password, Buffer.from(salt, 'hex'), 150000, 32, 'sha256').toString('hex') };
}
function verify(password, u) {
    if (!u || typeof password !== 'string' || password.length > 1024 || !/^[a-f0-9]{32}$/i.test(u.salt || '') || !/^[a-f0-9]{64}$/i.test(u.passwordHash || '')) return false;
    const hash = pbkdf2Sync(password, Buffer.from(u.salt, 'hex'), 150000, 32, 'sha256');
    return timingSafeEqual(hash, Buffer.from(u.passwordHash, 'hex'));
}
const sessionHash = token => createHash('sha256').update(token || '').digest('hex');
function current(state, token) {
    const session = state.sessions.find(s => s.hash === sessionHash(token) && s.expires > Date.now());
    const user = session && state.accounts.find(u => u.id === session.userId && u.status === 'active');
    return { user: user || null, session: user ? session : null };
}
function login(state, username, password) {
    const user = state.accounts.find(u => u.username.toLowerCase() === String(username).trim().toLowerCase() && u.status === 'active');
    if (!verify(password, user)) fail('Kullanıcı adı veya şifre hatalı.', 401);
    const token = randomBytes(32).toString('hex'), csrf = randomBytes(24).toString('hex');
    state.sessions = state.sessions.filter(s => s.expires > Date.now());
    state.sessions.push({ hash: sessionHash(token), csrf, userId: user.id, expires: Date.now() + 12 * 60 * 60 * 1000 });
    return { token, csrf, user: clean(user) };
}
function saveUser(state, actor, input, id) {
    requirePermission(actor, 'admin');
    if (!input || typeof input !== 'object') fail('Kullanıcı bilgileri gerekli.');
    const old = state.accounts.find(u => u.id === id), username = String(input.username || '').trim();
    if (id && !old) fail('Kullanıcı bulunamadı.', 404);
    if (!username || !String(input.name || '').trim() || !Object.hasOwn(roles, input.role) || !['active', 'passive'].includes(input.status)) fail('Kullanıcı bilgilerini kontrol edin.');
    if (state.accounts.some(u => u.id !== id && u.username.toLowerCase() === username.toLowerCase())) fail('Bu kullanıcı adı zaten var.');
    if (old && (old.username.toLowerCase() === 'admin' || old.id === actor.id) && (input.role !== 'admin' || input.status !== 'active' || username.toLowerCase() !== old.username.toLowerCase())) fail('Ana Admin veya kendi yönetici hesabınızın yetkisi düşürülemez.');
    const creds = input.password ? credentials(input.password) : null;
    if (!old && !creds) fail('Yeni kullanıcı için şifre girin.');
    const record = { ...old, id: old?.id || Math.max(0, ...state.accounts.map(u => u.id)) + 1, name: username.toLowerCase() === 'admin' ? 'Admin' : String(input.name).trim(), username, email: String(input.email || '').trim(), store: String(input.store || ''), role: input.role, status: input.status, permissions: old?.role === input.role ? old.permissions : [...defaults[input.role]], ...(creds || {}) };
    state.accounts = old ? state.accounts.map(u => u.id === id ? record : u) : [...state.accounts, record];
    if (old && (creds || old.status !== record.status || old.role !== record.role)) state.sessions = state.sessions.filter(s => s.userId !== id);
    return clean(record);
}
function removeUser(state, actor, id) {
    requirePermission(actor, 'admin');
    const user = state.accounts.find(u => u.id === id);
    if (!user) fail('Kullanıcı bulunamadı.', 404);
    if (user.username.toLowerCase() === 'admin' || id === actor.id) fail('Ana Admin ve kendi hesabınız silinemez.');
    state.accounts = state.accounts.filter(u => u.id !== id); state.sessions = state.sessions.filter(s => s.userId !== id);
}
function setPermissions(state, actor, id, values) {
    requirePermission(actor, 'admin');
    const user = state.accounts.find(u => u.id === id);
    if (!user || !Array.isArray(values)) fail('Kullanıcı veya yetkiler geçersiz.');
    if (user.role === 'admin') fail('Admin tüm yetkilere sahiptir.');
    user.permissions = [...new Set(values)].filter(p => permissions.has(p));
}
async function initialize(repo, env) {
    const { result } = await repo.transaction(state => {
        // Check inside the repository lock: concurrent server starts cannot seed twice.
        // Never use the environment password to reset or replace an existing account.
        if (state.accounts.length) return { status: 'existing' };
        if (state.authSetup?.completedAt) return { status: 'recovery-required' };
        if (typeof env.ADMIN_PASSWORD !== 'string' || env.ADMIN_PASSWORD.length < 8 || env.ADMIN_PASSWORD.length > 1024) return { status: 'configuration-required' };
        state.accounts.push({ id: 1, name: 'Admin', username: 'admin', role: 'admin', status: 'active', permissions: [], ...credentials(env.ADMIN_PASSWORD) });
        state.authSetup = { completedAt: new Date().toISOString() };
        return { status: 'created', username: 'admin' };
    }, { reason: 'initial-admin', actor: 'server' });
    return result;
}
function setupMessage(state) {
    return state.authSetup?.completedAt
        ? 'İlk kurulum daha önce tamamlanmış, ancak merkezi kullanıcı kayıtları bulunamıyor. Otomatik Admin oluşturulmadı; sunucu yöneticisi kullanıcı yedeğini kontrol etmeli.'
        : 'Merkezi yönetici hesabı henüz kurulmadı. Sunucuda ADMIN_PASSWORD ortam değişkenine 8–1024 karakterli bir şifre tanımlayıp yeniden başlatın. İlk kullanıcı adı: admin.';
}
function migrateAccounts(records) {
    if (!Array.isArray(records)) fail('Kullanıcı yedeği bir liste olmalı.');
    const names = new Set(), ids = new Set();
    return records.map(input => {
        const u = structuredClone(input), username = String(u.username || '').trim();
        if (!username || names.has(username.toLowerCase()) || !Number.isSafeInteger(u.id) || ids.has(u.id)) fail('Kullanıcı kimlikleri veya adları geçersiz/tekrarlı.');
        names.add(username.toLowerCase()); ids.add(u.id); u.username = username;
        u.role = username.toLowerCase() === 'admin' ? 'admin' : Object.hasOwn(roles, u.role) ? u.role : u.role === 'Sistem Yöneticisi' ? 'admin' : u.role === 'Yönetici' ? 'supervisor' : 'viewer';
        u.permissions = Array.isArray(u.permissions) ? u.permissions.filter(p => permissions.has(p)) : [...defaults[u.role]];
        u.status = u.status === 'active' ? 'active' : 'passive';
        if (!u.passwordHash && typeof u.password === 'string') Object.assign(u, credentials(u.password, false));
        delete u.password;
        if (!/^[a-f0-9]{32}$/i.test(u.salt || '') || !/^[a-f0-9]{64}$/i.test(u.passwordHash || '')) fail(`Kullanıcının şifre kaydı geçersiz: ${username}`);
        if (username.toLowerCase() === 'admin') u.name = 'Admin';
        return u;
    });
}
module.exports = { roles, defaults, clean, can, requirePermission, credentials, verify, current, login, saveUser, removeUser, setPermissions, initialize, setupMessage, migrateAccounts, sessionHash };

const express = require('express');
const { randomUUID } = require('node:crypto');
const auth = require('./auth-service');
const migration = require('./migration');
const { normalizeData, digest, fail } = require('./state');
const createInventory = require('./inventory-service');
require('../public/js/distribution-engine');
require('../public/js/warehouse-matrix');
require('../public/js/stock-size-view');

const reads = {
    getProducts: ['stock', 'stores', 'transfers', 'sales', 'reports', 'dashboard', 'ai'],
    getStores: ['stock', 'stores', 'transfers', 'sales', 'reports', 'dashboard'],
    getRetailStores: ['stock', 'stores', 'transfers', 'sales', 'reports'], getWarehouses: ['stock', 'stores', 'transfers', 'sales', 'reports'],
    getWarehouseMatrixData: ['transfers'], previewDistribution: ['transfers'],
    getTransferTasks: ['transfers'], getTransferOrderContext: ['transfers', 'sales', 'reports'], getTransfers: ['transfers', 'dashboard', 'reports'],
    getNotifications: ['notifications', 'dashboard'], getStats: ['dashboard'], getUsers: ['admin'],
    getTemplates: ['transfers'], getOrderNote: ['transfers'], getDashboardData: ['dashboard']
};
const writes = {
    addProduct: 'stockWrite', updateProduct: 'stockWrite', deleteProduct: 'stockWrite', upsertProductByCode: 'stockWrite', applyStockOperation: 'stockWrite', replaceProductsFromExcel: 'stockWrite',
    addStore: 'admin', transferStock: 'transfers', transferMissingSizes: 'transfers', applyWarehouseMatrix: 'transfers', applyDistribution: 'transfers', deleteTransferTasks: 'transfers', addTransfer: 'transfers', addTransfers: 'transfers',
    addNotification: 'admin', markNotificationRead: 'notifications', saveTemplate: 'transfers', deleteTemplate: 'transfers', saveOrderNote: 'transfers'
};
function cookieToken(req) { return (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('stock_session='))?.slice(14) || ''; }
function safePayload(value) {
    if (!value || typeof value !== 'object') return;
    for (const key of Object.keys(value)) {
        if (['__proto__', 'prototype', 'constructor'].includes(key)) fail('Geçersiz alan adı.');
        safePayload(value[key]);
    }
}
function makeApi(repo, env = process.env) {
    const router = express.Router();
    const ready = auth.initialize(repo, env); ready.catch(() => {});
    router.use(async (req, res, next) => {
        res.set('Cache-Control', 'no-store'); res.set('X-Content-Type-Options', 'nosniff');
        try { await ready; next(); } catch { res.status(503).json({ error: 'Veritabanı hazır değil. Sunucu yapılandırmasını kontrol edin.' }); }
    });
    router.use(express.json({ limit: '50mb' }));
    router.use((req, res, next) => {
        try {
            if (!['GET', 'HEAD'].includes(req.method)) {
                if (req.get('X-Stock-Request') !== '1') fail('İstek doğrulanamadı.', 403);
                const origin = req.get('Origin');
                const expected = env.APP_ORIGIN || `${req.protocol}://${req.get('host')}`;
                if (origin && origin !== expected) fail('İstek kaynağı kabul edilmedi.', 403);
                safePayload(req.body);
            }
            next();
        } catch (error) { next(error); }
    });
    function signed(state, req, permission, csrf = true) {
        const { user, session } = auth.current(state, cookieToken(req));
        if (!user) fail('Oturum açmanız gerekiyor.', 401);
        if (csrf && !['GET', 'HEAD'].includes(req.method) && req.get('X-CSRF-Token') !== session.csrf) fail('Oturum doğrulaması başarısız. Sayfayı yenileyin.', 403);
        if (permission) {
            if (Array.isArray(permission)) { if (!permission.some(p => auth.can(user, p))) fail('Bu işlem için yetkiniz yok.', 403); }
            else auth.requirePermission(user, permission);
        }
        return user;
    }
    router.get('/session.js', async (req, res) => {
        const state = await repo.read(), { user, session } = auth.current(state, cookieToken(req));
        const data = { user: auth.clean(user), csrf: session?.csrf || '', users: auth.can(user, 'admin') ? state.accounts.map(auth.clean) : [], setupRequired: !state.accounts.length };
        res.type('application/javascript').send('window.StockSession=' + JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') + ';');
    });
    router.get('/session', async (req, res) => {
        const state = await repo.read(), { user, session } = auth.current(state, cookieToken(req));
        res.json({ user: auth.clean(user), csrf: session?.csrf || '', users: auth.can(user, 'admin') ? state.accounts.map(auth.clean) : [] });
    });
    const attempts = new Map();
    router.post('/login', async (req, res) => {
        const key = req.ip, now = Date.now();
        for (const [ip, value] of attempts) if (value.until <= now) attempts.delete(ip);
        const attempt = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
        if (++attempt.count > 20) fail('Çok fazla giriş denemesi. Bir süre sonra tekrar deneyin.', 429);
        attempts.set(key, attempt);
        const { result } = await repo.transaction(state => auth.login(state, req.body?.username, req.body?.password), { reason: 'login' });
        attempts.delete(key);
        res.cookie('stock_session', result.token, { httpOnly: true, secure: env.NODE_ENV === 'production' || !!env.RENDER, sameSite: 'strict', maxAge: 12 * 60 * 60 * 1000, path: '/' });
        res.json({ user: result.user, csrf: result.csrf });
    });
    router.post('/logout', async (req, res) => {
        await repo.transaction(state => {
            signed(state, req);
            state.sessions = state.sessions.filter(s => s.hash !== auth.sessionHash(cookieToken(req)));
        }, { reason: 'logout' });
        res.clearCookie('stock_session', { path: '/' }); res.json({ ok: true });
    });
    router.post('/users/:action', async (req, res) => {
        const { result } = await repo.transaction(state => {
            const user = signed(state, req, 'admin'), { input, id, permissions } = req.body || {};
            if (req.params.action === 'save') auth.saveUser(state, user, input, id);
            else if (req.params.action === 'remove') auth.removeUser(state, user, id);
            else if (req.params.action === 'permissions') auth.setPermissions(state, user, id, permissions);
            else fail('İşlem bulunamadı.', 404);
            return state.accounts.map(auth.clean);
        }, { reason: 'user-' + req.params.action });
        res.json({ users: result });
    });
    function service(state, user) {
        return createInventory({ read: () => structuredClone(state.data), write: data => { state.data = normalizeData(data); }, token: () => digest(state.data) }, {
            DistributionEngine: globalThis.DistributionEngine, WarehouseMatrix: globalThis.WarehouseMatrix, StockSizeView: globalThis.StockSizeView,
            StockAuth: { current: () => user, require: permission => auth.requirePermission(user, permission) }, accountCount: state.accounts.length
        });
    }
    async function invoke(state, user, method, args) {
        if (method === 'getDashboardData') return { stats: await service(state, user).getStats(), products: state.data.products, stores: state.data.stores, transfers: state.data.transfers, notifications: state.data.notifications, sales: state.data.sales || null };
        if (method === 'getUsers') return state.accounts.map(auth.clean);
        if (method === 'getTemplates') return state.data.templates;
        if (method === 'getOrderNote') return state.data.notes[String(args[0])] || '';
        if (method === 'saveOrderNote') {
            if (!state.data.transferTasks.some(t => t.id === args[0]) || typeof args[1] !== 'string' || args[1].length > 5000) fail('Emir veya not geçersiz.');
            state.data.notes[String(args[0])] = args[1]; return true;
        }
        if (method === 'deleteTemplate') { state.data.templates = state.data.templates.filter(t => t.id !== args[0]); return true; }
        if (method === 'saveTemplate') {
            const record = args[0];
            if (!record || typeof record.name !== 'string' || !record.name.trim() || !record.config) fail('Şablon geçersiz.');
            if (state.data.templates.some(t => t.id !== record.id && t.name.toLocaleLowerCase('tr-TR') === record.name.toLocaleLowerCase('tr-TR'))) fail('Bu adla bir şablon var.');
            const old = state.data.templates.find(t => t.id === record.id);
            const saved = { id: record.id || randomUUID(), name: record.name, config: record.config, createdAt: old?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
            state.data.templates = old ? state.data.templates.map(t => t.id === old.id ? saved : t) : [...state.data.templates, saved]; return saved;
        }
        if (['addTransfer', 'addTransfers'].includes(method)) {
            const records = method === 'addTransfer' ? [args[0]] : args[0];
            if (!Array.isArray(records) || records.some(t => t.status !== 'Bekliyor')) fail('Tamamlanan transferler stok hareketi API’siyle oluşturulmalı.');
        }
        if (method === 'updateProduct' && (!args[1] || Object.hasOwn(args[1], 'id'))) fail('Ürün kimliği değiştirilemez.');
        try { return await service(state, user)[method](...args); }
        catch (error) { if (!error.status) error.status = 400; throw error; }
    }
    async function readMethod(req, res, method, args) {
        const state = await repo.read(), user = signed(state, req, reads[method]);
        res.json({ result: await invoke(state, user, method, args), revision: state.dataRevision });
    }
    async function writeMethod(req, res, method, args) {
        const requestId = req.get('Idempotency-Key');
        if (!requestId || !/^[\w-]{16,100}$/.test(requestId)) fail('İşlem kimliği gerekli.');
        const response = await repo.transaction(async state => {
            const user = signed(state, req, writes[method]), requestHash = digest({ method, args });
            const previous = state.receipts.find(r => r.id === requestId && r.userId === user.id);
            if (previous) { if (previous.hash !== requestHash) fail('İşlem kimliği farklı içerikle kullanıldı.', 409); return previous.result; }
            if (method === 'replaceProductsFromExcel') {
                if (String(state.dataRevision) !== req.get('If-Match')) fail('Veriler değişti. Sayfayı yenileyip Excel’i tekrar yükleyin.', 409);
                if (!Array.isArray(args[0]) || !args[0].length) fail('Excel ürün listesi boş.');
            }
            const result = await invoke(state, user, method, args);
            state.receipts = state.receipts.filter(r => r.at > Date.now() - 86400000).slice(-999);
            state.receipts.push({ id: requestId, userId: user.id, hash: requestHash, result, at: Date.now() });
            return result;
        }, { reason: method, actor: auth.sessionHash(cookieToken(req)).slice(0, 12) });
        res.json(response);
    }
    router.post('/data/:method', async (req, res) => {
        const { method } = req.params, args = req.body?.args;
        if (!Array.isArray(args) || args.length > 8) fail('İşlem parametreleri geçersiz.');
        if (Object.hasOwn(reads, method)) return readMethod(req, res, method, args);
        if (Object.hasOwn(writes, method)) return writeMethod(req, res, method, args);
        fail('İşlem bulunamadı.', 404);
    });
    for (const [path, method] of Object.entries({ products: 'getProducts', stores: 'getStores', stocks: 'getProducts', transfers: 'getTransfers' })) router.get('/' + path, (req, res) => readMethod(req, res, method, []));
    router.post('/imports/excel', (req, res) => writeMethod(req, res, 'replaceProductsFromExcel', [req.body.products, req.body.fileName]));
    router.get('/revision', async (req, res) => { const state = await repo.read(); signed(state, req); res.json({ revision: state.dataRevision }); });
    router.get('/backup', async (req, res) => {
        const state = await repo.read(); signed(state, req, 'admin');
        res.attachment('ai-stock-central-backup.json').json({ version: 2, createdAt: new Date().toISOString(), revision: state.dataRevision, data: { ...state.data, users: state.data.users.map(auth.clean) } });
    });
    router.get('/backups', async (req, res) => { signed(await repo.read(), req, 'admin'); res.json(await repo.backups()); });
    router.post('/migration/preview', async (req, res) => { const state = await repo.read(); signed(state, req, 'admin'); res.json(migration.preview(state, req.body.payload)); });
    router.post('/migration/import', async (req, res) => {
        const response = await repo.transaction(state => {
            const user = signed(state, req, 'admin');
            return migration.apply(state, req.body.payload, req.body.digest, req.body.revision, user);
        }, { reason: 'legacy-import' });
        res.json(response);
    });
    router.use((req, res) => res.status(404).json({ error: 'API bulunamadı.' }));
    router.use((error, req, res, next) => {
        const status = error.status || 503;
        if (status >= 500) console.error('API hatası:', error.code || error.name);
        res.status(status).json({ error: status >= 500 ? 'Merkezi veri kaydedilemedi. Bağlantıyı kontrol edip veriyi yenileyin.' : error.message });
    });
    return router;
}
module.exports = { makeApi, reads, writes };

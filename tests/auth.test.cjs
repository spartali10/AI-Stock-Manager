const assert = require('node:assert/strict');
const auth = require('../backend/auth-service');
const { emptyState } = require('../backend/state');
let state = emptyState(), user = null;
const db = { get: () => JSON.stringify(state.accounts), set: (key, value) => { state.accounts = auth.migrateAccounts(JSON.parse(value)); } };
const window = {};
const vm = { runInNewContext() { user = null; } };
const script = '', localStorage = {}, webcrypto = {};
const A = {
 isSetup: () => state.accounts.length === 0,
 async login(username, password) { if (!state.accounts.length) { if (username !== 'admin') throw Error('Admin required'); state.accounts.push({ id: 1, username: 'admin', name: 'Admin', role: 'admin', status: 'active', permissions: [], ...auth.credentials(password) }); } const result = auth.login(state, username, password); user = state.accounts.find(u => u.id === result.user.id); return this.landing(); },
 current: () => auth.clean(user), can: permission => auth.can(user, permission), roles: auth.roles,
 listUsers() { auth.requirePermission(user, 'admin'); return state.accounts.map(auth.clean); },
 async saveUser(input,id) { auth.saveUser(state,user,input,id); },
 setPermissions: (id, values) => auth.setPermissions(state,user,id,values),
 removeUser: id => auth.removeUser(state,user,id),
 landing: () => ['dashboard','stock','stores','reports'].find(p=>auth.can(user,p)) ? '/Stok' : '/ErisimYok'
}; window.StockAuth = A;
(async () => {
    assert(A.isSetup());
    await assert.rejects(A.login('admin', 'short'));
    await A.login('admin', 'test-only-password');
    assert.equal(A.current().name, 'Admin'); assert(A.can('admin'));
    assert(!db.get('aiStockUsers').includes('test-only-password'));
    await A.saveUser({ name: 'Reader', email: '', username: 'reader', password: 'reader-password', role: 'viewer', store: 'A', status: 'active' });
    const reader = A.listUsers().find(u => u.username === 'reader');
    assert(!('passwordHash' in reader));
    A.setPermissions(reader.id, ['stock', 'reports', 'admin']);
    await A.login('reader', 'reader-password');
    assert(A.can('reports')); assert(!A.can('admin')); assert(!A.can('transfers'));
    assert.throws(() => A.listUsers());
    await assert.rejects(A.saveUser({ name: 'X', username: 'x' }));
    assert.throws(() => A.removeUser(1));
    await A.login('admin', 'test-only-password');
    assert.throws(() => A.removeUser(1));
    await assert.rejects(A.saveUser({ ...A.current(), role: 'viewer', email: '', password: '' }, 1));
    await assert.rejects(A.saveUser({ name: 'Duplicate', username: 'READER', password: 'test-password', role: 'viewer', status: 'active', email: '' }));
    A.setPermissions(reader.id, []);
    await A.login('reader', 'reader-password'); assert.equal(A.landing(), '/ErisimYok');
    await A.login('admin', 'test-only-password'); A.removeUser(reader.id);
    await assert.rejects(A.login('reader', 'reader-password'));
    // The form's Yönetici role remains limited, including after edits and permission grants.
    await A.saveUser({ name: 'Yönetici', email: '', username: 'supervisor', password: 'manager-password', role: 'supervisor', store: 'A', status: 'active' });
    const supervisor = A.listUsers().find(u => u.username === 'supervisor');
    assert.equal(A.roles[supervisor.role], 'Yönetici');
    await A.login('supervisor', 'manager-password');
    assert.equal(A.current().role, 'supervisor');
    assert(A.can('stock')); assert(A.can('stores')); assert(!A.can('stockWrite')); assert(!A.can('admin'));
    assert.throws(() => A.listUsers()); assert.throws(() => A.setPermissions(supervisor.id, ['admin']));
    await assert.rejects(A.saveUser({ name: 'X', username: 'x', role: 'admin' }));
    await A.login('admin', 'test-only-password');
    A.setPermissions(supervisor.id, ['stock', 'stores', 'reports', 'stockWrite', 'admin']);
    await A.saveUser({ ...supervisor, name: 'Updated', email: '', password: '' }, supervisor.id);
    await A.login('supervisor', 'manager-password');
    assert.equal(A.current().role, 'supervisor'); assert(A.can('reports')); assert(A.can('stockWrite')); assert(!A.can('admin'));
    // Legacy Yönetici labels must not grant Admin, even with a stale admin permission.
    db.set('aiStockUsers', JSON.stringify([{ id: 3, username: 'legacy-manager', name: 'Legacy', role: 'Yönetici', status: 'active', permissions: ['stock', 'admin'], password: 'legacy-manager' }]));
    vm.runInNewContext(script, { window, localStorage, crypto: webcrypto, TextEncoder, location: { pathname: '/Login' }, document: { addEventListener() {} } });
    await window.StockAuth.login('legacy-manager', 'legacy-manager');
    assert.equal(window.StockAuth.current().role, 'supervisor'); assert(!window.StockAuth.can('admin'));
    // Legacy Admin is renamed and its existing password remains usable, then is hashed.
    db.set('aiStockUsers', JSON.stringify([{ id: 1, username: 'admin', name: 'Mehmet Admin', role: 'Sistem Yöneticisi', status: 'active', password: 'legacy' }]));
    vm.runInNewContext(script, { window, localStorage, crypto: webcrypto, TextEncoder, location: { pathname: '/Login' }, document: { addEventListener() {} } });
    await window.StockAuth.login('admin', 'legacy'); assert.equal(window.StockAuth.current().name, 'Admin');
    assert(!JSON.parse(db.get('aiStockUsers'))[0].password);
    console.log('PASS: Admin setup/migration, hashed passwords, login, CRUD, permissions, privilege checks, duplicate names and protected Admin.');
})();

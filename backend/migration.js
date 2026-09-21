const { normalizeData, digest, fail } = require('./state');
const auth = require('./auth-service');
function parse(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('JSON yedeği geçersiz.');
    const raw = payload.data || payload;
    const data = normalizeData(raw);
    delete data.accounts; delete data.sessions;
    if (payload.templates) data.templates = structuredClone(payload.templates);
    if (payload.notes) data.notes = structuredClone(payload.notes);
    // Credential migration is opt-in and server-side; old profile rows in data.users
    // are preserved but never become sign-in accounts automatically.
    return { data: normalizeData(data), accounts: payload.accounts };
}
function preview(state, payload) {
    const { data, accounts } = parse(payload);
    if (accounts) auth.migrateAccounts(accounts);
    return { digest: digest(payload), revision: state.dataRevision, counts: { products: data.products.length, stores: data.stores.length, transfers: data.transfers.length, transferTasks: data.transferTasks.length, users: accounts?.length || 0 }, stock: data.products.reduce((n, p) => n + p.stock, 0), canImport: isEmpty(state.data), source: data.meta.stockSource };
}
function isEmpty(data) { return !['products', 'stores', 'transfers', 'transferTasks', 'sales', 'templates', 'notifications', 'users'].some(key => data[key]?.length) && !Object.keys(data.notes || {}).length; }
function apply(state, payload, expectedDigest, revision, actor) {
    if (digest(payload) !== expectedDigest || state.dataRevision !== revision) fail('Yedek veya merkezi veri değişti. Önizlemeyi yeniden çalıştırın.', 409);
    if (!isEmpty(state.data)) fail('Merkezi veritabanı boş değil. Migration mevcut verinin üzerine yazamaz.', 409);
    const { data, accounts } = parse(payload);
    if (accounts?.length) {
        const imported = auth.migrateAccounts(accounts);
        // Keep the bootstrap admin and its current session. Import only absent names.
        for (const u of imported) {
            if (state.accounts.some(a => a.username.toLowerCase() === u.username.toLowerCase())) continue;
            u.id = Math.max(0, ...state.accounts.map(a => a.id)) + 1; state.accounts.push(u);
        }
    }
    state.data = data;
    state.data.meta.migration = { importedAt: new Date().toISOString(), digest: expectedDigest, actor: actor.username };
    return { imported: true, counts: { products: data.products.length, stores: data.stores.length, transfers: data.transfers.length } };
}
module.exports = { preview, apply, parse };

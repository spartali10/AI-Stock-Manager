const { createHash } = require('node:crypto');
const emptyData = () => ({ products: [], stores: [], users: [], transfers: [], notifications: [], transferTasks: [], templates: [], notes: {}, meta: { stockSource: 'central' } });
const emptyState = () => ({ data: emptyData(), accounts: [], sessions: [], receipts: [], dataRevision: 0 });
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function validateData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Veri nesnesi geçersiz.');
    for (const key of ['products', 'stores', 'users', 'transfers', 'notifications', 'transferTasks', 'templates', 'sales']) {
        if (data[key] !== undefined && !Array.isArray(data[key])) fail(`${key} bir liste olmalı.`);
        if (data[key]?.some(item => !item || typeof item !== 'object' || Array.isArray(item))) fail(`${key}: geçersiz kayıt.`);
    }
    if (!Array.isArray(data.products) || !Array.isArray(data.stores)) fail('products ve stores listeleri zorunlu.');
    for (const key of ['meta', 'notes']) if (data[key] !== undefined && (!data[key] || typeof data[key] !== 'object' || Array.isArray(data[key]))) fail(`${key} bir nesne olmalı.`);
    const ids = new Set();
    for (const p of data.products) {
        if (!Number.isSafeInteger(p.id) || p.id < 1 || ids.has(p.id)) fail('Ürün kimlikleri pozitif ve benzersiz olmalı.');
        ids.add(p.id);
        if (typeof p.code !== 'string' || !p.code.trim() || typeof p.store !== 'string' || !p.store.trim()) fail('Ürün kodu ve mağaza zorunlu.');
        if (!['number', 'string'].includes(typeof p.stock) || String(p.stock).trim() === '' || !Number.isSafeInteger(Number(p.stock))) fail('Stok tam sayı olmalı; negatif Excel stokları korunabilir.');
    }
    for (const s of data.stores) if (typeof s.name !== 'string' || !s.name.trim()) fail('Mağaza adı zorunlu.');
    for (const t of data.transfers || []) if (!Number.isSafeInteger(t.quantity) || t.quantity < 1 || !t.from || !t.to) fail('Transfer miktarı veya depoları geçersiz.');
    for (const template of data.templates || []) if (typeof template.name !== 'string' || !template.name.trim() || !template.config) fail('Şablon kaydı geçersiz.');
    return data;
}
function normalizeData(input) {
    validateData(input);
    const data = { ...emptyData(), ...structuredClone(input), meta: { ...input.meta, stockSource: input.meta?.stockSource || 'migration' } };
    // Preserve old location records; discover every Excel location, including retail stores.
    let nextId = Math.max(0, ...data.stores.map(s => Number(s.id) || 0)) + 1;
    const names = new Set(data.stores.map(s => s.name));
    for (const p of data.products) {
        p.stock = Number(p.stock);
        if (!names.has(p.store)) { data.stores.push({ id: nextId++, name: p.store }); names.add(p.store); }
    }
    return data;
}
module.exports = { emptyData, emptyState, digest, fail, validateData, normalizeData };

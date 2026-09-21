const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { JSDOM, requestInterceptor, CookieJar, VirtualConsole } = require('jsdom');
const { SqliteRepository } = require('../backend/repository');
const { createApp } = require('../server');
test('existing pages initialize against the central API without consuming legacy browser business data', async t => {
    const repository = new SqliteRepository(':memory:');
    await repository.transaction(s => {
        s.data.products = [{ id: 1, code: 'REAL001', name: 'Central Product', store: 'Central Store', color: 'Black', size: '1', stock: 9, capacity: 20, min: 0 }];
        s.data.stores = [{ id: 1, name: 'Central Store' }];
        s.data.notifications = [{ id: 1, title: 'Central notice', description: 'From database', read: false }];
        s.data.transferTasks = [{ id: 1, orderId: 1, quantity: 2, records: [{ from: 'Central Store', to: 'Target', product: 'REAL001', size: '1', quantity: 1 }, { from: 'Central Store', to: 'Target', product: 'REAL001', size: '2', quantity: 1 }] }];
    });
    const app = createApp({ repository, env: { ADMIN_PASSWORD: 'isolated-dom-test-only' } });
    const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
    const base = `http://127.0.0.1:${server.address().port}`;
    t.after(async () => { await new Promise(r => server.close(r)); await repository.close(); });
    const login = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Stock-Request': '1' }, body: JSON.stringify({ username: 'admin', password: 'isolated-dom-test-only' }) });
    const cookieJar = new CookieJar(); cookieJar.setCookieSync(login.headers.get('set-cookie'), base);
    const resources = { interceptors: [requestInterceptor(request => request.url.startsWith(base) ? undefined : new Response('', { status: 200 }))] };
    for (const [route, selector, expected] of [
        ['/Home', '#totalStock', '9'], ['/Index', '#statsContainer', '9'], ['/Stok', '#stockTable', 'REAL001'], ['/StokYonetimi', '#stockTable', 'REAL001'], ['/Magazalar', '#storeGrid', 'Central Store'], ['/Bildirimler', '#notificationList', 'Central notice'], ['/Transfer', '#transferTaskRows', '1'], ['/TransferEmri?id=1', '#groups', 'REAL001'], ['/Kullanicilar', '#usersBody', 'admin'], ['/Migration', 'h1', 'Merkezi veri']
    ]) {
        await t.test(route, async () => {
            const errors = [], pending = new Set();
            const virtualConsole = new VirtualConsole(); virtualConsole.on('jsdomError', e => { if (e.type === 'unhandled-exception') errors.push(e.cause?.stack || e.message); });
            const dom = await JSDOM.fromURL(base + route, { cookieJar, resources, runScripts: 'dangerously', virtualConsole, pretendToBeVisual: true, beforeParse(window) {
                window.structuredClone = structuredClone; window.crypto.randomUUID = randomUUID;
                window.ResizeObserver = class { observe() {} disconnect() {} };
                window.TextEncoder = TextEncoder; window.TextDecoder = TextDecoder;
                window.alert = () => {}; window.confirm = () => false;
                window.localStorage.setItem('aiStockNebimData', '{"products":[{"code":"OLD-DO-NOT-USE"}]}');
                window.localStorage.setItem('aiStockUsers', '[{"username":"old-admin"}]');
                window.fetch = (url, options = {}) => {
                    const promise = fetch(new URL(url, base), { ...options, headers: { ...options.headers, Cookie: cookieJar.getCookieStringSync(base) } });
                    pending.add(promise); promise.finally(() => pending.delete(promise)); return promise;
                };
            } });
            try {
                await new Promise(resolve => dom.window.addEventListener('load', resolve));
                for (let i = 0; i < 100; i++) {
                    if (dom.window.document.querySelector(selector)?.textContent.includes(expected) && !pending.size) break;
                    await new Promise(resolve => setTimeout(resolve, 20));
                }
                assert.deepEqual(errors, [], route);
                assert(dom.window.document.querySelector(selector)?.textContent.includes(expected), route + ': central content missing');
                assert(!dom.window.document.querySelector(selector).textContent.includes('OLD-DO-NOT-USE'));
                assert(dom.window.localStorage.getItem('aiStockNebimData').includes('OLD-DO-NOT-USE'));
                assert(dom.window.localStorage.getItem('aiStockUsers').includes('old-admin'));
                if (route.startsWith('/TransferEmri')) {
                    const doc = dom.window.document;
                    assert.equal(doc.querySelectorAll('#groups tbody tr').length, 2);
                    const toggle = doc.getElementById('special'); toggle.checked = true; toggle.dispatchEvent(new dom.window.Event('change'));
                    assert.equal(doc.querySelectorAll('#groups tbody tr').length, 1);
                    assert([...doc.querySelectorAll('thead th')].some(n => n.textContent === 'ONE SIZE'));
                }
            } finally { dom.window.close(); }
        });
    }
});

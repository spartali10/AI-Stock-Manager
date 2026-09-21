const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
function page(t, response, bootstrap) {
    const dom = new JSDOM(fs.readFileSync(require.resolve('../views/login.html'), 'utf8'), { url: 'http://localhost:3000/Login', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    if (bootstrap) dom.window.StockSession = bootstrap;
    dom.window.fetch = async () => response();
    dom.window.eval(fs.readFileSync(require.resolve('../public/js/auth'), 'utf8'));
    return dom.window;
}
test('legacy text 404 explains stale API instead of exposing a JSON parser error', async t => {
    const w = page(t, () => new Response('Sayfa bulunamadı.', { status: 404, headers: { 'Content-Type': 'text/plain' } }));
    await assert.rejects(w.StockAuth.login('admin', ''), /API’si bulunamadı/);
    assert.equal(w.StockAuth.isSetup(), false);
    w.eval(fs.readFileSync(require.resolve('../public/js/login'), 'utf8'));
    await new Promise(r => setImmediate(r));
    assert.match(w.document.querySelector('.demo').textContent, /durumu doğrulanamadı/);
    assert.match(w.document.getElementById('error').textContent, /yeniden başlat/);
    assert(!w.document.getElementById('error').textContent.includes('Unexpected token'));
});
test('missing bootstrap recovers setup status from the central session endpoint', async t => {
    const w = page(t, () => Response.json({ user: null, users: [], csrf: '', setupRequired: true, setupMessage: 'ADMIN_PASSWORD gerekli.' }));
    w.eval(fs.readFileSync(require.resolve('../public/js/login'), 'utf8'));
    await new Promise(r => setImmediate(r));
    assert.equal(w.StockAuth.isSetup(), true);
    assert.equal(w.document.querySelector('.demo').textContent, 'ADMIN_PASSWORD gerekli.');
});
test('gateway HTML and malformed JSON return clear errors without reflecting raw responses', async t => {
    for (const [response, expected] of [
        [() => new Response('<html>proxy detail</html>', { status: 502, headers: { 'Content-Type': 'text/html' } }), /HTTP 502/],
        [() => new Response('invalid', { status: 200, headers: { 'Content-Type': 'application/json' } }), /geçersiz yanıt/],
        [() => Response.json({ error: 'Kullanıcı adı veya şifre hatalı.' }, { status: 401 }), /Kullanıcı adı veya şifre hatalı/]
    ]) {
        const w = page(t, response, { user: null, users: [], csrf: '', setupRequired: false });
        await assert.rejects(w.StockAuth.login('admin', ''), expected);
    }
});

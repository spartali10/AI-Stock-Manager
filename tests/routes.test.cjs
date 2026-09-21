const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const routes = require('../routes/page-map.json');

function converted(source) {
  for (const [before, after] of Object.entries(require('./helpers/central-copy.json'))) source = source.replaceAll(before, after);
  if (source.includes('<title>Mağazalar')) source = source.replace(/onlineMinutes.textContent =\s*minutes;/g, 'if (onlineMinutes) onlineMinutes.textContent = minutes;').replace(/accountOnlineMinutes.textContent =\s*minutes;/g, 'if (accountOnlineMinutes) accountOnlineMinutes.textContent = minutes;');
  for (const [file, route] of Object.entries(routes)) source = source.replace(new RegExp(`(?<![\\w/-])(?:\\./)?${file.replace('.', '\\.')}`, 'g'), route);
  return source.replace(/((?:src|href)=["'])(?:\.\/)?(css|js)\//g, '$1/$2/').replace('untitled-1.html', 'home')
    // This optional filter now starts unchecked, as requested after migration.
    .replace('id="distMinTwoStock" checked', 'id="distMinTwoStock"');
}
test('backup hashes, all routes, redirects, assets and unchanged rendered markup/code', async () => {
  const manifest = require('../backups/pre-express/manifest.json');
  for (const [file, hash] of Object.entries(manifest)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'backups/pre-express', file))).digest('hex'), hash, file);
  const server = require('../server').listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const checked = new Set();
  try {
    for (const [file, route] of Object.entries(routes)) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, route);
      const html = await response.text();
      assert(!html.includes('<%'), route);
      assert(!/(?:href|src)=["'][^"']*\.html/.test(html), route);
      for (const [, url] of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
        if (!url.startsWith('/') || checked.has(url)) continue;
        checked.add(url);
        const asset = await fetch(base + url);
        assert.equal(asset.status, 200, `${route}: ${url}`);
        if (url.endsWith('.js')) { assert.match(asset.headers.get('content-type'), /javascript/); new vm.Script(await asset.text(), { filename: url }); }
        if (url.endsWith('.css')) assert.match(asset.headers.get('content-type'), /text\/css/);
      }
      let restored = html.replace(/<script src="\/api\/session.js"><\/script>\s*/g, '').replace(/<link rel="stylesheet" href="(\/css\/pages\/[^\"]+)">/g, (_, url) => '<style>' + fs.readFileSync(path.join(root, 'public', url), 'utf8').replace('url(/SatisAnalizi#chartGradient)', 'url(#chartGradient)') + '</style>');
      restored = restored.replace(/<script src="(\/js\/pages\/[^\"]+)"><\/script>/g, (_, url) => '<script>' + fs.readFileSync(path.join(root, 'public', url), 'utf8') + '</script>');
      const normalize = text => text.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n').trimEnd();
      // Stock settings now describe the existing size-series rules. Preserve the
      // migration comparison for all other settings panels and their scripts.
      if (file === 'ayarlar.html') {
        const stockPanel = /(<section class="settings-section" id="stock">\s*)<div class="panel">[\s\S]*?(?=<div class="panel">)/;
        const original = converted(fs.readFileSync(path.join(root, 'backups/pre-express', file), 'utf8'));
        restored = restored.replace(stockPanel, () => original.match(stockPanel)[0]);
        // The API scope help was added after migration; keep comparing the rest of the page.
        assert.match(html, /id="apiKeyScope" aria-describedby="apiReadOnlyNote"/);
        assert.match(html, /<p id="apiReadOnlyNote">[^<]+<\/p>/);
        restored = restored.replace('id="apiKeyScope" aria-describedby="apiReadOnlyNote"', 'id="apiKeyScope"')
          .replace('<option value="read">Yalnızca okuma ve görüntüleme</option>', '<option value="read">Yalnızca okuma</option>')
          .replace(/^ *<p id="apiReadOnlyNote">[^<]+<\/p>\r?\n/m, '');
      }
      // Warehouse details adds these shared assets; the original store markup remains intact.
      if (file === 'magazalar.html') {
        for (const asset of ['/css/warehouse-details.css', '/js/stock-size-view.js', '/js/warehouse-details.js']) assert(html.includes(asset));
        restored = restored.replace(/^    <link rel="stylesheet" href="\/css\/warehouse-details.css">\r?\n/m, '')
          .replace(/^    <script src="\/js\/(?:stock-size-view|warehouse-details)\.js"><\/script>\r?\n/gm, '');
      }
      // Stok has since gained a store selector and a new save handler; its
      // behavior is covered by stock-operation.test.cjs rather than the migration snapshot.
      // Home and sales analysis now use inventory data; stock-status and sales-performance cover calculations.
      if (!['anasayfa.html', 'satis-analizi.html', 'stok.html', 'kullanicilar.html', 'transferler.html', 'index.html', 'stokyonetimi.html', 'bildirimler.html', 'login.html'].includes(file)) { const actual = normalize(restored), expected = normalize(converted(fs.readFileSync(path.join(root, 'backups/pre-express', file), 'utf8'))); let i = 0; while (i < actual.length && actual[i] === expected[i]) i++; assert.equal(actual === expected, true, `${file}: difference at ${i}: ${JSON.stringify(actual.slice(i - 60, i + 120))} vs ${JSON.stringify(expected.slice(i - 60, i + 120))}`); }
      const legacy = await fetch(`${base}/${file}?filter=test`, { redirect: 'manual' });
      assert.equal(legacy.status, 302); assert.equal(legacy.headers.get('location'), `${route}?filter=test`);
      const slash = await fetch(`${base}${route.toLowerCase()}/?x=1`, { redirect: 'manual' });
      assert.equal(slash.headers.get('location'), `${route}?x=1`);
    }
    assert.equal((await fetch(base, { redirect: 'manual' })).headers.get('location'), '/Home');
    for (const url of ['/unknown', '/server.js', '/views/login.html', '/backups/pre-express/login.html', '/package.json']) assert.equal((await fetch(base + url)).status, 404, url);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('new route permission guards and navigation visibility', () => {
  const script = fs.readFileSync(path.join(root, 'public/js/auth.js'), 'utf8');
  const user = { id: 7, username: 'reader', name: 'Reader', role: 'viewer', status: 'active', permissions: ['stock'] };
    function run(pathname, signedIn, role = 'viewer') {
    user.role = role;
    const db = new Map([['aiStockUsers', JSON.stringify([user])], ['aiStockUser', JSON.stringify(signedIn ? user : null)]]);
    const redirects = [], handlers = {}, links = ['/Stok', '/Ayarlar', '/Raporlar'].map(href => ({ hidden: false, getAttribute: () => href }));
    const document = { documentElement: { style: {}, classList: { toggle() {} } }, addEventListener: (name, fn) => { handlers[name] = fn; }, querySelectorAll: selector => selector === 'a[href]' ? links : [] };
    vm.runInNewContext(script, { setInterval() {}, window: { StockSession: { user: signedIn ? user : null, users: [user] }, addEventListener() {} }, localStorage: { getItem: k => db.get(k), setItem: (k, v) => db.set(k, v) }, location: { pathname, replace: url => redirects.push(url) }, document });
    handlers.DOMContentLoaded();
    return { redirects, links };
  }
  assert.deepEqual(run('/Home', false).redirects, ['/Login']);
  assert.deepEqual(run('/Login', false).redirects, []);
  for (const route of ['/Ayarlar', '/ayarlar/', '/Raporlar']) assert.deepEqual(run(route, true).redirects, ['/Stok']);
  const allowed = run('/Stok', true);
  assert.deepEqual(allowed.redirects, []);
  assert.deepEqual(allowed.links.map(a => a.hidden), [false, true, true]);
  for (const role of ['supervisor', 'manager', 'editor', 'viewer']) {
    for (const page of ['/Ayarlar', '/Kullanicilar', '/Entegrasyon']) assert.deepEqual(run(page, true, role).redirects, ['/Stok']);
    assert.equal(run('/Stok', true, role).links[1].hidden, true);
  }
  assert.deepEqual(run('/Ayarlar', true, 'admin').redirects, []);
  assert.equal(run('/Ayarlar', true, 'admin').links[1].hidden, false);
});

test('user form and role filter distinguish Admin from Yönetici', () => {
  const html = fs.readFileSync(path.join(root, 'views/kullanicilar.html'), 'utf8');
  for (const id of ['formRole', 'roleFilter']) {
    const select = html.match(new RegExp(`<select id="${id}"[^>]*>([\\s\\S]*?)</select>`))[1];
    assert.match(select, /<option value="supervisor">\s*Yönetici\s*<\/option>/);
    assert.match(select, /<option value="admin">\s*Admin\s*<\/option>/);
  }
});

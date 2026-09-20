// One-time migration. Refuses to overwrite an existing backup or migrated views.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const routes = {
  'anasayfa.html': '/Home', 'stok.html': '/Stok', 'stokyonetimi.html': '/StokYonetimi',
  'raporlar.html': '/Raporlar', 'magazalar.html': '/Magazalar', 'ayarlar.html': '/Ayarlar',
  'kullanicilar.html': '/Kullanicilar', 'transferler.html': '/Transfer',
  'satis-analizi.html': '/SatisAnalizi', 'ai-onerileri.html': '/AiOnerileri',
  'bildirimler.html': '/Bildirimler', 'entegrasyon.html': '/Entegrasyon',
  'login.html': '/Login', 'erisim-yok.html': '/ErisimYok', 'index.html': '/Index'
};
const backup = 'backups/pre-express';
if (fs.existsSync(backup) || fs.existsSync('views')) throw Error('Migration already started; refusing to overwrite.');
const manifest = {};
function copy(source) {
  if (fs.statSync(source).isDirectory()) { for (const name of fs.readdirSync(source)) copy(`${source}/${name}`); return; }
  const target = `${backup}/${source}`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  manifest[source] = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
}
for (const source of [...Object.keys(routes), 'css', 'js', 'tests', 'docs']) copy(source);
fs.writeFileSync(`${backup}/manifest.json`, JSON.stringify(manifest, null, 2));
for (const dir of ['views/partials', 'public/css/pages', 'public/js/pages', 'routes']) fs.mkdirSync(dir, { recursive: true });
for (const name of ['css', 'js']) {
  for (const file of fs.readdirSync(name)) fs.renameSync(`${name}/${file}`, `public/${name}/${file}`);
}
function convert(text) {
  for (const [file, route] of Object.entries(routes)) text = text.replace(new RegExp(`(?<![\\w/-])(?:\\./)?${file.replace('.', '\\.')}`, 'g'), route);
  return text.replace(/((?:src|href)=["'])(?:\.\/)?(css|js)\//g, '$1/$2/');
}
const pages = {};
for (const file of Object.keys(routes)) {
  let html = convert(fs.readFileSync(file, 'utf8'));
  const stem = file.slice(0, -5); let css = 0, js = 0;
  html = html.replace(/<style>([\s\S]*?)<\/style>/g, (_, body) => {
    const url = `/css/pages/${stem}-${++css}.css`;
    fs.writeFileSync(`public${url}`, body); return `<link rel="stylesheet" href="${url}">`;
  });
  html = html.replace(/<script>([\s\S]*?)<\/script>/g, (_, body) => {
    const url = `/js/pages/${stem}-${++js}.js`;
    fs.writeFileSync(`public${url}`, body); return `<script src="${url}"></script>`;
  });
  fs.renameSync(file, `views/${file}`);
  pages[file] = html;
}
// Deduplicate only byte-identical sidebar markup, including each active state.
const groups = new Map();
for (const [file, html] of Object.entries(pages)) {
  for (const [block] of html.matchAll(/<aside\b[^>]*class="sidebar"[^>]*>[\s\S]*?<\/aside>/g)) {
    if (!groups.has(block)) groups.set(block, []);
    groups.get(block).push(file);
  }
}
let partial = 0;
for (const [block, files] of groups) {
  if (files.length < 2) continue;
  const name = `sidebar-${++partial}.html`;
  fs.writeFileSync(`views/partials/${name}`, block);
  for (const file of files) pages[file] = pages[file].replace(block, `<%- include('partials/${name}') %>`);
}
for (const [file, html] of Object.entries(pages)) fs.writeFileSync(`views/${file}`, html);
for (const file of fs.readdirSync('public/js')) {
  if (!file.endsWith('.js')) continue;
  const target = `public/js/${file}`;
  let source = convert(fs.readFileSync(target, 'utf8'));
  if (file === 'auth.js') {
    source = source.replace("location.pathname.split('/').pop() || '/Index'", "canonicalPage(location.pathname)");
    source = source.replace("a.getAttribute('href').split('#')[0].split('/').pop()", "canonicalPage(a.getAttribute('href'))");
    source = source.replace("!location.pathname.endsWith('/Login')", "canonicalPage(location.pathname) !== '/Login'");
    source = source.replace('    function guard() {', `    function canonicalPage(value) {
        const pathname = value.split(/[?#]/)[0].replace(/\\/+$/, '') || '/Home';
        return [...Object.keys(pagePermissions), '/Login', '/ErisimYok'].find(p => p.toLowerCase() === pathname.toLowerCase()) || pathname;
    }
    function guard() {`);
  }
  fs.writeFileSync(target, source);
}
for (const file of fs.readdirSync('tests')) {
  const target = `tests/${file}`;
  let source = convert(fs.readFileSync(target, 'utf8'));
  source = source.replaceAll('../js/', '../public/js/').replaceAll("'/js/", "'/public/js/").replaceAll("'js/logout.js'", "'public/js/logout.js'");
  if (file === 'logout.test.cjs') source = source.replace('fs.readdirSync(root)', "fs.readdirSync(path.join(root, 'views'))").replace('path.join(root, name)', "path.join(root, 'views', name)");
  fs.writeFileSync(target, source);
}
fs.writeFileSync('routes/page-map.json', JSON.stringify(routes, null, 2) + '\n');
console.log(`Backed up ${Object.keys(manifest).length} files; migrated ${Object.keys(pages).length} pages; ${partial} shared sidebar partials.`);

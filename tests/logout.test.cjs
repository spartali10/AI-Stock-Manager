const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const path = require('path'), root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'public/js/logout.js'), 'utf8');
let pages = 0;
for (const name of fs.readdirSync(path.join(root, 'views')).filter(n => n.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(root, 'views', name), 'utf8');
    if (!html.includes('id="logoutBtn"')) continue;
    assert.equal(html.split('src="/js/logout.js"').length - 1, 1, name);
    assert(html.indexOf('src="/js/logout.js"') < html.indexOf('</head>'), name);
    for (const [, code] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(code);
    pages++;
}
assert.equal(pages, 13);
(async () => {
const events = {}, removed = [], redirects = [];
let confirmation = false, prompts = 0;
const win = {
    StockAuth: { logout: async () => {} },
    confirm: () => { prompts++; return confirmation; },
    localStorage: { removeItem: key => removed.push(key) },
    sessionStorage: { removeItem: key => removed.push(key) },
    location: { replace: url => redirects.push(url) }
};
vm.runInNewContext(script, { document: { addEventListener: (name, fn, capture) => { assert(capture); events[name] = fn; } }, window: win, console: { warn() {} } });
const event = { target: { closest: () => ({}) }, preventDefault() {}, stopImmediatePropagation() {} };
await events.click({ ...event, target: { closest: () => null } }); assert.equal(prompts, 0);
await events.click(event); assert.equal(removed.length, 0); assert.equal(redirects.length, 0);
confirmation = true; await events.click(event);
assert.deepEqual(redirects, ['/Login']);
assert(removed.includes('aiStockUser')); assert(removed.includes('aiStockSessionStart'));
assert(!removed.includes('aiStockNebimData')); assert(!removed.includes('aiStockTheme'));
Object.defineProperty(win, 'localStorage', { get() { throw Error('Storage blocked'); } });
await events.click(event); assert.equal(redirects.length, 2);
let stopped = false;
events.keydown({ target: event.target, key: 'Enter', stopPropagation() { stopped = true; } }); assert(stopped);
console.log('PASS: all 13 pages, cancel, session cleanup, login redirect, storage error and keyboard propagation.');

})();

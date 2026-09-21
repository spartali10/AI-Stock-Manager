const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

async function setup(blocked) {
    class Element {
        constructor(tag) { this.tag = tag; this.children = []; this.events = {}; }
        append(...nodes) { this.children.push(...nodes); }
        replaceChildren(...nodes) { this.children = nodes; }
        setAttribute() {}
        addEventListener(name, callback) { this.events[name] = callback; }
    }
    const elements = new Map(), calls = [];
    const document = {
        getElementById(id) { if (!elements.has(id)) elements.set(id, new Element('div')); return elements.get(id); },
        createElement: tag => new Element(tag), createTextNode: text => ({ textContent: text })
    };
    const window = {
        location: { href: '/Transfer' }, addEventListener() {},
        open(...args) { calls.push(args); return blocked ? null : { focus() { calls.push('focus'); } }; },
        NebimAdapter: { getTransferTasks: async () => [{ id: 1, orderId: 1, quantity: 2, records: [] }] }
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('../public/js/transfer-tasks.js'), 'utf8'), { window, document });
    await new Promise(resolve => setImmediate(resolve));
    const row = document.getElementById('transferTaskRows').children[0];
    await row.children[8].children[0].events.click();
    return { window, document, calls };
}

test('order click opens and focuses a separate named window, preserving task page', async () => {
    const { window, calls } = await setup(false);
    assert.equal(calls[0][0], '/TransferEmri?id=1');
    assert.equal(calls[0][1], 'transfer-order-1');
    assert.match(calls[0][2], /popup=yes/);
    assert.equal(calls[1], 'focus');
    assert.equal(window.location.href, '/Transfer');
});

test('blocked popup exposes an order link without navigating away', async () => {
    const { window, document } = await setup(true);
    const status = document.getElementById('transferTasksStatus');
    assert.match(status.children[0].textContent, /engelledi/);
    assert.equal(status.children[1].href, '/TransferEmri?id=1');
    assert.equal(status.children[1].target, '_blank');
    assert.equal(window.location.href, '/Transfer');
});

test('order route renders and serves its scripts and stylesheet', async () => {
    const server = require('../server').listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    try {
        const base = `http://127.0.0.1:${server.address().port}`;
        const response = await fetch(base + '/TransferEmri?id=1');
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.match(html, /Transfer Edilen Ürünler/);
        for (const [, asset] of html.matchAll(/(?:src|href)="(\/(?:js|css|vendor)\/[^\"]+)"/g)) {
            assert.equal((await fetch(base + asset)).status, 200, asset);
        }
    } finally { await new Promise(resolve => server.close(resolve)); }
});

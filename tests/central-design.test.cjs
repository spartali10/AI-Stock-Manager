const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..'), backup = path.join(root, 'backups/pre-central-20260921-131554');
test('pre-central backup hashes are intact and existing page layout is preserved', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(backup, 'manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
    for (const [file, hash] of Object.entries(manifest)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(backup, file))).digest('hex').toUpperCase(), hash, file);
    const normalize = text => text.replaceAll('\r\n', '\n').replace(/<script\b[^>]*src="[^\"]+"[^>]*><\/script>/g, '').replace(/\s+/g, ' ').trim();
    for (const name of fs.readdirSync(path.join(backup, 'views')).filter(f => f.endsWith('.html'))) {
        let original = fs.readFileSync(path.join(backup, 'views', name), 'utf8');
        for (const [before, after] of Object.entries(require('./helpers/central-copy.json'))) original = original.replaceAll(before, after);
        if (name === 'login.html') original = original.replace(/<div class="demo">[\s\S]*?<\/div>/, '<div class="demo">Merkezi hesabınızla giriş yapın.</div>');
        assert.equal(normalize(fs.readFileSync(path.join(root, 'views', name), 'utf8')), normalize(original), name);
    }
});

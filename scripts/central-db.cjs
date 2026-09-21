// Server-operator tool: credentials come only from environment variables.
const fs = require('node:fs/promises');
const { createRepository } = require('../backend/repository');
const { normalizeData, fail } = require('../backend/state');
async function main() {
    const [command, value, revision] = process.argv.slice(2), repo = createRepository();
    try {
        if (command === 'check') { const s = await repo.read(); console.log(JSON.stringify({ revision: s.dataRevision, products: s.data.products.length, stores: s.data.stores.length, accounts: s.accounts.length })); }
        else if (command === 'backup') {
            if (!value) fail('Yedek dosya yolu gerekli.');
            const state = await repo.read();
            await fs.writeFile(value, JSON.stringify({ version: 2, createdAt: new Date().toISOString(), data: state.data, accounts: state.accounts }, null, 2), { flag: 'wx', mode: 0o600 });
            console.log('Yedek oluşturuldu. Dosya giriş şifre hashleri içerir; güvenli saklayın.');
        } else if (command === 'list-backups') console.log(JSON.stringify(await repo.backups(), null, 2));
        else if (command === 'restore') {
            if (!/^\d+$/.test(value || '') || !/^\d+$/.test(revision || '')) fail('Kullanım: restore YEDEK_ID BEKLENEN_REVIZYON');
            const snapshot = await repo.backup(value); if (!snapshot) fail('Yedek bulunamadı.');
            await repo.transaction(state => {
                if (state.dataRevision !== Number(revision)) fail('Merkezi veri değişti. Restore durduruldu.');
                state.data = normalizeData(snapshot.data);
                // Inventory restore never rolls back account revocations or passwords.
                state.receipts = [];
            }, { reason: 'operator-restore-' + value, actor: 'server-operator' });
            console.log('İş verisi geri yüklendi. Önceki durum ayrıca yedeklendi.');
        } else fail('Komutlar: check | backup DOSYA | list-backups | restore YEDEK_ID BEKLENEN_REVIZYON');
    } finally { await repo.close(); }
}
main().catch(e => { console.error(e.status ? e.message : 'Veritabanı işlemi başarısız. Bağlantı ve dosya yolunu kontrol edin.'); process.exitCode = 1; });

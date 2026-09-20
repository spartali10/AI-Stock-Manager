(() => {
    const KEY = 'aiStockIntegrationSettings';
    const cards = [...document.querySelectorAll('#integration .integration-card')];
    const get = id => document.getElementById(id);
    const names = { nebim: 'Nebim V3', backup: 'Bulut Yedekleme', email: 'E-Posta', api: 'REST API' };
    let active, trigger, working = false, token = '';
    const definitions = {
        nebim: [['endpoint', 'Nebim servis adresi', 'url'], ['database', 'Veritabanı / şirket', 'text'], ['username', 'Servis kullanıcı adı', 'text'], ['interval', 'Senkronizasyon aralığı (dakika)', 'number']],
        backup: [['provider', 'Sağlayıcı', ['S3', 'Azure Blob', 'WebDAV']], ['destination', 'Bucket / container / hedef adresi', 'text'], ['prefix', 'Yedek klasörü', 'text'], ['schedule', 'Yedekleme sıklığı', ['Manuel', 'Günlük', 'Haftalık']], ['retention', 'Saklama süresi (gün)', 'number']],
        email: [['host', 'SMTP sunucusu', 'text'], ['port', 'SMTP portu', 'number'], ['security', 'Bağlantı güvenliği', ['STARTTLS', 'TLS']], ['username', 'SMTP kullanıcı adı', 'text'], ['sender', 'Gönderen e-posta', 'email'], ['recipient', 'Test alıcısı', 'email']],
        api: [['baseUrl', 'Entegrasyon sunucusu adresi', 'url']]
    };
    const defaults = { nebim: { interval: '15' }, backup: { provider: 'S3', schedule: 'Manuel', retention: '30' }, email: { port: '587', security: 'STARTTLS' }, api: {} };
    function admin() { window.StockAuth.require('admin'); }
    function load() { const value = JSON.parse(localStorage.getItem(KEY) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
    function safeUrl(value) {
        const url = new URL(value);
        if (url.username || url.password || url.search || url.hash) throw new Error('Adres kullanıcı bilgisi, sorgu veya # içermemeli.');
        if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('HTTPS adresi kullanın. Yerel geliştirmede localhost HTTP kullanılabilir.');
        return url.href.replace(/\/$/, '');
    }
    const node = (tag, text) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; return el; };
    function status(message) { get('integrationFeedback').textContent = message; }
    function badges() {
        let settings; try { settings = load(); } catch { return; }
        Object.keys(names).forEach((key, i) => {
            const badge = cards[i].querySelector('.connection'); badge.className = 'connection warning';
            badge.textContent = settings[key] ? 'AYAR KAYITLI' : 'AYARLANMADI';
        });
    }
    async function request(path, options = {}) {
        admin(); const base = load().api?.baseUrl;
        if (!base) throw new Error('Önce REST API → API Anahtarları bölümünde entegrasyon sunucusu adresini kaydedin.');
        const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12000);
        try {
            const response = await fetch(safeUrl(base) + path, { ...options, redirect: 'error', credentials: 'omit', signal: controller.signal, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) } });
            if (!response.ok) throw new Error(`Sunucu isteği başarısız (HTTP ${response.status}).`);
            if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Sunucu beklenen JSON yanıtını vermedi.');
            const data = await response.json();
            if (data.ok !== true) throw new Error('Sunucu işlemi doğrulamadı. Bağlantı ve sunucu kayıtlarını kontrol edin.');
            return data;
        } catch (error) {
            if (error.name === 'AbortError') throw new Error('Bağlantı 12 saniye içinde yanıt vermedi.');
            if (error instanceof TypeError) throw new Error('Sunucuya ulaşılamadı. Adres, ağ bağlantısı ve CORS ayarlarını kontrol edin.');
            throw error;
        } finally { clearTimeout(timeout); }
    }
    async function run(task) {
        if (working) return; working = true;
        get('integrationDialog').querySelectorAll('button').forEach(b => { b.disabled = true; });
        try { admin(); await task(); } catch (error) { status(error.message); }
        finally { working = false; get('integrationDialog').querySelectorAll('button').forEach(b => { b.disabled = false; }); }
    }
    function open(kind, button) {
        admin(); active = kind; trigger = button;
        get('integrationTitle').textContent = names[kind] + ' Ayarları';
        get('integrationFields').replaceChildren(); status(''); get('issuedApiKey').textContent = '';
        const values = { ...defaults[kind], ...load()[kind] };
        definitions[kind].forEach(([key, title, type]) => {
            const label = node('label', title); const input = node(Array.isArray(type) ? 'select' : 'input');
            input.name = key; input.id = 'integrationField_' + key; input.required = key !== 'prefix';
            if (Array.isArray(type)) type.forEach(value => input.append(new Option(value, value)));
            else input.type = type;
            if (type === 'number') { input.min = '1'; input.step = '1'; input.max = key === 'port' ? '65535' : key === 'interval' ? '1440' : '3650'; }
            input.value = values[key] || ''; label.append(input); get('integrationFields').append(label);
        });
        get('integrationApiTools').hidden = kind !== 'api'; get('integrationBackupTools').hidden = kind !== 'backup';
        get('integrationTest').textContent = kind === 'email' ? 'Test E-postası Gönder' : kind === 'backup' ? 'Yedek Bağlantısını Test Et' : 'Bağlantıyı Test Et';
        get('integrationSecretNote').textContent = kind === 'api' ? 'Yönetim anahtarı yalnızca bu sayfa açıkken bellekte tutulur. API anahtarlarını sunucu oluşturur ve iptal eder.' : 'Bu form bağlantı tercihlerini kaydeder. Parola ve servis anahtarları entegrasyon sunucusunda tanımlanmalıdır.';
        get('integrationDialog').showModal();
    }
    get('integrationForm').addEventListener('submit', event => {
        event.preventDefault(); run(async () => {
            if (!get('integrationForm').reportValidity()) return;
            const values = {};
            definitions[active].forEach(([key, , type]) => { const input = get('integrationField_' + key); values[key] = input.value.trim(); if (type === 'url') values[key] = safeUrl(values[key]); });
            const settings = load(); if (active === 'api' && settings.api?.baseUrl !== values.baseUrl) { token = ''; get('integrationAdminToken').value = ''; get('apiKeysList').replaceChildren(); get('issuedApiKey').textContent = ''; }
            settings[active] = values; localStorage.setItem(KEY, JSON.stringify(settings)); badges();
            status('Ayarlar bu tarayıcıda kaydedildi. Bağlantı henüz doğrulanmadı. Test işlemi kaydedilen ayarları kullanır.');
        });
    });
    get('integrationTest').addEventListener('click', () => run(async () => {
        const config = load()[active]; if (!config) throw new Error('Önce ayarları kaydedin.');
        if (active === 'email' && !window.confirm(`${config.recipient} adresine gerçek bir test e-postası gönderilsin mi?`)) return;
        status('Bağlantı test ediliyor…');
        const data = await request('/integrations/' + active + '/test', { method: 'POST', body: JSON.stringify({ config }) });
        if (data.service !== active) throw new Error('Sunucu farklı bir servis yanıtı verdi. Test doğrulanamadı.');
        status(active === 'email' ? 'Sunucu test e-postasının gönderildiğini doğruladı.' : 'Sunucu bağlantı testini başarıyla doğruladı.');
    }));
    get('integrationAdminToken').addEventListener('input', event => { token = event.target.value.trim(); });
    get('apiKeysRefresh').addEventListener('click', () => run(async () => {
        const data = await request('/integrations/api-keys');
        if (!Array.isArray(data.keys)) throw new Error('Anahtar listesi yanıtı geçersiz.');
        get('apiKeysList').replaceChildren(...data.keys.map(key => {
            const item = node('li'); item.append(node('span', `${key.name} · ${key.prefix || '••••'} · ${key.revoked ? 'İptal edildi' : 'Aktif'}`));
            if (!key.revoked) {
                const button = node('button', 'İptal Et'); button.type = 'button';
                button.addEventListener('click', () => run(async () => {
                    if (!window.confirm(`${key.name} anahtarı iptal edilsin mi? Bu anahtarı kullanan bağlantılar duracaktır.`)) return;
                    await request('/integrations/api-keys/' + encodeURIComponent(key.id), { method: 'DELETE' });
                    item.replaceChildren(node('span', `${key.name} · İptal edildi`)); status('Anahtar sunucuda iptal edildi.');
                })); item.append(button);
            } return item;
        })); status(data.keys.length ? 'Anahtar listesi güncellendi.' : 'Sunucuda tanımlı API anahtarı yok.');
    }));
    get('apiKeyCreate').addEventListener('click', () => run(async () => {
        const name = get('apiKeyName').value.trim(); if (!name) throw new Error('Anahtar için bir ad girin.');
        const data = await request('/integrations/api-keys', { method: 'POST', body: JSON.stringify({ name, scope: get('apiKeyScope').value }) });
        if (typeof data.key !== 'string' || !data.key) throw new Error('Sunucu anahtar döndürmedi.');
        get('issuedApiKey').textContent = data.key; status('Anahtar sunucuda oluşturuldu. Şimdi kopyalayın; pencere kapanınca ekrandan kaldırılır.');
    }));
    get('backupDownload').addEventListener('click', () => run(async () => {
        const db = JSON.parse(localStorage.getItem('aiStockNebimData') || '{}');
        const data = { version: 1, createdAt: new Date().toISOString(), data: { products: db.products || [], stores: db.stores || [], transfers: db.transfers || [], notifications: db.notifications || [] } };
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        const link = node('a'); link.href = url; link.download = 'ai-stock-yedek-' + new Date().toISOString().slice(0, 10) + '.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        status('Yerel veri yedeği indirildi. Kullanıcılar, şifreler ve servis anahtarları dahil edilmedi.');
    }));
    get('backupRun').addEventListener('click', () => run(async () => {
        const config = load().backup; if (!config) throw new Error('Önce yedekleme ayarlarını kaydedin.');
        const data = await request('/integrations/backup/run', { method: 'POST', body: JSON.stringify({ config }) });
        if (typeof data.jobId !== 'string' || !data.jobId) throw new Error('Sunucu yedekleme iş numarası döndürmedi.');
        status('Yedekleme sunucuda başlatıldı. İş numarası: ' + data.jobId);
    }));
    get('integrationClose').addEventListener('click', () => { if (!working) get('integrationDialog').close(); });
    get('integrationDialog').addEventListener('cancel', event => { if (working) event.preventDefault(); });
    get('integrationDialog').addEventListener('close', () => { get('issuedApiKey').textContent = ''; trigger?.focus(); });
    Object.keys(names).forEach((kind, i) => {
        const buttons = cards[i].querySelectorAll('.integration-actions button');
        buttons.forEach((button, index) => { button.removeAttribute('onclick'); button.addEventListener('click', () => { try { open(kind, button); if (kind === 'nebim' && index === 1) get('integrationTest').click(); } catch (error) { window.showToast?.(error.message); } }); });
    });
    badges();
})();

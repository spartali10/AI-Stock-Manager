(() => {
    const get = id => document.getElementById(id);
    const status = message => { get('transferTemplateStatus').textContent = message; };
    let selectedId = '', templates = [];
    async function reload() { templates = await window.NebimAdapter.getTemplates(); refresh(); }
    function read() {
        const list = templates;
        if (!Array.isArray(list)) throw Error('Şablon kayıtları okunamadı.');
        return list;
    }
    function refresh(id = selectedId) {
        const list = read();
        selectedId = list.some(t => t.id === id) ? id : '';
        get('transferTemplateDelete').disabled = !selectedId;
        get('transferTemplateUpdate').disabled = !selectedId;
        const cards = get('transferTemplateCards'); cards.replaceChildren();
        if (!list.length) { const empty = document.createElement('p'); empty.textContent = 'Henüz kayıtlı şablon yok.'; cards.append(empty); }
        list.forEach(t => {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'transfer-template-card';
            button.setAttribute('aria-pressed', String(t.id === selectedId));
            const name = document.createElement('strong'); name.textContent = t.name;
            const mode = document.createElement('span'); mode.textContent = { chance: 'Şans Verelim', sweep: 'Sil Süpür', winner: 'Çalışan Kazanır' }[t.config?.distribution?.mode || 'chance'];
            button.append(name, mode);
            button.addEventListener('click', safe(() => {
                if (selectedId === t.id) {
                    window.QuickTransferContext.restore({ sources: [], targets: [], filters: [] });
                    window.QuickSalesRange.clear();
                    refresh('');
                    status('Şablon seçimi kaldırıldı. Hızlı Transfer seçimleri temizlendi.');
                } else {
                    loadTemplate(t.id);
                    refresh(t.id);
                }
                cards.children[list.indexOf(t)]?.focus();
            }));
            cards.append(button);
        });
    }
    const safe = fn => async () => { try { await fn(); } catch (error) { status(error.message); } };
    async function saveTemplate(update = false) {
        const name = get('transferTemplateName').value.trim();
        if (!name) throw Error('Şablon adı girin.');
        const config = window.QuickTransferContext.get();
        config.distribution = { mode: window.DistributionMode.get(), minimumQuantity: Number(get('distMinimumQuantity').value), sendAllStock: get('distSendAllStock').checked, minTwoStock: get('distMinTwoStock').checked, sendRemainder: get('distSendRemainder').checked, remainderStore: get('distRemainderStore').value };
        if (!config.distribution.sendAllStock && (!Number.isSafeInteger(config.distribution.minimumQuantity) || config.distribution.minimumQuantity < 1)) throw Error('Minimum transfer adedi pozitif tam sayı olmalıdır.');
        if (config.distribution.mode !== 'sweep' && !config.dateRange) throw Error('Geçerli bir tarih aralığı seçin.');
        if (!config.sources.length || !config.targets.length) throw Error('Kaynak ve hedef mağazaları seçin.');
        const list = read();
        const existing = update ? list.find(t => t.id === selectedId) : null;
        if (update && !existing) throw Error('Güncellenecek şablon kartını seçin.');
        if (list.some(t => t.id !== existing?.id && t.name.trim().toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR'))) throw Error('Bu adla bir şablon var. Mevcut kartı seçip Seçili Şablonu Güncelle düğmesini kullanın veya farklı ad girin.');
        const record = { ...(existing || { id: crypto.randomUUID(), createdAt: new Date().toISOString() }), name, config, updatedAt: new Date().toISOString() };
        await window.NebimAdapter.saveTemplate(record); templates = await window.NebimAdapter.getTemplates(); refresh(record.id);
        status(`${name} ${update ? 'güncellendi' : 'kaydedildi'}.`);
    }
    get('transferTemplateSave').addEventListener('click', safe(() => saveTemplate()));
    get('transferTemplateUpdate').addEventListener('click', safe(() => saveTemplate(true)));
    function loadTemplate(id) {
        const template = read().find(t => t.id === id);
        if (!template) throw Error('Şablon seçin.');
        const c = template.config, mode = c?.distribution?.mode || 'chance';
        const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
        if (!c || !['chance', 'sweep', 'winner'].includes(mode) || ![c.sources, c.targets].every(a => Array.isArray(a) && a.every(v => typeof v === 'string')) || !Array.isArray(c.filters) || c.filters.some(f => !f || !['hierarchy', 'attributes'].includes(f.type) || typeof f.key !== 'string' || !Array.isArray(f.selected) || f.selected.some(v => typeof v !== 'string')) || (mode !== 'sweep' && (!validDate(c.dateRange?.start) || !validDate(c.dateRange?.end) || c.dateRange.start > c.dateRange.end))) throw Error('Şablon verileri geçersiz.');
        const restored = window.QuickTransferContext.restore(c);
        window.DistributionMode.select(mode);
        if (mode !== 'sweep') window.QuickSalesRange.restore(c.dateRange);
        get('transferTemplateName').value = template.name;
        get('distMinimumQuantity').value = c.distribution?.minimumQuantity ?? 1;
        get('distSendAllStock').checked = c.distribution?.sendAllStock === true;
        get('distMinimumQuantity').disabled = get('distSendAllStock').checked;
        get('distMinTwoStock').checked = c.distribution?.minTwoStock === true;
        get('distSendRemainder').checked = c.distribution?.sendRemainder === true;
        get('distRemainderStore').value = c.distribution?.remainderStore || '';
        get('distRemainderStore').disabled = !get('distSendRemainder').checked;
        status(`${template.name} yüklendi. Adı veya transfer ayarlarını değiştirip Seçili Şablonu Güncelle ile kaydedebilirsiniz.`);
        if (restored?.missingStores.length) status(`${template.name} mevcut mağazalarla yüklendi. Listede bulunmadığı için seçilemeyen mağazalar: ${restored.missingStores.join(', ')}. Kaynak ve hedef seçimlerini kontrol edin; kayıtlı şablon güncellemedikçe değişmez.`);
    }
    get('transferTemplateDelete').addEventListener('click', safe(async () => {
        const list = read(), id = selectedId, record = list.find(t => t.id === id);
        if (!record || !confirm(`“${record.name}” şablonunu silmek istiyor musunuz?`)) return;
        await window.NebimAdapter.deleteTemplate(id); templates = await window.NebimAdapter.getTemplates(); refresh(''); status('Şablon silindi.');
    }));
    window.TransferTemplates = { selected: () => read().find(t => t.id === selectedId) || null };
    window.addEventListener('stock:data-changed', safe(reload));
    safe(reload)();
})();

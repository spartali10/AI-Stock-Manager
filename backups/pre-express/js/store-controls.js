(() => {
    const get = id => document.getElementById(id);
    const grid = get('storeGrid');
    const dialog = get('newStoreDialog');
    const form = get('newStoreForm');
    const template = grid.querySelector('.store-card').cloneNode(true);
    const normalize = value => value.trim().toLocaleLowerCase('tr-TR');
    let pending = false;

    // Match Turkish names with or without Turkish keyboard characters.
    const searchText = value => normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/\s+/g, ' ');
    function filterStores() {
        const terms = searchText(get('storeSearch').value).split(' ').filter(Boolean);
        const city = get('cityFilter').value;
        const status = get('statusFilter').value;
        const cards = [...grid.querySelectorAll('.store-card')];
        let visible = 0;
        cards.forEach(card => {
            const haystack = searchText(card.dataset.name + ' ' + card.querySelector('.store-location').textContent);
            const matches = terms.every(term => haystack.includes(term)) &&
                (city === 'all' || card.dataset.city === city) &&
                (status === 'all' || card.dataset.status === status);
            card.style.display = matches ? '' : 'none';
            if (matches) visible++;
        });
        get('emptyState').style.display = visible ? 'none' : 'block';
        get('storeFilterCount').textContent = cards.length + ' mağazadan ' + visible + ' tanesi gösteriliyor';
        get('clearStoreFilters').disabled = !terms.length && city === 'all' && status === 'all';
    }
    get('storeSearch').addEventListener('input', filterStores);
    get('cityFilter').addEventListener('change', filterStores);
    get('statusFilter').addEventListener('change', filterStores);
    get('clearStoreFilters').addEventListener('click', () => {
        get('storeSearch').value = '';
        get('cityFilter').value = 'all';
        get('statusFilter').value = 'all';
        filterStores();
        get('storeSearch').focus();
    });
    get('globalSearch').addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        get('storeSearch').value = get('globalSearch').value;
        filterStores();
    });
    filterStores();

    function setView(view) {
        const list = view === 'list';
        grid.classList.toggle('list-view', list);
        [['gridView', !list], ['listView', list]].forEach(([id, active]) => {
            get(id).classList.toggle('active', active);
            get(id).setAttribute('aria-pressed', String(active));
        });
    }
    get('gridView').addEventListener('click', () => setView('grid'));
    get('listView').addEventListener('click', () => setView('list'));

    function updateCounts() {
        const cards = [...grid.querySelectorAll('.store-card')];
        get('totalStoreCount').textContent = cards.length;
        get('totalStoreCount').nextElementSibling.textContent = '● ' + cards.filter(card => card.dataset.status === 'online').length + ' mağaza aktif';
    }
    function renderStore(store) {
        if ([...grid.querySelectorAll('.store-card')].some(card => normalize(card.dataset.name) === normalize(store.name))) return;
        const card = template.cloneNode(true);
        card.dataset.name = store.name;
        card.dataset.city = store.city;
        card.dataset.status = 'online';
        card.style.display = '';
        card.querySelector('.store-name').textContent = store.name;
        card.querySelector('.store-location').textContent = store.cityLabel + ' • ' + store.district;
        card.querySelector('.status').textContent = 'AKTİF';
        card.querySelector('.status').className = 'status online';
        card.querySelector('.performance-value').textContent = '%0';
        card.querySelector('.progress-bar').style.width = '0%';
        card.querySelectorAll('.metric-value').forEach((item, index) => { item.textContent = index === 1 ? '₺0' : '0'; });
        card.querySelector('.last-sync').textContent = 'Yeni mağaza • Henüz senkronize edilmedi';
        const detail = card.querySelector('.detail-btn');
        detail.dataset.store = store.name;
        detail.setAttribute('aria-haspopup', 'dialog');
        detail.setAttribute('aria-controls', 'storeDetailDialog');
        grid.append(card);
    }
    get('newStoreBtn').setAttribute('aria-haspopup', 'dialog');
    get('newStoreBtn').setAttribute('aria-controls', 'newStoreDialog');
    get('newStoreBtn').addEventListener('click', () => {
        form.reset();
        get('newStoreError').textContent = '';
        dialog.showModal();
    });
    ['newStoreClose', 'newStoreCancel'].forEach(id => get(id).addEventListener('click', () => { if (!pending) dialog.close(); }));
    dialog.addEventListener('cancel', event => { if (pending) event.preventDefault(); });
    dialog.addEventListener('close', () => get('newStoreBtn').focus());
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (pending || !form.reportValidity()) return;
        const name = get('newStoreName').value.trim();
        const district = get('newStoreDistrict').value.trim();
        const city = get('newStoreCity');
        get('newStoreError').textContent = '';
        if (!name || !district) { get('newStoreError').textContent = 'Mağaza adı ve ilçe boş bırakılamaz.'; return; }
        if ([...grid.querySelectorAll('.store-card')].some(card => normalize(card.dataset.name) === normalize(name))) {
            get('newStoreError').textContent = 'Bu isimde bir mağaza zaten var.'; return;
        }
        pending = true;
        get('newStoreSave').disabled = true;
        get('newStoreSave').textContent = 'Kaydediliyor…';
        try {
            const store = await window.NebimAdapter.addStore({ name, city: city.value, cityLabel: city.selectedOptions[0].textContent, district, stock: 0, sales: 0, percent: 0 });
            renderStore(store);
            get('storeSearch').value = '';
            get('cityFilter').value = 'all';
            get('statusFilter').value = 'all';
            filterStores();
            updateCounts();
            dialog.close();
            const toast = get('toast');
            toast.textContent = name + ' eklendi.';
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        } catch (error) {
            get('newStoreError').textContent = 'Mağaza kaydedilemedi. Tarayıcı depolama iznini kontrol edip tekrar deneyin.';
            console.warn('Mağaza eklenemedi.', error);
        } finally {
            pending = false;
            get('newStoreSave').disabled = false;
            get('newStoreSave').textContent = 'Mağazayı Ekle';
        }
    });
    async function loadStores() {
        try {
            const stores = await window.NebimAdapter.getStores();
            stores.filter(store => store.userCreated).forEach(renderStore);
        } catch (error) {
            console.warn('Kaydedilen mağazalar yüklenemedi.', error);
        }
        updateCounts();
        filterStores();
    }
    loadStores();
})();

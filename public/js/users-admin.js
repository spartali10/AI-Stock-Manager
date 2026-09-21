(() => {
    if (!window.StockAuth.can('admin')) return;
    const get = id => document.getElementById(id), A = window.StockAuth;
    let editingId = null, deletingId = null, permissionId = null, saving = false;
    const permissions = { dashboard: 'Ana sayfa ve özetler', stock: 'Stok görüntüleme', stockWrite: 'Stok ekleme / değiştirme / silme', stores: 'Mağazalar', sales: 'Satış analizi', reports: 'Raporlar', transfers: 'Transfer ve dağıtım işlemleri', ai: 'AI önerileri', notifications: 'Bildirimler' };
    const node = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
    function render() {
        const rows = A.listUsers().map(u => {
            const tr = node('tr'); Object.assign(tr.dataset, { id: u.id, name: u.name, email: u.email || u.username, role: u.role, status: u.status });
            const name = node('td'), cell = node('div', undefined, 'user-cell'), avatar = node('div', u.name[0], 'user-avatar'), info = node('div');
            info.append(node('div', u.name, 'user-name'), node('div', u.username + (u.email ? ' · ' + u.email : ''), 'user-email')); cell.append(avatar, info); name.append(cell);
            const role = node('td'); role.append(node('span', A.roles[u.role], 'role ' + u.role));
            const status = node('td'); status.append(node('span', u.status === 'active' ? 'Aktif' : 'Pasif', 'status ' + u.status));
            const actions = node('td'), group = node('div', undefined, 'action-group');
            [['✎', 'Düzenle', () => edit(u)], ['🔐', 'Yetkilendir', () => permissionsFor(u)], ['×', 'Sil', () => { deletingId = u.id; get('deleteUserName').textContent = u.name; openModal('deleteModal'); }]].forEach(([symbol, title, action]) => {
                const b = node('button', symbol, 'action-btn'); b.type = 'button'; b.title = title; b.setAttribute('aria-label', u.name + ' ' + title);
                b.disabled = title === 'Sil' && (u.username.toLowerCase() === 'admin' || u.id === A.current().id);
                b.addEventListener('click', action); group.append(b);
            });
            actions.append(group); tr.append(name, role, node('td', u.store || 'Merkez Ofis'), status, node('td', '—'), actions); return tr;
        });
        get('usersBody').replaceChildren(...rows); updateStatistics(); filterUsers();
        document.querySelectorAll('#roleSummary [data-role-count]').forEach(el => {
            el.textContent = rows.filter(row => row.dataset.role === el.dataset.roleCount).length;
        });
    }
    function edit(u) {
        A.require('admin'); editingId = u?.id || null;
        get('userModalTitle').textContent = u ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle';
        for (const [id, value] of Object.entries({ formName: u?.name || '', formEmail: u?.email || '', formUsername: u?.username || '', formRole: u?.role || 'viewer', formStore: u?.store || 'Merkez Ofis', formStatus: u?.status || 'active', formPassword: '' })) get(id).value = value;
        get('passwordGroup').style.display = 'flex';
        get('formPassword').placeholder = u ? 'Değişmeyecekse boş bırakın' : 'En az 8 karakter';
        openModal('userModal');
    }
    function permissionsFor(u) {
        permissionId = u.id; get('permissionUserName').textContent = u.name + ' — Yetki Ayarları';
        const box = document.querySelector('#permissionModal .permission-grid');
        box.replaceChildren(...Object.entries(permissions).map(([key, label]) => {
            const item = node('label', undefined, 'permission-box'), input = node('input'); input.type = 'checkbox'; input.value = key; input.checked = u.role === 'admin' || u.permissions.includes(key); input.disabled = u.role === 'admin';
            item.append(input, node('strong', label)); return item;
        }));
        openModal('permissionModal');
    }
    get('addUserBtn').addEventListener('click', () => edit(null));
    get('permissionBtn').addEventListener('click', () => showToast('Yetki atamak için kullanıcının yanındaki kilit butonunu seçin.'));
    window.saveUser = async () => {
        if (saving) return; saving = true;
        try {
            await A.saveUser({ name: get('formName').value, email: get('formEmail').value, username: get('formUsername').value, role: get('formRole').value, store: get('formStore').value, status: get('formStatus').value, password: get('formPassword').value }, editingId);
            closeModal('userModal'); render(); showToast('Kullanıcı kaydedildi.');
        } catch (error) { showToast(error.message); } finally { saving = false; }
    };
    window.savePermissions = async () => {
        try { await A.setPermissions(permissionId, [...document.querySelectorAll('#permissionModal input:checked')].map(n => n.value)); closeModal('permissionModal'); render(); showToast('Yetkiler kaydedildi.'); } catch (e) { showToast(e.message); }
    };
    window.confirmDelete = async () => {
        try { await A.removeUser(deletingId); closeModal('deleteModal'); render(); showToast('Kullanıcı silindi.'); } catch (e) { showToast(e.message); }
    };
    render();
})();

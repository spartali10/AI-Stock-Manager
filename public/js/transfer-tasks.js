(() => {
    const get = id => document.getElementById(id);
    const el = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; };
    const date = value => value ? new Date(value).toLocaleString('tr-TR') : '—';
    let tasks = [], selectedId = null;
    function openOrder(task) {
        const url = `/TransferEmri?id=${encodeURIComponent(task.id)}`;
        const popup = window.open(url, `transfer-order-${task.id}`, 'popup=yes,width=1440,height=900,resizable=yes,scrollbars=yes');
        if (popup) {
            popup.focus();
            get('transferTasksStatus').replaceChildren();
        } else {
            const link = el('a', 'Emri yeni pencerede aç');
            link.href = url; link.target = '_blank'; link.rel = 'noopener';
            get('transferTasksStatus').replaceChildren(document.createTextNode('Tarayıcı pencereyi engelledi. Bu site için açılır pencerelere izin verin veya bağlantıyı kullanın: '), link);
        }
    }
    function action(text, fn, cls) {
        const button = el('button', text, cls); button.type = 'button';
        button.addEventListener('click', async () => {
            button.disabled = true;
            try { await fn(); } catch (error) { get('transferTasksStatus').textContent = error.message; }
            finally { button.disabled = false; }
        });
        return button;
    }
    function showOrder(task, focus = true) {
        selectedId = task.id;
        get('taskOrderTitle').textContent = `${task.orderId} nolu Emir · ${task.quantity} adet`;
        get('taskOrderRows').replaceChildren(...task.records.map(record => {
            const tr = el('tr');
            [record.product, record.productName || record.product, record.color || '—', record.size || '—', record.from, record.to, record.quantity].forEach(value => tr.append(el('td', value)));
            return tr;
        }));
        get('taskOrderDetail').hidden = false;
        if (focus) get('taskOrderTitle').focus();
    }
    async function remove(ids) {
        if (!confirm(`${ids.length} görev kaydı silinsin mi? Stoklar ve gerçekleşen transferler korunur.`)) return;
        await window.NebimAdapter.deleteTransferTasks(ids);
        await refresh();
        get('transferTasksStatus').textContent = `${ids.length} görev kaydı silindi.`;
    }
    async function refresh() {
        try {
            tasks = (await window.NebimAdapter.getTransferTasks()).sort((a, b) => b.id - a.id);
            get('transferTaskRows').replaceChildren(...tasks.map(task => {
                const tr = el('tr');
                [task.id, task.templateName, task.user].forEach(value => tr.append(el('td', value)));
                const status = el('td'); status.append(el('span', task.status, 'task-status')); tr.append(status);
                [date(task.startedAt), date(task.finishedAt)].forEach(value => tr.append(el('td', value)));
                const progressCell = el('td'), progress = el('progress'); progress.max = 100; progress.value = Number(task.progress) || 0;
                if (task.status === 'Emir hazır · Gönderilmedi') progressCell.title = 'Emir hazırlığı tamamlandı. Bu yüzde ürünlerin gönderildiği anlamına gelmez.';
                progress.setAttribute('aria-label', `${task.id} nolu görevin ilerlemesi`);
                progressCell.append(progress, el('span', `${task.progress}%`, 'task-percent')); tr.append(progressCell, el('td', task.lastMessage));
                const order = el('td'); order.append(action(`${task.orderId} nolu Emir = ${task.quantity} adet`, () => openOrder(task), 'task-order-link')); tr.append(order);
                const deletion = el('td'), button = action('Sil', () => remove([task.id]), 'task-danger');
                button.setAttribute('aria-label', `${task.id} nolu görevi sil`); deletion.append(button); tr.append(deletion);
                return tr;
            }));
            get('transferTasksEmpty').hidden = tasks.length > 0;
            get('taskExportAll').disabled = get('taskDeleteAll').disabled = !tasks.length;
            const selected = tasks.find(task => task.id === selectedId);
            if (selected) showOrder(selected, false);
            else { selectedId = null; get('taskOrderDetail').hidden = true; }
        } catch (error) { get('transferTasksStatus').textContent = error.message; }
    }
    async function exportTasks(list) {
        if (!list.length) throw Error('İndirilecek görev bulunamadı.');
        const book = window.TransferTasksExcel.build(list, window.ExcelJS);
        const url = URL.createObjectURL(new Blob([await book.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const link = el('a'); link.href = url; link.download = list.length === 1 ? `transfer-emri-${list[0].orderId}.xlsx` : 'transfer-gorev-listesi.xlsx';
        document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        get('transferTasksStatus').textContent = 'Excel dosyası hazırlandı: Görev Listesi ve Emir Detayları.';
    }
    function bind(id, fn) {
        get(id).addEventListener('click', async () => {
            const button = get(id); button.disabled = true;
            try { await fn(); } catch (error) { get('transferTasksStatus').textContent = error.message; }
            finally { button.disabled = id === 'taskExportAll' || id === 'taskDeleteAll' ? !tasks.length : false; }
        });
    }
    bind('taskDeleteAll', () => remove(tasks.map(task => task.id)));
    bind('taskExportAll', () => exportTasks(tasks));
    bind('taskExportOrder', () => exportTasks(tasks.filter(task => task.id === selectedId)));
    bind('taskCloseOrder', () => { selectedId = null; get('taskOrderDetail').hidden = true; });
    window.addEventListener('transfer-tasks-changed', refresh);
    window.addEventListener('stock:data-changed', event => { if (event.key === 'aiStockNebimData' || event.key === null) refresh(); });
    refresh();
})();

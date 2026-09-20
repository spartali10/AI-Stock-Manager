(() => {
    window.StoreMultiSelect = function (select, title) {
        const wrap = document.createElement('div'); wrap.className = 'store-multi';
        const chips = document.createElement('div'); chips.className = 'store-multi-chips';
        const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'store-multi-toggle';
        toggle.textContent = '⌄'; toggle.setAttribute('aria-label', title + ' seç'); toggle.setAttribute('aria-expanded', 'false');
        const panel = document.createElement('div'); panel.className = 'store-multi-panel'; panel.hidden = true; panel.id = select.id + 'Options';
        toggle.setAttribute('aria-controls', panel.id);
        const search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Mağaza ara…'; search.setAttribute('aria-label', title + ' listesinde ara');
        const choices = document.createElement('div'); choices.className = 'store-multi-choices';
        const clear = document.createElement('button'); clear.type = 'button'; clear.textContent = 'Seçimi temizle'; clear.className = 'store-multi-clear';
        const all = document.createElement('button'); all.type = 'button'; all.textContent = 'Tüm mağazaları seç'; all.className = 'store-multi-clear';
        panel.append(search, choices, all, clear); wrap.append(chips, toggle, panel); select.after(wrap); select.hidden = true;
        chips.tabIndex = 0; chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', title + ' listesini aç veya kapat');
        const normalize = s => s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
        function close() { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
        function changed() {
            const current = [...select.selectedOptions].map(o => o.value);
            select.selectionOrder = [...(select.selectionOrder || []).filter(v => current.includes(v)), ...current.filter(v => !(select.selectionOrder || []).includes(v))];
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        function refreshChips() {
            chips.replaceChildren();
            const selected = [...select.selectedOptions].sort((a, b) => (select.selectionOrder || []).indexOf(a.value) - (select.selectionOrder || []).indexOf(b.value));
            if (!selected.length) { const empty = document.createElement('span'); empty.textContent = 'Mağaza seçin'; empty.className = 'store-multi-placeholder'; chips.append(empty); }
            selected.forEach(option => {
                const chip = document.createElement('span'); chip.className = 'store-multi-chip';
                const name = document.createElement('span'); name.textContent = option.textContent;
                const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', option.textContent + ' seçimini kaldır');
                remove.addEventListener('click', () => { option.selected = false; changed(); toggle.focus(); });
                chip.append(name, remove); chips.append(chip);
            });
        }
        function renderChoices() {
            choices.replaceChildren();
            const options = [...select.options].filter(o => o.value && normalize(o.textContent).includes(normalize(search.value)));
            options.forEach(option => {
                const label = document.createElement('label');
                const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = option.selected; checkbox.disabled = option.disabled;
                const name = document.createElement('span'); name.textContent = option.textContent + (option.disabled ? ' · Kaynak seçili' : '');
                checkbox.addEventListener('change', () => { option.selected = checkbox.checked; changed(); });
                label.append(checkbox, name); choices.append(label);
            });
            if (!options.length) choices.textContent = 'Mağaza bulunamadı.';
        }
        function open() { panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); renderChoices(); search.focus(); }
        function togglePanel() { if (panel.hidden) open(); else { close(); toggle.focus(); } }
        toggle.addEventListener('click', togglePanel);
        wrap.addEventListener('click', event => {
            if (!panel.contains(event.target) && !event.target.closest('button')) togglePanel();
        });
        chips.addEventListener('keydown', event => {
            if (event.target === chips && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); togglePanel(); }
        });
        all.addEventListener('click', () => { [...select.options].forEach(o => { if (o.value && !o.disabled) o.selected = true; }); changed(); });
        search.addEventListener('input', renderChoices);
        clear.addEventListener('click', () => { [...select.options].forEach(o => { o.selected = false; }); changed(); });
        wrap.addEventListener('keydown', event => { if (event.key === 'Escape') { close(); toggle.focus(); } });
        document.addEventListener('click', event => { if (!wrap.contains(event.target)) close(); });
        return { refresh() {
            refreshChips();
            // Keep focused checkboxes in place during selection.
            const labels = [...choices.querySelectorAll('label')];
            if (labels.length) labels.forEach(label => {
                const checkbox = label.querySelector('input');
                const name = label.querySelector('span').textContent.replace(' · Kaynak seçili', '');
                const option = [...select.options].find(o => o.textContent === name);
                if (option) { checkbox.checked = option.selected; checkbox.disabled = option.disabled; label.querySelector('span').textContent = name + (option.disabled ? ' · Kaynak seçili' : ''); }
            });
        } };
    };
})();

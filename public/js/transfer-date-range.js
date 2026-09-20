(() => {
    const start = document.getElementById('quickSalesStart');
    const end = document.getElementById('quickSalesEnd');
    const buttons = [...document.querySelectorAll('[data-sales-period]')];
    const hint = document.getElementById('quickSalesHint');
    let mode = 'week';
    let enabled = true;
    const container = document.querySelector('.quick-sales-compact');
    const format = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    function preset(period, now = new Date()) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const first = new Date(date);
        if (period === 'week') first.setDate(first.getDate() - 7);
        else {
            first.setDate(1);
            first.setMonth(first.getMonth() - 1);
            const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
            first.setDate(Math.min(date.getDate(), lastDay));
        }
        return { start: format(first), end: format(date) };
    }
    function validate() {
        start.setCustomValidity(''); end.setCustomValidity('');
        const today = format(new Date());
        start.max = today; end.max = today;
        if (!start.value || !end.value) return false;
        if (start.value > end.value) start.setCustomValidity('Başlangıç tarihi bitiş tarihinden sonra olamaz.');
        if (end.value > today) end.setCustomValidity('Bitiş tarihi bugünden sonra olamaz.');
        return start.validity.valid && end.validity.valid;
    }
    function select(period) {
        mode = period;
        if (mode !== 'custom') { const range = preset(mode); start.value = range.start; end.value = range.end; }
        start.readOnly = end.readOnly = mode !== 'custom';
        buttons.forEach(button => {
            const active = button.dataset.salesPeriod === mode;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        hint.textContent = !enabled ? 'Sil Süpür: Tarih dikkate alınmaz. Seçili filtrelere uyan kaynak stoğunun tamamı kullanılır.' : mode === 'week' ? 'Haftalık: Bugünden 7 gün öncesi ile bugün arası.' : mode === 'month' ? 'Aylık: Bugünden bir takvim ayı öncesi ile bugün arası.' : 'Özel: Başlangıç ve bitiş tarihlerini seçin.';
        validate();
    }
    buttons.forEach(button => button.addEventListener('click', () => { select(button.dataset.salesPeriod); if (mode === 'custom') start.focus(); }));
    [start, end].forEach(input => input.addEventListener('input', validate));
    window.QuickSalesRange = {
        isEnabled: () => enabled,
        clear() { start.value = ''; end.value = ''; select('custom'); },
        restore(range) { start.value = range.start; end.value = range.end; select('custom'); },
        setEnabled(value) {
            enabled = value;
            [start, end, ...buttons].forEach(control => { control.disabled = !enabled; });
            container.classList.toggle('is-disabled', !enabled);
            container.setAttribute('aria-disabled', String(!enabled));
            select(mode);
        },
        get() {
            if (!enabled) return null;
            if (mode !== 'custom') select(mode);
            if (!validate()) { start.reportValidity(); end.reportValidity(); return null; }
            return { mode, start: start.value, end: end.value };
        }
    };
    let rolloverTimer;
    function refreshDay() {
        if (mode !== 'custom') select(mode);
        else validate();
        clearTimeout(rolloverTimer);
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        rolloverTimer = setTimeout(refreshDay, midnight.getTime() - now.getTime() + 100);
    }
    window.addEventListener('focus', refreshDay);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDay(); });
    select('week');
    refreshDay();
})();

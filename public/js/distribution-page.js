(() => {
    if (new URLSearchParams(window.location.search).get('view') === 'distribution') {
        document.body.classList.add('distribution-page');
        document.title = 'Akıllı Dağıtım | AI Stock Manager';
        const link = document.getElementById('distributionPageLink');
        if (link) {
            link.href = '/Transfer';
            link.removeAttribute('target');
            link.textContent = '← Transferlere Dön';
        }
    }
    const button = document.getElementById('wmExpand');
    const fitButton = document.getElementById('wmFit');
    const viewport = document.querySelector('#chanceMatrix .wm-scroll');
    const table = viewport.querySelector('table');
    let fit = document.body.classList.contains('distribution-page'), frame = 0;
    function layout() {
        frame = 0;
        if (!viewport.getClientRects().length) return;
        table.style.zoom = '';
        if (fit) {
            const scale = Math.min(1, (viewport.clientWidth - 2) / table.offsetWidth);
            table.style.zoom = String(scale);
            fitButton.textContent = `Gerçek Boyut (%${Math.round(scale * 100)})`;
        } else fitButton.textContent = 'Ekrana Sığdır';
        fitButton.setAttribute('aria-pressed', String(fit));
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(layout); }
    fitButton.addEventListener('click', () => { fit = !fit; schedule(); });
    new ResizeObserver(schedule).observe(viewport);
    new MutationObserver(schedule).observe(table, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    const setExpanded = expanded => {
        document.body.classList.toggle('matrix-expanded', expanded);
        button.setAttribute('aria-pressed', String(expanded));
        button.textContent = expanded ? '↙ Normal Görünüme Dön (Esc)' : '⛶ Tabloyu Büyüt';
        if (!expanded) button.focus();
        schedule();
    };
    button.addEventListener('click', () => setExpanded(!document.body.classList.contains('matrix-expanded')));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && document.body.classList.contains('matrix-expanded')) setExpanded(false);
    });
    schedule();
})();

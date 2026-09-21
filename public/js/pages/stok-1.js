

        /* =========================================================
           TEMA
        ========================================================= */

        (function () {

            const savedTheme =
                localStorage.getItem(
                    "aiStockTheme"
                );

            if (
                savedTheme === "light"
            ) {

                document.body.classList.add(
                    "light-theme"
                );

            }

        })();


        const themeBtn =
            document.getElementById(
                "themeBtn"
            );


        function updateThemeButton() {

            const isLight =
                document.body.classList.contains(
                    "light-theme"
                );

            themeBtn.textContent =
                isLight
                    ? "☀️"
                    : "🌙";

            themeBtn.title =
                isLight
                    ? "Karanlık temaya geç"
                    : "Açık temaya geç";

            themeBtn.setAttribute(
                "aria-label",
                themeBtn.title
            );

        }


        updateThemeButton();


        themeBtn.addEventListener(
            "click",
            function () {

                const isLight =
                    document.body.classList.toggle(
                        "light-theme"
                    );

                localStorage.setItem(
                    "aiStockTheme",
                    isLight
                        ? "light"
                        : "dark"
                );

                updateThemeButton();

            }
        );


        /* =========================================================
           OTURUM
        ========================================================= */

        const SESSION_START_KEY =
            "aiStockSessionStart";

        const SESSION_ACTIVE_KEY =
            "aiStockSessionActive";


        function startOnlineSession() {

            let sessionStart =
                localStorage.getItem(
                    SESSION_START_KEY
                );

            const sessionActive =
                localStorage.getItem(
                    SESSION_ACTIVE_KEY
                );

            if (
                !sessionStart ||
                sessionActive !== "true"
            ) {

                sessionStart =
                    Date.now().toString();

                localStorage.setItem(
                    SESSION_START_KEY,
                    sessionStart
                );

                localStorage.setItem(
                    SESSION_ACTIVE_KEY,
                    "true"
                );

            }

            return Number(
                sessionStart
            );

        }


        startOnlineSession();


        function setOnlineMinutes(
            minutes
        ) {

            const onlineMinutes =
                document.getElementById(
                    "onlineMinutes"
                );

            const accountOnlineMinutes =
                document.getElementById(
                    "accountOnlineMinutes"
                );

            if (
                onlineMinutes
            ) {

                onlineMinutes.textContent =
                    minutes;

            }

            if (
                accountOnlineMinutes
            ) {

                accountOnlineMinutes.textContent =
                    minutes;

            }

        }


        function updateOnlineTime() {

            const sessionStart =
                Number(
                    localStorage.getItem(
                        SESSION_START_KEY
                    )
                );

            const sessionActive =
                localStorage.getItem(
                    SESSION_ACTIVE_KEY
                );

            if (
                !sessionStart ||
                sessionActive !== "true"
            ) {

                setOnlineMinutes(
                    0
                );

                return;

            }

            const elapsed =
                Math.max(
                    0,
                    Date.now() -
                    sessionStart
                );

            const minutes =
                Math.floor(
                    elapsed / 60000
                );

            setOnlineMinutes(
                minutes
            );

        }


        updateOnlineTime();


        const onlineTimer =
            setInterval(
                updateOnlineTime,
                1000
            );


        window.addEventListener(
            "storage",
            function (event) {

                if (
                    event.key ===
                    SESSION_START_KEY ||
                    event.key ===
                    SESSION_ACTIVE_KEY
                ) {

                    updateOnlineTime();

                }

            }
        );


        /* =========================================================
           ACCOUNT MENU
        ========================================================= */

        const userArea =
            document.getElementById(
                "userArea"
            );

        const accountMenu =
            document.getElementById(
                "accountMenu"
            );


        userArea.addEventListener(
            "click",
            function (event) {

                if (
                    event.target.closest(
                        ".account-menu"
                    )
                ) {

                    return;

                }

                event.stopPropagation();

                const isOpen =
                    accountMenu.classList.toggle(
                        "show"
                    );

                userArea.setAttribute(
                    "aria-expanded",
                    isOpen
                        ? "true"
                        : "false"
                );

            }
        );


        userArea.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    if (
                        event.target.closest(
                            ".account-menu"
                        )
                    ) {

                        return;

                    }

                    event.preventDefault();

                    const isOpen =
                        accountMenu.classList.toggle(
                            "show"
                        );

                    userArea.setAttribute(
                        "aria-expanded",
                        isOpen
                            ? "true"
                            : "false"
                    );

                }

                if (
                    event.key === "Escape"
                ) {

                    closeAccountMenu();

                }

            }
        );


        document.addEventListener(
            "click",
            function (event) {

                if (
                    !userArea.contains(
                        event.target
                    )
                ) {

                    closeAccountMenu();

                }

            }
        );


        function closeAccountMenu() {

            accountMenu.classList.remove(
                "show"
            );

            userArea.setAttribute(
                "aria-expanded",
                "false"
            );

        }


        /* =========================================================
           BİLDİRİMLER
        ========================================================= */

        const notificationBtn =
            document.getElementById(
                "notificationBtn"
            );


        notificationBtn.addEventListener(
            "click",
            function () {

                window.location.href =
                    "/Bildirimler";

            }
        );


        /* =========================================================
           TABLO VERİLERİ
        ========================================================= */

        const table =
            document.getElementById(
                "stockTable"
            );

        let rows =
            Array.from(
                table.querySelectorAll(
                    "tbody tr"
                )
            );


        /* =========================================================
           NEBIM V3 ADAPTER - MEVCUT SATIRLARI DEPOYA KAYDET
        ========================================================= */

        // Static example rows are not imported into central storage.
        table.querySelector('tbody').replaceChildren();
        rows = [];


        function escapeHtml(value) {
            return String(value == null ? "" : value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        let stockColumns = [], stockGroups = new Map(), operationProducts = [];
        let stockPage = 1, stockPageSize = 10;
        const pagination = document.createElement('div'); pagination.className = 'stock-pagination';
        const pageLabel = document.createElement('label'); pageLabel.textContent = 'Sayfada göster: ';
        const pageSizeSelect = document.createElement('select'); pageSizeSelect.setAttribute('aria-label', 'Sayfada gösterilecek ürün sayısı');
        [10, 25, 50, 100].forEach(n => pageSizeSelect.append(new Option(String(n), String(n))));
        pageLabel.append(pageSizeSelect);
        const previousPage = document.createElement('button'), nextPage = document.createElement('button'), pageInfo = document.createElement('span');
        previousPage.type = nextPage.type = 'button'; previousPage.textContent = '← Önceki'; nextPage.textContent = 'Sonraki →';
        pageInfo.setAttribute('role', 'status');
        pagination.append(pageLabel, previousPage, pageInfo, nextPage);
        table.closest('.table-wrapper').before(pagination);
        function paginateStock() {
            const matching = rows.filter(row => row.dataset.filterMatch !== 'false');
            const pages = Math.max(1, Math.ceil(matching.length / stockPageSize));
            stockPage = Math.min(stockPage, pages);
            rows.forEach(row => { row.style.display = 'none'; });
            matching.slice((stockPage - 1) * stockPageSize, stockPage * stockPageSize).forEach(row => { row.style.display = ''; });
            previousPage.disabled = stockPage === 1; nextPage.disabled = stockPage === pages;
            pageInfo.textContent = matching.length ? `${(stockPage - 1) * stockPageSize + 1}–${Math.min(stockPage * stockPageSize, matching.length)} / ${matching.length} ürün · Sayfa ${stockPage}/${pages}` : '0 ürün';
            updateVisibleProductCount();
        }
        pageSizeSelect.addEventListener('change', () => { stockPageSize = Number(pageSizeSelect.value); stockPage = 1; paginateStock(); });
        previousPage.addEventListener('click', () => { if (stockPage > 1) { stockPage--; paginateStock(); } });
        nextPage.addEventListener('click', () => { if (!nextPage.disabled) { stockPage++; paginateStock(); } });
        function productRowHtml(product) {
            const stock = Number(product.stock) || 0;
            const capacity = Math.max(Number(product.capacity) || stock || 1, 1);
            const minimum = Math.max(Number(product.min) || 0, 0);
            const status = StockSizeView.status(product);
            const percentage = Math.min(100, Math.max(0, stock / capacity * 100));
            const progressClass = status === "critical" ? " danger" : status === "low" ? " warning" : "";
            const statusText = StockSizeView.statusText(status);
            const icon = product.icon || "K";
            const fabricKey = Object.keys(product.attributes || {}).find(key => key.trim().toLocaleLowerCase('tr-TR') === 'kumaş cinsi');
            const fabric = product.fabric || product.fabricType || product.attributes?.[fabricKey] || 'Tanımsız';

            return `<tr data-one-size-only="${product.oneSizeOnly}" data-numbered-sizes-only="${product.numberedSizesOnly}" data-product-id="${Number(product.id) || 0}" data-status="${status}" data-category="${escapeHtml(product.category || "Genel")}" data-stock="${stock}" data-capacity="${capacity}" data-min="${minimum}" data-code="${escapeHtml(product.code)}" data-product="${escapeHtml(product.name)}" data-store="${escapeHtml(product.store)}" data-icon="${escapeHtml(icon)}">
                <td>${escapeHtml(Array.isArray(fabric) ? fabric.join(', ') || 'Tanımsız' : fabric)}</td>
                <td><div class="product"><div><div class="product-name">${escapeHtml(product.name)}</div><div class="product-code">${escapeHtml(product.code)}</div></div></div></td>
                <td class="stock-color-cell"><span class="stock-color-badge">${escapeHtml(product.color || '-')}</span></td>
                <td>${escapeHtml(product.store)}</td>
                ${stockColumns.map(size => {
                    const members = product.members.filter(p => StockSizeView.size(p) === size);
                    const amount = members.reduce((n, p) => n + Number(p.stock), 0);
                    const notProduced = (size === '4' && !members.length) || (product.oneSizeOnly && ['0', '1', '2', '3', '4'].includes(size)) || (product.numberedSizesOnly && size === 'ONE SIZE');
                    const negative = !notProduced && amount < 0;
                    const state = notProduced ? 'missing' : negative ? 'negative' : amount === 0 ? 'critical' : 'normal';
                    const label = negative ? `${size}: Eksi stok (${formatNumber(amount)})` : size;
                    return `<td class="size-stock-cell"><span class="size-stock-badge ${state}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${notProduced ? '-' : formatNumber(amount)}${negative ? '<span class="stock-negative-warning" aria-hidden="true">!</span>' : ''}</span></td>`;
                }).join('')}
                <td><span class="status ${status}">${statusText}</span></td>
                <td><div class="action-group"><button class="action-btn" type="button" onclick="showDetailFromRow(this)">Detay</button><button class="action-btn primary" type="button" onclick="openOperationFromRow(this)">Islem</button></div></td>
            </tr>`;
        }

        function renderProducts(products) {
            stockColumns = StockSizeView.columns(products).filter(size => !['belirtilmemiş', 'tanımsız', 'tanimsiz'].includes(size.trim().toLocaleLowerCase('tr-TR')));
            products = StockSizeView.group(products);
            const codeOrder = new Intl.Collator('tr', { numeric: true, sensitivity: 'base' });
            products.sort((a, b) => codeOrder.compare(String(a.code ?? '').trim(), String(b.code ?? '').trim()));
            stockGroups = new Map(products.map(p => [String(p.id), p.members]));
            const caption = table.caption || table.createCaption();
            caption.textContent = 'Beden stokları: Yeşil sayı: Mevcut adet · Kırmızı 0: Bu mağazada stok yok · −: Ürünün üretilmeyen bedeni.';
            table.querySelector('thead').innerHTML = `<tr>${['KUMAŞ CİNSİ', 'ÜRÜN ADI', 'RENK', 'MAĞAZA', ...stockColumns, 'DURUM', 'İŞLEM'].map(label => `<th>${escapeHtml(label)}</th>`).join('')}</tr>`;
            const body = table.querySelector("tbody");
            body.innerHTML = products.map(productRowHtml).join("");
            rows = Array.from(body.querySelectorAll("tr"));
            rows.forEach(updateRow);
            updateStatistics();
            filterProducts();
            table.classList.add('size-view-ready');
        }

        let selectedOperationRow =
            null;

        let operationType =
            "add";


        let selectedDetailRow =
            null;


        /* =========================================================
           NUMARA FORMATLAMA
        ========================================================= */

        function formatNumber(
            number
        ) {

            return Number(
                number
            ).toLocaleString(
                "tr-TR"
            );

        }


        /* =========================================================
           ÜRÜN DURUMU
        ========================================================= */




        /* =========================================================
           SATIR GÜNCELLE
        ========================================================= */

        function updateRow(
            row
        ) {

            const stock =
                Number(
                    row.dataset.stock
                );

            const capacity =
                Number(
                    row.dataset.capacity
                );

            const minimum =
                Number(
                    row.dataset.min
                );


            const percentage =
                capacity > 0
                    ? Math.min(
                        100,
                        Math.max(
                            0,
                            (stock / capacity) * 100
                        )
                    )
                    : 0;


            const status =
                StockSizeView.status({ members: stockGroups.get(row.dataset.productId) || [{ stock }] });


            row.dataset.status =
                status;


            const currentStock =
                row.querySelector(
                    ".current-stock"
                );

            const progress =
                row.querySelector(
                    ".progress-bar"
                );

            const statusElement =
                row.querySelector(
                    ".status"
                );


            if (
                currentStock
            ) {

                currentStock.textContent =
                    formatNumber(
                        stock
                    );

            }


            if (
                progress
            ) {

                progress.style.width =
                    percentage + "%";

                progress.classList.remove(
                    "warning",
                    "danger"
                );

                if (
                    status === "low"
                ) {

                    progress.classList.add(
                        "warning"
                    );

                }

                if (
                    status === "critical"
                ) {

                    progress.classList.add(
                        "danger"
                    );

                }

            }


            if (
                statusElement
            ) {

                statusElement.className =
                    "status " + status;

                statusElement.textContent =
                    StockSizeView.statusText(status);

            }

        }


        /* =========================================================
           İSTATİSTİKLERİ GÜNCELLE
        ========================================================= */

        function updateStatistics() {

            let totalStock = 0;

            let normalCount = 0;

            let lowCount = 0;

            let criticalCount = 0;
            let depletedCount = 0;


            rows.forEach(
                function (row) {

                    const stock =
                        Number(
                            row.dataset.stock
                        );

                    const status =
                        row.dataset.status;


                    totalStock +=
                        stock;

                    if (status === "depleted") depletedCount++;


                    if (
                        status === "normal"
                    ) {

                        normalCount++;

                    }

                    if (
                        status === "low"
                    ) {

                        lowCount++;

                    }

                    if (
                        status === "critical"
                    ) {

                        criticalCount++;

                    }

                }
            );


            const totalProducts =
                rows.length;


            const normalPercentage =
                totalProducts
                    ? (
                        normalCount /
                        totalProducts *
                        100
                    ).toFixed(1)
                    : 0;


            document.getElementById(
                "totalStockValue"
            ).textContent =
                formatNumber(
                    totalStock
                );


            document.getElementById(
                "normalStockValue"
            ).textContent =
                formatNumber(
                    normalCount
                );


            document.getElementById(
                "normalStockDescription"
            ).textContent =
                "%" +
                normalPercentage +
                " ürün normal seviyede";


            document.getElementById(
                "lowStockValue"
            ).textContent =
                formatNumber(
                    lowCount
                );


            document.getElementById(
                "lowStockDescription"
            ).textContent =
                lowCount +
                " ürün kontrol edilmeli";


            document.getElementById(
                "criticalStockValue"
            ).textContent =
                formatNumber(
                    criticalCount
                );


            document.getElementById(
                "healthNormal"
            ).textContent =
                normalCount;


            document.getElementById(
                "healthLow"
            ).textContent =
                lowCount;


            document.getElementById(
                "healthCritical"
            ).textContent =
                criticalCount;


            document.getElementById("healthDepleted").textContent = depletedCount;

            const healthyPercentage =
                totalProducts
                    ? Math.round(
                        normalCount /
                        totalProducts *
                        100
                    )
                    : 0;


            document.getElementById(
                "healthScore"
            ).textContent =
                healthyPercentage +
                "%";


            document.getElementById(
                "productCount"
            ).textContent =
                totalProducts +
                " ürün";


            updateCriticalList();

            updateAIInsight();

        }


        /* =========================================================
           KRİTİK LİSTE
        ========================================================= */

        function updateCriticalList() {

            const container =
                document.getElementById(
                    "criticalList"
                );


            container.innerHTML = "";


            const criticalRows =
                rows
                    .filter(
                        row =>
                            row.dataset.status ===
                            "critical"
                    )
                    .sort(
                        function (a, b) {

                            return Number(
                                a.dataset.stock
                            ) -
                                Number(
                                    b.dataset.stock
                                );

                        }
                    );


            const displayRows =
                criticalRows.slice(
                    0,
                    5
                );


            if (
                displayRows.length === 0
            ) {

                container.innerHTML = `

            <div
                style="
                    padding:20px 0;
                    text-align:center;
                    color:var(--green);
                    font-size:10px;
                "
            >
                ✓ Kritik seviyede ürün bulunmuyor.
            </div>

        `;

                return;

            }


            displayRows.forEach(
                function (row) {

                    const item =
                        document.createElement(
                            "div"
                        );

                    item.className =
                        "low-item";


                    item.innerHTML = `

                <div class="low-icon">
                    ${row.dataset.icon}
                </div>

                <div class="low-info">

                    <div class="low-name">
                        ${row.dataset.product}
                    </div>

                    <div class="low-store">
                        ${row.dataset.store}
                    </div>

                </div>

                <div class="low-count">
                    ${formatNumber(row.dataset.stock)}
                </div>

            `;


                    container.appendChild(
                        item
                    );

                }
            );

        }


        /* =========================================================
           AI ANALİZ
        ========================================================= */

        function updateAIInsight() {

            const criticalRows =
                rows.filter(
                    row =>
                        row.dataset.status ===
                        "critical"
                );


            const lowRows =
                rows.filter(
                    row =>
                        row.dataset.status ===
                        "low"
                );


            const insight =
                document.getElementById(
                    "aiInsightText"
                );


            if (
                criticalRows.length > 0
            ) {

                const row =
                    criticalRows[0];


                const stock =
                    Number(
                        row.dataset.stock
                    );

                const minimum =
                    Number(
                        row.dataset.min
                    );


                insight.innerHTML = `

            Son stok verilerine göre
            <strong>
                ${row.dataset.store}
            </strong>
            mağazasında
            <strong>
                ${row.dataset.product}
            </strong>
            kritik seviyede.

            Mevcut stok
            <strong>
                ${formatNumber(stock)}
            </strong>
            adet,
            minimum stok seviyesi ise
            <strong>
                ${formatNumber(minimum)}
            </strong>
            adet.

            Önerilen aksiyon:
            stok girişinin veya mağazalar arası
            transferin önceliklendirilmesi.

        `;

                return;

            }


            if (
                lowRows.length > 0
            ) {

                insight.innerHTML = `

            Sistemde
            <strong>
                ${lowRows.length}
            </strong>
            düşük stok seviyesine sahip ürün bulunuyor.

            Satış hızları takip edilmeli ve
            minimum stok seviyesine yaklaşan
            ürünler için erken tedarik planlaması
            yapılmalıdır.

        `;

                return;

            }


            insight.innerHTML = `

        Mevcut stok seviyelerinde kritik veya
        düşük stok riski bulunmuyor.

        Stok durumu
        <strong>
            sağlıklı
        </strong>
        görünüyor.

    `;

        }


        /* =========================================================
           FİLTRE
        ========================================================= */

        const productSearch =
            document.getElementById(
                "productSearch"
            );

        const storeFilter =
            document.getElementById(
                "storeFilter"
            );

        const statusFilter =
            document.getElementById(
                "statusFilter"
            );

        const categoryFilter =
            document.getElementById(
                "categoryFilter"
            );

        const globalSearch =
            document.getElementById(
                "globalSearch"
            );


        function filterProducts() {

            const search =
                (
                    productSearch.value +
                    " " +
                    globalSearch.value
                )
                    .toLocaleLowerCase(
                        "tr-TR"
                    )
                    .trim();


            const store =
                storeFilter.value
                    .toLocaleLowerCase(
                        "tr-TR"
                    );


            const status =
                statusFilter.value
                    .toLocaleLowerCase(
                        "tr-TR"
                    );


            const category =
                categoryFilter.value
                    .toLocaleLowerCase(
                        "tr-TR"
                    );


            rows.forEach(
                function (row) {

                    const text =
                        row.textContent
                            .toLocaleLowerCase(
                                "tr-TR"
                            );


                    const rowStatus =
                        row.dataset.status
                            .toLocaleLowerCase(
                                "tr-TR"
                            );


                    const rowCategory =
                        row.dataset.category
                            .toLocaleLowerCase(
                                "tr-TR"
                            );


                    const searchMatch =
                        !search ||
                        text.includes(
                            search
                        );


                    const storeMatch =
                        !store ||
                        text.includes(
                            store
                        );


                    const statusMatch =
                        !status ||
                        rowStatus ===
                        status;


                    const categoryMatch =
                        !category ||
                        rowCategory ===
                        category;


                    row.style.display =
                        searchMatch &&
                            storeMatch &&
                            statusMatch &&
                            categoryMatch
                            ? ""
                            : "none";
                    row.dataset.filterMatch = String(searchMatch && storeMatch && statusMatch && categoryMatch);

                }
            );


            stockPage = 1;
            paginateStock();

        }


        function updateVisibleProductCount() {

            const visible =
                rows.filter(
                    row =>
                        row.style.display !==
                        "none"
                ).length;


            document.getElementById(
                "productCount"
            ).textContent =
                visible +
                " / " +
                rows.length +
                " ürün";

        }


        productSearch.addEventListener(
            "input",
            filterProducts
        );


        globalSearch.addEventListener(
            "input",
            filterProducts
        );


        storeFilter.addEventListener(
            "change",
            filterProducts
        );


        statusFilter.addEventListener(
            "change",
            filterProducts
        );


        categoryFilter.addEventListener(
            "change",
            filterProducts
        );


        /* =========================================================
           OPERATION MODAL
        ========================================================= */

        const operationModal =
            document.getElementById(
                "operationModal"
            );


        const operationAmount =
            document.getElementById(
                "operationAmount"
            );


        const operationNote =
            document.getElementById(
                "operationNote"
            );


        const addOperation =
            document.getElementById(
                "addOperation"
            );


        const removeOperation =
            document.getElementById(
                "removeOperation"
            );


        const operationStore = document.getElementById('operationStore');
        const saveOperationButton = document.getElementById('saveOperationBtn');
        let operationSaving = false;

        function updateOperationStoreMode() {
            const removing = operationType === 'remove';
            operationStore.disabled = removing || operationSaving;
            if (removing && selectedOperationRow) operationStore.value = selectedOperationRow.dataset.store;
            document.querySelector('label[for="operationStore"]').textContent = removing ? 'Stok Çıkılacak Mağaza' : 'Stok Girilecek Mağaza';
            document.getElementById('operationStoreHelp').textContent = removing
                ? 'Stok çıkışı ürünün mevcut mağazasından yapılır.'
                : 'Ürün seçilen mağazada yoksa yeni stok kaydı oluşturulur.';
        }

        function selectOperationSize() {
            if (operationSaving || !selectedOperationRow) return;
            const product = operationProducts.find(p => String(p.id) === document.getElementById('operationSize').value);
            if (!product) return;
            Object.assign(selectedOperationRow.dataset, { productId: product.id, stock: product.stock, capacity: product.capacity, min: product.min, product: product.name });
            document.getElementById('operationProductInfo').textContent = `${product.name} / ${StockSizeView.size(product)} · ${product.store} · Mevcut stok: ${formatNumber(product.stock)}`;
        }
        document.getElementById('operationSize').addEventListener('change', selectOperationSize);

        async function openOperationFromRow(
            button
        ) {

            if (operationSaving) return;
            const originalRow = button.closest("tr");
            const row = originalRow.cloneNode(true);
            operationProducts = stockGroups.get(originalRow.dataset.productId) || [];
            document.getElementById('operationSize').replaceChildren(...operationProducts.map(p => new Option(`${StockSizeView.size(p)} · ${formatNumber(p.stock)} adet`, p.id)));


            selectedOperationRow =
                row;


            operationType =
                "add";


            addOperation.classList.add(
                "active"
            );

            removeOperation.classList.remove(
                "active"
            );


            operationAmount.value =
                10;


            operationNote.value =
                "";


            document.getElementById(
                "operationProductInfo"
            ).innerHTML = `

        <strong
            style="
                color:var(--text);
                font-size:12px;
            "
        >
            ${row.dataset.product}
        </strong>

        <br>

        <span
            style="
                display:inline-block;
                margin-top:5px;
            "
        >
            ${row.dataset.store}
            • Mevcut stok:
            <strong>
                ${formatNumber(row.dataset.stock)}
            </strong>
        </span>

    `;


            selectOperationSize();
            operationStore.replaceChildren(new Option(row.dataset.store, row.dataset.store));
            updateOperationStoreMode();
            saveOperationButton.disabled = true;
            try {
                const stores = await NebimAdapter.getStores();
                if (selectedOperationRow !== row) return;
                const names = [...new Set([row.dataset.store, ...stores.map(store => store.name)])].filter(Boolean);
                operationStore.replaceChildren(...names.map(name => new Option(name, name)));
                operationStore.value = row.dataset.store;
                saveOperationButton.disabled = false;
            } catch (error) {
                showToast(error.message || 'Mağazalar yüklenemedi.', 'error');
                return;
            }

            operationModal.classList.add(
                "show"
            );


            setTimeout(
                function () {

                    operationAmount.focus();

                },
                100
            );

        }


        function closeOperationModal() {
            if (operationSaving) return;

            operationModal.classList.remove(
                "show"
            );

            selectedOperationRow =
                null;

        }


        addOperation.addEventListener(
            "click",
            function () {

                operationType =
                    "add";

                addOperation.classList.add(
                    "active"
                );

                removeOperation.classList.remove(
                    "active"
                );

            }
        );


        removeOperation.addEventListener(
            "click",
            function () {

                operationType =
                    "remove";

                removeOperation.classList.add(
                    "active"
                );

                addOperation.classList.remove(
                    "active"
                );

            }
        );


        addOperation.addEventListener('click', updateOperationStoreMode);
        removeOperation.addEventListener('click', updateOperationStoreMode);

        /* =========================================================
           SAVE OPERATION
        ========================================================= */

        saveOperationButton.addEventListener('click', async function () {
            if (!selectedOperationRow || operationSaving) return;
            const amount = Number(operationAmount.value);
            if (!Number.isSafeInteger(amount) || amount <= 0) {
                showToast('Lütfen pozitif bir tam sayı girin.', 'error');
                operationAmount.focus();
                return;
            }
            const productId = Number(selectedOperationRow.dataset.productId);
            const store = operationStore.value;
            const type = operationType;
            const note = operationNote.value.trim();
            operationSaving = true;
            saveOperationButton.disabled = true;
            operationStore.disabled = true;
            let saved = false;
            try {
                await NebimAdapter.applyStockOperation(productId, store, type, amount);
                saved = true;
                renderProducts(await NebimAdapter.getProducts());
                const message = type === 'add' ? 'Stok girişi' : 'Stok çıkışı';
                showToast(message + ' ' + store + ' için kaydedildi.' + (note ? ' • ' + note : ''), 'success');
            } catch (error) {
                showToast(saved ? 'İşlem kaydedildi ancak tablo yenilenemedi. Sayfayı yenileyin.' : error.message || 'Stok işlemi kaydedilemedi.', 'error');
            } finally {
                operationSaving = false;
                saveOperationButton.disabled = false;
                updateOperationStoreMode();
                if (saved) closeOperationModal();
            }
        });

        /* =========================================================
           DETAIL
        ========================================================= */

        function showDetailFromRow(
            button
        ) {

            const row =
                button.closest(
                    "tr"
                );


            showDetail(
                row
            );

        }


        function showDetail(
            row
        ) {

            selectedDetailRow =
                row;


            document.getElementById(
                "detailIcon"
            ).textContent =
                row.dataset.icon;


            document.getElementById(
                "detailProductName"
            ).textContent =
                row.dataset.product;


            document.getElementById(
                "detailProductCode"
            ).textContent =
                row.dataset.code;


            document.getElementById(
                "detailStore"
            ).textContent =
                row.dataset.store;


            document.getElementById(
                "detailCurrent"
            ).textContent =
                formatNumber(
                    row.dataset.stock
                );


            document.getElementById(
                "detailMinimum"
            ).textContent =
                formatNumber(
                    row.dataset.min
                );


            document.getElementById(
                "detailCapacity"
            ).textContent =
                formatNumber(
                    row.dataset.capacity
                );


            const status =
                row.dataset.status;


            const statusElement =
                document.getElementById(
                    "detailStatus"
                );


            statusElement.className =
                "status " +
                status;


            statusElement.textContent =
                StockSizeView.statusText(status);


            document.getElementById(
                "detailModal"
            ).classList.add(
                "show"
            );

        }


        function closeDetailModal() {

            document.getElementById(
                "detailModal"
            ).classList.remove(
                "show"
            );

            selectedDetailRow =
                null;

        }


        document
            .getElementById(
                "detailOperationBtn"
            )
            .addEventListener(
                "click",
                function () {

                    if (
                        !selectedDetailRow
                    ) {

                        return;

                    }


                    const row =
                        selectedDetailRow;


                    closeDetailModal();


                    openOperationFromRow(
                        row.querySelector(
                            ".action-btn.primary"
                        )
                    );

                }
            );


        /* =========================================================
           ANA STOK İŞLEMİ BUTONU
        ========================================================= */

        document
            .getElementById(
                "addStockBtn"
            )
            .addEventListener(
                "click",
                function () {

                    const firstVisibleRow =
                        rows.find(
                            row =>
                                row.style.display !==
                                "none"
                        );


                    if (
                        firstVisibleRow
                    ) {

                        openOperationFromRow(
                            firstVisibleRow.querySelector(
                                ".action-btn.primary"
                            )
                        );

                        return;

                    }


                    showToast(
                        "İşlem yapılabilecek ürün bulunamadı.",
                        "error"
                    );

                }
            );


        /* =========================================================
           KRİTİKLERİ GÖSTER
        ========================================================= */

        document
            .getElementById(
                "showCriticalBtn"
            )
            .addEventListener(
                "click",
                function () {

                    productSearch.value =
                        "";

                    globalSearch.value =
                        "";

                    storeFilter.value =
                        "";

                    categoryFilter.value =
                        "";

                    statusFilter.value =
                        "critical";


                    filterProducts();

                    window.scrollTo({
                        top:
                            document.getElementById(
                                "stockTable"
                            ).offsetTop -
                            100,
                        behavior:
                            "smooth"
                    });

                }
            );


        /* =========================================================
           EXCEL / CSV IMPORT
        ========================================================= */

        const excelFileInput = document.getElementById("excelFileInput");

        function normalizeHeader(value) {
            return String(value == null ? "" : value)
                .toLocaleLowerCase("tr-TR")
                .replace(/ı/g, "i")
                .replace(/ş/g, "s")
                .replace(/ğ/g, "g")
                .replace(/ü/g, "u")
                .replace(/ö/g, "o")
                .replace(/ç/g, "c")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, "");
        }

        function getExcelValue(row, headers) {
            const normalized = {};
            Object.keys(row).forEach(function (key) {
                normalized[normalizeHeader(key)] = row[key];
            });
            for (const header of headers) {
                if (normalized[header] !== undefined && normalized[header] !== "") {
                    return normalized[header];
                }
            }
            return "";
        }

        function toStockNumber(value, fallback) {
            const number = Number(String(value).replace(/\./g, "").replace(",", "."));
            return Number.isFinite(number) && number >= 0 ? number : fallback;
        }

        function importStockRows(sheetRows, fileName, parsed = false) {
            const products = parsed ? sheetRows : window.StockExcel.parse(sheetRows);

            return NebimAdapter.replaceProductsFromExcel(products, fileName).then(function (savedProducts) {
                renderProducts(savedProducts);
                showToast(products.length + " urun Excel dosyasindan yuklendi.", "success");
            });
        }

        function parseCsv(text) {
            const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
            if (lines.length < 2) return [];
            const delimiter = lines[0].includes(";") ? ";" : ",";
            const parseLine = function (line) {
                const cells = [];
                let cell = "", quoted = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        if (quoted && line[i + 1] === '"') { cell += '"'; i++; } else { quoted = !quoted; }
                    } else if (char === delimiter && !quoted) { cells.push(cell.trim()); cell = ""; }
                    else { cell += char; }
                }
                cells.push(cell.trim());
                return cells;
            };
            const headers = parseLine(lines[0]);
            return lines.slice(1).map(function (line) {
                const cells = parseLine(line), row = {};
                headers.forEach(function (header, index) { row[header] = cells[index] || ""; });
                return row;
            });
        }

        document.getElementById("importBtn").addEventListener("click", function () {
            excelFileInput.click();
        });

        excelFileInput.addEventListener("change", function () {
            const file = this.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (event) {
                try {
                    let sheetRows;
                    if (/\.csv$/i.test(file.name)) {
                        sheetRows = parseCsv(event.target.result);
                    } else {
                        if (typeof XLSX === "undefined") throw new Error("Excel okuyucu yuklenemedi. CSV dosyasi kullanin veya internet baglantinizi kontrol edin.");
                        const workbook = XLSX.read(event.target.result, { type: "array" });
                        sheetRows = window.StockExcel.readWorkbook(workbook, XLSX);
                    }
                    importStockRows(sheetRows, file.name, !/\.csv$/i.test(file.name)).catch(function (error) { showToast(error.message, "error"); });
                } catch (error) {
                    showToast(error.message || "Dosya okunamadi.", "error");
                }
                excelFileInput.value = "";
            };
            if (/\.csv$/i.test(file.name)) reader.readAsText(file, "utf-8");
            else reader.readAsArrayBuffer(file);
        });

        document.getElementById('exportBtn').addEventListener('click', async function () {
            this.disabled = true;
            try {
                const visible = rows.filter(row => row.dataset.filterMatch !== 'false');
                if (!visible.length) throw Error('Dışa aktarılacak ürün bulunamadı.');
                const records = visible.map(row => ({
                    name: row.dataset.product, code: row.dataset.code,
                    fabric: row.cells[0].textContent.trim(),
                    color: row.querySelector('.stock-color-badge')?.textContent || '-',
                    store: row.dataset.store, status: row.dataset.status,
                    quantities: stockColumns.map(size => {
                        const members = (stockGroups.get(row.dataset.productId) || []).filter(p => StockSizeView.size(p) === size);
                        const notProduced = (size === '4' && !members.length) || (row.dataset.oneSizeOnly === 'true' && ['0', '1', '2', '3', '4'].includes(size)) || (row.dataset.numberedSizesOnly === 'true' && size === 'ONE SIZE');
                        return notProduced ? null : members.reduce((sum, p) => sum + Number(p.stock), 0);
                    })
                }));
                for (const row of visible) {
                    const members = stockGroups.get(row.dataset.productId) || [];
                    if (members.some(p => !stockColumns.includes(StockSizeView.size(p)) && Number(p.stock) > 0)) throw Error(`${row.dataset.code}: Bedeni belirtilmemiş stok var. Aktarmadan önce bedenini tanımlayın.`);
                }
                const book = window.StockExcel.build(records, stockColumns, window.ExcelJS);
                const buffer = await book.xlsx.writeBuffer();
                const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
                const link = document.createElement('a');
                link.href = url; link.download = 'stok-listesi.xlsx'; link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                showToast('Stok listesi Excel olarak dışa aktarıldı.', 'success');
            } catch (error) { showToast(error.message, 'error'); }
            finally { this.disabled = false; }
        });

        /* =========================================================
           MODAL DIŞINA TIKLAMA
        ========================================================= */

        operationModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    operationModal
                ) {

                    closeOperationModal();

                }

            }
        );


        const detailModal =
            document.getElementById(
                "detailModal"
            );


        detailModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    detailModal
                ) {

                    closeDetailModal();

                }

            }
        );


        /* =========================================================
           ESCAPE
        ========================================================= */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeOperationModal();

                    closeDetailModal();

                    closeAccountMenu();

                }

            }
        );


        /* =========================================================
           GÜVENLİ ÇIKIŞ
        ========================================================= */

        const logoutBtn =
            document.getElementById(
                "logoutBtn"
            );


        


        /* =========================================================
           OTOMATİK ACTIVE MENU
        ========================================================= */

        (function () {

            const currentPage =
                window.location.pathname
                    .split("/")
                    .pop()
                    .toLowerCase();


            document
                .querySelectorAll(
                    ".menu-item"
                )
                .forEach(
                    function (item) {

                        const href =
                            item
                                .getAttribute(
                                    "href"
                                )
                                .split("/")
                                .pop()
                                .toLowerCase();


                        if (
                            currentPage ===
                            href
                        ) {

                            document
                                .querySelectorAll(
                                    ".menu-item"
                                )
                                .forEach(
                                    menu =>
                                        menu.classList
                                            .remove(
                                                "active"
                                            )
                                );


                            item.classList.add(
                                "active"
                            );

                        }

                    }
                );

        })();


        /* =========================================================
           TOAST
        ========================================================= */

        let toastTimer;


        function showToast(
            message,
            type = ""
        ) {

            const toast =
                document.getElementById(
                    "toast"
                );


            toast.textContent =
                message;


            toast.classList.remove(
                "success",
                "error"
            );


            if (
                type
            ) {

                toast.classList.add(
                    type
                );

            }


            toast.classList.add(
                "show"
            );


            clearTimeout(
                toastTimer
            );


            toastTimer =
                setTimeout(
                    function () {

                        toast.classList.remove(
                            "show"
                        );

                    },
                    2800
                );

        }


        /* =========================================================
           BAŞLANGIÇ VERİLERİNİ HAZIRLA
        ========================================================= */

        rows.forEach(
            function (row) {

                updateRow(
                    row
                );

            }
        );


        updateStatistics();

        filterProducts();

        // Sayfa yeniden acildiginda Excel'den yuklenmis (veya yapilan
        // stok islemleriyle guncellenmis) kalici veriyi tabloya uygula.
        NebimAdapter.getProducts().then(function (products) {
            renderProducts(products);
        });

    

window.addEventListener('stock:data-changed', event => { if (event.key === "aiStockNebimData") NebimAdapter.getProducts().then(renderProducts); });

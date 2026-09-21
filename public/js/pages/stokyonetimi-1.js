

        /* =========================================================
           THEME SYSTEM
           - localStorage ile kalıcı
           - Sayfa açılmadan önce tema uygulanır
        ========================================================= */

        (function () {

            const savedTheme =
                localStorage.getItem("aiStockTheme");

            if (savedTheme === "light") {

                document.body.classList.add(
                    "light-theme"
                );

            }

        })();


        const themeBtn =
            document.getElementById("themeBtn");


        function updateThemeButton() {

            const isLight =
                document.body.classList.contains(
                    "light-theme"
                );

            themeBtn.textContent =
                isLight ? "☀️" : "🌙";

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
           PRODUCT SEARCH / FILTER
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

        let rows =
            document.querySelectorAll(
                "#stockTable tbody tr"
            );

        const centralRowTemplate = rows[0].cloneNode(true);
        document.querySelector('#stockTable tbody').replaceChildren();
        rows = [];
        async function loadCentralStock() {
            try {
                const products = await NebimAdapter.getProducts();
                const body = document.querySelector('#stockTable tbody'); body.replaceChildren();
                products.forEach(p => {
                    const row = centralRowTemplate.cloneNode(true), cells = row.querySelectorAll('td');
                    const state = StockSizeView.status(p);
                    row.dataset.status = state; row.dataset.category = p.category || 'Genel';
                    row.querySelector('.product-name').textContent = p.name || p.code;
                    row.querySelector('.product-code').textContent = [p.code, p.color, p.size].filter(Boolean).join(' · ');
                    row.querySelector('.product-image').textContent = p.icon || '◇';
                    cells[1].textContent = p.store;
                    row.querySelector('.stock-number strong').textContent = Number(p.stock).toLocaleString('tr-TR');
                    row.querySelector('.stock-number span').textContent = '/ ' + (p.capacity || '—');
                    row.querySelector('.progress-bar').style.width = Math.max(0, Math.min(100, Number(p.stock) / (Number(p.capacity) || 1) * 100)) + '%';
                    cells[3].textContent = p.min || 0;
                    const badge = row.querySelector('.status'); badge.className = 'status ' + state; badge.textContent = StockSizeView.statusText(state);
                    row.querySelectorAll('[onclick]').forEach(button => { button.removeAttribute('onclick'); button.addEventListener('click', () => showDetail(p.name || p.code)); });
                    body.append(row);
                });
                rows = body.querySelectorAll('tr');
                const selectedStore = storeFilter.value, selectedCategory = categoryFilter.value;
                storeFilter.replaceChildren(new Option('Tüm Mağazalar', ''), ...[...new Set(products.map(p => p.store))].map(s => new Option(s, s)));
                categoryFilter.replaceChildren(new Option('Tüm Kategoriler', ''), ...[...new Set(products.map(p => p.category || 'Genel'))].map(s => new Option(s, s)));
                storeFilter.value = selectedStore; categoryFilter.value = selectedCategory;
                const counts = StockSizeView.counts(products), values = [products.reduce((n, p) => n + Number(p.stock), 0), counts.normal, counts.low, counts.critical];
                document.querySelectorAll('.stat-value').forEach((node, i) => { node.textContent = (values[i] || 0).toLocaleString('tr-TR'); });
                filterProducts();
            } catch (error) { showToast(error.message); }
        }
        window.addEventListener('stock:data-changed', loadCentralStock);
        // Wait until this page's filter bindings and toast variables are initialized.
        document.addEventListener('DOMContentLoaded', loadCentralStock);


        function filterProducts() {

            const search =
                productSearch.value
                    .toLocaleLowerCase("tr-TR")
                    .trim();

            const store =
                storeFilter.value
                    .toLocaleLowerCase("tr-TR");

            const status =
                statusFilter.value
                    .toLocaleLowerCase("tr-TR");

            const category =
                categoryFilter.value
                    .toLocaleLowerCase("tr-TR");


            rows.forEach(function (row) {

                const text =
                    row.innerText
                        .toLocaleLowerCase("tr-TR");

                const rowStatus =
                    row.dataset.status
                        .toLocaleLowerCase("tr-TR");

                const rowCategory =
                    row.dataset.category
                        .toLocaleLowerCase("tr-TR");


                const searchMatch =
                    !search ||
                    text.includes(search);


                const storeMatch =
                    !store ||
                    text.includes(store);


                const statusMatch =
                    !status ||
                    rowStatus === status;


                const categoryMatch =
                    !category ||
                    rowCategory === category;


                row.style.display =
                    searchMatch &&
                        storeMatch &&
                        statusMatch &&
                        categoryMatch
                        ? ""
                        : "none";

            });

        }


        productSearch.addEventListener(
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
           DETAIL
        ========================================================= */

        function showDetail(product) {

            showToast(
                product +
                " için stok detay ekranı açılacak."
            );

        }


        /* =========================================================
           STOK İŞLEMİ
        ========================================================= */

        document
            .getElementById("addStockBtn")
            .addEventListener(
                "click",
                function () {

                    showToast(
                        "Yeni stok işlemi ekranı açılacak."
                    );

                }
            );


        /* =========================================================
           EXPORT
        ========================================================= */

        document
            .getElementById("exportBtn")
            .addEventListener(
                "click",
                function () {

                    const table =
                        document.getElementById(
                            "stockTable"
                        );

                    let csv = [];

                    const rows =
                        table.querySelectorAll(
                            "tr"
                        );


                    rows.forEach(function (row) {

                        if (
                            row.style.display === "none"
                        ) {
                            return;
                        }


                        const cols =
                            row.querySelectorAll(
                                "th, td"
                            );


                        const rowData = [];


                        cols.forEach(function (col) {

                            let value =
                                col.innerText
                                    .replace(/\n/g, " ")
                                    .replace(/;/g, ",");

                            rowData.push(
                                '"' + value + '"'
                            );

                        });


                        csv.push(
                            rowData.join(";")
                        );

                    });


                    const blob =
                        new Blob(
                            [
                                "\uFEFF" +
                                csv.join("\n")
                            ],
                            {
                                type:
                                    "text/csv;charset=utf-8;"
                            }
                        );


                    const url =
                        URL.createObjectURL(
                            blob
                        );


                    const link =
                        document.createElement(
                            "a"
                        );

                    link.href = url;

                    link.download =
                        "stok-listesi.csv";

                    document.body.appendChild(
                        link
                    );

                    link.click();

                    link.remove();

                    URL.revokeObjectURL(url);


                    showToast(
                        "Stok listesi dışa aktarıldı."
                    );

                }
            );


        /* =========================================================
           TOAST
        ========================================================= */

        let toastTimer;


        function showToast(message) {

            const toast =
                document.getElementById(
                    "toast"
                );


            toast.textContent =
                message;


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
                    2500
                );

        }


        /* =========================================================
           AUTOMATIC ACTIVE MENU
        ========================================================= */

        (function () {

            const currentPage =
                window.location.pathname
                    .split("/")
                    .pop()
                    .toLowerCase();


            document
                .querySelectorAll(".menu-item")
                .forEach(function (item) {

                    const href =
                        item
                            .getAttribute("href")
                            .split("/")
                            .pop()
                            .toLowerCase();


                    if (
                        currentPage === href
                    ) {

                        document
                            .querySelectorAll(".menu-item")
                            .forEach(
                                menu =>
                                    menu.classList
                                        .remove("active")
                            );


                        item.classList.add(
                            "active"
                        );

                    }

                });

        })();


        /* =========================================================
           KULLANICI MENÜSÜ
        ========================================================= */

        const userArea =
            document.getElementById("userArea");

        userArea.addEventListener(
            "click",
            function (event) {

                if (
                    event.target.closest(".account-menu")
                ) {
                    return;
                }

                this.classList.toggle("open");
            }
        );

        document.addEventListener(
            "click",
            function (event) {

                if (!userArea.contains(event.target)) {

                    userArea.classList.remove("open");
                }
            }
        );


        /* =========================================================
           BİLDİRİMLER
        ========================================================= */

        document.getElementById("notificationBtn")
            .addEventListener(
                "click",
                function () {

                    window.location.href =
                        "/Bildirimler";
                }
            );


        /* =========================================================
           GÜVENLİ ÇIKIŞ
        ========================================================= */

        

    

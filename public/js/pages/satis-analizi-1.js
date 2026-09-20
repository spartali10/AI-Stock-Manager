

        /* =========================================================
           THEME SYSTEM
        ========================================================= */

        (function () {

            const savedTheme =
                localStorage.getItem(
                    "aiStockTheme"
                );


            if (savedTheme === "light") {

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
           PRODUCT SEARCH
        ========================================================= */

        const globalSearch =
            document.getElementById(
                "globalSearch"
            );

        const chartSearch =
            document.getElementById(
                "chartSearch"
            );

        const chartStore =
            document.getElementById(
                "chartStore"
            );

        const chartCategory =
            document.getElementById(
                "chartCategory"
            );

        let salesRows =
            document.querySelectorAll(
                "#salesTable tbody tr"
            );


        function normalizeText(value) {

            return value
                .toLocaleLowerCase("tr-TR")
                .trim();

        }


        function filterSalesTable() {

            const globalValue =
                normalizeText(
                    globalSearch.value
                );


            const chartValue =
                normalizeText(
                    chartSearch.value
                );


            const storeValue =
                normalizeText(
                    chartStore.value
                );


            const categoryValue =
                normalizeText(
                    chartCategory.value
                );


            let visibleCount = 0;


            salesRows.forEach(
                function (row) {


                    const rowSearch =
                        normalizeText(
                            row.dataset.search || ""
                        );


                    const rowStore =
                        normalizeText(
                            row.dataset.store || ""
                        );


                    const rowCategory =
                        normalizeText(
                            row.dataset.category || ""
                        );


                    const rowText =
                        normalizeText(
                            row.innerText
                        );


                    const searchMatch =

                        (
                            !globalValue ||

                            rowText.includes(
                                globalValue
                            ) ||

                            rowSearch.includes(
                                globalValue
                            )
                        )

                        &&

                        (
                            !chartValue ||

                            rowText.includes(
                                chartValue
                            ) ||

                            rowSearch.includes(
                                chartValue
                            )
                        );


                    const storeMatch =

                        !storeValue ||

                        rowStore ===
                        storeValue;


                    const categoryMatch =

                        !categoryValue ||

                        rowCategory ===
                        categoryValue;


                    const visible =

                        searchMatch &&
                        storeMatch &&
                        categoryMatch;


                    row.style.display =
                        visible
                            ? ""
                            : "none";


                    if (visible) {
                        visibleCount++;
                    }

                }
            );


            document.getElementById(
                "productCount"
            ).textContent =
                visibleCount +
                " ürün";

        }


        globalSearch.addEventListener(
            "input",
            filterSalesTable
        );


        chartSearch.addEventListener(
            "input",
            filterSalesTable
        );


        chartStore.addEventListener(
            "change",
            filterSalesTable
        );


        chartCategory.addEventListener(
            "change",
            filterSalesTable
        );


        /* =========================================================
           PERIOD BUTTONS
        ========================================================= */

        const periodButtons =
            document.querySelectorAll(
                ".period-btn"
            );


        const chartPeriod =
            document.getElementById(
                "chartPeriod"
            );


        periodButtons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {


                        periodButtons.forEach(
                            function (item) {

                                item.classList.remove(
                                    "active"
                                );

                            }
                        );


                        button.classList.add(
                            "active"
                        );


                        const period =
                            button.dataset.period;


                        if (

                            period === "7" ||

                            period === "30" ||

                            period === "90" || period === "365"

                        ) {

                            chartPeriod.value =
                                period;

                        }


                        showToast(
                            button.innerText +
                            " satış analizi gösteriliyor."
                        );

                    }
                );

            }
        );


        chartPeriod.addEventListener(
            "change",
            function () {


                periodButtons.forEach(
                    function (button) {

                        button.classList.toggle(
                            "active",

                            button.dataset.period ===
                            chartPeriod.value
                        );

                    }
                );


                showToast(
                    "Analiz dönemi güncellendi."
                );

            }
        );


        /* =========================================================
           EXPORT CSV
        ========================================================= */

        document
            .getElementById("exportBtn")
            .addEventListener(
                "click",
                function () {


                    const table =
                        document.getElementById(
                            "salesTable"
                        );


                    const rows =
                        table.querySelectorAll(
                            "tr"
                        );


                    let csv = [];


                    rows.forEach(
                        function (row) {


                            if (
                                row.style.display ===
                                "none"
                            ) {

                                return;

                            }


                            const columns =
                                row.querySelectorAll(
                                    "th, td"
                                );


                            const data = [];


                            columns.forEach(
                                function (column) {


                                    const value =
                                        column.innerText
                                            .replace(
                                                /\n/g,
                                                " "
                                            )
                                            .replace(
                                                /;/g,
                                                ","
                                            );


                                    data.push(
                                        '"' +
                                        value +
                                        '"'
                                    );

                                }
                            );


                            csv.push(
                                data.join(";")
                            );

                        }
                    );


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
                        "satis-analizi.csv";


                    document.body.appendChild(
                        link
                    );


                    link.click();


                    link.remove();


                    URL.revokeObjectURL(
                        url
                    );


                    showToast(
                        "Satış analizi dışa aktarıldı."
                    );

                }
            );


        /* =========================================================
           REPORT BUTTON
        ========================================================= */

        document
            .getElementById("reportBtn")
            .addEventListener(
                "click",
                function () {

                    showToast(
                        "Satış raporu oluşturuluyor..."
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
                .forEach(
                    function (item) {


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
           GLOBAL SEARCH - ENTER
        ========================================================= */

        globalSearch.addEventListener(
            "keydown",
            function (event) {


                if (
                    event.key === "Enter"
                ) {


                    chartSearch.value =
                        globalSearch.value;


                    filterSalesTable();


                    showToast(
                        "Satış sonuçları filtrelendi."
                    );

                }

            }
        );


        /* =========================================================
           USER ACCOUNT MENU
        ========================================================= */

        (function () {


            const userArea =
                document.getElementById(
                    "userArea"
                );


            const accountMenu =
                document.getElementById(
                    "accountMenu"
                );


            const logoutBtn =
                document.getElementById(
                    "logoutBtn"
                );


            const onlineMinutes =
                document.getElementById(
                    "onlineMinutes"
                );


            const accountOnlineMinutes =
                document.getElementById(
                    "accountOnlineMinutes"
                );


            if (
                !userArea ||
                !accountMenu
            ) {

                return;

            }


            /* -----------------------------------------------------
               OPEN / CLOSE
            ----------------------------------------------------- */

            function toggleAccountMenu() {


                const isOpen =
                    userArea.classList.toggle(
                        "open"
                    );


                userArea.setAttribute(
                    "aria-expanded",
                    isOpen
                        ? "true"
                        : "false"
                );

            }


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


                    toggleAccountMenu();

                }
            );


            /* -----------------------------------------------------
               KEYBOARD
            ----------------------------------------------------- */

            userArea.addEventListener(
                "keydown",
                function (event) {


                    if (

                        event.key === "Enter" ||

                        event.key === " "

                    ) {


                        event.preventDefault();


                        toggleAccountMenu();

                    }

                }
            );


            /* -----------------------------------------------------
               OUTSIDE CLICK
            ----------------------------------------------------- */

            document.addEventListener(
                "click",
                function (event) {


                    if (
                        !userArea.contains(
                            event.target
                        )
                    ) {


                        userArea.classList.remove(
                            "open"
                        );


                        userArea.setAttribute(
                            "aria-expanded",
                            "false"
                        );

                    }

                }
            );


            /* -----------------------------------------------------
               LOGIN TIME
            ----------------------------------------------------- */

            const loginTimeKey =
                "aiStockLoginTime";


            let loginTime =
                localStorage.getItem(
                    loginTimeKey
                );


            if (!loginTime) {


                loginTime =
                    Date.now();


                localStorage.setItem(
                    loginTimeKey,
                    loginTime
                );

            }


            function updateOnlineTime() {


                const elapsed =
                    Math.floor(

                        (
                            Date.now() -
                            Number(loginTime)

                        ) / 60000

                    );


                const minutes =
                    Math.max(
                        0,
                        elapsed
                    );


                if (onlineMinutes) {

                    onlineMinutes.textContent =
                        minutes;

                }


                if (accountOnlineMinutes) {

                    accountOnlineMinutes.textContent =
                        minutes;

                }

            }


            updateOnlineTime();


            setInterval(
                updateOnlineTime,
                30000
            );


            /* -----------------------------------------------------
               LOGOUT
            ----------------------------------------------------- */

            if (logoutBtn) {


                

            }

        })();

    

        const performanceEscape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
        let performanceRequest = 0;
        async function refreshProductPerformance() {
            const request = ++performanceRequest;
            const body = document.querySelector('#salesTable tbody');
            try {
                const [context, warehouses] = await Promise.all([NebimAdapter.getTransferOrderContext(), NebimAdapter.getWarehouses()]);
                if (request !== performanceRequest) return;
                context.products = context.products.filter(p => !warehouses.some(w => normalizeText(w.name) === normalizeText(p.store || '')));
                const products = SalesPerformance.build(context, Number(chartPeriod.value) || 30);
                for (const [select, values, label] of [[chartStore, products.map(p => p.store), 'Tüm Mağazalar'], [chartCategory, products.map(p => p.category || 'Genel'), 'Tüm Kategoriler']]) {
                    const selected = select.value;
                    select.replaceChildren(new Option(label, ''), ...[...new Set(values)].filter(Boolean).map(value => new Option(value, value)));
                    if ([...select.options].some(option => option.value === selected)) select.value = selected;
                }
                const number = value => value === null ? 'Veri yok' : Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
                body.innerHTML = products.map((p, index) => {
                    const e = performanceEscape;
                    const trend = p.trend === null ? 'Veri yok' : (p.trend > 0 ? '↑ ' : p.trend < 0 ? '↓ ' : '') + number(Math.abs(p.trend)) + '%';
                    const performance = p.performance === null ? 'Veri yok' : '<div class="mini-bar" title="Satılan / (satılan + mevcut stok)"><div class="mini-bar-fill" style="width:' + p.performance + '%"></div></div><span>' + number(p.performance) + '%</span>';
                    return '<tr data-store="' + e(p.store) + '" data-category="' + e(p.category || 'Genel') + '" data-search="' + e(p.name + ' ' + p.code + ' ' + p.color) + '">' +
                        '<td><span class="rank">' + String(index + 1).padStart(2, '0') + '</span></td>' +
                        '<td><div class="product"><div class="product-image">' + e(p.icon || 'K') + '</div><div><div class="product-name">' + e(p.name || p.code) + '</div><div class="product-code">' + e(p.code) + (p.color ? ' · ' + e(p.color) : '') + '</div></div></div></td>' +
                        '<td>' + e(p.store) + '</td><td><span class="sales-value">' + number(p.stock) + '</span></td><td><span class="sales-value">' + number(p.sold) + '</span></td>' +
                        '<td><span class="sales-value">' + (p.revenue === null ? 'Veri yok' : '₺' + number(p.revenue)) + '</span></td>' +
                        '<td><span class="' + (p.trend > 0 ? 'sales-positive' : p.trend < 0 ? 'sales-negative' : '') + '">' + trend + '</span></td><td>' + performance + '</td></tr>';
                }).join('');
                salesRows = body.querySelectorAll('tr');
                filterSalesTable();
                if (!products.length) body.innerHTML = '<tr><td colspan="8">Mağazalarda kayıtlı ürün bulunmuyor.</td></tr>';
            } catch (error) {
                if (request !== performanceRequest) return;
                body.innerHTML = '<tr><td colspan="8">Stok verileri yüklenemedi. Sayfayı yeniden deneyin.</td></tr>';
                salesRows = [];
                document.getElementById('productCount').textContent = 'Veri yüklenemedi';
            }
        }
        chartPeriod.addEventListener('change', refreshProductPerformance);
        periodButtons.forEach(button => button.addEventListener('click', refreshProductPerformance));
        window.addEventListener('storage', event => { if (event.key === 'aiStockNebimData') refreshProductPerformance(); });
        window.addEventListener('focus', refreshProductPerformance);
        refreshProductPerformance();

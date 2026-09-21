

        /* =========================================================
           CONFIG
        ========================================================= */

        const CONFIG = {

            loginTimeKey:
                "aiStockLoginTime",

            userKey:
                "aiStockUser",

            themeKey: "aiStockTheme"

        };


        /* =========================================================
           DEMO DATA
        ========================================================= */

        const DEFAULT_DATA = CentralDashboard.empty();


        /* =========================================================
           STATE
        ========================================================= */

        let dashboardData =
            loadDashboardData();

        let onlineTimer =
            null;

        let toastTimer =
            null;


        /* =========================================================
           DOM
        ========================================================= */

        const $ = selector =>
            document.querySelector(selector);

        const $$ = selector =>
            document.querySelectorAll(selector);


        /* =========================================================
           LOGIN / SESSION
        ========================================================= */

        function checkSession() {

            const loginTime =
                parseInt(
                    (window.StockAuth.current() ? (sessionStorage.getItem(CONFIG.loginTimeKey) || Date.now()) : null),
                    10
                );


            /*
             * Login zamanı yoksa dashboard'a
             * erişim verilmez.
             */
            if (
                !Number.isFinite(loginTime) ||
                loginTime <= 0
            ) {

                window.location.replace(
                    "/Login"
                );

                return false;

            }


            return true;
        }


        if (!checkSession()) {

            throw new Error(
                "Geçerli oturum bulunamadı."
            );

        }


        /* =========================================================
           USER
        ========================================================= */

        function loadUser() {

            const savedUser =
                JSON.stringify(window.StockAuth.current());


            if (!savedUser) {
                return;
            }


            try {

                const user =
                    JSON.parse(savedUser);


                if (!user) {
                    return;
                }


                const userName =
                    user.name ||
                    user.username ||
                    "Admin";


                const firstLetter =
                    userName
                        .trim()
                        .charAt(0)
                        .toUpperCase();


                const userNameElement =
                    $("#userName");

                const accountNameElement =
                    $("#accountName");

                const avatarElement =
                    $("#avatar");


                if (userNameElement) {

                    userNameElement.textContent =
                        userName;

                }


                if (accountNameElement) {

                    accountNameElement.textContent =
                        userName;

                }


                if (avatarElement) {

                    avatarElement.textContent =
                        firstLetter || "M";

                }

            } catch (error) {

                console.warn(
                    "Kullanıcı bilgisi okunamadı."
                );

            }

        }


        loadUser();


        /* =========================================================
           ONLINE TIME
        ========================================================= */

        function updateOnlineTime() {

            const loginTime =
                parseInt(
                    (window.StockAuth.current() ? (sessionStorage.getItem(CONFIG.loginTimeKey) || Date.now()) : null),
                    10
                );


            if (
                !Number.isFinite(loginTime) ||
                loginTime <= 0
            ) {

                if (onlineTimer) {

                    clearInterval(
                        onlineTimer
                    );

                }


                window.location.replace(
                    "/Login"
                );

                return;

            }


            let elapsed =
                Date.now() -
                loginTime;


            if (elapsed < 0) {

                elapsed = 0;

            }


            const minutes =
                Math.floor(
                    elapsed / 60000
                );


            const onlineMinutes =
                $("#onlineMinutes");

            const accountOnlineMinutes =
                $("#accountOnlineMinutes");


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


        onlineTimer =
            setInterval(
                updateOnlineTime,
                1000
            );


        /* =========================================================
           STORAGE EVENTS
        ========================================================= */

        window.addEventListener(
            "storage",
            function (event) {

                if (
                    event.key ===
                    CONFIG.loginTimeKey
                ) {

                    if (!event.newValue) {

                        if (onlineTimer) {

                            clearInterval(
                                onlineTimer
                            );

                        }


                        window.location.replace(
                            "/Login"
                        );

                        return;

                    }


                    updateOnlineTime();

                }


                if (
                    event.key ===
                    CONFIG.userKey
                ) {

                    loadUser();

                }


                if (
                    event.key ===
                    CONFIG.themeKey
                ) {

                    applyTheme(
                        event.newValue ||
                        "dark"
                    );

                }

            }
        );


        /* =========================================================
           THEME
        ========================================================= */

        function applyTheme(theme) {

            const isLight =
                theme === "light";


            document.body.classList.toggle(
                "light-theme",
                isLight
            );


            const themeButton =
                $("#themeBtn");


            if (!themeButton) {
                return;
            }


            themeButton.textContent =
                isLight
                    ? "☀️"
                    : "🌙";


            themeButton.title =
                isLight
                    ? "Karanlık temaya geç"
                    : "Açık temaya geç";

        }


        const savedTheme =
            localStorage.getItem(
                CONFIG.themeKey
            ) || "dark";


        applyTheme(savedTheme);


        $("#themeBtn").addEventListener(
            "click",
            function () {

                const isLight =
                    document.body.classList.contains(
                        "light-theme"
                    );


                const newTheme =
                    isLight
                        ? "dark"
                        : "light";


                localStorage.setItem(
                    CONFIG.themeKey,
                    newTheme
                );


                applyTheme(newTheme);

            }
        );


        /* =========================================================
           USER MENU
        ========================================================= */

        const userArea =
            $("#userArea");


        function closeUserMenu() {

            userArea.classList.remove(
                "open"
            );

            userArea.setAttribute(
                "aria-expanded",
                "false"
            );

        }


        function toggleUserMenu() {

            const isOpen =
                userArea.classList.toggle(
                    "open"
                );


            userArea.setAttribute(
                "aria-expanded",
                String(isOpen)
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


                toggleUserMenu();

            }
        );


        userArea.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    toggleUserMenu();

                }


                if (
                    event.key === "Escape"
                ) {

                    closeUserMenu();

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

                    closeUserMenu();

                }

            }
        );


        /* =========================================================
           NOTIFICATION
        ========================================================= */

        $("#notificationBtn").addEventListener(
            "click",
            function () {

                window.location.href =
                    "/Bildirimler";

            }
        );


        /* =========================================================
           DASHBOARD DATA
        ========================================================= */

        function loadDashboardData() { return CentralDashboard.empty(); }




        /* =========================================================
           STATS RENDER
        ========================================================= */

        function renderStats() {

            const container =
                $("#statsContainer");


            container.innerHTML =
                dashboardData.stats
                    .map(function (stat) {

                        return `
                    <div class="stat-card">

                        <div class="stat-top">

                            <div class="stat-title">
                                ${escapeHTML(stat.title)}
                            </div>

                            <div class="stat-icon">
                                ${escapeHTML(stat.icon)}
                            </div>

                        </div>

                        <div class="stat-value">
                            ${escapeHTML(stat.value)}
                        </div>

                        <div class="stat-description ${escapeHTML(stat.type)}">
                            ${escapeHTML(stat.description)}
                        </div>

                    </div>
                `;

                    })
                    .join("");

        }


        /* =========================================================
           CHART RENDER
        ========================================================= */

        function renderChart(period = "7") {

            const chart =
                dashboardData.charts[period];


            if (!chart) {
                return;
            }


            $("#chartTotal").textContent =
                chart.total;


            $("#chartSubtitle").textContent =
                chart.subtitle;


            $("#chartChange").textContent =
                chart.change;


            const chartElement =
                $("#salesChart");


            chartElement
                .querySelectorAll(
                    ".bar-group"
                )
                .forEach(
                    element =>
                        element.remove()
                );


            chart.labels.forEach(
                function (label, index) {

                    const group =
                        document.createElement(
                            "div"
                        );


                    group.className =
                        "bar-group";


                    const secondary =
                        document.createElement(
                            "div"
                        );


                    secondary.className =
                        "bar secondary";


                    secondary.style.height =
                        chart.secondary[index] +
                        "%";


                    const primary =
                        document.createElement(
                            "div"
                        );


                    primary.className =
                        "bar";


                    primary.style.height =
                        chart.primary[index] +
                        "%";


                    group.appendChild(
                        secondary
                    );


                    group.appendChild(
                        primary
                    );


                    chartElement.appendChild(
                        group
                    );

                }
            );


            const labels =
                $("#chartLabels");


            labels.innerHTML =
                chart.labels
                    .map(
                        label =>
                            `<div class="chart-label">
                        ${escapeHTML(label)}
                    </div>`
                    )
                    .join("");

        }


        $("#chartPeriod").addEventListener(
            "change",
            function () {

                renderChart(
                    this.value
                );


                const text =
                    this.options[
                        this.selectedIndex
                    ].text;


                showToast(
                    `${text} satış verileri görüntüleniyor.`
                );

            }
        );


        /* =========================================================
           ACTIVITY RENDER
        ========================================================= */

        function renderActivities() {

            const container =
                $("#activityList");


            container.innerHTML =
                dashboardData.activities
                    .map(function (item) {

                        return `
                    <div class="activity">

                        <div class="activity-icon ${escapeHTML(item.type)}">
                            ${escapeHTML(item.icon)}
                        </div>

                        <div class="activity-info">

                            <div class="activity-title">
                                ${escapeHTML(item.title)}
                            </div>

                            <div class="activity-description">
                                ${escapeHTML(item.description)}
                            </div>

                        </div>

                        <div class="activity-time">
                            ${escapeHTML(item.time)}
                        </div>

                    </div>
                `;

                    })
                    .join("");

        }


        /* =========================================================
           STORE RENDER
        ========================================================= */

        function renderStores() {

            const container =
                $("#storeList");


            container.innerHTML =
                dashboardData.stores
                    .map(function (store) {

                        const warning =
                            store.type === "warning";


                        return `
                    <div class="store-item">

                        <div class="store-top">

                            <div class="store-name">
                                ${escapeHTML(store.name)}
                            </div>

                            <div
                                class="store-percent"
                                style="
                                    color:
                                    ${warning
                                ? "var(--yellow)"
                                : "var(--green)"};
                                "
                            >
                                %${store.percent}
                            </div>

                        </div>

                        <div class="store-progress">

                            <div
                                class="store-progress-bar"
                                style="
                                    width:${store.percent}%;
                                    ${warning
                                ? `
                                            background:
                                            linear-gradient(
                                                90deg,
                                                #d89d00,
                                                #ffd000
                                            );
                                        `
                                : ""}
                                "
                            ></div>

                        </div>

                        <div class="store-info">

                            <span>
                                ${escapeHTML(store.stock)}
                            </span>

                            <span>
                                ${escapeHTML(store.sales)}
                            </span>

                        </div>

                    </div>
                `;

                    })
                    .join("");

        }


        /* =========================================================
           ALERT RENDER
        ========================================================= */

        function renderAlerts() {

            const container =
                $("#alertList");


            const alerts =
                dashboardData.alerts;


            container.innerHTML =
                alerts
                    .map(function (alert) {

                        const yellow =
                            alert.type === "yellow";


                        return `
                    <div class="alert-item">

                        <div
                            class="alert-icon"
                            style="
                                ${yellow
                                ? `
                                        color:var(--yellow);
                                        background:rgba(255,208,0,.05);
                                        border-color:rgba(255,208,0,.15);
                                    `
                                : ""}
                            "
                        >
                            ${escapeHTML(alert.icon)}
                        </div>

                        <div class="alert-text">

                            <div class="alert-title">
                                ${escapeHTML(alert.title)}
                            </div>

                            <div class="alert-desc">
                                ${escapeHTML(alert.description)}
                            </div>

                        </div>

                    </div>
                `;

                    })
                    .join("");


            $("#alertCount").textContent =
                `${alerts.length} UYARI`;

        }


        /* =========================================================
           AI INSIGHT
        ========================================================= */

        function renderAI() { $('#aiInsightText').textContent = 'Güncel stok ve transferler merkezi veritabanından okunuyor. Ayrıntılar için Stok ve Akıllı Dağıtım ekranlarını kullanın.'; }


        /* =========================================================
           DASHBOARD RENDER
        ========================================================= */

        function renderDashboard() {

            renderStats();

            renderChart(
                $("#chartPeriod").value
            );

            renderActivities();

            renderStores();

            renderAlerts();

            renderAI();

        }


        /* =========================================================
           SEARCH
        ========================================================= */

        const globalSearch =
            $("#globalSearch");


        globalSearch.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key !== "Enter"
                ) {

                    return;

                }


                const value =
                    globalSearch.value.trim();


                if (!value) {

                    showToast(
                        "Aramak istediğiniz ürün, kod veya mağazayı yazın."
                    );

                    return;

                }


                window.location.href =
                    "/Stok?search=" +
                    encodeURIComponent(
                        value
                    );

            }
        );


        /* =========================================================
           QUICK STOCK
        ========================================================= */

        $("#quickStockBtn").addEventListener(
            "click",
            function () {

                showToast(
                    "Stok işlemi ekranı açılıyor..."
                );


                setTimeout(
                    function () {

                        window.location.href =
                            "/Stok";

                    },
                    500
                );

            }
        );


        /* =========================================================
           REFRESH
        ========================================================= */

        $('#refreshBtn').addEventListener('click', async function () {
            this.disabled = true; this.textContent = '↻ Güncelleniyor...';
            try { dashboardData = await CentralDashboard.load(); renderDashboard(); showToast('Dashboard verileri güncellendi.'); }
            catch (error) { showToast(error.message); }
            finally { this.disabled = false; this.textContent = '↻ Yenile'; }
        });


        /* =========================================================
           FRESH DEMO DATA
        ========================================================= */

        // Refresh reads the central API; no random demo values are generated.


        /* =========================================================
           AI ACTION
        ========================================================= */

        $("#aiActionBtn").addEventListener(
            "click",
            function () {

                showToast(
                    "AI önerileri ekranına yönlendiriliyorsunuz..."
                );


                setTimeout(
                    function () {

                        window.location.href =
                            "/AiOnerileri";

                    },
                    500
                );

            }
        );


        /* =========================================================
           LOGOUT
        ========================================================= */

        


        /* =========================================================
           TOAST
        ========================================================= */

        function showToast(message) {

            const toast =
                $("#toast");


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
           ACTIVE MENU
        ========================================================= */

        function setActiveMenu() {

            const currentPage =
                window.location.pathname
                    .split("/")
                    .pop()
                    .toLowerCase();


            $$(".menu-item")
                .forEach(function (item) {

                    const href =
                        item
                            .getAttribute("href")
                            .split("/")
                            .pop()
                            .toLowerCase();


                    item.classList.toggle(
                        "active",
                        currentPage === href ||
                        (
                            currentPage === "" &&
                            href === "home"
                        )
                    );

                });

        }


        setActiveMenu();


        /* =========================================================
           ESCAPE HTML
        ========================================================= */

        function escapeHTML(value) {

            return String(value)
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#039;");

        }


        /* =========================================================
           INITIAL RENDER
        ========================================================= */

        renderDashboard();


        /* =========================================================
           PAGE VISIBILITY
        ========================================================= */

        document.addEventListener(
            "visibilitychange",
            function () {

                if (
                    !document.hidden
                ) {

                    updateOnlineTime();

                }

            }
        );

    
async function refreshCentralDashboard() { try { dashboardData = await CentralDashboard.load(); renderDashboard(); } catch (error) { showToast(error.message); } }
refreshCentralDashboard(); window.addEventListener('stock:data-changed', refreshCentralDashboard);

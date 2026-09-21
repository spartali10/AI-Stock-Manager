

        /* =========================================================
           CONFIG
        ========================================================= */

        const CONFIG = {

            loginTimeKey:
                "aiStockLoginTime",

            userKey:
                "aiStockUser",

            themeKey:
                "aiStockTheme",

            dashboardKey:
                "aiStockDashboardData"

        };


        /* =========================================================
           DEMO DATA
        ========================================================= */

        const DEFAULT_DATA = {

            stats: [

                {
                    title: "Toplam Stok",
                    value: "125.420",
                    icon: "◇",
                    description: "↑ %4.8 geçen aya göre",
                    type: "green"
                },

                {
                    title: "Bugünkü Satış",
                    value: "2.486",
                    icon: "↗",
                    description: "↑ %12.4 dünkü satışa göre",
                    type: "green"
                },

                {
                    title: "Düşük Stok",
                    value: "342",
                    icon: "!",
                    description: "Kontrol edilmesi gereken ürün",
                    type: "yellow"
                },

                {
                    title: "Kritik Stok",
                    value: "87",
                    icon: "⚠",
                    description: "Acil aksiyon gerekli",
                    type: "red"
                }

            ],


            charts: {

                "7": {

                    total: "₺ 486.240",

                    subtitle:
                        "Bu haftanın toplam satış cirosu",

                    change: "↑ %18.6",

                    labels: [
                        "Pzt",
                        "Sal",
                        "Çar",
                        "Per",
                        "Cum",
                        "Cmt",
                        "Paz"
                    ],

                    primary: [
                        65,
                        72,
                        59,
                        82,
                        76,
                        91,
                        84
                    ],

                    secondary: [
                        48,
                        55,
                        44,
                        67,
                        58,
                        71,
                        62
                    ]

                },


                "30": {

                    total: "₺ 1.842.620",

                    subtitle:
                        "Son 30 günlük toplam satış cirosu",

                    change: "↑ %14.2",

                    labels: [
                        "1. Hafta",
                        "2. Hafta",
                        "3. Hafta",
                        "4. Hafta"
                    ],

                    primary: [
                        68,
                        79,
                        88,
                        94
                    ],

                    secondary: [
                        52,
                        61,
                        69,
                        74
                    ]

                },


                "90": {

                    total: "₺ 5.486.240",

                    subtitle:
                        "Son 3 aylık toplam satış cirosu",

                    change: "↑ %21.8",

                    labels: [
                        "Nisan",
                        "Mayıs",
                        "Haziran",
                        "Temmuz",
                        "Ağustos"
                    ],

                    primary: [
                        57,
                        69,
                        74,
                        87,
                        94
                    ],

                    secondary: [
                        43,
                        52,
                        59,
                        67,
                        76
                    ]

                }

            },


            activities: [

                {
                    icon: "✓",
                    type: "green",
                    title: "Stok transferi tamamlandı",
                    description:
                        "Ankara Mağaza 01 → İzmir Mağaza 01",
                    time: "5 dk"
                },

                {
                    icon: "◇",
                    type: "",
                    title: "Yeni stok girişi yapıldı",
                    description:
                        "480 adet Nike T-Shirt 1023",
                    time: "18 dk"
                },

                {
                    icon: "!",
                    type: "yellow",
                    title: "Düşük stok uyarısı",
                    description:
                        "Pantolon 2045 minimum seviyeye yaklaştı",
                    time: "32 dk"
                },

                {
                    icon: "✓",
                    type: "green",
                    title: "Nebim V3 senkronizasyonu tamamlandı",
                    description:
                        "1.248 ürün başarıyla güncellendi",
                    time: "1 sa"
                },

                {
                    icon: "✦",
                    type: "",
                    title: "AI stok analizi oluşturuldu",
                    description:
                        "14 yeni transfer önerisi hazırlandı",
                    time: "2 sa"
                }

            ],


            stores: [

                {
                    name: "İstanbul Mağaza 01",
                    percent: 94,
                    stock: "24.820 stok",
                    sales: "₺ 128.400 satış",
                    type: "normal"
                },

                {
                    name: "Ankara Mağaza 01",
                    percent: 88,
                    stock: "21.640 stok",
                    sales: "₺ 104.820 satış",
                    type: "normal"
                },

                {
                    name: "İzmir Mağaza 01",
                    percent: 76,
                    stock: "18.420 stok",
                    sales: "₺ 86.240 satış",
                    type: "warning"
                },

                {
                    name: "Bursa Mağaza 01",
                    percent: 71,
                    stock: "15.680 stok",
                    sales: "₺ 74.520 satış",
                    type: "warning"
                },

                {
                    name: "İstanbul Mağaza 02",
                    percent: 83,
                    stock: "17.340 stok",
                    sales: "₺ 92.260 satış",
                    type: "normal"
                }

            ],


            alerts: [

                {
                    icon: "⚠",
                    title: "Kritik stok seviyesi",
                    description:
                        "Sweatshirt 3021 — İzmir Mağaza 01",
                    type: "red"
                },

                {
                    icon: "!",
                    title: "342 ürün düşük stokta",
                    description:
                        "Stok yönetimi ekranından kontrol edin.",
                    type: "red"
                },

                {
                    icon: "◌",
                    title: "Senkronizasyon bekliyor",
                    description:
                        "Nebim V3 ile son senkronizasyon 2 saat önce.",
                    type: "yellow"
                }

            ]

        };


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
                    localStorage.getItem(
                        CONFIG.loginTimeKey
                    ),
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
                localStorage.getItem(
                    CONFIG.userKey
                );


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
                    localStorage.getItem(
                        CONFIG.loginTimeKey
                    ),
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

        function loadDashboardData() {

            const saved =
                localStorage.getItem(
                    CONFIG.dashboardKey
                );


            if (!saved) {

                return structuredClone(
                    DEFAULT_DATA
                );

            }


            try {

                return JSON.parse(saved);

            } catch (error) {

                console.warn(
                    "Dashboard verisi okunamadı."
                );


                return structuredClone(
                    DEFAULT_DATA
                );

            }

        }


        function saveDashboardData() {

            localStorage.setItem(
                CONFIG.dashboardKey,
                JSON.stringify(
                    dashboardData
                )
            );

        }


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

        function renderAI() {

            $("#aiInsightText").innerHTML = `
        Son 14 günlük satış verilerine göre
        <strong>İzmir Mağaza 01</strong>
        için stok riski artıyor.

        <br><br>

        Özellikle
        <strong>Sweatshirt 3021</strong>
        ürününde yaklaşık 3 günlük stok kaldığı
        tahmin ediliyor.

        <br><br>

        AI sistemi,
        <strong>Ankara Mağaza 01 → İzmir Mağaza 01</strong>
        yönünde stok transferi öneriyor.
    `;

        }


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

        $("#refreshBtn").addEventListener(
            "click",
            function () {

                const button =
                    this;


                button.disabled =
                    true;


                button.textContent =
                    "↻ Güncelleniyor...";


                document
                    .querySelector(".main")
                    .classList.add(
                        "is-loading"
                    );


                setTimeout(
                    function () {

                        /*
                         * Gerçek API bağlandığında
                         * bu bölüm fetch/API çağrısı
                         * ile değiştirilebilir.
                         */
                        dashboardData =
                            generateFreshDemoData();


                        saveDashboardData();

                        renderDashboard();


                        button.disabled =
                            false;


                        button.textContent =
                            "↻ Yenile";


                        document
                            .querySelector(".main")
                            .classList.remove(
                                "is-loading"
                            );


                        showToast(
                            "Dashboard verileri güncellendi."
                        );

                    },
                    900
                );

            }
        );


        /* =========================================================
           FRESH DEMO DATA
        ========================================================= */

        function generateFreshDemoData() {

            const data =
                structuredClone(
                    DEFAULT_DATA
                );


            const randomChange =
                Math.floor(
                    Math.random() * 5000
                );


            const totalStock =
                125420 +
                randomChange;


            const todaySales =
                2486 +
                Math.floor(
                    Math.random() * 150
                );


            const lowStock =
                342 +
                Math.floor(
                    Math.random() * 10
                );


            const criticalStock =
                87 +
                Math.floor(
                    Math.random() * 5
                );


            data.stats[0].value =
                totalStock
                    .toLocaleString("tr-TR");


            data.stats[1].value =
                todaySales
                    .toLocaleString("tr-TR");


            data.stats[2].value =
                lowStock
                    .toLocaleString("tr-TR");


            data.stats[3].value =
                criticalStock
                    .toLocaleString("tr-TR");


            data.charts["7"].primary =
                data.charts["7"].primary
                    .map(
                        value =>
                            Math.max(
                                20,
                                Math.min(
                                    98,
                                    value +
                                    Math.floor(
                                        Math.random() * 11
                                    ) - 5
                                )
                            )
                    );


            return data;

        }


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

    


        /* =========================================================
           SİSTEM AYARLARI
        ========================================================= */

        const LOGIN_TIME_KEY = "aiStockLoginTime";
        const USER_KEY = "aiStockUser";
        const THEME_KEY = "aiStockTheme";


        /* =========================================================
           OTURUM KONTROLÜ
        ========================================================= */

        function checkLogin() {

            const loginTime =
                localStorage.getItem(LOGIN_TIME_KEY);

            if (!loginTime) {

                window.location.replace("/Login");

                return false;
            }

            return true;
        }

        if (!checkLogin()) {

            throw new Error("Oturum bulunamadı.");
        }


        /* =========================================================
           KULLANICI BİLGİLERİ
        ========================================================= */

        function loadUser() {

            const raw =
                localStorage.getItem(USER_KEY);

            if (!raw) return;

            try {

                const user =
                    JSON.parse(raw);

                const name =
                    user.name ||
                    user.username ||
                    user.email ||
                    "Admin";

                document.getElementById("userName")
                    .textContent = name;

                document.getElementById("accountName")
                    .textContent = name;

                document.getElementById("avatar")
                    .textContent =
                    name.trim().charAt(0).toUpperCase();

            } catch (error) {

                console.log("Kullanıcı bilgisi okunamadı.");

            }
        }

        loadUser();


        /* =========================================================
           TEMA
        ========================================================= */

        function applyTheme(theme) {

            const light =
                theme === "light";

            document.body.classList.toggle(
                "light",
                light
            );

            document.getElementById("themeBtn")
                .textContent =
                light ? "☀️" : "🌙";
        }

        applyTheme(
            localStorage.getItem(THEME_KEY) || "dark"
        );

        document.getElementById("themeBtn")
            .addEventListener(
                "click",
                function () {

                    const light =
                        document.body.classList.contains("light");

                    const newTheme =
                        light ? "dark" : "light";

                    localStorage.setItem(
                        THEME_KEY,
                        newTheme
                    );

                    applyTheme(newTheme);
                }
            );


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

                    setUserAreaState(false);
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

        


        /* =========================================================
           GRAFİK VERİLERİ
        ========================================================= */

        const chartData = {

            7: {
                total: "₺ 486.240",
                subtitle: "Bu haftanın toplam satış cirosu",
                change: "↑ %18.6",
                labels: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"],
                primary: [65, 72, 59, 82, 76, 91, 84],
                secondary: [48, 55, 44, 67, 58, 71, 62]
            },

            30: {
                total: "₺ 1.842.620",
                subtitle: "Son 30 günlük toplam satış cirosu",
                change: "↑ %14.2",
                labels: ["1. Hafta", "2. Hafta", "3. Hafta", "4. Hafta"],
                primary: [68, 79, 88, 94],
                secondary: [52, 61, 69, 74]
            },

            90: {
                total: "₺ 5.486.240",
                subtitle: "Son 3 aylık toplam satış cirosu",
                change: "↑ %21.8",
                labels: ["Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos"],
                primary: [57, 69, 74, 87, 94],
                secondary: [43, 52, 59, 67, 76]
            }

        };


        /* =========================================================
           GRAFİK RENDER
        ========================================================= */

        function renderChart(period) {

            const data =
                chartData[period];

            document.getElementById("chartTotal")
                .textContent = data.total;

            document.getElementById("chartSubtitle")
                .textContent = data.subtitle;

            document.getElementById("chartChange")
                .textContent = data.change;

            const chart =
                document.getElementById("salesChart");

            chart
                .querySelectorAll(".bar-group")
                .forEach(
                    element => element.remove()
                );

            data.labels.forEach(
                function (label, index) {

                    const group =
                        document.createElement("div");

                    group.className =
                        "bar-group";

                    const secondary =
                        document.createElement("div");

                    secondary.className =
                        "bar secondary";

                    secondary.style.height =
                        data.secondary[index] + "%";

                    const primary =
                        document.createElement("div");

                    primary.className =
                        "bar";

                    primary.style.height =
                        data.primary[index] + "%";

                    group.appendChild(secondary);
                    group.appendChild(primary);

                    chart.appendChild(group);
                }
            );

            document.getElementById("chartLabels")
                .innerHTML =
                data.labels
                    .map(
                        label =>
                            `<div class="chart-label">${label}</div>`
                    )
                    .join("");
        }

        renderChart("7");

        document.getElementById("chartPeriod")
            .addEventListener(
                "change",
                function () {

                    renderChart(this.value);

                    showToast(
                        "Satış grafiği güncellendi."
                    );
                }
            );


        /* =========================================================
           AKTİVİTELER
        ========================================================= */

        const activities = [

            {
                icon: "✓",
                color: "green",
                title: "Stok transferi tamamlandı",
                description: "Ankara Mağaza 01 → İzmir Mağaza 01",
                time: "5 dk"
            },

            {
                icon: "◇",
                color: "",
                title: "Yeni stok girişi yapıldı",
                description: "480 adet Nike T-Shirt 1023",
                time: "18 dk"
            },

            {
                icon: "!",
                color: "yellow",
                title: "Düşük stok uyarısı",
                description: "Pantolon 2045 minimum seviyeye yaklaştı",
                time: "32 dk"
            },

            {
                icon: "✓",
                color: "green",
                title: "Nebim V3 senkronizasyonu tamamlandı",
                description: "1.248 ürün başarıyla güncellendi",
                time: "1 sa"
            },

            {
                icon: "✦",
                color: "",
                title: "AI stok analizi oluşturuldu",
                description: "14 yeni transfer önerisi hazırlandı",
                time: "2 sa"
            }

        ];

        function renderActivities() {

            document.getElementById("activityList")
                .innerHTML =
                activities.map(
                    item => `
                    <div class="activity">

                        <div class="activity-icon ${item.color}">
                            ${item.icon}
                        </div>

                        <div class="activity-info">

                            <div class="activity-title">
                                ${item.title}
                            </div>

                            <div class="activity-description">
                                ${item.description}
                            </div>

                        </div>

                        <div class="activity-time">
                            ${item.time}
                        </div>

                    </div>
                `
                ).join("");
        }

        renderActivities();


        /* =========================================================
           MAĞAZALAR
        ========================================================= */

        const stores = [

            {
                name: "İstanbul Mağaza 01",
                percent: 94,
                stock: "24.820 stok",
                sales: "₺ 128.400 satış"
            },

            {
                name: "Ankara Mağaza 01",
                percent: 88,
                stock: "21.640 stok",
                sales: "₺ 104.820 satış"
            },

            {
                name: "İzmir Mağaza 01",
                percent: 76,
                stock: "18.420 stok",
                sales: "₺ 86.240 satış"
            },

            {
                name: "Bursa Mağaza 01",
                percent: 71,
                stock: "15.680 stok",
                sales: "₺ 74.520 satış"
            },

            {
                name: "İstanbul Mağaza 02",
                percent: 83,
                stock: "17.340 stok",
                sales: "₺ 92.260 satış"
            }

        ];

        function renderStores() {

            document.getElementById("storeList")
                .innerHTML =
                stores.map(
                    store => {

                        const warning =
                            store.percent < 80;

                        return `
                        <div class="store-item">

                            <div class="store-top">

                                <div class="store-name">
                                    ${store.name}
                                </div>

                                <div
                                    class="store-percent"
                                    style="
                                        color:
                                        ${warning
                                ? "var(--yellow)"
                                : "var(--green)"
                            };
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
                                ? "background:linear-gradient(90deg,#d89d00,#ffd000);"
                                : ""
                            }
                                    "
                                ></div>

                            </div>

                            <div class="store-info">

                                <span>
                                    ${store.stock}
                                </span>

                                <span>
                                    ${store.sales}
                                </span>

                            </div>

                        </div>
                    `;
                    }
                ).join("");
        }

        renderStores();


        /* =========================================================
           UYARILAR
        ========================================================= */

        const alerts = [

            {
                icon: "⚠",
                title: "Kritik stok seviyesi",
                description: "Sweatshirt 3021 — İzmir Mağaza 01"
            },

            {
                icon: "!",
                title: "342 ürün düşük stokta",
                description: "Stok yönetimi ekranından kontrol edin."
            },

            {
                icon: "◌",
                title: "Senkronizasyon bekliyor",
                description: "Nebim V3 ile son senkronizasyon 2 saat önce."
            }

        ];

        function renderAlerts() {

            document.getElementById("alertList")
                .innerHTML =
                alerts.map(
                    alert => `
                    <div class="alert-item">

                        <div class="alert-icon">
                            ${alert.icon}
                        </div>

                        <div class="alert-text">

                            <div class="alert-title">
                                ${alert.title}
                            </div>

                            <div class="alert-desc">
                                ${alert.description}
                            </div>

                        </div>

                    </div>
                `
                ).join("");

            document.getElementById("alertCount")
                .textContent =
                `${alerts.length} UYARI`;
        }

        renderAlerts();


        /* =========================================================
           NEBIM V3 ADAPTER - GERÇEK ZAMANLI İSTATİSTİKLER
        ========================================================= */

        function refreshStatsFromStore() {

            NebimAdapter.getStats().then(function (stats) {

                document.getElementById("totalStock")
                    .textContent =
                    stats.totalStock.toLocaleString("tr-TR");

                document.getElementById("lowStock")
                    .textContent =
                    stats.lowStock.toLocaleString("tr-TR");

                document.getElementById("criticalStock")
                    .textContent =
                    stats.criticalStock.toLocaleString("tr-TR");

                document.getElementById("notificationCount")
                    .textContent =
                    stats.unreadNotifications;

            });
        }

        refreshStatsFromStore();


        /* =========================================================
           STOK BUTONU
        ========================================================= */

        document.getElementById("stockBtn")
            .addEventListener(
                "click",
                function () {

                    window.location.href =
                        "/Stok";
                }
            );


        /* =========================================================
           AI
        ========================================================= */

        document.getElementById("aiBtn")
            .addEventListener(
                "click",
                function () {

                    window.location.href =
                        "/AiOnerileri";
                }
            );


        /* =========================================================
           GLOBAL SEARCH
        ========================================================= */

        document.getElementById("globalSearch")
            .addEventListener(
                "keydown",
                function (event) {

                    if (event.key !== "Enter") {
                        return;
                    }

                    const value =
                        this.value.trim();

                    if (!value) {

                        showToast(
                            "Aramak istediğiniz ürünü veya mağazayı yazın."
                        );

                        return;
                    }

                    window.location.href =
                        "/Stok?search=" +
                        encodeURIComponent(value);
                }
            );


        /* =========================================================
           YENİLE
        ========================================================= */

        document.getElementById("refreshBtn")
            .addEventListener(
                "click",
                function () {

                    const button = this;

                    button.disabled = true;
                    button.textContent = "↻ Güncelleniyor...";

                    setTimeout(
                        function () {

                            refreshStatsFromStore();

                            button.disabled = false;
                            button.textContent = "↻ Yenile";

                            showToast(
                                "Dashboard verileri güncellendi."
                            );

                        },
                        800
                    );
                }
            );


        /* =========================================================
           TOAST
        ========================================================= */

        let toastTimer;

        function showToast(message) {

            const toast =
                document.getElementById("toast");

            toast.textContent =
                message;

            toast.classList.add("show");

            clearTimeout(toastTimer);

            toastTimer =
                setTimeout(
                    function () {

                        toast.classList.remove("show");

                    },
                    2500
                );
        }


        /* =========================================================
           BAŞKA SEKMEDE ÇIKIŞ YAPILIRSA
        ========================================================= */

        window.addEventListener(
            "storage",
            function (event) {

                if (
                    event.key === LOGIN_TIME_KEY &&
                    !event.newValue
                ) {

                    window.location.replace(
                        "/Login"
                    );
                }

                if (
                    event.key === USER_KEY
                ) {

                    loadUser();
                }

                if (
                    event.key === THEME_KEY
                ) {

                    applyTheme(
                        event.newValue || "dark"
                    );
                }
            }
        );


        /* =========================================================
           ESC TUŞU
        ========================================================= */

        document.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Escape") {

                    userArea.classList.remove(
                        "open"
                    );
                }
            }
        );

    
window.addEventListener("storage", event => { if (event.key === "aiStockNebimData") refreshStatsFromStore(); });

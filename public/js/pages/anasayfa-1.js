

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
                (window.StockAuth.current() ? (sessionStorage.getItem(LOGIN_TIME_KEY) || Date.now()) : null);

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
                JSON.stringify(window.StockAuth.current());

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

        const chartData = CentralDashboard.empty().charts;


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

        const activities = [];

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
                                ${escapeCentralText(item.title)}
                            </div>

                            <div class="activity-description">
                                ${escapeCentralText(item.description)}
                            </div>

                        </div>

                        <div class="activity-time">
                            ${escapeCentralText(item.time)}
                        </div>

                    </div>
                `
                ).join("");
        }

        renderActivities();


        /* =========================================================
           MAĞAZALAR
        ========================================================= */

        const stores = [];

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
                                    ${escapeCentralText(store.name)}
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
                                    ${escapeCentralText(store.stock)}
                                </span>

                                <span>
                                    ${escapeCentralText(store.sales)}
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

        const alerts = [];

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
                                ${escapeCentralText(alert.title)}
                            </div>

                            <div class="alert-desc">
                                ${escapeCentralText(alert.description)}
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

    
window.addEventListener('stock:data-changed', event => { if (event.key === "aiStockNebimData") refreshStatsFromStore(); });

function escapeCentralText(value) { const n = document.createElement("span"); n.textContent = value; return n.innerHTML; }
async function refreshCentralDashboard() {
    try { const data = await CentralDashboard.load(); stores.splice(0, stores.length, ...data.stores); activities.splice(0, activities.length, ...data.activities); alerts.splice(0, alerts.length, ...data.alerts); Object.assign(chartData, data.charts); renderStores(); renderActivities(); renderAlerts(); renderChart(document.querySelector('.period-btn.active')?.dataset.period || 7); const sales = document.getElementById('todaySales'); if (sales) sales.textContent = data.stats[1].value; }
    catch (error) { console.warn(error.message); }
}
refreshCentralDashboard(); window.addEventListener('stock:data-changed', refreshCentralDashboard);

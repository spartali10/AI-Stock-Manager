

        /* =========================================================
           THEME SYSTEM
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
           GLOBAL SEARCH
        ========================================================= */

        const globalSearch =
            document.getElementById(
                "globalSearch"
            );


        globalSearch.addEventListener(
            "keydown",
            function (event) {

                if (event.key !== "Enter") {
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
                    encodeURIComponent(value);

            }
        );


        /* =========================================================
           NOTIFICATION
        ========================================================= */

        document
            .getElementById("notificationBtn")
            .addEventListener(
                "click",
                function () {

                    window.location.href =
                        "/Bildirimler";

                }
            );


        /* =========================================================
           USER ACCOUNT MENU
        ========================================================= */

        const userArea =
            document.getElementById(
                "userArea"
            );

        const accountMenu =
            document.getElementById(
                "accountMenu"
            );


        function toggleAccountMenu() {

            const isOpen =
                userArea.getAttribute(
                    "aria-expanded"
                ) === "true";

            userArea.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );

            accountMenu.setAttribute(
                "aria-hidden",
                String(isOpen)
            );

        }


        function closeAccountMenu() {

            userArea.setAttribute(
                "aria-expanded",
                "false"
            );

            accountMenu.setAttribute(
                "aria-hidden",
                "true"
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

                if (event.key === "Escape") {

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


        document.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Escape") {

                    closeAccountMenu();

                }

            }
        );


        /* =========================================================
           LOGOUT
        ========================================================= */

        


        /* =========================================================
           REFRESH
        ========================================================= */

        document
            .getElementById("refreshBtn")
            .addEventListener(
                "click",
                function () {

                    showToast(
                        "Entegrasyon bilgileri yenileniyor..."
                    );

                    setTimeout(
                        function () {

                            showToast(
                                "Entegrasyon bilgileri başarıyla güncellendi."
                            );

                        },
                        900
                    );

                }
            );


        /* =========================================================
           TEST ALL CONNECTIONS
        ========================================================= */

        document
            .getElementById("testAllBtn")
            .addEventListener(
                "click",
                function () {

                    showToast(
                        "Tüm sistem bağlantıları test ediliyor..."
                    );

                    setTimeout(
                        function () {

                            showToast(
                                "Tüm bağlantılar başarılı. Sistemler aktif."
                            );

                        },
                        1400
                    );

                }
            );


        /* =========================================================
           TEST INDIVIDUAL INTEGRATION
        ========================================================= */

        document
            .querySelectorAll(".integration-test")
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const system =
                                this.dataset.system;

                            showToast(
                                system +
                                " bağlantısı test ediliyor..."
                            );

                            setTimeout(
                                function () {

                                    showToast(
                                        system +
                                        " bağlantısı başarılı."
                                    );

                                },
                                1000
                            );

                        }
                    );

                }
            );


        /* =========================================================
           TEST NEBIM CONNECTION
        ========================================================= */

        document
            .getElementById("testConnectionBtn")
            .addEventListener(
                "click",
                function () {

                    const log =
                        document.getElementById(
                            "testLog"
                        );

                    log.innerHTML =
                        "[12:45:01] Sunucuya bağlanılıyor...<br>" +
                        "[12:45:02] Kimlik doğrulama kontrol ediliyor...<br>" +
                        "[12:45:02] Nebim V3 API yanıtı bekleniyor...";

                    showToast(
                        "Nebim V3 bağlantısı test ediliyor..."
                    );

                    setTimeout(
                        function () {

                            log.innerHTML =
                                "[12:45:01] Sunucuya bağlanılıyor...<br>" +
                                "[12:45:02] Kimlik doğrulama başarılı.<br>" +
                                "[12:45:03] Nebim V3 API erişimi doğrulandı.<br>" +
                                "[12:45:03] Veritabanı bağlantısı aktif.<br>" +
                                "[12:45:03] Bağlantı testi başarılı.";

                            showToast(
                                "Nebim V3 bağlantısı başarıyla doğrulandı."
                            );

                        },
                        1300
                    );

                }
            );


        /* =========================================================
           SAVE SETTINGS
        ========================================================= */

        document
            .getElementById("saveSettingsBtn")
            .addEventListener(
                "click",
                function () {

                    const server =
                        document
                            .getElementById("server")
                            .value
                            .trim();

                    const port =
                        document
                            .getElementById("port")
                            .value
                            .trim();

                    const database =
                        document
                            .getElementById("database")
                            .value
                            .trim();

                    if (
                        !server ||
                        !port ||
                        !database
                    ) {

                        showToast(
                            "Lütfen zorunlu bağlantı alanlarını doldurun."
                        );

                        return;

                    }

                    showToast(
                        "Entegrasyon ayarları kaydediliyor..."
                    );

                    setTimeout(
                        function () {

                            showToast(
                                "Entegrasyon ayarları başarıyla kaydedildi."
                            );

                        },
                        900
                    );

                }
            );


        /* =========================================================
           RESET SETTINGS
        ========================================================= */

        document
            .getElementById("resetSettingsBtn")
            .addEventListener(
                "click",
                function () {

                    const confirmed =
                        window.confirm(
                            "Entegrasyon ayarlarını varsayılan değerlere döndürmek istediğinize emin misiniz?"
                        );

                    if (!confirmed) {
                        return;
                    }

                    document
                        .getElementById("server")
                        .value =
                        "192.168.1.100";

                    document
                        .getElementById("port")
                        .value =
                        "1433";

                    document
                        .getElementById("database")
                        .value =
                        "NebimV3";

                    document
                        .getElementById("username")
                        .value =
                        "ai_stock";

                    document
                        .getElementById("password")
                        .value =
                        "********";

                    document
                        .getElementById("apiUrl")
                        .value =
                        "https://nebim.local/api/v3";

                    showToast(
                        "Varsayılan entegrasyon ayarları yüklendi."
                    );

                }
            );


        /* =========================================================
           QUICK ACTIONS
        ========================================================= */

        document
            .querySelectorAll(".quick-btn")
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const action =
                                this.dataset.quick;

                            showToast(
                                action +
                                " başlatılıyor..."
                            );

                            setTimeout(
                                function () {

                                    showToast(
                                        action +
                                        " tamamlandı."
                                    );

                                },
                                1100
                            );

                        }
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
                    2600
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
                                    function (menu) {

                                        menu.classList
                                            .remove("active");

                                    }
                                );

                            item.classList.add(
                                "active"
                            );

                        }

                    }
                );

        })();

    
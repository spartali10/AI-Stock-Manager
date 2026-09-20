

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
           SETTINGS NAVIGATION
        ========================================================= */

        const settingNavItems =
            document.querySelectorAll(
                ".settings-nav-item"
            );

        const settingSections =
            document.querySelectorAll(
                ".settings-section"
            );


        settingNavItems.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const target =
                            button.dataset.section;


                        settingNavItems.forEach(
                            function (item) {

                                item.classList.remove(
                                    "active"
                                );

                            }
                        );


                        settingSections.forEach(
                            function (section) {

                                section.classList.remove(
                                    "active"
                                );

                            }
                        );


                        button.classList.add(
                            "active"
                        );


                        const targetSection =
                            document.getElementById(
                                target
                            );


                        if (targetSection) {

                            targetSection.classList.add(
                                "active"
                            );

                        }


                        history.replaceState(
                            null,
                            "",
                            "#" + target
                        );

                    }
                );

            }
        );


        /* =========================================================
           LOAD SECTION FROM URL
        ========================================================= */

        (function () {

            const hash =
                window.location.hash
                    .replace("#", "");


            if (!hash) {
                return;
            }


            const targetButton =
                document.querySelector(
                    '[data-section="' +
                    hash +
                    '"]'
                );


            if (targetButton) {

                targetButton.click();

            }

        })();


        /* =========================================================
           TOGGLE SYSTEM
        ========================================================= */

        function toggleSetting(element) {

            element.classList.toggle(
                "active"
            );

            const state =
                element.classList.contains(
                    "active"
                );

            showToast(
                state
                    ? "Ayar etkinleştirildi."
                    : "Ayar devre dışı bırakıldı."
            );

        }


        /* =========================================================
           SAVE SETTINGS
        ========================================================= */

        function saveSettings(section) {

            showToast(
                section +
                " başarıyla kaydedildi."
            );

        }


        /* =========================================================
           GENERAL RESET
        ========================================================= */

        function resetGeneral() {

            document.getElementById(
                "systemName"
            ).value =
                "AI Stock Manager";


            document.getElementById(
                "language"
            ).value =
                "Türkçe";


            document.getElementById(
                "currency"
            ).value =
                "Türk Lirası (₺)";


            document.getElementById(
                "timezone"
            ).value =
                "Europe/Istanbul";


            document.getElementById(
                "systemDescription"
            ).value =
                "Nebim V3 Entegrasyon ve Akıllı Stok Yönetim Paneli";


            showToast(
                "Genel ayarlar varsayılan değerlere döndürüldü."
            );

        }


        /* =========================================================
           DANGER RESET
        ========================================================= */

        function confirmReset() {

            const answer =
                confirm(
                    "Tüm ayarları sıfırlamak istediğinizden emin misiniz?"
                );


            if (answer) {

                localStorage.removeItem(
                    "aiStockTheme"
                );

                showToast(
                    "Ayarlar sıfırlandı. Sayfa yenilenecek."
                );


                setTimeout(
                    function () {

                        location.reload();

                    },
                    1200
                );

            }

        }


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

                if (
                    event.key === "Enter"
                ) {

                    const query =
                        globalSearch.value
                            .trim();

                    if (!query) {

                        showToast(
                            "Aramak istediğiniz ifadeyi yazın."
                        );

                        return;

                    }


                    showToast(
                        '"' +
                        query +
                        '" için arama yapılıyor.'
                    );

                }

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
           AUTOMATIC ACTIVE SIDEBAR
        ========================================================= */

        (function () {

            const currentPage =
                window.location.pathname
                    .split("/")
                    .pop()
                    .toLowerCase();


            document
                .querySelectorAll(
                    ".sidebar .menu-item"
                )
                .forEach(
                    function (item) {

                        const href =
                            item
                                .getAttribute("href")
                                .split("/")
                                .pop()
                                .toLowerCase();


                        item.classList.remove(
                            "active"
                        );


                        if (
                            currentPage === href
                        ) {

                            item.classList.add(
                                "active"
                            );

                        }

                    }
                );

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

        

    
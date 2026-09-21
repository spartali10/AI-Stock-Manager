

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
           NOTIFICATION BUTTON
        ========================================================= */

        const notificationBtn =
            document.getElementById(
                "notificationBtn"
            );

        if (notificationBtn) {

            notificationBtn.addEventListener(
                "click",
                function () {

                    window.location.href =
                        "/Bildirimler";

                }
            );

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

                if (event.key === "Enter") {

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


        /* =========================================================
           KEYBOARD ACCOUNT MENU
        ========================================================= */

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


        /* =========================================================
           CLOSE ACCOUNT MENU - CLICK OUTSIDE
        ========================================================= */

        document.addEventListener(
            "click",
            function (event) {

                if (
                    !userArea.contains(event.target)
                ) {

                    userArea.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                    accountMenu.setAttribute(
                        "aria-hidden",
                        "true"
                    );

                }

            }
        );


        /* =========================================================
           CLOSE ACCOUNT MENU - ESCAPE KEY
        ========================================================= */

        document.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Escape") {

                    userArea.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                    accountMenu.setAttribute(
                        "aria-hidden",
                        "true"
                    );

                }

            }
        );


        /* ===============================
           LOGOUT
        ========================================================= */

        


        /* =========================================================
           RUN AI
        ========================================================= */

        document
            .getElementById("runAiBtn")
            .addEventListener(
                "click",
                function () {

                    showToast(
                        "AI analiz motoru çalıştırılıyor..."
                    );

                    setTimeout(
                        function () {

                            showToast(
                                "AI analizi tamamlandı. 6 yeni öneri oluşturuldu."
                            );

                        },
                        1200
                    );

                }
            );


        /* =========================================================
           REFRESH
        ========================================================= */

        document
            .getElementById("refreshBtn")
            .addEventListener(
                "click",
                function () {

                    showToast(
                        "AI önerileri güncelleniyor..."
                    );

                    setTimeout(
                        function () {

                            showToast(
                                "Öneriler başarıyla güncellendi."
                            );

                        },
                        900
                    );

                }
            );


        /* =========================================================
           RECOMMENDATION ACTIONS
        ========================================================= */

        document
            .querySelectorAll(".recommendation-action")
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const action =
                                this.dataset.action;

                            showToast(
                                action +
                                " detayları açılıyor..."
                            );

                        }
                    );

                }
            );


        /* =========================================================
           DETAIL ANALYSIS
        ========================================================= */

        document
            .getElementById("detailAnalysisBtn")
            .addEventListener(
                "click",
                function () {

                    showToast(
                        "Detaylı AI analizi hazırlanıyor..."
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
                                            .remove("active")
                                );

                            item.classList.add(
                                "active"
                            );

                        }

                    }
                );

        })();

    


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
           USER AREA / ACCOUNT MENU
        ========================================================= */

        const userArea =
            document.getElementById(
                "userArea"
            );

        const accountMenu =
            document.getElementById(
                "accountMenu"
            );


        function setUserMenu(open) {

            userArea.classList.toggle(
                "open",
                open
            );

            userArea.setAttribute(
                "aria-expanded",
                String(open)
            );

            accountMenu.setAttribute(
                "aria-hidden",
                String(!open)
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

                setUserMenu(
                    !userArea.classList.contains(
                        "open"
                    )
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

                    setUserMenu(
                        !userArea.classList.contains(
                            "open"
                        )
                    );

                }


                if (
                    event.key === "Escape"
                ) {

                    setUserMenu(false);

                    userArea.focus();

                }

            }
        );


        document.addEventListener(
            "click",
            function (event) {

                if (
                    !userArea.contains(event.target)
                ) {

                    setUserMenu(false);

                }

            }
        );


        /* =========================================================
           ONLINE TIME
        ========================================================= */

        const onlineMinutes =
            document.getElementById(
                "onlineMinutes"
            );

        const accountOnlineMinutes =
            document.getElementById(
                "accountOnlineMinutes"
            );


        let onlineStart =
            sessionStorage.getItem(
                "aiStockOnlineStart"
            );


        if (!onlineStart) {

            onlineStart =
                String(Date.now());

            sessionStorage.setItem(
                "aiStockOnlineStart",
                onlineStart
            );

        }


        function updateOnlineTime() {

            const start =
                Number(onlineStart);

            const elapsed =
                Math.max(
                    0,
                    Date.now() - start
                );

            const minutes =
                Math.floor(
                    elapsed / 60000
                );

            onlineMinutes.textContent =
                minutes;

            accountOnlineMinutes.textContent =
                minutes;

        }


        updateOnlineTime();


        setInterval(
            updateOnlineTime,
            60000
        );


        /* =========================================================
           LOGOUT
        ========================================================= */

        const logoutBtn =
            document.getElementById(
                "logoutBtn"
            );


        


        /* =========================================================
           NOTIFICATIONS
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


        notificationBtn.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    window.location.href =
                        "/Bildirimler";

                }

            }
        );


        /* =========================================================
           REFRESH
        ========================================================= */

        function refreshStoreCountFromStore() {
            const cards = [...document.querySelectorAll(".store-card")];
            const count = document.getElementById("totalStoreCount");
            count.textContent = cards.length;
            count.nextElementSibling.textContent = "● " + cards.filter(card => card.dataset.status === "online").length + " mağaza aktif";
        }
        refreshStoreCountFromStore();

        document
            .getElementById("refreshBtn")
            .addEventListener(
                "click",
                function () {

                    const button =
                        this;

                    button.innerHTML =
                        "↻ Güncelleniyor...";

                    button.disabled =
                        true;


                    setTimeout(
                        function () {

                            refreshStoreCountFromStore();

                            button.innerHTML =
                                "↻ Yenile";

                            button.disabled =
                                false;

                            showToast(
                                "Mağaza verileri güncellendi."
                            );

                        },
                        900
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
           ESC KEY
        ========================================================= */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape"
                ) {

                    setUserMenu(false);

                }

            }
        );

    
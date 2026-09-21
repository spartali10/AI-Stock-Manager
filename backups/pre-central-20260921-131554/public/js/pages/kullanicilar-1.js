

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
           MODAL SYSTEM
        ========================================================= */

        function openModal(id) {

            document
                .getElementById(id)
                .classList.add("show");

        }


        function closeModal(id) {

            document
                .getElementById(id)
                .classList.remove("show");

        }


        document
            .querySelectorAll(".modal-overlay")
            .forEach(function (modal) {

                modal.addEventListener(
                    "click",
                    function (event) {

                        if (
                            event.target === modal
                        ) {

                            modal.classList.remove(
                                "show"
                            );

                        }

                    }
                );

            });


        document.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Escape") {

                    document
                        .querySelectorAll(".modal-overlay.show")
                        .forEach(function (modal) {

                            modal.classList.remove(
                                "show"
                            );

                        });

                }

            }
        );


        const userSearch =
            document.getElementById(
                "userSearch"
            );

        const roleFilter =
            document.getElementById(
                "roleFilter"
            );

        const statusFilter =
            document.getElementById(
                "statusFilter"
            );


        function filterUsers() {

            const search =
                userSearch.value
                    .toLocaleLowerCase("tr-TR")
                    .trim();

            const role =
                roleFilter.value;

            const status =
                statusFilter.value;


            const rows =
                document.querySelectorAll(
                    "#usersBody tr"
                );


            let visible = 0;


            rows.forEach(function (row) {

                const text =
                    (
                        row.dataset.name +
                        " " +
                        row.dataset.email +
                        " " +
                        row.innerText
                    )
                        .toLocaleLowerCase(
                            "tr-TR"
                        );


                const searchMatch =
                    !search ||
                    text.includes(search);


                const roleMatch =
                    !role ||
                    row.dataset.role === role;


                const statusMatch =
                    !status ||
                    row.dataset.status === status;


                const show =
                    searchMatch &&
                    roleMatch &&
                    statusMatch;


                row.style.display =
                    show
                        ? ""
                        : "none";


                if (show) {
                    visible++;
                }

            });


            document.getElementById(
                "userCountLabel"
            ).textContent =
                visible +
                " kullanıcı";

        }


        userSearch.addEventListener(
            "input",
            filterUsers
        );

        roleFilter.addEventListener(
            "change",
            filterUsers
        );

        statusFilter.addEventListener(
            "change",
            filterUsers
        );


        /* =========================================================
           GLOBAL SEARCH
        ========================================================= */

        document
            .getElementById("globalSearch")
            .addEventListener(
                "input",
                function () {

                    userSearch.value =
                        this.value;

                    filterUsers();

                }
            );


        /* =========================================================
           STATISTICS
        ========================================================= */

        function updateStatistics() {

            const rows =
                document.querySelectorAll(
                    "#usersBody tr"
                );


            let total = 0;

            let active = 0;

            let admins = 0;


            rows.forEach(function (row) {

                total++;


                if (
                    row.dataset.status ===
                    "active"
                ) {

                    active++;

                }


                if (
                    row.dataset.role ===
                    "admin"
                ) {

                    admins++;

                }

            });


            document.getElementById(
                "totalUsers"
            ).textContent =
                total;


            document.getElementById(
                "activeUsers"
            ).textContent =
                active;


            document.getElementById(
                "adminUsers"
            ).textContent =
                admins;

        }


        /* =========================================================
           HELPERS
        ========================================================= */

        function getInitials(name) {

            return name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map(
                    word =>
                        word.charAt(0)
                )
                .join("")
                .toLocaleUpperCase(
                    "tr-TR"
                );

        }


        function escapeHtml(value) {

            return value
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

        }


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

        


        /* =========================================================
           INITIAL UPDATE
        ========================================================= */

        updateStatistics();

    
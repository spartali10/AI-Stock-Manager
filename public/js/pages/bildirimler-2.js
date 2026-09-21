

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


        const userArea =
            document.getElementById("userArea");

        const accountMenu =
            document.getElementById("accountMenu");

        if (userArea && accountMenu) {

            function setUserMenu(isOpen) {
                userArea.classList.toggle("open", isOpen);
                userArea.setAttribute("aria-expanded", isOpen ? "true" : "false");
            }

            userArea.addEventListener("click", function (event) {
                if (event.target.closest(".account-menu")) {
                    return;
                }
                setUserMenu(!userArea.classList.contains("open"));
            });

            userArea.addEventListener("keydown", function (event) {
                if (event.target.closest(".account-menu") && event.key !== "Escape") return;
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setUserMenu(!userArea.classList.contains("open"));
                }
                if (event.key === "Escape") {
                    setUserMenu(false);
                }
            });

            document.addEventListener("click", function (event) {
                if (!userArea.contains(event.target)) {
                    setUserMenu(false);
                }
            });
        }


        /* =========================================================
           NOTIFICATION DATA
        ========================================================= */

        let notificationItems =
            document.querySelectorAll(
                ".notification-item"
            );

        /* =========================================================
           NEBIM V3 ADAPTER - SENKRONİZASYON
        ========================================================= */

        function getNotificationTitle(item) {

            return item
                .querySelector(".notification-title")
                .textContent
                .trim();
        }

        // Static examples are presentation templates, never seed data.
        const centralNotificationTemplate = notificationItems[0].cloneNode(true);
        document.getElementById('notificationList').replaceChildren();
        notificationItems = [];
        async function loadCentralNotifications() {
            try {
                const list = await NebimAdapter.getNotifications(), container = document.getElementById('notificationList');
                container.replaceChildren();
                list.forEach(n => {
                    const item = centralNotificationTemplate.cloneNode(true);
                    item.classList.toggle('unread', !n.read); item.dataset.type = n.type || 'system'; item.dataset.search = (n.title || '') + ' ' + (n.description || '');
                    item.querySelector('.notification-title').textContent = n.title || '';
                    item.querySelector('.notification-text').textContent = n.description || '';
                    item.querySelector('.notification-time').textContent = n.createdAt ? new Date(n.createdAt).toLocaleString('tr-TR') : 'Merkezi kayıt';
                    item.querySelectorAll('[onclick]').forEach(button => button.removeAttribute('onclick'));
                    item.addEventListener('click', async () => { if (n.read) return; try { await NebimAdapter.markNotificationRead(n.id); await loadCentralNotifications(); } catch(e) { showToast(e.message); } });
                    container.append(item);
                });
                notificationItems = container.querySelectorAll('.notification-item');
                document.getElementById('totalCount').textContent = list.length;
                updateUnreadCount(); filterNotifications();
            } catch(error) { showToast(error.message); }
        }
        document.addEventListener('DOMContentLoaded', loadCentralNotifications);
        window.addEventListener('stock:data-changed', loadCentralNotifications);

        function markNotificationReadInStore(title) {

            NebimAdapter.getNotifications().then(function (list) {

                const match =
                    list.find(n => n.title === title);

                if (match) {
                    NebimAdapter.markNotificationRead(match.id);
                }

            });
        }

        const filterButtons =
            document.querySelectorAll(
                ".filter-btn"
            );

        const globalSearch =
            document.getElementById(
                "globalSearch"
            );

        const emptyState =
            document.getElementById(
                "emptyState"
            );

        const resultCount =
            document.getElementById(
                "resultCount"
            );


        let currentFilter = "all";


        /* =========================================================
           FILTER SYSTEM
        ========================================================= */

        function filterNotifications() {

            const search =
                globalSearch.value
                    .toLocaleLowerCase("tr-TR")
                    .trim();

            let visibleCount = 0;


            notificationItems.forEach(
                function (item) {

                    const type =
                        item.dataset.type;

                    const text =
                        item.dataset.search
                            .toLocaleLowerCase("tr-TR");

                    const unread =
                        item.classList.contains(
                            "unread"
                        );


                    let filterMatch = true;


                    if (currentFilter === "unread") {

                        filterMatch =
                            unread;

                    }

                    else if (
                        currentFilter === "critical"
                    ) {

                        filterMatch =
                            type === "critical";

                    }

                    else if (
                        currentFilter === "ai"
                    ) {

                        filterMatch =
                            type === "ai";

                    }

                    else if (
                        currentFilter === "system"
                    ) {

                        filterMatch =
                            type === "system";

                    }


                    const searchMatch =
                        !search ||
                        text.includes(search);


                    const visible =
                        filterMatch &&
                        searchMatch;


                    item.style.display =
                        visible
                            ? ""
                            : "none";


                    if (visible) {

                        visibleCount++;

                    }

                }
            );


            resultCount.textContent =
                visibleCount +
                " bildirim";


            emptyState.style.display =
                visibleCount === 0
                    ? "block"
                    : "none";

        }


        filterButtons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        filterButtons.forEach(
                            function (btn) {

                                btn.classList.remove(
                                    "active"
                                );

                            }
                        );


                        button.classList.add(
                            "active"
                        );


                        currentFilter =
                            button.dataset.filter;


                        filterNotifications();

                    }
                );

            }
        );


        globalSearch.addEventListener(
            "input",
            filterNotifications
        );


        /* =========================================================
           UNREAD COUNT
        ========================================================= */

        function updateUnreadCount() {

            const unread =
                document.querySelectorAll(
                    ".notification-item.unread"
                ).length;


            document.getElementById(
                "unreadCount"
            ).textContent =
                unread;


            const badge =
                document.getElementById(
                    "notificationCount"
                );


            badge.textContent =
                unread;


            if (unread === 0) {

                badge.style.display =
                    "none";

            } else {

                badge.style.display =
                    "flex";

            }

        }


        /* =========================================================
           MARK SINGLE AS READ
        ========================================================= */

        notificationItems.forEach(
            function (item) {

                item.addEventListener(
                    "click",
                    function (event) {

                        if (
                            event.target.closest(
                                "button"
                            )
                        ) {
                            return;
                        }


                        if (
                            item.classList.contains(
                                "unread"
                            )
                        ) {

                            item.classList.remove(
                                "unread"
                            );


                            const dot =
                                item.querySelector(
                                    ".unread-dot"
                                );


                            if (dot) {

                                dot.remove();

                            }


                            updateUnreadCount();

                            showToast(
                                "Bildirim okundu olarak işaretlendi."
                            );

                            filterNotifications();

                        }

                    }
                );

            }
        );


        /* =========================================================
           MARK ALL READ
        ========================================================= */

        async function markAllAsRead() {
            try { const list = await NebimAdapter.getNotifications(); for (const n of list.filter(n => !n.read)) await NebimAdapter.markNotificationRead(n.id); await loadCentralNotifications(); showToast('Tüm bildirimler okundu olarak işaretlendi.'); }
            catch(error) { showToast(error.message); }
        }


        document
            .getElementById("markAllBtn")
            .addEventListener(
                "click",
                markAllAsRead
            );


        document
            .getElementById("clearBtn")
            .addEventListener(
                "click",
                markAllAsRead
            );


        /* =========================================================
           BUTTON ACTION
        ========================================================= */

        function notificationAction(
            button,
            message
        ) {

            const item =
                button.closest(
                    ".notification-item"
                );


            if (
                item &&
                item.classList.contains(
                    "unread"
                )
            ) {

                item.classList.remove(
                    "unread"
                );


                const dot =
                    item.querySelector(
                        ".unread-dot"
                    );


                if (dot) {

                    dot.remove();

                }


                updateUnreadCount();

            }


            showToast(message);

        }


        /* =========================================================
           SETTINGS
        ========================================================= */

        document
            .getElementById(
                "notificationSettingsBtn"
            )
            .addEventListener(
                "click",
                function () {

                    showToast(
                        "Bildirim ayarları ekranı açılacak."
                    );

                }
            );


        /* =========================================================
           GLOBAL SEARCH
        ========================================================= */

        globalSearch.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape"
                ) {

                    globalSearch.value = "";

                    filterNotifications();

                    globalSearch.blur();

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
           AUTOMATIC ACTIVE MENU
        ========================================================= */

        (function () {

            const currentPage =
                window.location.pathname
                    .split("/")
                    .pop()
                    .toLowerCase();


            document
                .querySelectorAll(
                    ".menu-item"
                )
                .forEach(
                    function (item) {

                        const href =
                            item
                                .getAttribute(
                                    "href"
                                )
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
           INITIALIZE
        ========================================================= */

        updateUnreadCount();

        filterNotifications();


        /* =========================================================
           LOGOUT
        ========================================================= */

    

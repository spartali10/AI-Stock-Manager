

        /* =========================================================
           THEME
        ========================================================= */

        const themeBtn =
            document.getElementById("themeBtn");


        const savedTheme =
            localStorage.getItem("aiStockTheme");


        if (savedTheme === "light") {

            document.body.classList.add("light-theme");

            themeBtn.textContent = "☀️";

        }


        /* Tema değiştir */

        themeBtn.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();

                document.body.classList.toggle(
                    "light-theme"
                );

                const isLight =
                    document.body.classList.contains(
                        "light-theme"
                    );

                themeBtn.textContent =
                    isLight
                        ? "☀️"
                        : "🌙";

                localStorage.setItem(
                    "aiStockTheme",
                    isLight
                        ? "light"
                        : "dark"
                );

            }
        );


        /* =========================================================
           ACTIVE MENU
        ========================================================= */

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

                item.classList.remove("active");

                if (currentPage === href) {

                    item.classList.add("active");

                }

            });


        /* =========================================================
           USER PROFILE MENU
        ========================================================= */

        const userArea =
            document.getElementById("userArea");


        const accountMenu =
            document.getElementById("accountMenu");


        function toggleAccountMenu() {

            const isOpen =
                userArea.classList.contains("open");


            userArea.classList.toggle(
                "open",
                !isOpen
            );

            userArea.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );

        }


        userArea.addEventListener(
            "click",
            function (event) {

                /*
                 * Menü içerisindeki link veya butonlara
                 * tıklandığında ana user-area tekrar
                 * açılıp kapanmasın.
                 */

                if (
                    event.target.closest(".account-item")
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

            }
        );


        /* Dışarı tıklanınca kapat */

        document.addEventListener(
            "click",
            function (event) {

                if (
                    !userArea.contains(event.target)
                ) {

                    userArea.classList.remove("open");

                    userArea.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }

            }
        );


        /* =========================================================
           ORTAK ONLINE / OTURUM SÜRESİ
        ========================================================= */

        const SESSION_START_KEY =
            "aiStockSessionStartedAt";


        /*
         * Oturum başlangıç zamanını al.
         *
         * Eğer login sistemi daha önce oluşturduysa
         * mevcut zamanı kullanır.
         *
         * Eğer değer yoksa bu sayfanın açılışını
         * başlangıç olarak kabul eder.
         *
         * Gerçek login sayfasında aynı anahtar
         * login başarılı olduğunda oluşturulmalıdır.
         */

        function ensureSessionStarted() {

            let startedAt =
                localStorage.getItem(
                    SESSION_START_KEY
                );


            if (
                !startedAt ||
                Number.isNaN(Number(startedAt))
            ) {

                startedAt =
                    String(Date.now());

                localStorage.setItem(
                    SESSION_START_KEY,
                    startedAt
                );

            }


            return Number(startedAt);

        }


        const onlineStartedAt =
            ensureSessionStarted();


        /*
         * Online süresini güncelle.
         *
         * Üst profil ve açılır profil menüsü
         * aynı başlangıç zamanını kullandığı için
         * her zaman aynı dakika değerini gösterir.
         */

        function updateOnlineMinutes() {

            const storedStartedAt =
                localStorage.getItem(
                    SESSION_START_KEY
                );


            /*
             * Oturum bilgisi yoksa 0 göster.
             */

            if (
                !storedStartedAt ||
                Number.isNaN(Number(storedStartedAt))
            ) {

                const onlineMinutes =
                    document.getElementById(
                        "onlineMinutes"
                    );


                const accountOnlineMinutes =
                    document.getElementById(
                        "accountOnlineMinutes"
                    );


                if (onlineMinutes) {

                    onlineMinutes.textContent =
                        "0";

                }


                if (accountOnlineMinutes) {

                    accountOnlineMinutes.textContent =
                        "0";

                }


                return;

            }


            const startedAt =
                Number(storedStartedAt);


            const elapsed =
                Math.max(
                    0,
                    Date.now() - startedAt
                );


            const minutes =
                Math.floor(
                    elapsed / 60000
                );


            /*
             * Profilde görünen online dakika.
             */

            const onlineMinutes =
                document.getElementById(
                    "onlineMinutes"
                );


            if (onlineMinutes) {

                onlineMinutes.textContent =
                    minutes;

            }


            /*
             * Profil açılır menüsündeki online dakika.
             */

            const accountOnlineMinutes =
                document.getElementById(
                    "accountOnlineMinutes"
                );


            if (accountOnlineMinutes) {

                accountOnlineMinutes.textContent =
                    minutes;

            }

        }


        /*
         * İlk açılışta hemen çalıştır.
         */

        updateOnlineMinutes();


        /*
         * Her 10 saniyede güncelle.
         */

        const onlineTimer =
            setInterval(
                updateOnlineMinutes,
                10000
            );


        /* =========================================================
           NOTIFICATION
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
           LOGOUT
        ========================================================= */

        const logoutBtn =
            document.getElementById(
                "logoutBtn"
            );


        


        /* =========================================================
           SEARCH
        ========================================================= */

        const searchInput =
            document.getElementById(
                "transferSearch"
            );


        const statusFilter =
            document.getElementById(
                "statusFilter"
            );


        const storeFilter =
            document.getElementById(
                "storeFilter"
            );


        const tableRows =
            document.querySelectorAll(
                "#transferTable tbody tr"
            );


        function filterTransfers() {

            const search =
                searchInput.value
                    .toLowerCase()
                    .trim();


            const status =
                statusFilter.value;


            const store =
                storeFilter.value;


            let visible = 0;


            tableRows.forEach(function (row) {

                const text =
                    row.innerText
                        .toLowerCase();


                const rowStatus =
                    row.dataset.status;


                const searchMatch =
                    !search ||
                    text.includes(search);


                const statusMatch =
                    !status ||
                    rowStatus === status;


                const storeMatch =
                    !store ||
                    text.includes(store);


                if (
                    searchMatch &&
                    statusMatch &&
                    storeMatch
                ) {

                    row.style.display = "";

                    visible++;

                } else {

                    row.style.display =
                        "none";

                }

            });


            document.getElementById(
                "resultCount"
            ).textContent =
                visible + " transfer";

        }


        searchInput.addEventListener(
            "input",
            filterTransfers
        );


        statusFilter.addEventListener(
            "change",
            filterTransfers
        );


        storeFilter.addEventListener(
            "change",
            filterTransfers
        );


        /* =========================================================
           DATE FILTER
        ========================================================= */

        const dateFilter =
            document.getElementById(
                "dateFilter"
            );


        dateFilter.addEventListener(
            "change",
            function () {

                /*
                 * Demo verilerinde tarih filtresi
                 * mevcut yapıyı bozmadan bırakılmıştır.
                 */

                filterTransfers();

            }
        );


        /* =========================================================
           MODAL
        ========================================================= */

        const modal =
            document.getElementById(
                "transferModal"
            );


        function openModal() {

            modal.classList.add("show");

        }


        function closeModal() {

            modal.classList.remove("show");

        }


        modal.addEventListener(
            "click",
            function (event) {

                if (event.target === modal) {

                    closeModal();

                }

            }
        );


        /* =========================================================
           ESC
        ========================================================= */

        document.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Escape") {

                    closeModal();

                    userArea.classList.remove("open");

                    userArea.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }

            }
        );


        /* =========================================================
           CREATE TRANSFER
        ========================================================= */

        function createTransfer() {

            const from =
                document.getElementById("newTransferFrom").value;

            const to =
                document.getElementById("newTransferTo").value;

            const product =
                document.getElementById("newTransferProduct").value.trim();

            const quantity =
                document.getElementById("newTransferQuantity").value;

            if (!product || !quantity || Number(quantity) <= 0) {

                alert(
                    "Lütfen ürün kodu ve geçerli bir miktar girin."
                );

                return;
            }

            NebimAdapter.addTransfer({
                from: from,
                to: to,
                product: product,
                quantity: Number(quantity),
                status: "Bekliyor"
            });

            closeModal();

            alert(
                "Yeni transfer başarıyla oluşturuldu.\n\n" +
                "Transfer onay sürecine gönderildi."
            );

        }


        /* =========================================================
           QUICK TRANSFER
        ========================================================= */

        /* =========================================================
           TRANSFER DETAIL
        ========================================================= */

        function showTransfer(id) {

            alert(
                "Transfer Detayı\n\n" +
                "Transfer No: " +
                id +
                "\n\n" +
                "Detay ekranı burada açılabilir."
            );

        }


        /* =========================================================
           EXPORT
        ========================================================= */

        function exportTransfers() {

            const csv =
                "Transfer ID,Kaynak,Hedef,Ürün,Miktar,Durum\n" +

                "TR-2026-0486," +
                "Ankara M01," +
                "İzmir M01," +
                "14 ürün," +
                "186," +
                "Yolda\n" +

                "TR-2026-0485," +
                "Bursa M01," +
                "İstanbul M02," +
                "8 ürün," +
                "94," +
                "Bekliyor\n" +

                "TR-2026-0484," +
                "İstanbul M01," +
                "Ankara M01," +
                "21 ürün," +
                "327," +
                "Tamamlandı\n";


            const blob =
                new Blob(
                    [csv],
                    {
                        type:
                            "text/csv;charset=utf-8;"
                    }
                );


            const url =
                URL.createObjectURL(blob);


            const link =
                document.createElement("a");


            link.href = url;

            link.download =
                "transferler.csv";


            document.body.appendChild(link);

            link.click();

            document.body.removeChild(link);

            URL.revokeObjectURL(url);

        }


        /* =========================================================
           GLOBAL SEARCH
        ========================================================= */

        document
            .getElementById("globalSearch")
            .addEventListener(
                "input",
                function () {

                    const value =
                        this.value
                            .toLowerCase()
                            .trim();


                    if (!value) {

                        searchInput.value = "";

                        filterTransfers();

                        return;

                    }


                    searchInput.value =
                        value;

                    filterTransfers();

                }
            );

    
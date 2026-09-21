
    (() => {
        const detailDialog = document.getElementById("storeDetailDialog");
        let detailTrigger;
        const setDetailText = (id, text) => { document.getElementById(id).textContent = text; };

        document.querySelectorAll(".detail-btn").forEach(button => {
            button.setAttribute("aria-haspopup", "dialog");
            button.setAttribute("aria-controls", "storeDetailDialog");
        });
        document.getElementById("storeGrid").addEventListener("click", event => {
            const button = event.target.closest(".detail-btn");
            if (!button) return;
                const card = button.closest(".store-card");
                const read = selector => card.querySelector(selector).textContent.trim();
                const metrics = [...card.querySelectorAll(".metric-value")].map(value => value.textContent.trim());
                detailTrigger = button;
                setDetailText("detailTitle", card.dataset.name);
                setDetailText("detailLocation", read(".store-location"));
                setDetailText("detailStatus", read(".status"));
                document.getElementById("detailStatus").className = "status " + card.dataset.status;
                setDetailText("detailSync", read(".last-sync"));
                ["detailStock", "detailSales", "detailLow", "detailCritical"].forEach((id, i) => setDetailText(id, metrics[i]));
                const performance = Math.max(0, Math.min(100, Number(read(".performance-value").replace(/[^0-9.]/g, "")) || 0));
                setDetailText("detailPerformance", "%" + performance);
                document.getElementById("detailProgressBar").style.width = performance + "%";
                document.getElementById("detailProgress").setAttribute("aria-valuenow", performance);
                setDetailText("detailSummary", metrics[2] + " düşük stok ve " + metrics[3] + " kritik stok kaydı bulunuyor. " +
                    (Number(metrics[3].replace(/\./g, "")) > 0
                        ? "Kritik stokları öncelikle inceleyerek mağazanın ikmal ihtiyacını değerlendirin."
                        : "Kritik stok kaydı bulunmuyor. Düşük stok seviyelerini düzenli olarak takip edin."));
                detailDialog.showModal();
        });
        document.getElementById("detailClose").addEventListener("click", () => detailDialog.close());
        document.getElementById("detailDone").addEventListener("click", () => detailDialog.close());
        detailDialog.addEventListener("click", event => {
            const bounds = detailDialog.getBoundingClientRect();
            if (event.target === detailDialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) detailDialog.close();
        });
        detailDialog.addEventListener("close", () => detailTrigger?.focus());

    })();
    
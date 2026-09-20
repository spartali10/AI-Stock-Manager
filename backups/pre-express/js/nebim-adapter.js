/* =========================================================
   NEBIM V3 ADAPTER
   Şimdilik localStorage tabanlı çalışır; gerçek Nebim V3 API
   bilgileri geldiğinde sadece bu dosyadaki fonksiyonlar
   (fetch/axios çağrılarıyla) değiştirilecek. Sayfa kodları
   NebimAdapter.* çağırmaya devam edeceği için başka hiçbir
   sayfa dosyası bozulmayacak.
========================================================= */

(function (global) {

    const STORAGE_KEY = "aiStockNebimData";

    const seedData = {

        products: [
            { id: 1, code: "NT1023", name: "Nike T-Shirt 1023", category: "T-Shirt", icon: "👕", store: "İstanbul Mağaza 01", stock: 480, capacity: 600, min: 120 },
            { id: 2, code: "PN2045", name: "Pantolon 2045", category: "Pantolon", icon: "👖", store: "Ankara Mağaza 01", stock: 95, capacity: 400, min: 100 },
            { id: 3, code: "SW3021", name: "Sweatshirt 3021", category: "Sweatshirt", icon: "🧥", store: "İzmir Mağaza 01", stock: 18, capacity: 350, min: 80 }
        ],

        stores: [
            { id: 1, name: "İstanbul Mağaza 01", percent: 94, stock: 24820, sales: 128400 },
            { id: 2, name: "Ankara Mağaza 01", percent: 88, stock: 21640, sales: 104820 },
            { id: 3, name: "İzmir Mağaza 01", percent: 76, stock: 18420, sales: 86240 },
            { id: 4, name: "Bursa Mağaza 01", percent: 71, stock: 15680, sales: 74520 },
            { id: 5, name: "İstanbul Mağaza 02", percent: 83, stock: 17340, sales: 92260 }
        ],

        users: [
            { id: 1, name: "Admin", role: "Sistem Yöneticisi", email: "mehmet@aistockmanager.com", active: true }
        ],

        transfers: [
            { id: 1, from: "Ankara Mağaza 01", to: "İzmir Mağaza 01", product: "Sweatshirt 3021", quantity: 40, status: "Tamamlandı" }
        ],

        notifications: [
            { id: 1, title: "Kritik stok seviyesi", description: "Sweatshirt 3021 — İzmir Mağaza 01", read: false },
            { id: 2, title: "342 ürün düşük stokta", description: "Stok yönetimi ekranından kontrol edin.", read: false },
            { id: 3, title: "Senkronizasyon bekliyor", description: "Nebim V3 ile son senkronizasyon 2 saat önce.", read: false }
        ]

    };

    function loadDb() {

        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            saveDb(seedData);
            return JSON.parse(JSON.stringify(seedData));
        }

        try {
            const db = JSON.parse(raw);
            db.meta = db.meta || { stockSource: "demo" };
            return db;
        } catch (error) {
            saveDb(seedData);
            return JSON.parse(JSON.stringify(seedData));
        }
    }

    function saveDb(db) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    }

    function nextId(list) {
        return list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    }

    function withDelay(value) {
        // Gerçek API çağrısı hissi vermesi ve ileride fetch() ile
        // birebir değiştirilebilmesi için Promise döndürülür.
        return Promise.resolve(value);
    }

    const NebimAdapter = {

        // --- PRODUCTS ---
        getProducts() {
            return withDelay(loadDb().products);
        },

        addProduct(product) {
            const db = loadDb();
            product.id = nextId(db.products);
            db.products.push(product);
            saveDb(db);
            return withDelay(product);
        },

        updateProduct(id, changes) {
            const db = loadDb();
            const item = db.products.find(p => p.id === id);
            if (item) Object.assign(item, changes);
            saveDb(db);
            return withDelay(item);
        },

        deleteProduct(id) {
            const db = loadDb();
            db.products = db.products.filter(p => p.id !== id);
            saveDb(db);
            return withDelay(true);
        },

        // Koda göre bulur, yoksa oluşturur (stok.html tablosundaki satırlarla senkronizasyon için)
        upsertProductByCode(code, changes) {
            const db = loadDb();
            let item = db.products.find(p => p.code === code);

            if (item) {
                Object.assign(item, changes);
            } else {
                item = Object.assign({ id: nextId(db.products), code }, changes);
                db.products.push(item);
            }

            saveDb(db);
            return withDelay(item);
        },

        // Var olan kodları koruyarak sadece eksik ürünleri depoya ekler (sayfa ilk yüklendiğinde kullanılır)
        seedProductsIfMissing(products) {
            const db = loadDb();

            if (db.meta && db.meta.stockSource === "excel") {
                return withDelay(true);
            }
            const existingCodes = new Set(db.products.map(p => p.code));

            products.forEach(function (product) {
                if (!existingCodes.has(product.code)) {
                    product.id = nextId(db.products);
                    db.products.push(product);
                    existingCodes.add(product.code);
                }
            });

            saveDb(db);
            return withDelay(true);
        },

        replaceProductsFromExcel(products, fileName) {
            const db = loadDb();
            db.products = products.map(function (product, index) {
                return Object.assign({}, product, { id: index + 1 });
            });
            db.meta = {
                stockSource: "excel",
                excelFileName: fileName || "stok-listesi",
                importedAt: new Date().toISOString()
            };
            saveDb(db);
            return withDelay(db.products);
        },

        // --- STORES ---
        getStores() {
            return withDelay(loadDb().stores);
        },

        addStore(store) {
            const db = loadDb();
            const normalize = name => name.trim().toLocaleLowerCase("tr-TR");
            if (db.stores.some(item => normalize(item.name) === normalize(store.name))) {
                throw new Error("Bu isimde bir mağaza zaten var.");
            }
            const record = Object.assign({}, store, { id: nextId(db.stores), userCreated: true });
            db.stores.push(record);
            saveDb(db);
            return withDelay(record);
        },

        // --- USERS ---
        getUsers() {
            return withDelay(loadDb().users);
        },

        addUser(user) {
            const db = loadDb();
            user.id = nextId(db.users);
            db.users.push(user);
            saveDb(db);
            return withDelay(user);
        },

        deleteUser(id) {
            const db = loadDb();
            db.users = db.users.filter(u => u.id !== id);
            saveDb(db);
            return withDelay(true);
        },

        // --- TRANSFERS ---
        getWarehouseMatrixData() {
            const db = loadDb();
            return withDelay({ products: db.products, stores: db.stores, token: JSON.stringify(db), fetchedAt: new Date().toISOString(), source: db.meta?.stockSource || 'local' });
        },

        applyWarehouseMatrix(warehouse, entries, token) {
            const db = loadDb();
            if (JSON.stringify(db) !== token) throw new Error('Stok verileri değişti. Güncel veriyi tekrar çekin.');
            const routes = global.WarehouseMatrix.plan(db, warehouse, entries);
            if (!routes.length) throw new Error('Dağıtılacak adet girin.');
            routes.forEach(route => {
                const source = db.products.find(p => p.id === route.productId);
                let target = db.products.find(p => p.store === route.to && global.DistributionEngine.variant(p) === global.DistributionEngine.variant(source));
                if (!target) { target = { ...source, id: nextId(db.products), store: route.to, stock: 0 }; db.products.push(target); }
                if (!Number.isSafeInteger(Number(target.stock)) || Number(target.stock) < 0) throw new Error('Hedef mağaza stoğu geçersiz.');
                source.stock = Number(source.stock) - route.quantity;
                target.stock = Number(target.stock) + route.quantity;
                db.transfers.push({ id: nextId(db.transfers), from: warehouse, to: route.to, product: route.code, color: route.color, size: route.size, quantity: route.quantity, status: 'Tamamlandı', mode: 'chance-matrix', createdAt: new Date().toISOString() });
            });
            saveDb(db);
            return withDelay(routes.length);
        },

        previewDistribution(config) {
            const db = loadDb();
            return withDelay({ ...global.DistributionEngine.build(db, config), token: JSON.stringify(db) });
        },

        applyDistribution(config, token) {
            const db = loadDb();
            if (JSON.stringify(db) !== token) throw new Error("Veriler değişti. Dağıtım önizlemesini yeniden oluşturun.");
            const plan = global.DistributionEngine.build(db, config);
            if (plan.blocked || !plan.routes.length) throw new Error("Uygulanabilir dağıtım yok.");
            const known = new Set([...db.stores.map(s => s.name), ...db.products.map(p => p.store), 'Ankara Mağaza 02']);
            const totals = new Map();
            plan.routes.forEach(route => {
                if (!known.has(route.to) || route.from === route.to || !Number.isSafeInteger(route.quantity) || route.quantity <= 0) throw new Error("Geçersiz dağıtım hedefi veya miktarı.");
                totals.set(route.productId, (totals.get(route.productId) || 0) + route.quantity);
            });
            totals.forEach((quantity, id) => {
                const source = db.products.find(p => p.id === id);
                if (!source || quantity > Number(source.stock)) throw new Error("Kaynak stok yetersiz.");
            });
            plan.routes.forEach(route => {
                const source = db.products.find(p => p.id === route.productId);
                let target = db.products.find(p => p.store === route.to && global.DistributionEngine.variant(p) === global.DistributionEngine.variant(source));
                if (!target) { target = { ...source, id: nextId(db.products), store: route.to, stock: 0 }; db.products.push(target); }
                source.stock = Number(source.stock) - route.quantity;
                target.stock = Number(target.stock) + route.quantity;
                db.transfers.push({ id: nextId(db.transfers), from: route.from, to: route.to, product: route.code, color: route.color, size: route.size, quantity: route.quantity, status: 'Tamamlandı', mode: config.mode, reason: route.reason, salesDateRange: config.dateRange, createdAt: new Date().toISOString() });
            });
            saveDb(db);
            return withDelay(plan.routes.length);
        },

        transferStock(productId, targets, quantity, salesDateRange) {
            const db = loadDb();
            const source = db.products.find(p => p.id === productId);
            const normalize = value => String(value).trim().toLocaleLowerCase('tr-TR');
            if (!source || !Array.isArray(targets) || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error("Geçerli bir ürün, hedef ve miktar seçin.");
            const destinations = [...new Set(targets.map(normalize))].filter(name => name !== normalize(source.store));
            const total = quantity * destinations.length;
            if (!destinations.length || !Number.isSafeInteger(total) || !Number.isFinite(Number(source.stock)) || total > Number(source.stock)) throw new Error("Hedef seçimini ve toplam kaynak stoğunu kontrol edin.");
            const known = [...db.stores.map(s => s.name), ...db.products.map(p => p.store), "Ankara Mağaza 02"];
            const names = destinations.map(name => {
                const found = known.find(store => normalize(store) === name);
                if (!found) throw new Error("Hedef mağaza bulunamadı.");
                return found;
            });
            const records = [];
            const firstId = nextId(db.transfers);
            names.forEach((name, index) => {
                const sourceVariant = global.DistributionEngine?.variant(source);
                let target = db.products.find(p => normalize(p.store) === normalize(name) && p.code === source.code &&
                    (sourceVariant ? global.DistributionEngine.variant(p) === sourceVariant : !global.DistributionEngine?.variant(p)));
                if (!target) {
                    target = Object.assign({}, source, { id: nextId(db.products), store: name, stock: 0 });
                    db.products.push(target);
                }
                if (!Number.isFinite(Number(target.stock))) throw new Error("Hedef stok miktarı geçersiz.");
                target.stock = Number(target.stock) + quantity;
                const record = { id: firstId + index, from: source.store, to: name, product: source.code, quantity, status: "Tamamlandı", createdAt: new Date().toISOString() };
                if (sourceVariant) {
                    const [, color, size] = JSON.parse(sourceVariant);
                    record.color = color; record.size = size;
                }
                if (salesDateRange) record.salesDateRange = Object.assign({}, salesDateRange);
                db.transfers.push(record);
                records.push(record);
            });
            source.stock = Number(source.stock) - total;
            saveDb(db);
            return withDelay(records);
        },

        getTransfers() {
            return withDelay(loadDb().transfers);
        },

        addTransfer(transfer) {
            const db = loadDb();
            transfer.id = nextId(db.transfers);
            db.transfers.push(transfer);
            saveDb(db);
            return withDelay(transfer);
        },

        addTransfers(transfers) {
            if (!Array.isArray(transfers) || !transfers.length) throw new Error("Transfer listesi boş.");
            const db = loadDb();
            const firstId = nextId(db.transfers);
            const records = transfers.map((transfer, index) => {
                if (!transfer.from || !transfer.to || transfer.from === transfer.to || !Number.isSafeInteger(transfer.quantity) || transfer.quantity < 1) throw new Error("Geçersiz transfer.");
                return Object.assign({}, transfer, { id: firstId + index });
            });
            db.transfers.push(...records);
            saveDb(db);
            return withDelay(records);
        },

        // --- NOTIFICATIONS ---
        getNotifications() {
            return withDelay(loadDb().notifications);
        },

        addNotification(notification) {
            const db = loadDb();
            notification.id = nextId(db.notifications);
            db.notifications.push(notification);
            saveDb(db);
            return withDelay(notification);
        },

        markNotificationRead(id) {
            const db = loadDb();
            const item = db.notifications.find(n => n.id === id);
            if (item) item.read = true;
            saveDb(db);
            return withDelay(item);
        },

        // --- STATS (mevcut verilerden hesaplanır) ---
        getStats() {
            const db = loadDb();

            const totalStock = db.products.reduce((sum, p) => sum + p.stock, 0);
            const lowStock = db.products.filter(p => p.stock <= p.min * 1.5 && p.stock > p.min * 0.5).length;
            const criticalStock = db.products.filter(p => p.stock <= p.min * 0.5).length;
            const unreadNotifications = db.notifications.filter(n => !n.read).length;

            return withDelay({
                totalStock,
                lowStock,
                criticalStock,
                unreadNotifications,
                storeCount: db.stores.length,
                userCount: db.users.length,
                transferCount: db.transfers.length
            });
        },

        // --- RESET (geliştirme/test amaçlı) ---
        resetToSeed() {
            saveDb(seedData);
            return withDelay(true);
        }

    };

    // Shared client-side permissions; the production API must enforce these too.
    const protectedMethods = {
        addProduct: 'stockWrite', updateProduct: 'stockWrite', deleteProduct: 'stockWrite', upsertProductByCode: 'stockWrite', replaceProductsFromExcel: 'stockWrite',
        addStore: 'admin', addUser: 'admin', deleteUser: 'admin', getUsers: 'admin', resetToSeed: 'admin',
        transferStock: 'transfers', addTransfer: 'transfers', addTransfers: 'transfers', applyDistribution: 'transfers', applyWarehouseMatrix: 'transfers', previewDistribution: 'transfers', getWarehouseMatrixData: 'transfers', getTransfers: 'transfers',
        addNotification: 'admin', markNotificationRead: 'notifications'
    };
    Object.entries(protectedMethods).forEach(([name, permission]) => {
        const method = NebimAdapter[name];
        NebimAdapter[name] = function (...args) { global.StockAuth?.require(permission); return method.apply(this, args); };
    });
    const seedProducts = NebimAdapter.seedProductsIfMissing;
    NebimAdapter.seedProductsIfMissing = function (...args) {
        if (global.StockAuth && !global.StockAuth.can('stockWrite')) return withDelay(true);
        return seedProducts.apply(this, args);
    };
    const legacyGetUsers = NebimAdapter.getUsers;
    NebimAdapter.getUsers = () => global.StockAuth ? withDelay(global.StockAuth.listUsers()) : legacyGetUsers();
    global.NebimAdapter = NebimAdapter;

})(window);

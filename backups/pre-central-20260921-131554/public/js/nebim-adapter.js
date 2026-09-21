/* =========================================================
   NEBIM V3 ADAPTER
   Stok değişiklikleri ve transferler yalnızca localStorage'a yazılır.
   Nebim bağlantısı yalnızca okuma/görüntüleme içindir. Gelecekteki
   bağlantı, yerel değişiklik metotlarını uzak yazma çağrılarına
   dönüştürmemeli; yerel taslakları Nebim'e senkronize etmemelidir.
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

    const isMainWarehouseName = name => /^mam[uü]l\s+depo(?:\s|\(|$)/i.test(String(name || '').trim());
    const isWarehouse = store => store?.type === 'finished_goods' || store?.isFinishedGoodsWarehouse === true || isMainWarehouseName(store?.name);
    function classifyLocations(db) {
        db.stores = db.stores || [];
        for (const product of db.products || []) {
            if (isMainWarehouseName(product.store) && !db.stores.some(s => s.name === product.store)) db.stores.push({ id: nextId(db.stores), name: product.store });
        }
        db.stores.forEach(store => {
            if (isWarehouse(store)) Object.assign(store, { type: 'finished_goods', isFinishedGoodsWarehouse: true, role: 'distribution_warehouse', isMainWarehouse: true });
            else if (!store.type) store.type = 'store';
        });
        return db;
    }
    function loadDb() {

        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            saveDb(seedData);
            return JSON.parse(JSON.stringify(seedData));
        }

        try {
            const db = JSON.parse(raw);
            db.meta = db.meta || { stockSource: "demo" };
            return classifyLocations(db);
        } catch (error) {
            saveDb(seedData);
            return JSON.parse(JSON.stringify(seedData));
        }
    }

    function saveDb(db) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(classifyLocations(db)));
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
        isWarehouse,

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

        applyStockOperation(productId, store, type, amount) {
            global.StockAuth?.require('stockWrite');
            const db = loadDb();
            const source = db.products.find(p => p.id === productId);
            if (!source) throw new Error('Ürün bulunamadı. Sayfayı yenileyin.');
            if (!['add', 'remove'].includes(type) || !Number.isSafeInteger(amount) || amount <= 0) throw new Error('Pozitif bir tam sayı girin.');
            if (type === 'remove' && store !== source.store) throw new Error('Stok çıkışı ürünün mevcut mağazasından yapılabilir.');
            if (!store || (store !== source.store && !db.stores.some(s => s.name === store))) throw new Error('Geçerli bir mağaza seçin.');
            // Match the actual variant, never just its product code.
            const dimension = (p, field, label) => {
                const key = Object.keys(p.attributes || {}).find(k => k.trim().toLocaleLowerCase('tr-TR') === label);
                return JSON.stringify(p[field] ?? p.attributes?.[key] ?? null);
            };
            const matches = p => p.code === source.code && ['color', 'size', 'fabric'].every((field, i) => dimension(p, field, ['renk', 'beden', 'kumaş'][i]) === dimension(source, field, ['renk', 'beden', 'kumaş'][i]));
            const candidates = store === source.store ? [source] : db.products.filter(p => p.store === store && matches(p));
            if (candidates.length > 1) throw new Error('Hedef mağazada aynı varyantın birden fazla kaydı var. Önce kayıtları kontrol edin.');
            let target = candidates[0];
            const oldStock = target ? Number(target.stock) : 0;
            const capacity = Number((target || source).capacity);
            const stock = oldStock + (type === 'add' ? amount : -amount);
            if (!Number.isSafeInteger(oldStock) || oldStock < 0 || !Number.isSafeInteger(stock)) throw new Error('Stok miktarı geçersiz.');
            if (stock < 0) throw new Error('Mevcut stoktan fazla çıkış yapılamaz.');
            if (type === 'add' && Number.isFinite(capacity) && capacity > 0 && stock > capacity) throw new Error('Hedef mağazadaki ürünün stok kapasitesi aşılamaz.');
            if (!target) {
                target = { ...source, id: nextId(db.products), store, stock: 0 };
                db.products.push(target);
            }
            target.stock = stock;
            saveDb(db);
            return withDelay(target);
        },

        // Koda göre bulur, yoksa oluşturur (/Stok tablosundaki satırlarla senkronizasyon için)
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
        getRetailStores() { return withDelay(loadDb().stores.filter(s => !isWarehouse(s))); },
        getWarehouses() { return withDelay(loadDb().stores.filter(isWarehouse)); },

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
            const stores = [...db.stores];
            for (const product of db.products) {
                if (product.store && !stores.some(store => store.name === product.store)) stores.push({ name: product.store });
            }
            return withDelay({ products: db.products, stores, token: JSON.stringify(db), fetchedAt: new Date().toISOString(), source: db.meta?.stockSource || 'local' });
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

        transferStock(productId, targets, quantity, salesDateRange, remainderOptions = {}) {
            const startedAt = new Date().toISOString();
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
            const routes = names.map(name => ({ name, quantity }));
            if (remainderOptions.sendRemainder) {
                const warehouse = db.stores.find(store => normalize(store.name) === normalize(remainderOptions.remainderStore) && isWarehouse(store));
                if (!warehouse || normalize(warehouse.name) === normalize(source.store)) throw new Error("Kalan ürünler için kaynaktan farklı bir depo seçin.");
                const remaining = Number(source.stock) - total;
                if (!Number.isSafeInteger(remaining) || remaining < 0) throw new Error("Kaynak stok miktarı geçersiz.");
                if (remaining > 0) routes.push({ name: warehouse.name, quantity: remaining });
            }
            const records = [];
            const firstId = nextId(db.transfers);
            routes.forEach(({ name, quantity }, index) => {
                const sourceVariant = global.DistributionEngine?.variant(source);
                let target = db.products.find(p => normalize(p.store) === normalize(name) && p.code === source.code &&
                    (sourceVariant ? global.DistributionEngine.variant(p) === sourceVariant : !global.DistributionEngine?.variant(p)));
                if (!target) {
                    target = Object.assign({}, source, { id: nextId(db.products), store: name, stock: 0 });
                    db.products.push(target);
                }
                if (!Number.isFinite(Number(target.stock))) throw new Error("Hedef stok miktarı geçersiz.");
                const inventorySnapshot = { source: Number(source.stock), target: Number(target.stock), capturedAt: startedAt, phase: 'before-transfer' };
                target.stock = Number(target.stock) + quantity;
                const record = { id: firstId + index, from: source.store, to: name, product: source.code, quantity, inventorySnapshot, status: "Tamamlandı", createdAt: new Date().toISOString() };
                if (sourceVariant) {
                    const [, color, size] = JSON.parse(sourceVariant);
                    record.color = color; record.size = size;
                }
                if (salesDateRange) record.salesDateRange = Object.assign({}, salesDateRange);
                db.transfers.push(record);
                records.push(record);
            });
            source.stock = Number(source.stock) - routes.reduce((sum, route) => sum + route.quantity, 0);
            db.transferTasks = db.transferTasks || [];
            db.meta = db.meta || {};
            const taskId = Math.max(db.meta.lastTransferTaskId || 0, nextId(db.transferTasks) - 1) + 1;
            db.meta.lastTransferTaskId = taskId;
            const user = global.StockAuth?.current();
            records.forEach(record => { record.orderId = taskId; });
            db.transferTasks.push({
                id: taskId, orderId: taskId,
                templateName: String(remainderOptions.templateName || 'Hızlı Transfer'),
                user: user?.username || user?.name || 'Bilinmiyor',
                status: 'Tamamlandı', startedAt, finishedAt: new Date().toISOString(),
                progress: 100, lastMessage: 'Transfer tamamlandı.',
                quantity: records.reduce((sum, record) => sum + record.quantity, 0),
                records: records.map(record => ({ ...record, productName: source.name || source.code }))
            });
            saveDb(db);
            return withDelay(records);
        },

        transferMissingSizes(productIds, targetName, dateRange, options = {}) {
            const db = loadDb();
            const limited = options.sendAllStock === false;
            const minimumQuantity = options.minimumQuantity ?? 1;
            if (limited && (!Number.isSafeInteger(minimumQuantity) || minimumQuantity < 1)) throw Error('Minimum transfer adedi pozitif tam sayı olmalıdır.');
            const norm = value => String(value ?? '').trim().toLocaleLowerCase('tr-TR');
            const field = (p, name, label) => p[name] || p.attributes?.[Object.keys(p.attributes || {}).find(k => norm(k) === norm(label))] || '';
            const variant = p => JSON.stringify([p.code, field(p, 'color', 'Renk'), field(p, 'size', 'Beden'), field(p, 'fabric', 'Kumaş Cinsi') || p.fabricType].map(norm));
            const ranked = Array.isArray(targetName);
            const names = ranked ? [...new Set(targetName)] : [targetName];
            const stores = [...db.stores];
            for (const product of db.products) {
                if (product.store && !stores.some(s => norm(s.name) === norm(product.store))) stores.push({ name: product.store });
            }
            const destinations = names.map(name => stores.find(s => norm(s.name) === norm(name)));
            let destination = destinations[0];
            if (destinations.some(s => !s)) throw Error('Hedef mağaza bulunamadı.');
            if (!destination || !Array.isArray(productIds) || !productIds.length) throw Error('Kaynak ürünleri ve tek hedef seçin.');
            const sources = [...new Set(productIds)].map(id => db.products.find(p => p.id === id));
            if (sources.some(p => !p || (!ranked && norm(p.store) === norm(destination.name)) || !Number.isSafeInteger(Number(p.stock)) || Number(p.stock) < 0)) throw Error('Kaynak ürün veya stok geçersiz.');
            const salesVariant = p => JSON.stringify([p.code, field(p, 'color', 'Renk'), field(p, 'size', 'Beden')].map(norm));
            let salesAvailable = ranked;
            if (ranked && options.stockPriority) {
                const coverage = db.meta?.salesCoverage;
                salesAvailable = !!(dateRange && coverage && coverage.start <= dateRange.start && coverage.end >= dateRange.end && [...sources.map(p => p.store), ...names].every(s => coverage.stores?.includes(s)) && Array.isArray(db.sales));
            }
            if (options.targetOrder) salesAvailable = false;
            if (salesAvailable) {
                const coverage = db.meta?.salesCoverage;
                const date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
                if (!dateRange || !coverage || ![dateRange.start, dateRange.end, coverage.start, coverage.end].every(date) || dateRange.start > dateRange.end || coverage.start > dateRange.start || coverage.end < dateRange.end || ![...sources.map(p => p.store), ...names].every(s => coverage.stores?.includes(s))) throw Error('Seçili tarih ve mağazalar için eksiksiz satış geçmişi gerekli.');
                if (!Array.isArray(db.sales) || db.sales.some(s => !date(s.date) || !s.code || !s.store || !field(s, 'color', 'Renk') || !field(s, 'size', 'Beden') || !Number.isSafeInteger(s.quantity) || s.quantity < 0)) throw Error('Satış verileri eksik veya geçersiz.');
            }
            const salesTotal = (store, product) => (db.sales || []).filter(s => norm(s.store) === norm(store) && s.date >= dateRange.start && s.date <= dateRange.end && salesVariant(s) === salesVariant(product) && (field(s, 'fabric', 'Kumaş Cinsi') ? variant(s) === variant(product) : true)).reduce((n, s) => n + s.quantity, 0);
            if (salesAvailable && sources.some(p => new Set(db.products.filter(other => salesVariant(other) === salesVariant(p)).map(variant)).size > 1 && db.sales.some(s => salesVariant(s) === salesVariant(p) && !field(s, 'fabric', 'Kumaş Cinsi')))) throw Error('Aynı ürünün farklı kumaşları var; satış kayıtlarında kumaş bilgisi gerekli.');
            const sourceVariants = new Set(sources.map(variant));
            const initialTargets = db.products.filter(p => sourceVariants.has(variant(p)) && destinations.some(s => norm(p.store) === norm(s.name)));
            const invalidTarget = initialTargets.find(p => !['number', 'string'].includes(typeof p.stock) || String(p.stock).trim() === '' || !Number.isSafeInteger(Number(p.stock)));
            if (invalidTarget) throw Error(`Hedef stok geçersiz: ${invalidTarget.store} / ${invalidTarget.code} / ${field(invalidTarget, 'color', 'Renk')} / ${field(invalidTarget, 'size', 'Beden')}. Stok tam sayı olmalıdır.`);
            const occupied = new Set(initialTargets.filter(p => Number(p.stock) > 0).map(p => JSON.stringify([norm(p.store), variant(p)])));
            let targetCursor = 0;
            const routes = sources.filter(p => Number(p.stock) >= (options.minTwoStock ? 2 : 1) && field(p, 'size', 'Beden')).flatMap(source => {
                const ordered = options.targetOrder ? [...destinations.slice(targetCursor), ...destinations.slice(0, targetCursor)] : destinations;
                const candidates = ordered.filter(s => norm(s.name) !== norm(source.store) && !occupied.has(JSON.stringify([norm(s.name), variant(source)])));
                if (salesAvailable) candidates.sort((a, b) => salesTotal(b.name, source) - salesTotal(a.name, source));
                if (options.minTwoStock) {
                    return candidates.slice(0, Number(source.stock)).map(target => {
                        occupied.add(JSON.stringify([norm(target.name), variant(source)]));
                        targetCursor = (destinations.indexOf(target) + 1) % destinations.length;
                        return { source, target, quantity: 1 };
                    });
                }
                const target = candidates[0];
                if (target && options.targetOrder) {
                    targetCursor = (destinations.indexOf(target) + 1) % destinations.length;
                    occupied.add(JSON.stringify([norm(target.name), variant(source)]));
                }
                return target && (options.stockPriority || !ranked || (salesTotal(source.store, source) === 0 && salesTotal(target.name, source) > 0)) ? { source, target } : null;
            }).filter(Boolean);
            const eligible = routes;
            if (!eligible.length) throw Error(ranked ? 'Seçili hedeflerde koşullara uyan beden yok: kaynak stoğu pozitif, kaynak dönem satışı 0, hedef dönem satışı pozitif ve hedef beden stoğu 0 olmalıdır.' : 'Filtrelerdeki ürünlerin hedefte eksik ve kaynakta stok bulunan bedeni yok.');
            const startedAt = new Date().toISOString(), records = [];
            for (const { source, target: selectedTarget, quantity: plannedQuantity } of eligible) {
                destination = selectedTarget;
                const quantity = plannedQuantity ?? (limited ? Math.min(minimumQuantity, Number(source.stock)) : Number(source.stock));
                let target = db.products.find(p => norm(p.store) === norm(destination.name) && variant(p) === variant(source));
                if (!target) { target = { ...source, id: nextId(db.products), store: destination.name, stock: 0 }; if (!options.draftOnly) db.products.push(target); }
                const inventorySnapshot = { source: Number(source.stock), target: Number(target.stock), capturedAt: startedAt, phase: 'before-transfer' };
                if (!Number.isSafeInteger(Number(target.stock) + quantity)) throw Error('Hedef stok sınırı aşıldı.');
                if (!options.draftOnly) {
                    target.stock = Number(target.stock) + quantity;
                    source.stock = Number(source.stock) - quantity;
                }
                const record = { id: nextId(db.transfers), from: source.store, to: destination.name, product: source.code, productName: source.name, color: field(source, 'color', 'Renk'), size: field(source, 'size', 'Beden'), fabric: field(source, 'fabric', 'Kumaş Cinsi') || source.fabricType || '', quantity, inventorySnapshot, status: 'Tamamlandı', createdAt: startedAt };
                if (options.draftOnly) { record.id = records.length + 1; record.status = 'Bekliyor'; }
                else db.transfers.push(record);
                records.push(record);
                if (ranked) {
                    record.salesDateRange = { ...dateRange };
                    record.sourceSales = salesAvailable ? salesTotal(source.store, source) : null;
                    record.targetSales = salesAvailable ? salesTotal(destination.name, source) : null;
                    record.reason = `Kaynak satışı: ${record.sourceSales} · Hedef satışı: ${record.targetSales} · Başlangıç hedef beden stoğu: 0`;
                    if (!salesAvailable) record.reason = 'Hedef beden stoğu yok. Eksiksiz satış verisi bulunmadığından hedef seçim sırası kullanıldı.';
                    if (options.targetOrder) record.reason = 'Hedef seçim sırasına göre dağıtıldı. Stoğu bulunan hedef bedenleri atlandı.';
                }
            }
            db.transferTasks ||= []; db.meta ||= {};
            const orderId = Math.max(db.meta.lastTransferTaskId || 0, nextId(db.transferTasks) - 1) + 1;
            db.meta.lastTransferTaskId = orderId;
            records.forEach(r => { r.orderId = orderId; });
            db.transferTasks.push({ id: orderId, orderId, templateName: 'Filtreye Göre Eksik Beden Transferi', user: global.StockAuth?.current()?.username || 'Bilinmiyor', status: 'Tamamlandı', startedAt, finishedAt: startedAt, progress: 100, lastMessage: 'Transfer tamamlandı.', quantity: records.reduce((n, r) => n + r.quantity, 0), records });
            if (options.draftOnly) Object.assign(db.transferTasks[db.transferTasks.length - 1], { status: 'Emir hazır · Gönderilmedi', finishedAt: startedAt, progress: 100, lastMessage: 'Emir hazırlığı tamamlandı. Gönderilmedi; stok hareketi yapılmadı.' });
            saveDb(db);
            return withDelay(records);
        },

        getTransferTasks() {
            return withDelay((loadDb().transferTasks || []).map(task => {
                if (task.status === 'Bekliyor' && task.lastMessage === 'Emir oluşturuldu. Stok hareketi yapılmadı.' && task.records?.length) {
                    return { ...task, status: 'Emir hazır · Gönderilmedi', finishedAt: task.startedAt, progress: 100, lastMessage: 'Emir hazırlığı tamamlandı. Gönderilmedi; stok hareketi yapılmadı.' };
                }
                return task;
            }));
        },

        getTransferOrderContext() {
            const db = loadDb();
            return withDelay({ products: db.products || [], sales: db.sales || null, meta: db.meta || {} });
        },

        deleteTransferTasks(ids) {
            if (!Array.isArray(ids) || ids.some(id => !Number.isSafeInteger(id))) throw new Error('Geçerli görev seçin.');
            const db = loadDb();
            db.transferTasks = (db.transferTasks || []).filter(task => !ids.includes(task.id));
            saveDb(db);
            return withDelay(true);
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
            const counts = global.StockSizeView.counts(db.products);
            const { normal: normalStock, low: lowStock, critical: criticalStock, depleted: depletedStock } = counts;
            const unreadNotifications = db.notifications.filter(n => !n.read).length;

            return withDelay({
                totalStock,
                normalStock,
                depletedStock,
                lowStock,
                criticalStock,
                unreadNotifications,
                storeCount: db.stores.filter(s => !isWarehouse(s)).length,
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
        transferMissingSizes: 'transfers', transferStock: 'transfers', addTransfer: 'transfers', addTransfers: 'transfers', applyDistribution: 'transfers', applyWarehouseMatrix: 'transfers', previewDistribution: 'transfers', getWarehouseMatrixData: 'transfers', getTransfers: 'transfers',
        getTransferTasks: 'transfers', getTransferOrderContext: 'transfers', deleteTransferTasks: 'transfers',
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

// Compatibility facade: all business data comes from the central backend.
// There is no localStorage fallback and no direct Nebim connection.
(function (global) {
    const reads = ["getProducts","getStores","getRetailStores","getWarehouses","getWarehouseMatrixData","previewDistribution","getTransferTasks","getTransferOrderContext","getTransfers","getNotifications","getStats","getUsers","getTemplates","getOrderNote"];
    const writes = ["addProduct","updateProduct","deleteProduct","upsertProductByCode","applyStockOperation","replaceProductsFromExcel","addStore","transferStock","transferMissingSizes","applyWarehouseMatrix","applyDistribution","deleteTransferTasks","addTransfer","addTransfers","addNotification","markNotificationRead","saveTemplate","deleteTemplate","saveOrderNote"];
    const api = {
        isWarehouse: store => store?.type === 'finished_goods' || store?.isFinishedGoodsWarehouse === true || /^mam[uü]l\s+depo(?:\s|\(|$)/i.test(String(store?.name || '').trim()),
        seedProductsIfMissing: () => Promise.resolve(true),
        resetToSeed: () => Promise.reject(new Error('Merkezi veriler demo verileriyle değiştirilemez.'))
    };
    for (const name of reads) api[name] = (...args) => global.StockApi.call(name, args);
    for (const name of writes) api[name] = (...args) => global.StockApi.call(name, args, true);
    global.NebimAdapter = api;
})(window);

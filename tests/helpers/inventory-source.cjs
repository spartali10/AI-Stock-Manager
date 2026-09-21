const fs = require('node:fs');
module.exports = function inventorySource() {
 const source = fs.readFileSync(require.resolve('../../backend/inventory-service'), 'utf8').replace('module.exports = function createInventoryService', 'const createInventoryService = function');
 return source + '\nwindow.NebimAdapter = createInventoryService({read: () => JSON.parse(localStorage.getItem("aiStockNebimData")), write: db => localStorage.setItem("aiStockNebimData", JSON.stringify(db)), token: () => JSON.stringify(JSON.parse(localStorage.getItem("aiStockNebimData")))}, window);';
};

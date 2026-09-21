// Future read-only source contract. No Nebim network/database connection exists.
module.exports = class NebimReadOnlySource {
    async readProducts() { throw new Error('Nebim okuma bağlantısı henüz yapılandırılmadı.'); }
    async readStores() { throw new Error('Nebim okuma bağlantısı henüz yapılandırılmadı.'); }
    async readStocks() { throw new Error('Nebim okuma bağlantısı henüz yapılandırılmadı.'); }
    async readSales() { throw new Error('Nebim okuma bağlantısı henüz yapılandırılmadı.'); }
};

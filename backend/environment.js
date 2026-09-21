const path = require('node:path');
// Node preserves values already supplied by the hosting platform. No secret is logged.
module.exports = function loadLocalEnvironment(filename = path.join(__dirname, '../.env')) {
    try { process.loadEnvFile(filename); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
};

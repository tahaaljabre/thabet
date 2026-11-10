const queries = require('./reports/queries');
const mutations = require('./reports/mutations');

// Compatibility facade for existing IPC handlers and services.
module.exports = { ...queries, ...mutations };

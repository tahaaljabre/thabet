const session = require('./users/session');
const accounts = require('./users/accounts');
const authentication = require('./users/authentication');
const reset = require('./users/reset');

module.exports = { ...session, ...accounts, ...authentication, ...reset };

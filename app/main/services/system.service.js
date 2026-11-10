const users = require('./system/users');
const financialYears = require('./system/financial-years');
const vouchers = require('./system/vouchers');
const closing = require('./system/closing');
const settings = require('./system/settings');

module.exports = {
  ...users,
  ...financialYears,
  ...vouchers,
  ...closing,
  ...settings
};

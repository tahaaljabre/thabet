const salary = require('./employees/salary');
const statements = require('./employees/statements');
const records = require('./employees/records');
const transactions = require('./employees/transactions');

// Compatibility facade: existing IPC handlers keep importing this file.
module.exports = {
  ...salary,
  ...statements,
  ...records,
  ...transactions
};

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

const dbPath = path.join(process.env.APPDATA, 'hadramout-desktop', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening db:', err);
    process.exit(1);
  }
});

const tables = [
  'users', 'BankSalesMapping', 'BankTransactions', 'BankAccounts', 
  'employee_salary_history', 'employee_transactions', 'employees', 
  'supplier_transactions', 'suppliers', 'CashGeneralVouchers', 
  'ClosingPartners', 'ClosingReports', 'partners', 'daily_reports', 
  'expenses', 'FinancialYears', 'cashiers', 'settings'
];

db.serialize(() => {
  for (const table of tables) {
    db.run(`DELETE FROM ${table}`, (err) => {
      if (err) console.error(`Error on ${table}:`, err.message);
      else console.log(`Cleared ${table}`);
    });
  }
  db.run("DELETE FROM sqlite_sequence", (err) => {
    if (err) console.error('Error on sqlite_sequence:', err.message);
    else console.log('Cleared sqlite_sequence');
  });
  
  const currentYear = new Date().getFullYear().toString();
  db.run("INSERT INTO FinancialYears (YearName, IsClosed) VALUES (?, 0)", [currentYear], (err) => {
    if (err) console.error('Error inserting year:', err.message);
    else console.log('Inserted year');
  });
});

db.close((err) => {
  if (err) console.error(err);
  else console.log('Done clearing database');
});

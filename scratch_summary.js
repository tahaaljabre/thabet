const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(process.env.APPDATA, 'hadramout-desktop', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const targetDiff = 14001;
const startDate = '2026-07-03';

db.serialize(() => {
  db.all("SELECT * FROM supplier_transactions WHERE tx_date >= ?", [startDate], (err, rows) => {
    let sum = 0;
    rows.forEach(r => {
      if(r.amount == targetDiff) console.log('Exact 14001 in supplier_transactions:', r);
      if(r.tx_type === 'عليه') sum += r.amount;
      if(r.tx_type === 'له') sum -= r.amount;
    });
    console.log('Supplier total Cash Outflow since 3rd:', sum);
  });
  
  db.all("SELECT * FROM employee_transactions WHERE tx_date >= ?", [startDate], (err, rows) => {
    let sum = 0;
    rows.forEach(r => {
      if(r.amount == targetDiff || r.allowances == targetDiff || r.deductions == targetDiff) 
        console.log('Exact 14001 in employee_transactions:', r);
      sum += (r.amount || 0) + (r.allowances || 0) + (r.deductions || 0);
    });
    console.log('Employee total Cash Outflow since 3rd:', sum);
  });
  
  db.all("SELECT * FROM CashGeneralVouchers WHERE voucher_date >= ?", [startDate], (err, rows) => {
    let inSum = 0, outSum = 0;
    rows.forEach(r => {
      if(r.amount == targetDiff) console.log('Exact 14001 in CashGeneralVouchers:', r);
      if(r.voucher_type === 'قبض') inSum += r.amount;
      else if(r.voucher_type === 'صرف') outSum += r.amount;
    });
    console.log('Vouchers Outflow:', outSum, 'Inflow:', inSum);
  });
  
  db.all("SELECT * FROM daily_reports WHERE report_date >= ?", [startDate], (err, rows) => {
    let sales = 0;
    rows.forEach(r => {
      if(r.cashier_actual == targetDiff || r.cash_sales == targetDiff) 
        console.log('Exact 14001 in daily_reports:', r);
      sales += (r.cashier_actual || r.cash_sales || 0);
    });
    console.log('Total Cash Sales since 3rd:', sales);
  });
  
  db.all("SELECT * FROM expenses WHERE expense_date >= ?", [startDate], (err, rows) => {
    let sum = 0;
    rows.forEach(r => {
      if(r.amount == targetDiff) console.log('Exact 14001 in expenses:', r);
      sum += r.amount;
    });
    console.log('Total general expenses since 3rd:', sum);
  });
});

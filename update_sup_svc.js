const fs = require('fs');
const file = 'c:/Users/tahaa/OneDrive/سطح المكتب/thabit/app/main/services/suppliers.service.js';
let content = fs.readFileSync(file, 'utf8');

// Replace INSERT logic
content = content.replace(
/const res = await dbRun\("INSERT INTO supplier_transactions \(supplier_id, tx_date, amount, tx_type, notes,\s*account_id, year_id\) VALUES \(\?, \?, \?, \?, \?, \?, \?\)", \s*\[tx\.supplier_id, tx\.tx_date, tx\.amount, tx\.tx_type, tx\.notes, finalAccountId, yearId\]\);/g,
`const maxVoucherRow = await dbGet("SELECT MAX(voucher_no) as max_voucher FROM supplier_transactions WHERE year_id = ?", [yearId]);
        const nextVoucher = (maxVoucherRow && maxVoucherRow.max_voucher) ? maxVoucherRow.max_voucher + 1 : 1;
        const res = await dbRun("INSERT INTO supplier_transactions (supplier_id, tx_date, amount, tx_type, notes, account_id, voucher_no, year_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
        [tx.supplier_id, tx.tx_date, tx.amount, tx.tx_type, tx.notes, finalAccountId, nextVoucher, yearId]);`);

// Add getSupplierTransactionByVoucher
const newFunc = `
async function getSupplierTransactionByVoucher(voucherNo, yearId) {
  return await dbGet(\`
    SELECT tx.*, s.name as supplier_name, s.phone as supplier_phone
    FROM supplier_transactions tx
    JOIN suppliers s ON tx.supplier_id = s.id
    WHERE tx.voucher_no = ? AND tx.year_id = ?
  \`, [voucherNo, yearId]);
}
`;

content = content.replace(/module\.exports = {/, newFunc + '\nmodule.exports = {');
content = content.replace(/getSupplierTransactions,/, 'getSupplierTransactions,\n  getSupplierTransactionByVoucher,');

fs.writeFileSync(file, content, 'utf8');
console.log('Updated suppliers.service.js');

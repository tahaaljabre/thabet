const fs = require('fs');
const file = 'c:/Users/tahaa/OneDrive/سطح المكتب/thabit/app/renderer/js/pages/suppliers/print.js';
let content = fs.readFileSync(file, 'utf8');

// Display voucher_no in the print voucher header
const voucherNoHtml = `
            <div class="v-header-left">
              \${tx.voucher_no ? \`<p style="font-weight:bold; color:#7A1A22;">\${t('voucher_number') || 'رقم السند'}: #\${tx.voucher_no}</p>\` : ''}
              <p>\${isEn ? 'Date:' : 'التاريخ:'} \${formatDateString(tx.tx_date)}</p>
            </div>
`;

content = content.replace(/<div class="v-header-left">\s*<p>\$\{isEn \? 'Date:' : '[^']+'\} \$\{formatDateString\(tx\.tx_date\)\}<\/p>\s*<\/div>/, voucherNoHtml);

fs.writeFileSync(file, content, 'utf8');
console.log('Updated suppliers print template');

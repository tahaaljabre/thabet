const fs = require('fs');
const path = require('path');
const fp = path.resolve('app/renderer/js/pages/vault/reports.js');
let c = fs.readFileSync(fp, 'utf8');

c = c.replace(/padding:6px 13px;/g, 'padding:10px 13px;');
c = c.replace(/padding: 4px 0;/g, 'padding: 8px 4px;');
c = c.replace(/padding: 6px 0;/g, 'padding: 10px 4px;');

fs.writeFileSync(fp, c);
console.log('Padding replaced successfully');

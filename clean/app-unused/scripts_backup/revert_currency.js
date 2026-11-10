const fs = require('fs');
const path = require('path');

function revertCurrency(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      revertCurrency(fullPath);
    } else if (fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('ر.ي')) {
        content = content.replace(/ر\.ي/g, "฿");
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

revertCurrency(path.join(__dirname, 'renderer', 'js'));

const indexPath = path.join(__dirname, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');
if (indexHtml.includes('ر.ي')) {
  indexHtml = indexHtml.replace(/ر\.ي/g, "฿");
  fs.writeFileSync(indexPath, indexHtml, 'utf8');
}

console.log('Currency reverted successfully.');

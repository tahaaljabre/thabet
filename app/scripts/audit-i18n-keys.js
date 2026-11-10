const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadLocale(file, language) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  return context.window.locales[language];
}

function filesIn(target, result = []) {
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(target)) filesIn(path.join(target, name), result);
  } else if (/\.(?:js|html)$/.test(target)) result.push(target);
  return result;
}

const ar = loadLocale('js/locales/ar.js', 'ar');
const en = loadLocale('js/locales/en.js', 'en');
const referenced = new Set();
const patterns = [
  /(?:window\.)?\bt\(\s*['"]([^'"]+)['"]/g,
  /data-i18n(?:-placeholder|-title|-aria-label|-alt)?=['"]([^'"]+)['"]/g
];

for (const file of filesIn('renderer')) {
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source))) referenced.add(match[1]);
  }
}

const missingAr = [...referenced].filter(key => !(key in ar)).sort();
const missingEn = [...referenced].filter(key => !(key in en)).sort();
const onlyAr = Object.keys(ar).filter(key => !(key in en)).sort();
const onlyEn = Object.keys(en).filter(key => !(key in ar)).sort();

console.log(`Referenced: ${referenced.size}`);
console.log(`Arabic: ${Object.keys(ar).length}; English: ${Object.keys(en).length}`);
console.log(`Missing Arabic (${missingAr.length}): ${missingAr.join(', ')}`);
console.log(`Missing English (${missingEn.length}): ${missingEn.join(', ')}`);
console.log(`Only Arabic (${onlyAr.length}): ${onlyAr.join(', ')}`);
console.log(`Only English (${onlyEn.length}): ${onlyEn.join(', ')}`);

if (missingAr.length || missingEn.length || onlyAr.length || onlyEn.length) process.exitCode = 1;

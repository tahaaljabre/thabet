const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/locales/ar.js'), 'utf8'), context);
const entries = Object.entries(context.window.locales.ar)
  .filter(([, value]) => typeof value === 'string' && /[\u0600-\u06ff]/.test(value))
  .sort((a, b) => b[1].length - a[1].length);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const files = walk(path.join(root, 'renderer/js'))
  .filter(file => file.endsWith('.js'))
  .filter(file => /print|statement|voucher-templates|full-report/.test(path.basename(file)));
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let total = 0;

for (const file of files) {
  let source = fs.readFileSync(file, 'utf8');
  let changes = 0;
  for (const [key, rawValue] of entries) {
    const value = rawValue.trim();
    const pattern = new RegExp(`>(\\s*)${escapeRegex(value)}(\\s*)<`, 'g');
    source = source.replace(pattern, (match, before, after) => {
      changes++;
      return `>${before}\${window.t('${key}')}${after}<`;
    });
  }
  if (!changes) continue;
  total += changes;
  console.log(`${path.relative(root, file)}: ${changes}`);
  if (process.argv.includes('--write')) fs.writeFileSync(file, source, 'utf8');
}
console.log(`TOTAL_PRINT_LINKS=${total}`);

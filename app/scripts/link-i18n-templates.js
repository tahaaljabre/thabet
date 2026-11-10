const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/locales/ar.js'), 'utf8'), context);
const entries = Object.entries(context.window.locales.ar)
  .filter(([, value]) => typeof value === 'string' && value.trim().length > 1)
  .sort((a, b) => b[1].length - a[1].length);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const templateRoot = path.join(root, 'renderer/js/templates');
const files = walk(templateRoot).filter(file => file.endsWith('.js'));
for (const section of walk(path.join(root, 'renderer/js/pages'))) {
  if (!section.endsWith('.js')) continue;
  if (/[/\\](template|index)\.js$/.test(section) || section.includes(`${path.sep}settings${path.sep}template-`)) files.push(section);
}

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let total = 0;

for (const file of [...new Set(files)]) {
  let source = fs.readFileSync(file, 'utf8');
  let changes = 0;

  for (const [key, rawValue] of entries) {
    const value = rawValue.trim();
    if (!/[\u0600-\u06ff]/.test(value)) continue;
    const escaped = escapeRegex(value);
    const elementPattern = new RegExp(`(<([a-zA-Z][\\w-]*)(?:[^<>]*?))>(\\s*)${escaped}(\\s*)<\\/\\2>`, 'g');
    source = source.replace(elementPattern, (match, opening, tag, before, after) => {
      if (/\bdata-i18n\s*=/.test(opening)) return match;
      changes++;
      return `${opening} data-i18n="${key}">${before}${value}${after}</${tag}>`;
    });

    const placeholderPattern = new RegExp(`(<(?:input|textarea)\\b(?![^>]*data-i18n-placeholder)[^>]*?)placeholder="${escaped}"`, 'g');
    source = source.replace(placeholderPattern, (match, opening) => {
      changes++;
      return `${opening}data-i18n-placeholder="${key}" placeholder="${value}"`;
    });
  }

  if (changes) {
    total += changes;
    console.log(`${path.relative(root, file)}: ${changes}`);
    if (process.argv.includes('--write')) fs.writeFileSync(file, source, 'utf8');
  }
}

console.log(`TOTAL_LINKS=${total}`);

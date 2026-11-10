const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'renderer');
const findings = [];
const arabic = /[\u0600-\u06ff]/;
const dynamicUiSink = /\b(?:showToast|alert|showConfirm)\s*\(|\.(?:textContent|innerText|placeholder|title)\s*=/;

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!/\.(?:js|html)$/.test(entry.name)) continue;
    const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!arabic.test(line) || !dynamicUiSink.test(line)) return;
      if (/\b(?:window\.)?t\s*\(/.test(line) || /data-i18n(?:-\w+)?=/.test(line)) return;
      findings.push(`${path.relative(root, fullPath)}:${index + 1}`);
    });
  }
}

walk(root);
if (findings.length) {
  console.error('Hard-coded interface text audit failed:');
  findings.forEach(finding => console.error(`- ${finding}`));
  process.exit(1);
}
console.log('Hard-coded interface text audit passed.');

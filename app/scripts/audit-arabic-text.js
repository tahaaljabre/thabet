const fs = require('fs');
const path = require('path');

const roots = process.argv.slice(2);
const targets = roots.length ? roots : ['renderer/js'];
const extensions = new Set(['.js', '.html']);

function visit(target) {
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(target)) visit(path.join(target, name));
    return;
  }
  if (!extensions.has(path.extname(target))) return;
  const lines = fs.readFileSync(target, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/[\u0600-\u06ff]/.test(line)) {
      console.log(`${target}:${index + 1}:${line.trim()}`);
    }
  });
}

targets.forEach(visit);

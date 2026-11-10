const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const appRoot = path.resolve(__dirname, '..');
const roots = [
  path.join(appRoot, 'main.js'),
  path.join(appRoot, 'wipe-db.js'),
  path.join(appRoot, 'main'),
  path.join(appRoot, 'renderer', 'preload.js'),
  path.join(appRoot, 'renderer', 'js')
];

function collectJavaScript(target, files = []) {
  if (!fs.existsSync(target)) return files;
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (target.endsWith('.js')) files.push(target);
    return files;
  }

  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    collectJavaScript(path.join(target, entry.name), files);
  }
  return files;
}

const files = roots.flatMap(root => collectJavaScript(root));
let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(`\nSyntax error: ${path.relative(appRoot, file)}\n`);
    process.stderr.write(result.stderr || result.stdout || 'Unknown syntax error\n');
  }

  const content = fs.readFileSync(file, 'utf8');
  const importRegex = /(?:from|import)\s+['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)|require\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const relPath = match[1] || match[2] || match[3];
    const resolvedBase = path.resolve(path.dirname(file), relPath);
    const candidates = [
      resolvedBase,
      `${resolvedBase}.js`,
      path.join(resolvedBase, 'index.js')
    ];
    if (!candidates.some(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())) {
      failed = true;
      process.stderr.write(`\nMissing module import in ${path.relative(appRoot, file)}: "${relPath}"\n`);
    }
  }
}

if (failed) process.exit(1);
console.log(`JavaScript syntax check passed (${files.length} files).`);

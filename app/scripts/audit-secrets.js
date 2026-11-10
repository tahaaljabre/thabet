const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignoredDirectories = new Set(['node_modules', 'dist', 'build', '.git']);
const forbiddenFileNames = [
  /^credentials\.json$/i,
  /client.*secret.*\.json$/i,
  /^google_oauth_credentials\.json$/i,
  /^google_drive_token\.json$/i
];
const credentialValuePatterns = [
  /"client_secret"\s*:\s*"(?!YOUR_|REPLACE_|<)[^"]{8,}"/i,
  /"private_key"\s*:\s*"-----BEGIN (?:RSA )?PRIVATE KEY/i,
  /"refresh_token"\s*:\s*"(?!YOUR_|REPLACE_|<)[^"]{8,}"/i
];
const findings = [];

function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(root, fullPath);
    if (entry.isDirectory()) {
      scan(fullPath);
      continue;
    }
    if (forbiddenFileNames.some(pattern => pattern.test(entry.name))) {
      findings.push(`${relativePath}: forbidden credential filename`);
      continue;
    }
    if (!/\.(?:json|js|cjs|mjs|env|yaml|yml|txt)$/i.test(entry.name)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    if (credentialValuePatterns.some(pattern => pattern.test(content))) {
      findings.push(`${relativePath}: possible embedded credential value`);
    }
  }
}

scan(root);
if (findings.length) {
  console.error('Credential audit failed:');
  findings.forEach(finding => console.error(`- ${finding}`));
  process.exit(1);
}
console.log('Credential audit passed: no embedded OAuth credential files or values found.');

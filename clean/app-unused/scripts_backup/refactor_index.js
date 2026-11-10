const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// try to remove lines 846 to 864 instead
let lines = content.split('\n');
let startIdx = lines.findIndex(l => l.includes('<script src="renderer/js/core/event-bus.js"></script>'));
let endIdx = lines.findIndex(l => l.includes('<script src="renderer/js/pages/suppliers/ledger.js"></script>'));
if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
    lines.splice(startIdx, endIdx - startIdx + 1);
    content = lines.join('\n');
    console.log("Removed via lines.");
} else {
    console.log("Could not find start or end index.");
}

// Ensure js/i18n.js is removed from the end if it's there
lines = content.split('\n');
let i18nIdx = lines.findIndex(l => l.includes('<script src="js/i18n.js"></script>'));
if(i18nIdx !== -1) {
    lines.splice(i18nIdx, 1);
    content = lines.join('\n');
}

// Build the new block to insert right before </body>
const newBlock = `
    <!-- Core Scripts & Config -->
    <script src="js/i18n.js"></script>
    <script src="renderer/js/core/event-bus.js"></script>
    <script src="renderer/js/core/ui-helpers.js"></script>
    <script src="renderer/js/core/init.js"></script>
    <script src="renderer/js/core/print-engine.js"></script>
    
    <!-- App Entry -->
    <script type="module" src="renderer/js/app.js"></script>

    <!-- Employees Page Modules -->
    <script src="renderer/js/pages/employees/index.js"></script>
    <script src="renderer/js/pages/employees/form.js"></script>
    <script src="renderer/js/pages/employees/ledger.js"></script>
    <script src="renderer/js/pages/employees/salary.js"></script>

    <!-- Suppliers Page Modules -->
    <script src="renderer/js/pages/suppliers/index.js"></script>
    <script src="renderer/js/pages/suppliers/form.js"></script>
    <script src="renderer/js/pages/suppliers/ledger.js"></script>

    <!-- Vault Page Modules (Head) -->
    <script src="renderer/js/pages/vault/index.js"></script>
    <script src="renderer/js/pages/vault/reports.js"></script>
`;

if (content.includes('</body>')) {
    content = content.replace('</body>', newBlock + '\n</body>');
    console.log("Inserted new block before </body>");
} else {
    console.log("</body> not found!");
}

fs.writeFileSync(indexPath, content, 'utf8');
console.log("Done.");

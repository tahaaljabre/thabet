const fs = require('fs');
const file = 'c:/Users/tahaa/OneDrive/سطح المكتب/thabit/app/renderer/js/pages/purchases/ledger.js';
const printFile = 'c:/Users/tahaa/OneDrive/سطح المكتب/thabit/app/renderer/js/pages/purchases/print.js';

let content = fs.readFileSync(file, 'utf8');

const extractFunction = (content, funcName) => {
    const startStr = `async function ${funcName}`;
    const startIdx = content.indexOf(startStr);
    if (startIdx === -1) return { func: '', content };
    
    let endIdx = -1;
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let started = false;
    
    for (let i = startIdx; i < content.length; i++) {
        const char = content[i];
        
        if (inString) {
            if (char === stringChar && content[i-1] !== '\\') {
                inString = false;
            }
        } else {
            if (char === "'" || char === '"' || char === "`") {
                inString = true;
                stringChar = char;
            } else if (char === '{') {
                braceCount++;
                started = true;
            } else if (char === '}') {
                braceCount--;
                if (started && braceCount === 0) {
                    endIdx = i + 1;
                    break;
                }
            }
        }
    }
    
    if (endIdx === -1) return { func: '', content };
    
    const funcCode = content.substring(startIdx, endIdx);
    const newContent = content.substring(0, startIdx) + content.substring(endIdx);
    
    return { func: funcCode, content: newContent };
};

let res = extractFunction(content, 'printDailyExpensesVoucher');
const voucherFunc = res.func;
content = res.content;

res = extractFunction(content, 'printExpensesStatement');
const stmtFunc = res.func;
content = res.content;

const printContent = `// Print Templates for Purchases / Expenses
${voucherFunc}

${stmtFunc}
`;

fs.writeFileSync(printFile, printContent, 'utf8');
fs.writeFileSync(file, content, 'utf8');

console.log('Extraction complete for purchases');

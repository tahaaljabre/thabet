const fs = require('fs');
const file = 'c:/Users/tahaa/OneDrive/سطح المكتب/thabit/app/renderer/js/pages/employees/ledger.js';
const printFile = 'c:/Users/tahaa/OneDrive/سطح المكتب/thabit/app/renderer/js/pages/employees/print.js';

let content = fs.readFileSync(file, 'utf8');

// Find boundaries
// printEmployeeStatement starts at 'async function printEmployeeStatement()'
// printEmployeeVoucher starts at 'async function printEmployeeVoucher(txId)'
// printAllEmployeesReport starts at 'async function printAllEmployeesReport()'

const extractFunction = (content, funcName) => {
    const startStr = `async function ${funcName}`;
    const startIdx = content.indexOf(startStr);
    if (startIdx === -1) return { func: '', content };
    
    // Simple block parser to find the end of the function
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

let res = extractFunction(content, 'printEmployeeStatement');
const stmtFunc = res.func;
content = res.content;

res = extractFunction(content, 'printEmployeeVoucher');
const voucherFunc = res.func;
content = res.content;

res = extractFunction(content, 'printAllEmployeesReport');
const reportFunc = res.func;
content = res.content;

// Remove the standalone openAllEmployeesReportModal and closeAllEmployeesReportModal as well, because they are tied to printAllEmployeesReport and could be moved to print.js
res = extractFunction(content, 'openAllEmployeesReportModal');
const openModalFunc = res.func;
content = res.content;

res = extractFunction(content, 'closeAllEmployeesReportModal');
const closeModalFunc = res.func;
content = res.content;

// For non-async functions, our parser above looks for "async function", we need to adjust
const extractNonAsyncFunction = (content, funcName) => {
    const startStr = `function ${funcName}`;
    const startIdx = content.indexOf(startStr);
    if (startIdx === -1) return { func: '', content };
    
    // Simple block parser to find the end of the function
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
}

// Let's retry modal functions
res = extractNonAsyncFunction(content, 'openAllEmployeesReportModal');
const openModalFuncReal = res.func;
content = res.content;

res = extractNonAsyncFunction(content, 'closeAllEmployeesReportModal');
const closeModalFuncReal = res.func;
content = res.content;

// Now save the extracted functions to print.js
const printContent = `// Print Templates for Employees
${stmtFunc}

${voucherFunc}

${openModalFuncReal}

${closeModalFuncReal}

${reportFunc}
`;

fs.writeFileSync(printFile, printContent, 'utf8');
fs.writeFileSync(file, content, 'utf8');

console.log('Extraction complete');

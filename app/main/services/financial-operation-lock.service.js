let operationTail = Promise.resolve();

async function runFinancialOperationExclusive(operation) {
  const previous = operationTail;
  let release;
  operationTail = new Promise(resolve => { release = resolve; });
  await previous.catch(() => {});
  try {
    return await operation();
  } finally {
    release();
  }
}

module.exports = { runFinancialOperationExclusive };

/**
 * SQLite transaction manager.
 *
 * The app uses a single sqlite3 connection. Two overlapping `BEGIN` statements
 * on the same connection fail with "cannot start a transaction within a
 * transaction", and a single-statement write issued while another operation has
 * an open transaction would silently join that transaction (and be rolled back
 * with it).
 *
 * This module serializes write work through one queue and exposes
 * `withTransaction` for multi-statement operations. The queue is re-entrant for
 * the async chain that already owns it, so nested calls join the outer
 * transaction instead of deadlocking.
 */
const { AsyncLocalStorage } = require('async_hooks');
const { db } = require('./connection');

const transactionScope = new AsyncLocalStorage();
let queueTail = Promise.resolve();

function rawRun(sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function isInsideExclusiveScope() {
  return Boolean(transactionScope.getStore());
}

function isInsideTransaction() {
  const scope = transactionScope.getStore();
  return Boolean(scope && scope.inTransaction);
}

/**
 * Runs `operation` after every previously queued write operation has finished.
 * Nested calls on the same async chain run immediately (they already own the
 * queue).
 */
async function runExclusive(operation) {
  if (isInsideExclusiveScope()) {
    return await operation();
  }
  const previous = queueTail;
  let release;
  queueTail = new Promise((resolve) => { release = resolve; });
  await previous.catch(() => {});
  try {
    return await transactionScope.run({ inTransaction: false }, operation);
  } finally {
    release();
  }
}

/**
 * Runs `operation` inside a transaction and commits on success, rolling back on
 * error. Nested calls join the surrounding transaction and leave COMMIT/ROLLBACK
 * to the outermost caller.
 */
async function withTransaction(operation, options = {}) {
  if (isInsideTransaction()) {
    return await operation();
  }
  return runExclusive(async () => {
    const scope = transactionScope.getStore();
    await rawRun(options.immediate ? 'BEGIN IMMEDIATE' : 'BEGIN TRANSACTION');
    if (scope) scope.inTransaction = true;
    try {
      const result = await operation();
      await rawRun('COMMIT');
      return result;
    } catch (error) {
      await rawRun('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      if (scope) scope.inTransaction = false;
    }
  });
}

module.exports = { runExclusive, withTransaction, isInsideTransaction };

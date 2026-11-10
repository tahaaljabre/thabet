const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

// Ensure db directory exists in userData
const dbPath = process.env.NODE_ENV === 'test' ? ':memory:' : path.join(app.getPath('userData'), 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the SQLite database:', err.message);
  } else {
    if (process.env.NODE_ENV !== 'test') console.log('Connected to the SQLite database.');
  }
});

// Monkey patch db.run to ensure all queries have a callback to catch unhandled errors
const originalDbRun = db.run.bind(db);
db.run = function (sql, ...args) {
  if (args.length === 0 || typeof args[args.length - 1] !== 'function') {
    args.push((err) => {
      if (err && process.env.NODE_ENV !== 'test') {
        console.error(`Database Error on [${sql}]:`, err.message);
      }
    });
  }
  return originalDbRun(sql, ...args);
};

// Also patch db.all just in case
const originalDbAll = db.all.bind(db);
db.all = function (sql, ...args) {
  if (args.length === 0 || typeof args[args.length - 1] !== 'function') {
    args.push((err, rows) => {
      if (err && process.env.NODE_ENV !== 'test') {
        console.error(`Database Error on [${sql}]:`, err.message);
      }
    });
  }
  return originalDbAll(sql, ...args);
};

module.exports = { db, dbPath };


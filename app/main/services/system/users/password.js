const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const hashStr = String(storedHash);
  if (!hashStr.includes(':')) {
    // Legacy SHA-256 or plaintext fallback
    const legacyHash = crypto.createHash('sha256').update(String(password)).digest('hex');
    return legacyHash === hashStr || String(password) === hashStr;
  }
  // New secure format: salt:hash
  const [salt, key] = hashStr.split(':');
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return key === derivedKey;
  } catch (err) {
    return false;
  }
}

// Users

module.exports = { hashPassword, verifyPassword };

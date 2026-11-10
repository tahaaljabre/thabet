const crypto = require('crypto');
const { hashPassword, verifyPassword } = require('../../main/services/system/users/password');
const {
  setActiveSession,
  getActiveUserRole,
  getActiveUserPermissions
} = require('../../main/services/system/users/session');

describe('System user security helpers', () => {
  it('hashes new passwords and verifies them securely', () => {
    const hash = hashPassword('correct-password');
    expect(hash).toContain(':');
    expect(verifyPassword('correct-password', hash)).toBe(true);
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('keeps compatibility with legacy SHA-256 passwords', () => {
    const legacyHash = crypto.createHash('sha256').update('legacy-password').digest('hex');
    expect(verifyPassword('legacy-password', legacyHash)).toBe(true);
    expect(verifyPassword('wrong-password', legacyHash)).toBe(false);
  });

  it('stores the active role and permissions in the shared session', () => {
    setActiveSession('manager', { sales: true });
    expect(getActiveUserRole()).toBe('manager');
    expect(getActiveUserPermissions()).toEqual({ sales: true });
  });
});

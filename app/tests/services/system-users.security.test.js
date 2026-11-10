const crypto = require('crypto');
const { hashPassword, verifyPassword } = require('../../main/services/system/users/password');
const {
  setActiveSession,
  getActiveUserRole,
  getActiveUserPermissions,
  setWindowSession,
  getWindowSession,
  resolveWindowSession,
  copyWindowSession,
  clearWindowSession,
  clearAllWindowSessions,
  runWithSession
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

  it('keeps an isolated session per window and inherits it to child windows', () => {
    clearAllWindowSessions();
    setActiveSession('manager', { sales: true });
    setWindowSession(101, { role: 'cashier', permissions: { sales: true }, user: { username: 'cashier' } });

    expect(resolveWindowSession(101).role).toBe('cashier');
    expect(getWindowSession(202)).toBeNull();
    expect(resolveWindowSession(202).role).toBe('manager');

    copyWindowSession(101, 202);
    expect(resolveWindowSession(202).role).toBe('cashier');
    expect(getWindowSession(202).user).toEqual({ username: 'cashier' });

    clearWindowSession(202);
    expect(getWindowSession(202)).toBeNull();
    clearAllWindowSessions();
  });

  it('scopes service-level role checks to the calling window session', async () => {
    clearAllWindowSessions();
    setActiveSession('manager', {});
    setWindowSession(303, { role: 'cashier', permissions: { sales: true } });

    const scopedRole = await runWithSession(resolveWindowSession(303), async () => getActiveUserRole());

    expect(scopedRole).toBe('cashier');
    expect(getActiveUserRole()).toBe('manager');
    clearAllWindowSessions();
  });
});

const { resolveWindowSession, runWithSession } = require('../services/system/users/session');

/**
 * Middleware to enforce role and permission checks for IPC handlers.
 *
 * Authorization uses the session of the calling window (webContents), so each
 * window keeps its own role. The handler runs inside that session scope so
 * service-level checks (getActiveUserRole) see the same caller.
 *
 * @param {Object} options - Rules for authorization.
 * @param {string} [options.role] - If set (e.g., 'manager'), only this role is allowed.
 * @param {string} [options.permission] - If set (e.g., 'sales'), cashiers must have this permission (managers have all).
 * @param {Function} handler - The original IPC handler function.
 * @returns {Function} - Wrapped handler function.
 */
function requireAuth(options, handler) {
  return async (event, ...args) => {
    const session = resolveWindowSession(event && event.sender ? event.sender.id : undefined);
    const role = session.role;
    const perms = session.permissions || {};

    if (!role) {
      return { success: false, error: 'غير مصرح - الرجاء تسجيل الدخول' };
    }

    if (options.role && role !== options.role) {
      return { success: false, error: 'غير مصرح - هذه العملية تتطلب صلاحيات مدير' };
    }

    if (options.permission && role !== 'manager' && !perms[options.permission]) {
      return { success: false, error: 'غير مصرح - ليس لديك الصلاحية المطلوبة' };
    }

    return await runWithSession(session, () => handler(event, ...args));
  };
}

module.exports = {
  requireAuth
};

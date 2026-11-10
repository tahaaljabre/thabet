const systemService = require('../services/system.service');

/**
 * Middleware to enforce role and permission checks for IPC handlers.
 * 
 * @param {Object} options - Rules for authorization.
 * @param {string} [options.role] - If set (e.g., 'manager'), only this role is allowed.
 * @param {string} [options.permission] - If set (e.g., 'sales'), cashiers must have this permission (managers have all).
 * @param {Function} handler - The original IPC handler function.
 * @returns {Function} - Wrapped handler function.
 */
function requireAuth(options, handler) {
  return async (event, ...args) => {
    const role = systemService.getActiveUserRole();
    const perms = systemService.getActiveUserPermissions() || {};

    if (!role) {
      return { success: false, error: 'غير مصرح - الرجاء تسجيل الدخول' };
    }

    if (options.role && role !== options.role) {
      return { success: false, error: 'غير مصرح - هذه العملية تتطلب صلاحيات مدير' };
    }

    if (options.permission && role !== 'manager' && !perms[options.permission]) {
      return { success: false, error: 'غير مصرح - ليس لديك الصلاحية المطلوبة' };
    }

    return await handler(event, ...args);
  };
}

module.exports = {
  requireAuth
};

/**
 * Front-End Authentication and Role-Based Access Control (RBAC) Module
 */

/**
 * Checks if the currently logged-in user has a specific permission.
 * 
 * @param {string} permission - The name of the permission (e.g., 'sales', 'vault').
 * @returns {boolean} - True if the user is a manager or has the specified permission.
 */
export function hasPermission(permission) {
  const user = window.currentUser;
  
  // No user logged in yet, deny access
  if (!user) return false;

  // Managers have access to everything
  const role = user.role || user.Role;
  if (role === 'manager') return true;

  // For non-managers, parse the permissions JSON
  let perms = {};
  const rawPerms = user.permissions || user.Permissions;
  if (typeof rawPerms === 'string') {
    try {
      perms = JSON.parse(rawPerms);
    } catch (e) {
      console.warn("Failed to parse user permissions JSON:", e);
      perms = {};
    }
  } else if (typeof rawPerms === 'object' && rawPerms !== null) {
    perms = rawPerms;
  }

  return perms[permission] === true;
}

/**
 * Checks if the currently logged-in user has a specific role (e.g., 'manager').
 * 
 * @param {string} requiredRole - The required role.
 * @returns {boolean}
 */
export function hasRole(requiredRole) {
  const user = window.currentUser;
  if (!user) return false;
  
  const role = user.role || user.Role;
  return role === requiredRole;
}

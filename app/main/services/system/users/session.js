let activeUserRole = null;
let activeUserPermissions = {};

function setActiveSession(role, permissions) {
  activeUserRole = role || null;
  activeUserPermissions = permissions || {};
}

function getActiveUserRole() { return activeUserRole; }
function getActiveUserPermissions() { return activeUserPermissions; }

module.exports = { setActiveSession, getActiveUserRole, getActiveUserPermissions };

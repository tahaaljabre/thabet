/**
 * Session state.
 *
 * `setActiveSession` keeps the legacy process-wide session used by services and
 * tests. Window-scoped sessions (keyed by webContents id) are what IPC
 * authorization uses, so every window keeps its own role/permissions and a
 * child window inherits the session of the window that opened it.
 */
const { AsyncLocalStorage } = require('async_hooks');

const requestScope = new AsyncLocalStorage();
const windowSessions = new Map();

function normalizeSession(source = {}) {
  return {
    role: source.role || null,
    permissions: source.permissions && typeof source.permissions === 'object' ? source.permissions : {},
    user: source.user || null,
    yearId: source.yearId === undefined ? null : source.yearId,
    yearName: source.yearName || ''
  };
}

let fallbackSession = normalizeSession();

function setActiveSession(role, permissions) {
  fallbackSession = normalizeSession({ ...fallbackSession, role, permissions });
  const scope = requestScope.getStore();
  if (scope) {
    scope.role = fallbackSession.role;
    scope.permissions = fallbackSession.permissions;
  }
}

function getActiveSession() {
  return requestScope.getStore() || fallbackSession;
}

function getActiveUserRole() { return getActiveSession().role; }
function getActiveUserPermissions() { return getActiveSession().permissions; }
function getFallbackSession() { return fallbackSession; }

/** Runs `operation` with `session` visible to getActiveUserRole/Permissions. */
function runWithSession(session, operation) {
  return requestScope.run(normalizeSession(session || {}), operation);
}

function setWindowSession(webContentsId, session = {}) {
  if (webContentsId === undefined || webContentsId === null) return null;
  const record = normalizeSession(session);
  windowSessions.set(webContentsId, record);
  return record;
}

function getWindowSession(webContentsId) {
  if (webContentsId === undefined || webContentsId === null) return null;
  return windowSessions.get(webContentsId) || null;
}

function updateWindowSession(webContentsId, patch = {}) {
  const current = getWindowSession(webContentsId);
  if (!current) return null;
  const next = normalizeSession({ ...current, ...patch });
  windowSessions.set(webContentsId, next);
  return next;
}

function copyWindowSession(fromWebContentsId, toWebContentsId) {
  const source = getWindowSession(fromWebContentsId);
  if (!source) return null;
  const copy = normalizeSession(source);
  windowSessions.set(toWebContentsId, copy);
  return copy;
}

function clearWindowSession(webContentsId) {
  windowSessions.delete(webContentsId);
}

function clearAllWindowSessions() {
  windowSessions.clear();
}

function activeWindowSessionCount() {
  return windowSessions.size;
}

/** Session to authorize a window: its own, otherwise the process-wide one. */
function resolveWindowSession(webContentsId) {
  return getWindowSession(webContentsId) || fallbackSession;
}

module.exports = {
  setActiveSession,
  getActiveSession,
  getActiveUserRole,
  getActiveUserPermissions,
  getFallbackSession,
  runWithSession,
  setWindowSession,
  getWindowSession,
  updateWindowSession,
  copyWindowSession,
  clearWindowSession,
  clearAllWindowSessions,
  activeWindowSessionCount,
  resolveWindowSession
};

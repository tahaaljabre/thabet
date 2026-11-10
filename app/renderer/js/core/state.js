/**
 * Minimal reactive state store.
 */

const listeners = new Map();
const state = {
  currentUser: null,
  currentFiscalYear: null,
  currentPage: null,
};

export function getState(key) {
  return state[key];
}

export function setState(key, value) {
  state[key] = value;
  const cbs = listeners.get(key);
  if (cbs) cbs.forEach((cb) => cb(value));
}

export function subscribe(key, callback) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(callback);
  return () => listeners.get(key).delete(callback);
}

export function getCurrentUser() { return state.currentUser; }
export function getCurrentFiscalYear() { return state.currentFiscalYear; }
export function getCurrentPage() { return state.currentPage; }

/**
 * Toast notification system.
 * Replaces all window.alert() and ad-hoc success/error messages.
 */

const DEFAULT_DURATION = 3000;
const TOAST_TYPES = {
  success: { icon: '✓', role: 'status' },
  warning: { icon: '!', role: 'alert' },
  error: { icon: '×', role: 'alert' },
  info: { icon: 'i', role: 'status' }
};

export function showToast(message, type = 'info', duration = DEFAULT_DURATION) {
  const normalizedType = TOAST_TYPES[type] ? type : 'info';
  const config = TOAST_TYPES[normalizedType];
  // Check if a toast container exists; create one if not
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${normalizedType}`;
  toast.setAttribute('role', config.role);

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = config.icon;

  const text = document.createElement('span');
  text.className = 'toast-message';
  text.textContent = String(message || '');

  const progress = document.createElement('div');
  progress.className = 'luxury-toast-progress';
  progress.style.animationDuration = `${duration}ms`;

  toast.append(icon, text, progress);
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-leaving');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Generic modal component.
 */

import { createElement } from '../core/dom.js';

let activeModal = null;

export function showModal(title, contentNode, { onConfirm, onCancel, showCancel = true } = {}) {
  if (activeModal) closeModal();

  const overlay = createElement('div', { class: 'modal-overlay' });
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '1000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'rgba(0, 0, 0, 0.55)'
  });

  const box = createElement('div', { class: 'modal-box' });
  Object.assign(box.style, {
    width: 'min(440px, 100%)',
    maxHeight: '90vh',
    overflowY: 'auto',
    background: 'var(--card-bg, var(--bg-color, #fff))',
    color: 'var(--text-color, #222)',
    border: '1px solid var(--border-color, #ddd)',
    borderRadius: '14px',
    boxShadow: '0 18px 50px rgba(0, 0, 0, 0.3)',
    padding: '18px'
  });
  const header = createElement('div', { class: 'modal-header' });
  header.appendChild(createElement('h3', { textContent: title }));
  const closeBtn = createElement('button', {
    textContent: '×',
    class: 'modal-close',
    title: window.t?.('modal_close') || 'إغلاق'
  });
  closeBtn.addEventListener('click', () => { if (onCancel) onCancel(); closeModal(); });
  header.appendChild(closeBtn);
  box.appendChild(header);

  const body = createElement('div', { class: 'modal-body' });
  if (contentNode instanceof Node) body.appendChild(contentNode);
  else body.textContent = String(contentNode);
  box.appendChild(body);

  const footer = createElement('div', { class: 'modal-footer' });
  if (showCancel) {
    const cancelBtn = createElement('button', { textContent: window.t?.('btn_cancel') || 'إلغاء', class: 'btn-secondary' });
    cancelBtn.addEventListener('click', () => { if (onCancel) onCancel(); closeModal(); });
    footer.appendChild(cancelBtn);
  }
  const confirmBtn = createElement('button', { textContent: window.t?.('modal_confirm') || 'تأكيد', class: 'btn-primary' });
  confirmBtn.addEventListener('click', () => { if (onConfirm) onConfirm(); closeModal(); });
  footer.appendChild(confirmBtn);
  box.appendChild(footer);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  activeModal = overlay;
}

export function showConfirm(title, message) {
  return new Promise((resolve) => {
    showModal(title, createElement('p', { textContent: message }), {
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
      showCancel: true
    });
  });
}

export function showPrompt(title, message, placeholder = '') {
  return new Promise((resolve) => {
    const wrapper = createElement('div');
    const label = createElement('p', { textContent: message });
    const input = createElement('textarea', {
      class: 'form-control',
      rows: '3',
      placeholder
    });
    Object.assign(input.style, {
      width: '100%',
      marginTop: '10px',
      resize: 'vertical'
    });
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    showModal(title, wrapper, {
      onConfirm: () => resolve(input.value),
      onCancel: () => resolve(null),
      showCancel: true
    });
    setTimeout(() => input.focus(), 0);
  });
}

export function closeModal() {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
  }
}

export function showAlert(title, message) {
  showModal(title, createElement('p', { textContent: message }), { showCancel: false });
}

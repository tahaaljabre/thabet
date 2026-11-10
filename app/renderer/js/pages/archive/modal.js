let isArchiveCollapsed = false;

async function openArchiveModal() {
  const modal = document.getElementById('archive-modal');
  if (!modal) throw new Error('نافذة الأرشيف غير موجودة');
  modal.style.display = 'flex';
  await switchArchiveTab('emp');
}

function closeArchiveModal() {
  document.getElementById('archive-modal').style.display = 'none';
}

async function switchArchiveTab(panelType) {
  const tabs = ['emp', 'sup', 'emptx', 'suptx'];
  tabs.forEach(t => {
    const btn = document.getElementById(`archive-tab-btn-${t}`);
    const panel = document.getElementById(`archive-panel-${t}`);
    if (btn) btn.classList.toggle('active', t === panelType);
    if (panel) panel.style.display = t === panelType ? 'block' : 'none';

    document.querySelectorAll(`.archive-tab-btn[data-archive-tab="${t}"]`).forEach(el => {
      el.classList.toggle('active', t === panelType);
    });
    document.querySelectorAll(`.archive-panel[data-archive-panel="${t}"]`).forEach(el => {
      el.style.display = t === panelType ? 'block' : 'none';
    });
  });

  if (panelType === 'emp') await loadArchivedEmployees();
  else if (panelType === 'sup') await loadArchivedSuppliers();
  else if (panelType === 'emptx') await loadArchivedEmployeeTxs();
  else if (panelType === 'suptx') await loadArchivedSupplierTxs();
}

function toggleArchiveCollapse() {
  const body = document.getElementById('archive-modal-body');
  const footer = document.querySelector('#archive-modal .modal-footer');
  const content = document.getElementById('archive-modal-content');
  
  if (!isArchiveCollapsed) {
    body.style.display = 'none';
    if (footer) footer.style.display = 'none';
    content.style.height = 'auto';
    content.style.width = '350px';
    isArchiveCollapsed = true;
  } else {
    body.style.display = 'block';
    if (footer) footer.style.display = 'flex';
    content.style.width = '90%';
    content.style.height = 'auto';
    isArchiveCollapsed = false;
  }
}

// Dragging logic
document.addEventListener('DOMContentLoaded', () => {
  const modalContent = document.getElementById('archive-modal-content');
  const modalHeader = document.getElementById('archive-modal-header');
  const modalContainer = document.getElementById('archive-modal');

  if (!modalHeader || !modalContent || !modalContainer) return;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  modalHeader.addEventListener('mousedown', (e) => {
    // Only drag if left clicked on the header (not buttons inside)
    if (e.target.tagName === 'BUTTON') return;
    
    isDragging = true;
    
    // Switch modal layout from flex centering to absolute positioning to allow free movement
    modalContainer.style.display = 'block';
    modalContainer.style.pointerEvents = 'none'; // click-through background
    modalContent.style.pointerEvents = 'auto'; // keep clicks inside modal
    modalContent.style.position = 'absolute';
    
    const rect = modalContent.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    modalContent.style.left = rect.left + 'px';
    modalContent.style.top = rect.top + 'px';
    modalContent.style.margin = '0';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    modalContent.style.left = (e.clientX - offsetX) + 'px';
    modalContent.style.top = (e.clientY - offsetY) + 'px';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
});

if (typeof window !== 'undefined') {
  window.openArchiveModal = openArchiveModal;
  window.closeArchiveModal = closeArchiveModal;
  window.switchArchiveTab = switchArchiveTab;
  window.toggleArchiveCollapse = toggleArchiveCollapse;
}

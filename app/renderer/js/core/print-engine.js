// Printing and Voucher Helpers
function openPrintModal(type, keyOrId) {
  const modal = document.getElementById('print-modal');
  const modalBody = document.getElementById('print-modal-body');
  const printArea = document.getElementById('print-voucher-area');
  
  if (!modal || !modalBody || !printArea) return;
  
  // 1. Get transaction details
  let voucherData = getVoucherData(type, keyOrId);
  if (!voucherData) return;
  
  // 2. Render voucher for screen preview
  modalBody.innerHTML = renderVoucherPreview(voucherData);
  
  // 3. Render voucher for print media
  printArea.innerHTML = renderVoucherPrint(voucherData);
  
  // 4. Show modal
  modal.classList.add('show');
}

function closePrintModal() {
  const modal = document.getElementById('print-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}



window.addEventListener('afterprint', () => {
  document.body.classList.remove('print-voucher-active');
});

// Ensure closing print modal on escape key or clicking outside content
window.addEventListener('click', (e) => {
  const modal = document.getElementById('print-modal');
  if (e.target === modal) {
    closePrintModal();
  }
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePrintModal();
  }
});

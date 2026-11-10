const toLocalDateString = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];

async function loadEmployeeTransactions() {
  if (!currentEmployeeId) return;
  const txs = await window.api.getEmployeeTransactions(currentEmployeeId, window.currentYearId);
  currentEmployeeTxs = txs;
  const tbody = document.getElementById('emp-tx-tbody');
  tbody.innerHTML = '';

  txs.filter(tx => !tx.is_archived).forEach(tx => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:bold;">#${tx.id}</td>
      <td>${formatDateString(tx.tx_date)}</td>
      <td style="font-weight:bold; color:var(--primary-color)">${window.appSettings?.currency || ''}${tx.amount.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
      <td>${window.t('attendance_short')}: ${tx.attendance_days} | ${window.t('absence_short')}: ${tx.absence_days}</td>
      <td>${window.t('deduction_short')}: ${tx.deductions} | ${window.t('allowance_short')}: ${tx.allowances}</td>
      <td>${tx.notes || '-'}</td>
      <td class="no-print" style="display:flex; gap:5px; justify-content:center;">
        <button class="btn-secondary" style="padding:2px 5px; font-size:10px;" onclick="printEmployeeVoucher(${tx.id})">${window.t('print_button')}</button>
        <button class="btn-primary" style="padding:2px 5px; font-size:10px;" onclick="editEmployeeTx(${tx.id})">${window.t('edit_button')}</button>
        <button class="btn-primary" style="padding:2px 5px; font-size:10px; background-color: var(--kabd);" onclick="window.archiveItem('employee_tx', ${tx.id})">${window.t('archive_button')}</button>
        <button class="btn-danger" style="padding:2px 5px; font-size:10px;" onclick="deleteEmployeeTx(${tx.id})">${window.t('delete_button')}</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

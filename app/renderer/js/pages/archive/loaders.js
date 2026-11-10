function setArchiveTbodiesHtml(selector, html) {
  document.querySelectorAll(selector).forEach(tbody => {
    tbody.innerHTML = html;
  });
}

async function loadArchivedEmployees() {
  try {
    const list = await window.api.getArchivedEmployees();
    if (!Array.isArray(list)) throw new Error(list?.error || 'تعذر جلب الموظفين المؤرشفين');
    archivedEmployeesList = list;
    if (!list.length) {
      setArchiveTbodiesHtml('#archive-emp-tbody, .archive-emp-tbody', '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:18px;">لا يوجد موظفون مؤرشفون</td></tr>');
      return;
    }
    const rowsHtml = list.map(emp => `
      <tr>
        <td>${window.escapeHTML(emp.name)}<div style="font-size:10px;color:var(--muted);">${window.escapeHTML(emp.financial_year || '-')} · ${Number(emp.transaction_count) || 0} حركة</div></td>
        <td>${emp.phone || '-'}</td>
        <td>${window.appSettings?.currency || ''}${(emp.salary || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
        <td>
          <button class="btn-primary" style="padding: 4px 8px; font-size: 11px;" onclick="restoreItem('employee', ${emp.id})">${t('restore_button')}</button>
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-right: 5px;" onclick="printArchivedEmployeeStatement(${emp.id})">${t('print_statement_short')}</button>
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-right: 5px;" onclick="exportArchivedEmployeeExcel(${emp.id})">📊 Excel</button>
        </td>
      </tr>
    `).join('');
    setArchiveTbodiesHtml('#archive-emp-tbody, .archive-emp-tbody', rowsHtml);
  } catch (err) {
    console.error(err);
    setArchiveTbodiesHtml('#archive-emp-tbody, .archive-emp-tbody', `<tr><td colspan="4" style="text-align:center;color:var(--red);padding:18px;">${window.escapeHTML(err.message)}</td></tr>`);
  }
}

async function loadArchivedSuppliers() {
  try {
    const list = await window.api.getArchivedSuppliers();
    if (!Array.isArray(list)) throw new Error(list?.error || 'تعذر جلب الموردين المؤرشفين');
    archivedSuppliersList = list;
    if (!list.length) {
      setArchiveTbodiesHtml('#archive-sup-tbody, .archive-sup-tbody', '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:18px;">لا يوجد موردون مؤرشفون</td></tr>');
      return;
    }
    const rowsHtml = list.map(sup => `
      <tr>
        <td>${window.escapeHTML(sup.name)}<div style="font-size:10px;color:var(--muted);">${window.escapeHTML(sup.financial_year || '-')} · ${Number(sup.transaction_count) || 0} حركة</div></td>
        <td>${sup.phone || '-'}</td>
        <td>${sup.address || '-'}</td>
        <td>
          <button class="btn-primary" style="padding: 4px 8px; font-size: 11px;" onclick="restoreItem('supplier', ${sup.id})">${t('restore_button')}</button>
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-right: 5px;" onclick="printArchivedSupplierStatement(${sup.id})">${t('print_statement_short')}</button>
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-right: 5px;" onclick="exportArchivedSupplierExcel(${sup.id})">📊 Excel</button>
        </td>
      </tr>
    `).join('');
    setArchiveTbodiesHtml('#archive-sup-tbody, .archive-sup-tbody', rowsHtml);
  } catch (err) {
    console.error(err);
    setArchiveTbodiesHtml('#archive-sup-tbody, .archive-sup-tbody', `<tr><td colspan="4" style="text-align:center;color:var(--red);padding:18px;">${window.escapeHTML(err.message)}</td></tr>`);
  }
}

async function loadArchivedEmployeeTxs() {
  try {
    const list = await window.api.getArchivedEmployeeTransactions();
    if (!Array.isArray(list)) throw new Error(list?.error || 'تعذر جلب حركات الموظفين المؤرشفة');
    if (!list.length) {
      setArchiveTbodiesHtml('#archive-emptx-tbody, .archive-emptx-tbody', '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:18px;">لا توجد حركات موظفين مؤرشفة أو سابقة</td></tr>');
      return;
    }
    const rowsHtml = list.map(tx => `
      <tr>
        <td>${window.escapeHTML(tx.emp_name || '-')}<div style="font-size:10px;color:var(--muted);">${window.escapeHTML(tx.financial_year || '-')}</div></td>
        <td>${tx.tx_date}</td>
        <td>${window.appSettings?.currency || ''}${(tx.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
        <td>${tx.notes || '-'}</td>
        <td>
          ${tx.is_archived ? `<button class="btn-primary" style="padding: 4px 8px; font-size: 11px;" onclick="restoreItem('employee_tx', ${tx.id})">${t('restore_button')}</button>` : '<span style="font-size:10px;color:var(--muted);">تابع لموظف مؤرشف</span>'}
        </td>
      </tr>
    `).join('');
    setArchiveTbodiesHtml('#archive-emptx-tbody, .archive-emptx-tbody', rowsHtml);
  } catch (err) {
    console.error(err);
    setArchiveTbodiesHtml('#archive-emptx-tbody, .archive-emptx-tbody', `<tr><td colspan="5" style="text-align:center;color:var(--red);padding:18px;">${window.escapeHTML(err.message)}</td></tr>`);
  }
}

async function loadArchivedSupplierTxs() {
  try {
    const list = await window.api.getArchivedSupplierTransactions();
    if (!Array.isArray(list)) throw new Error(list?.error || 'تعذر جلب حركات الموردين المؤرشفة');
    if (!list.length) {
      setArchiveTbodiesHtml('#archive-suptx-tbody, .archive-suptx-tbody', '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:18px;">لا توجد حركات موردين مؤرشفة أو سابقة</td></tr>');
      return;
    }
    const rowsHtml = list.map(tx => {
      const typeText = tx.tx_type === 'له' ? t('supplier_credit_type') : t('supplier_debit_type');
      const colorClass = tx.tx_type === 'له' ? 'text-red' : 'text-green';
      return `
        <tr>
          <td>${window.escapeHTML(tx.sup_name || '-')}<div style="font-size:10px;color:var(--muted);">${window.escapeHTML(tx.financial_year || '-')}</div></td>
          <td>${tx.tx_date}</td>
          <td class="${colorClass}">${typeText}</td>
          <td>${window.appSettings?.currency || ''}${(tx.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
          <td>${tx.notes || '-'}</td>
          <td>
            ${tx.is_archived ? `<button class="btn-primary" style="padding: 4px 8px; font-size: 11px;" onclick="restoreItem('supplier_tx', ${tx.id})">${t('restore_button')}</button>` : '<span style="font-size:10px;color:var(--muted);">تابع لمورد مؤرشف</span>'}
          </td>
        </tr>
      `;
    }).join('');
    setArchiveTbodiesHtml('#archive-suptx-tbody, .archive-suptx-tbody', rowsHtml);
  } catch (err) {
    console.error(err);
    setArchiveTbodiesHtml('#archive-suptx-tbody, .archive-suptx-tbody', `<tr><td colspan="6" style="text-align:center;color:var(--red);padding:18px;">${window.escapeHTML(err.message)}</td></tr>`);
  }
}

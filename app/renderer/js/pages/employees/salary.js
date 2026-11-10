async function openSalaryChangeModal() {
  if (!currentEmployeeId) {
    alert(window.t('select_employee_first'));
    return;
  }
  document.getElementById('sc-new-salary').value = '';
  document.getElementById('sc-effective-date').value = new Date().toISOString().split('T')[0];
  
  const tbody = document.getElementById('sc-history-tbody');
  tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${window.t('loading')}</td></tr>`;
  
  document.getElementById('salary-change-modal').style.display = 'flex';
  
  try {
    const history = await window.api.getEmployeeSalaryHistory(currentEmployeeId);
    tbody.innerHTML = '';
    if (history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${window.t('no_previous_records')}</td></tr>`;
    } else {
      history.forEach(h => {
        tbody.innerHTML += `
          <tr>
            <td style="padding: 5px; border: 1px solid var(--border-color); text-align: center; color: var(--green2); font-weight: bold;">${window.appSettings?.currency || ''}${h.salary.toLocaleString()}</td>
            <td style="padding: 5px; border: 1px solid var(--border-color); text-align: center;">${h.effective_date}</td>
            <td style="padding: 5px; border: 1px solid var(--border-color); text-align: center;">
              <button class="btn-danger" style="padding:2px 5px; font-size:10px;" onclick="deleteSalaryChange(${h.id})">🗑</button>
            </td>
          </tr>
        `;
      });
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: red;">${window.t('records_load_error')}</td></tr>`;
  }
}

function closeSalaryChangeModal() {
  document.getElementById('salary-change-modal').style.display = 'none';
}

async function saveSalaryChange() {
  const salary = parseFloat(document.getElementById('sc-new-salary').value);
  const date = document.getElementById('sc-effective-date').value;
  
  if (isNaN(salary) || !date) {
    alert(window.t('valid_salary_date_required'));
    return;
  }
  
  if (await window.api.confirmDialog(`${window.t('confirm_salary_change')} ${window.appSettings?.currency || ''}${salary} ${window.t('effective_from')} ${date}?`)) {
    await window.api.addEmployeeSalaryChange(currentEmployeeId, salary, date);
    // Refresh the modal to show the new record
    openSalaryChangeModal();
    alert(window.t('salary_changed_success'));
  }
}

async function deleteSalaryChange(id) {
  if (await window.api.confirmDialog(window.t('confirm_delete_salary_record'))) {
    await window.api.deleteEmployeeSalaryChange(id);
    openSalaryChangeModal(); // refresh
  }
}

let currentNetSalary = 0;

async function openDisburseSalaryModal() {
  if (!currentEmployeeId) {
    alert(window.t('select_employee_first'));
    return;
  }
  
  const stats = await window.api.getAllEmployeesStatement('', '', window.currentYearId);
  const empStat = stats.find(s => s.id === currentEmployeeId);
  
  if (!empStat) {
    alert(window.t('salary_details_error'));
    return;
  }
  
  currentNetSalary = empStat.closingBalance;
  
  const detailsHtml = `
    <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
      <span>${window.t('total_salary_due')}</span>
      <span style="font-weight:bold; color:var(--green2);">${(empStat.salary + empStat.totalAllowances).toLocaleString('en-US')}</span>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
      <span>${window.t('total_advances_deductions')}</span>
      <span style="font-weight:bold; color:var(--red);">${empStat.totalDeductions.toLocaleString('en-US')}</span>
    </div>
    <hr style="border:0; border-top:1px solid #ccc; margin: 10px 0;">
    <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
      <span>${window.t('net_salary_remaining')}</span>
      <span style="font-weight:bold; color: ${currentNetSalary >= 0 ? 'var(--green2)' : 'var(--red)'}; font-size: 18px;">
        ${currentNetSalary.toLocaleString('en-US')}
      </span>
    </div>
  `;
  
  document.getElementById('salary-disburse-details').innerHTML = detailsHtml;
  
  const today = new Date();
  document.getElementById('salary-disburse-date').value = today.toISOString().split('T')[0];
  document.getElementById('salary-disburse-notes').value = window.t('salary_payment_note');
  
  document.getElementById('salary-disburse-modal').style.display = 'flex';
}

function closeDisburseSalaryModal() {
  document.getElementById('salary-disburse-modal').style.display = 'none';
}

async function executeSalaryDisbursement() {
  if (currentNetSalary <= 0) {
    if (!(await window.api.confirmDialog(window.t('confirm_nonpositive_salary')))) {
      return;
    }
  }
  
  const txDate = document.getElementById('salary-disburse-date').value;
  const notes = document.getElementById('salary-disburse-notes').value;
  
  if (!txDate) {
    alert(window.t('select_disbursement_date'));
    return;
  }

  const disbursementCheck = await window.api.canDisburseSalaryOnDate(currentEmployeeId, txDate, window.currentYearId);
  if (!disbursementCheck || disbursementCheck.allowed !== true) {
    const reasonKey = disbursementCheck?.reasonCode === 'FUTURE_DATE'
      ? 'salary_future_payment_error'
      : disbursementCheck?.reasonCode === 'INVALID_DATE'
        ? 'select_disbursement_date'
        : 'no_salary_due_on_date';
    alert(window.t(reasonKey));
    return;
  }
  currentNetSalary = Number(disbursementCheck.payableAmount) || 0;
  
  if (currentNetSalary > 0) {
    const tx = {
      employee_id: currentEmployeeId,
      tx_date: txDate,
      amount: currentNetSalary,
      deductions: 0,
      allowances: 0,
      notes: notes,
      year_id: window.currentYearId
    };
    
    try {
      const res = await window.api.saveEmployeeTransaction(tx);
      if (res) {
        alert(window.t('salary_disbursed_success'));
        closeDisburseSalaryModal();
        if (typeof loadEmployeeTransactions === 'function') {
          loadEmployeeTransactions();
        }
      } else {
        alert(window.t('operation_not_saved'));
      }
    } catch(e) {
      alert(window.t('error_occurred') + ': ' + e);
    }
  } else {
    alert(window.t('no_salary_due'));
    closeDisburseSalaryModal();
  }
}

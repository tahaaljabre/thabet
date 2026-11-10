let employeeSalaryCalculationSequence = 0;

async function calculateEmployeeSalaryAmounts(source = 'all') {
    const sequence = ++employeeSalaryCalculationSequence;
    if (!currentEmployeeId) return;
    const emp = allEmployees.find(item => item.id == currentEmployeeId);
    if (!emp) return;

    let activeSalary = emp.salary || 0;
    try {
      const history = await window.api.getEmployeeSalaryHistory(currentEmployeeId);
      const dateVal = document.getElementById('emp-tx-date').value || new Date().toISOString().substring(0, 10);
      const validHistory = history.filter(item => item.effective_date <= dateVal).sort((a, b) => a.effective_date.localeCompare(b.effective_date));
      if (validHistory.length > 0) activeSalary = validHistory[validHistory.length - 1].salary;
    } catch (error) {
      console.error(error);
    }

    if (sequence !== employeeSalaryCalculationSequence) return;
    if (activeSalary <= 0) return;

    const dateVal = document.getElementById('emp-tx-date').value || new Date().toISOString().split('T')[0];
    const date = new Date(dateVal);
    const dailyRate = activeSalary / new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const absenceInput = document.getElementById('emp-tx-absence');
    const attendanceInput = document.getElementById('emp-tx-attendance');
    const deductionsInput = document.getElementById('emp-tx-deductions');
    const allowancesInput = document.getElementById('emp-tx-allowances');
    const absenceDays = parseFloat(absenceInput.value) || 0;
    const extraDays = parseFloat(attendanceInput.value) || 0;

    if (source === 'all' || source === 'absence') {
      if (absenceDays > 0) {
        deductionsInput.value = (absenceDays * dailyRate).toFixed(2);
        deductionsInput.dataset.salaryAutoCalculated = 'true';
      } else if (deductionsInput.dataset.salaryAutoCalculated === 'true') {
        deductionsInput.value = '0';
        delete deductionsInput.dataset.salaryAutoCalculated;
      }
    }

    if (source === 'all' || source === 'attendance') {
      if (extraDays > 0) {
        allowancesInput.value = (extraDays * dailyRate).toFixed(2);
        allowancesInput.dataset.salaryAutoCalculated = 'true';
      } else if (allowancesInput.dataset.salaryAutoCalculated === 'true') {
        allowancesInput.value = '0';
        delete allowancesInput.dataset.salaryAutoCalculated;
      }
    }
}

window.calculateEmployeeSalaryAmounts = calculateEmployeeSalaryAmounts;

document.addEventListener('DOMContentLoaded', () => {

  const absenceInput = document.getElementById('emp-tx-absence');
  const attendanceInput = document.getElementById('emp-tx-attendance');
  const deductionsInput = document.getElementById('emp-tx-deductions');
  const allowancesInput = document.getElementById('emp-tx-allowances');
  const dateInput = document.getElementById('emp-tx-date');
  if (dateInput) dateInput.addEventListener('change', () => calculateEmployeeSalaryAmounts('all'));
  if (deductionsInput) deductionsInput.addEventListener('input', () => {
    delete deductionsInput.dataset.salaryAutoCalculated;
  });
  if (allowancesInput) allowancesInput.addEventListener('input', () => {
    delete allowancesInput.dataset.salaryAutoCalculated;
  });
});

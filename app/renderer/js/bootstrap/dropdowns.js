document.addEventListener('click', event => {
  if (event.target.closest('.custom-dropdown')) return;

  const employeeList = document.getElementById('employee-dropdown-list');
  const supplierList = document.getElementById('supplier-dropdown-list');
  if (employeeList) employeeList.style.display = 'none';
  if (supplierList) supplierList.style.display = 'none';
});

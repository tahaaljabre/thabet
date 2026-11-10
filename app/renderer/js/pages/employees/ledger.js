// Compatibility bridge for salary modal actions used by the employee page.
window.openSalaryChangeModal = (...args) => {
  if (typeof openSalaryChangeModal !== 'undefined') return openSalaryChangeModal(...args);
};
window.closeSalaryChangeModal = (...args) => {
  if (typeof closeSalaryChangeModal !== 'undefined') return closeSalaryChangeModal(...args);
};
window.saveSalaryChange = (...args) => {
  if (typeof saveSalaryChange !== 'undefined') return saveSalaryChange(...args);
};
window.deleteSalaryChange = (...args) => {
  if (typeof deleteSalaryChange !== 'undefined') return deleteSalaryChange(...args);
};

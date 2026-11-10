export const printProvider = {
  type: 'print',
  label: 'طباعة',
  available: true,
  async export(document = {}) {
    if (typeof document.beforePrint === 'function') await document.beforePrint();
    window.print();
    return { success: true, type: 'print' };
  }
};

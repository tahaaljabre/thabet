// Excel has its own provider from the beginning so adding the implementation
// later does not require changing report screens or the export dispatcher.
export const excelProvider = {
  type: 'excel',
  label: 'Excel',
  available: false,
  unavailableMessage: 'سيتم دعم تصدير Excel في إصدار قادم',
  async export() {
    throw new Error(this.unavailableMessage);
  }
};

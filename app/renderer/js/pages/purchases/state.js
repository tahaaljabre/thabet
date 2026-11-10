export const state = {
  purchases: [],
  reportDate: window.getLocalDateString ? window.getLocalDateString() : new Date().toISOString().split('T')[0],
  editingPurchaseId: null,
  currentYearId: window.currentYearId || null
};

export function setPurchases(purchases) {
  state.purchases = purchases;
}

export function setReportDate(date) {
  state.reportDate = date;
}

export function setEditingPurchaseId(id) {
  state.editingPurchaseId = id;
}

export function setCurrentYearId(id) {
  state.currentYearId = id;
}

export function setState(newState) {
  if (!newState) return;
  state.purchases = newState.purchases || [];
  if (newState.reportDate) state.reportDate = newState.reportDate;
  if (newState.editingPurchaseId !== undefined) state.editingPurchaseId = newState.editingPurchaseId;
}

export function resetState() {
  state.purchases = [];
  state.editingPurchaseId = null;
}

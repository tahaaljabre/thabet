export const state = {
  draftReportState: null,
  editingExpenseId: null,
  currentYearId: 1
};

export function updateDraftReportState(newState) {
  state.draftReportState = newState;
}

export function setEditingExpenseId(id) {
  state.editingExpenseId = id;
}

export function setCurrentYearId(id) {
  state.currentYearId = id;
}

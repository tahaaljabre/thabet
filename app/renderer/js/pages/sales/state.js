export const state = {
  reportDate: '',
  cashierName: '',
  cashierUser: '',
  cashierActual: 0,
  sales: { cash: 0, kbank: 0, grab: 0, lineman: 0, krungsri: 0 },
  channelSales: {},
  purchases: []
};

export const globals = {
  cashiersList: [],
  appSettings: {},
  currentYearId: 1,
  currentSelectedDate: '',
  currentLang: 'ar'
};

export function updateState(newState) {
  // Retain the reference to the original state object but update its properties
  for (const key in state) {
    if (state.hasOwnProperty(key)) {
      delete state[key];
    }
  }
  Object.assign(state, newState);
}

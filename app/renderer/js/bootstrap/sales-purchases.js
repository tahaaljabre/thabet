import { initEvents as initSalesEvents } from '../pages/sales/events.js';
import { attachEvents as initPurchasesEvents } from '../pages/purchases/events.js';

let initialized = false;

function initializeSalesAndPurchases() {
  if (initialized || !window.currentUser) return;
  initialized = true;
  void initSalesEvents();
  initPurchasesEvents();
}

window.addEventListener('stateChanged', initializeSalesAndPurchases);

if (window.currentUser) initializeSalesAndPurchases();

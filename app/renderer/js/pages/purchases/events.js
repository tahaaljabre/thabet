import * as service from './service.js';
import * as ui from './ui.js';
import { exportPurchasesExcel } from './excel.js';

export function attachEvents() {
  const btnAdd = document.getElementById('btn-add-expense');
  if (btnAdd) {
    btnAdd.addEventListener('click', service.addPurchase);
  }

  const btnSave = document.getElementById('btn-save-purchases-report');
  if (btnSave) {
    btnSave.addEventListener('click', service.savePurchasesReport);
  }

  const dateInput = document.getElementById('expense-report-date');
  if (dateInput) {
    const todayStr = new Date().toLocaleDateString('en-CA');
    dateInput.value = todayStr;
    dateInput.addEventListener('change', (e) => {
      service.loadStateForDate(e.target.value);
    });
  }

  // Handle enter key in inputs to trigger add
  const inputs = ['expense-name', 'expense-qty', 'expense-amount'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          service.addPurchase();
        }
      });
    }
  });

  // Ledger date filters
  const fromFilter = document.getElementById('expenses-print-from');
  const toFilter = document.getElementById('expenses-print-to');
  
  if (fromFilter) {
    fromFilter.addEventListener('change', service.loadLedger);
  }
  
  if (toFilter) {
    toFilter.addEventListener('change', service.loadLedger);
  }

  const btnPrintStatement = document.getElementById('btn-print-purchases-statement');
  if (btnPrintStatement) {
    btnPrintStatement.addEventListener('click', service.printStatement);
  }
  const btnExcelStatement = document.getElementById('btn-excel-purchases-statement');
  if (btnExcelStatement) btnExcelStatement.addEventListener('click', exportPurchasesExcel);

  // Voucher search
  const btnSearch = document.getElementById('purchases-voucher-search-btn');
  const inputSearch = document.getElementById('expenses-voucher-search-input');
  
  if (btnSearch) {
    btnSearch.addEventListener('click', () => {
      service.handleVoucherSearch();
    });
  }
  
  if (inputSearch) {
    inputSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        service.handleVoucherSearch();
      }
    });
  }
  
  // Initialize the module state (load accounts, ledger, draft)
  service.initializeModule();

  window.addEventListener('languageChanged', () => {
    ui.renderDraftTable();
    service.loadLedger();
    ui.resetAddButton();
  });
}

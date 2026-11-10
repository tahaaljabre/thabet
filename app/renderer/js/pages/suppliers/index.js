// ==========================================
// SUPPLIERS LOGIC
// ==========================================
let currentEditSupTxId = null;

async function loadSuppliers() {
  allSuppliers = await window.api.getSuppliers(window.currentYearId);
  const listContainer = document.getElementById('supplier-dropdown-list');
  if(!listContainer) return;
  listContainer.innerHTML = '';
  allSuppliers.forEach(sup => {
    let div = document.createElement('div');
    div.className = 'dropdown-item';
    div.style.padding = '10px';
    div.style.cursor = 'pointer';
    div.style.borderBottom = '1px solid #eee';
    div.dataset.id = sup.id;
    div.textContent = sup.name;
    div.onmouseover = () => { Array.from(listContainer.children).forEach(c => c.style.backgroundColor = ''); div.style.backgroundColor = '#f1f5f9'; };
    div.onmouseout = () => div.style.backgroundColor = '';
    div.onclick = () => selectSupplierOption(sup.id, sup.name);
    listContainer.appendChild(div);
  });
}
window.loadSuppliers = loadSuppliers;

async function onSupplierSelect() {
  const val = document.getElementById('select-supplier').value;
  if(!val) {
    currentSupplierId = null;
    document.getElementById('supplier-management-panel').style.display = 'none';
    return;
  }
  currentSupplierId = val;
  document.getElementById('supplier-management-panel').style.display = 'block';
  
  // Set default date
  document.getElementById('sup-tx-date').value = new Date().toISOString().substring(0,10);
  
  await loadSupplierTransactions();
}

window.toggleSupplierDropdown = function(e) {
  const list = document.getElementById('supplier-dropdown-list');
  list.style.display = list.style.display === 'none' ? 'block' : 'none';
  filterSuppliers();
  if(e) e.stopPropagation();
};
window.filterSuppliers = function() {
  const input = document.getElementById('select-supplier-input').value.toLowerCase();
  const list = document.getElementById('supplier-dropdown-list');
  if(input) list.style.display = 'block';
  let items = Array.from(list.children);
  items.forEach(item => {
    if (item.textContent.toLowerCase().includes(input)) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
  currentSupFocusedIndex = -1;
};
window.handleSupplierKeydown = function(e) {
  const list = document.getElementById('supplier-dropdown-list');
  if(list.style.display === 'none' && e.key !== 'Escape') {
    list.style.display = 'block';
    filterSuppliers();
  }
  let items = Array.from(list.children).filter(i => i.style.display !== 'none');
  if(items.length === 0) return;
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    currentSupFocusedIndex++;
    if(currentSupFocusedIndex >= items.length) currentSupFocusedIndex = items.length - 1;
    highlightSupItem(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    currentSupFocusedIndex--;
    if(currentSupFocusedIndex < 0) currentSupFocusedIndex = 0;
    highlightSupItem(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if(currentSupFocusedIndex >= 0 && currentSupFocusedIndex < items.length) {
      items[currentSupFocusedIndex].click();
    }
  } else if (e.key === 'Escape') {
    list.style.display = 'none';
  }
};
function highlightSupItem(items) {
  items.forEach((item, index) => {
    if (index === currentSupFocusedIndex) {
      item.style.backgroundColor = 'var(--border-color)';
      item.scrollIntoView({block: 'nearest'});
    } else {
      item.style.backgroundColor = '';
    }
  });
}
window.selectSupplierOption = function(id, name) {
  const input = document.getElementById('select-supplier-input');
  input.value = name;
  document.getElementById('supplier-dropdown-list').style.display = 'none';
  
  currentSupplierId = id;
  const panel = document.getElementById('supplier-management-panel');
  if(panel) panel.style.display = 'block';
  
  const sup = allSuppliers.find(s => s.id == id);
  if(sup) {
    document.getElementById('sup-tx-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('sup-tx-amount').value = '0';
    document.getElementById('sup-tx-notes').value = '';
    if (typeof window.resetAccountDropdownToCashVault === 'function') {
      window.resetAccountDropdownToCashVault('sup-tx-account');
    }
    
    if(document.getElementById('sup-print-from')) document.getElementById('sup-print-from').value = '';
    if(document.getElementById('sup-print-to')) document.getElementById('sup-print-to').value = '';
    
    loadSupplierTransactions();
  }
};

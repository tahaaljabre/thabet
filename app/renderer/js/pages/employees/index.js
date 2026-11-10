// ==========================================
// EMPLOYEES MANAGEMENT
// ==========================================
let allEmployees = [];
let currentEmployeeId = null;
let currentEmployeeTxs = [];
let currentEditEmpTxId = null;
const employeePhotoCache = new Map();
let employeePhotoRequestSequence = 0;
let allSuppliers = [];
let currentSupplierId = null;
let currentSupplierTxs = [];

async function loadEmployees() {
  allEmployees = await window.api.getEmployees(window.currentYearId);
  const listContainer = document.getElementById('employee-dropdown-list');
  if(!listContainer) return;
  listContainer.innerHTML = '';
  allEmployees.forEach(emp => {
    let div = document.createElement('div');
    div.className = 'dropdown-item';
    div.style.padding = '10px';
    div.style.cursor = 'pointer';
    div.style.borderBottom = '1px solid var(--border-color)';
    div.dataset.id = emp.id;
    
    // Add small avatar next to the name if photo exists
    let avatarHtml = `<div style="display:inline-flex;width:24px;height:24px;border-radius:50%;background:#e2e8f0;vertical-align:middle;margin-left:10px;border:1px solid #ccc;align-items:center;justify-content:center;font-size:11px;">👤</div>`;
    let categoryBadge = emp.category_name
      ? `<span style="font-size:11px;background:rgba(122,26,34,0.12);color:var(--lahmi2);padding:2px 8px;border-radius:10px;margin-inline-start:8px;font-weight:600;vertical-align:middle;">${window.escapeHTML(emp.category_name)}</span>`
      : '';
      
    div.innerHTML = avatarHtml + `<span style="vertical-align:middle;">${window.escapeHTML(emp.name)}</span>` + categoryBadge;
    div.onmouseover = () => { Array.from(listContainer.children).forEach(c => c.style.backgroundColor = ''); div.style.backgroundColor = 'var(--border-color)'; };
    div.onmouseout = () => div.style.backgroundColor = '';
    div.onclick = () => selectEmployeeOption(emp.id, emp.name);
    listContainer.appendChild(div);
  });
}
window.loadEmployees = loadEmployees;

async function onEmployeeDatalistChange() {
  const input = document.getElementById('select-employee-input');
  const datalist = document.getElementById('employees-list');
  const panel = document.getElementById('employee-management-panel');
  
  if(!input.value) {
    currentEmployeeId = null;
    panel.style.display = 'none';
    return;
  }
  
  const selectedOption = Array.from(datalist.options).find(opt => opt.value === input.value);
  if(selectedOption) {
    currentEmployeeId = selectedOption.dataset.id;
    panel.style.display = 'block';
    
    document.getElementById('emp-tx-date').value = new Date().toISOString().substring(0,10);
    document.getElementById('emp-tx-attendance').value = '0';
    document.getElementById('emp-tx-absence').value = '0';
    document.getElementById('emp-tx-deductions').value = '0';
    document.getElementById('emp-tx-allowances').value = '0';
    document.getElementById('emp-tx-amount').value = '0';
    document.getElementById('emp-tx-notes').value = '';
    
    await loadEmployeeTransactions();
  } else {
    currentEmployeeId = null;
    panel.style.display = 'none';
  }
}

window.toggleEmployeeDropdown = function(e) {
  const list = document.getElementById('employee-dropdown-list');
  list.style.display = list.style.display === 'none' ? 'block' : 'none';
  filterEmployees();
  if(e) e.stopPropagation();
};
window.filterEmployees = function() {
  const input = document.getElementById('select-employee-input').value.toLowerCase();
  const list = document.getElementById('employee-dropdown-list');
  if(input) list.style.display = 'block';
  let items = Array.from(list.children);
  items.forEach(item => {
    if (item.textContent.toLowerCase().includes(input)) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
  currentEmpFocusedIndex = -1;
};
window.handleEmployeeKeydown = function(e) {
  const list = document.getElementById('employee-dropdown-list');
  if(list.style.display === 'none' && e.key !== 'Escape') {
    list.style.display = 'block';
    filterEmployees();
  }
  let items = Array.from(list.children).filter(i => i.style.display !== 'none');
  if(items.length === 0) return;
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    currentEmpFocusedIndex++;
    if(currentEmpFocusedIndex >= items.length) currentEmpFocusedIndex = items.length - 1;
    highlightEmpItem(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    currentEmpFocusedIndex--;
    if(currentEmpFocusedIndex < 0) currentEmpFocusedIndex = 0;
    highlightEmpItem(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if(currentEmpFocusedIndex >= 0 && currentEmpFocusedIndex < items.length) {
      items[currentEmpFocusedIndex].click();
    }
  } else if (e.key === 'Escape') {
    list.style.display = 'none';
  }
};
function highlightEmpItem(items) {
  items.forEach((item, index) => {
    if (index === currentEmpFocusedIndex) {
      item.style.backgroundColor = 'var(--border-color)';
      item.scrollIntoView({block: 'nearest'});
    } else {
      item.style.backgroundColor = '';
    }
  });
}
async function fetchEmployeePhotoOnDemand(id) {
  if (employeePhotoCache.has(Number(id))) return employeePhotoCache.get(Number(id));
  const photo = await window.api.getEmployeePhoto(id);
  employeePhotoCache.set(Number(id), photo || '');
  return photo || '';
}
window.fetchEmployeePhotoOnDemand = fetchEmployeePhotoOnDemand;

window.selectEmployeeOption = async function(id, name) {
  const input = document.getElementById('select-employee-input');
  input.value = name;
  document.getElementById('employee-dropdown-list').style.display = 'none';
  
  currentEmployeeId = id;
  const panel = document.getElementById('employee-management-panel');
  if(panel) panel.style.display = 'block';
  
  const emp = allEmployees.find(e => e.id == id);
  if(emp) {
    document.getElementById('emp-tx-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('emp-tx-amount').value = '0';
    document.getElementById('emp-tx-attendance').value = '0';
    document.getElementById('emp-tx-absence').value = '0';
    document.getElementById('emp-tx-deductions').value = '0';
    document.getElementById('emp-tx-allowances').value = '0';
    document.getElementById('emp-tx-notes').value = '';
    if (typeof window.resetAccountDropdownToCashVault === 'function') {
      window.resetAccountDropdownToCashVault('emp-tx-account');
    }
    const empBasicSalaryEl = document.getElementById('emp-basic-salary');
    if(empBasicSalaryEl) empBasicSalaryEl.textContent = emp.salary.toLocaleString('en-US');

    const empCategoryWrap = document.getElementById('emp-header-category-wrap');
    const empCategoryEl = document.getElementById('emp-header-category');
    if (empCategoryWrap && empCategoryEl) {
      if (emp.category_name) {
        empCategoryEl.textContent = emp.category_name;
        empCategoryWrap.style.display = 'inline';
      } else {
        empCategoryEl.textContent = '';
        empCategoryWrap.style.display = 'none';
      }
    }

    const headerPhoto = document.getElementById('emp-header-photo');
    if (headerPhoto) {
      const requestSequence = ++employeePhotoRequestSequence;
      headerPhoto.style.display = 'none';
      const photo = await fetchEmployeePhotoOnDemand(emp.id);
      if (requestSequence !== employeePhotoRequestSequence || Number(currentEmployeeId) !== Number(emp.id)) return;
      if (photo) {
        headerPhoto.src = photo;
        headerPhoto.style.display = 'inline-block';
      } else {
        headerPhoto.src = '';
        headerPhoto.style.display = 'none';
      }
    }

    if(document.getElementById('emp-print-from')) document.getElementById('emp-print-from').value = '';
    if(document.getElementById('emp-print-to')) document.getElementById('emp-print-to').value = '';
    
    loadEmployeeTransactions();
  }
};

window.toggleEmployeePhotoZoom = function() {
  const img = document.getElementById('emp-header-photo');
  if (!img) return;
  
  if (img.style.transform === 'scale(3)') {
    // Zoom out
    img.style.transform = 'scale(1)';
    img.style.zIndex = '1';
    img.style.cursor = 'zoom-in';
  } else {
    // Zoom in
    img.style.transform = 'scale(3)';
    img.style.zIndex = '1000';
    img.style.cursor = 'zoom-out';
  }
};

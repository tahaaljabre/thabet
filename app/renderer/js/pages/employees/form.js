async function populateEmployeeCategoryOptions(selectedCategoryId = '') {
  const select = document.getElementById('emp-category');
  if (!select) return;
  let categories = [];
  try {
    if (window.api && typeof window.api.getEmployeeCategories === 'function') {
      categories = await window.api.getEmployeeCategories();
    }
  } catch (err) {
    console.error('Failed to load employee categories:', err);
  }
  const noneText = window.t('employee_category_none');
  const escape = typeof window.escapeHTML === 'function' ? window.escapeHTML : (v => String(v ?? ''));
  select.innerHTML = `<option value="">${escape(noneText)}</option>` +
    (Array.isArray(categories) ? categories : []).map(cat =>
      `<option value="${cat.id}" ${String(selectedCategoryId ?? '') === String(cat.id) ? 'selected' : ''}>${escape(cat.name)}</option>`
    ).join('');
  select.value = selectedCategoryId ? String(selectedCategoryId) : '';
}

async function openEmployeeModal(emp = null) {
  const modal = document.getElementById('employee-modal');
  const preview = document.getElementById('emp-photo-preview');
  const base64Input = document.getElementById('emp-photo-base64');
  const fileInput = document.getElementById('emp-photo-input');
  fileInput.value = '';
  await populateEmployeeCategoryOptions(emp ? (emp.category_id || '') : '');

  if(emp) {
    document.getElementById('employee-modal-title').setAttribute('data-i18n', 'edit_employee_title');
    document.getElementById('employee-modal-title').textContent = window.t('edit_employee_title');
    document.getElementById('emp-id').value = emp.id;
    document.getElementById('emp-name').value = emp.name;
    document.getElementById('emp-phone').value = emp.phone;
    document.getElementById('emp-salary').value = emp.salary;
    document.getElementById('emp-start-date').value = emp.monthly_accrual_start_date || new Date().toISOString().substring(0, 10);
    
    const photo = typeof window.fetchEmployeePhotoOnDemand === 'function'
      ? await window.fetchEmployeePhotoOnDemand(emp.id)
      : '';
    if (photo) {
      preview.src = photo;
      preview.style.display = 'inline-block';
      base64Input.value = photo;
    } else {
      preview.style.display = 'none';
      preview.src = '';
      base64Input.value = '';
    }
  } else {
    document.getElementById('employee-modal-title').setAttribute('data-i18n', 'add_employee_title');
    document.getElementById('employee-modal-title').textContent = window.t('add_employee_title');
    document.getElementById('emp-id').value = '';
    document.getElementById('emp-name').value = '';
    document.getElementById('emp-phone').value = '';
    document.getElementById('emp-salary').value = '';
    document.getElementById('emp-start-date').value = new Date().toISOString().substring(0, 10);
    preview.style.display = 'none';
    preview.src = '';
    base64Input.value = '';
  }
  modal.style.display = 'flex';
}

function previewEmployeePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const image = new Image();
    image.onload = () => {
      const maxSize = 512;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.76);
      document.getElementById('emp-photo-base64').value = base64;
      const preview = document.getElementById('emp-photo-preview');
      preview.src = base64;
      preview.style.display = 'inline-block';
    };
    image.onerror = () => alert(t('employee_photo_read_error'));
    image.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function closeEmployeeModal() {
  document.getElementById('employee-modal').style.display = 'none';
}

async function saveEmployee() {
  const empId = document.getElementById('emp-id').value || null;
  const categorySelect = document.getElementById('emp-category');
  const emp = {
    id: empId,
    name: document.getElementById('emp-name').value,
    phone: document.getElementById('emp-phone').value,
    category_id: categorySelect && categorySelect.value ? Number(categorySelect.value) : null,
    salary: parseFloat(document.getElementById('emp-salary').value) || 0,
    monthly_accrual_start_date: document.getElementById('emp-start-date').value || new Date().toISOString().substring(0, 10),
    photo: document.getElementById('emp-photo-base64').value || null
  };
  if(!emp.name) {
    alert(window.t('employee_name_required'));
    return;
  }
  try {
    emp.year_id = window.currentYearId;
    const savedId = await window.api.saveEmployee(emp);
    if (!savedId) throw new Error('لم يتم حفظ بيانات الموظف');
    closeEmployeeModal();
    await loadEmployees();
    employeePhotoCache.set(Number(savedId), emp.photo || '');
  
  // Try to re-select the saved employee
  if (empId || currentEmployeeId || savedId) {
    const newEmp = allEmployees.find(e => Number(e.id) === Number(savedId)) || allEmployees.find(e => e.name === emp.name);
    if(newEmp && typeof window.selectEmployeeOption === 'function') {
      await window.selectEmployeeOption(newEmp.id, newEmp.name);
    }
  }
  } catch (error) {
    console.error('saveEmployee failed:', error);
    alert(`${window.t('error_occurred') || 'حدث خطأ'}: ${error.message || error}`);
  }
}

function editCurrentEmployee() {
  if(!currentEmployeeId) return;
  const emp = allEmployees.find(e => e.id == currentEmployeeId);
  if(emp) openEmployeeModal(emp);
}

async function deleteCurrentEmployee() {
  if(!currentEmployeeId) return;
  const emp = allEmployees.find(e => e.id == currentEmployeeId);
  const confirmed = await window.api.confirmDialog(window.t('confirm_delete_employee'));
  if(confirmed) {
    try {
      await window.api.deleteEmployee(currentEmployeeId);
      currentEmployeeId = null;
      document.getElementById('employee-management-panel').style.display = 'none';
      await loadEmployees();
    } catch (e) {
      console.error(e);
      alert(window.t('delete_error'));
    }
  }
}

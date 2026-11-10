function addPartner() {
  const name = document.getElementById('partner-name').value.trim();
  const pct = window.safeParseFloat(document.getElementById('partner-percentage').value) || 0;
  
  if (!name) return alert(t('partner_name_input_required'));
  if (pct <= 0 || pct > 100) return alert(t('partner_percentage_range'));
  
  const currentTotal = partnersList.reduce((sum, p) => sum + p.percentage, 0);
  if (currentTotal + pct > 100) return alert(t('partner_percentage_total_error'));
  
  partnersList.push({ name, percentage: pct });
  document.getElementById('partner-name').value = '';
  document.getElementById('partner-percentage').value = '';
  
  renderPartners();
}

function renderPartners() {
  const tbody = document.getElementById('partners-tbody');
  const rawDistributableAttr = document.getElementById('closing-distributable').getAttribute('data-raw');
  const distributable = window.safeParseFloat(rawDistributableAttr) || 0;
  
  const activeYearObj = (window.financialYears || []).find(y => y.YearID === window.currentYearId);
  const isYearClosedVal = activeYearObj ? activeYearObj.IsClosed === 1 : false;

  tbody.innerHTML = partnersList.map((p, idx) => {
    const share = distributable * (p.percentage / 100);
    const withdrawals = partnerWithdrawalsMap[p.name] || 0;
    const netRemaining = share - withdrawals;
    
    let actionBtn = isYearClosedVal ? '-' : `<button class="btn-danger" style="padding:2px 5px; font-size:11px;" onclick="removePartner(${idx})">${t('delete_button')}</button>`;

    return `
      <tr>
        <td>${p.name}</td>
        <td>${p.percentage}%</td>
        <td style="font-weight:bold; color:var(--primary-color);">${window.appSettings?.currency || ''}${share.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
        <td style="color:var(--red);">${window.appSettings?.currency || ''}${withdrawals.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
        <td style="font-weight:bold; color:var(--green2);">${window.appSettings?.currency || ''}${netRemaining.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join('');
  
  const totalPct = partnersList.reduce((sum, p) => sum + p.percentage, 0);
  document.getElementById('distribution-total-pct').innerText = `${t('distribution_total_prefix')} ${totalPct}%`;
}

function removePartner(idx) {
  partnersList.splice(idx, 1);
  renderPartners();
}

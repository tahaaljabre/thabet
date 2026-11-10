import { showToast } from '../../core/notifications.js';
import { createElement, clearElement } from '../../core/dom.js';

export function addPartner({ isYearClosed, partnersList, safeParseFloat, renderPartners }) {
  if (isYearClosed) {
    showToast(t('closed_year_no_edit'), 'warning');
    return;
  }

  const nameInput = document.getElementById('partner-name');
  const pctInput = document.getElementById('partner-percentage');

  const name = nameInput.value.trim();
  const pct = safeParseFloat(pctInput.value) || 0;

  if (!name) {
    showToast(t('partner_name_required'), 'error');
    return;
  }
  if (pct <= 0 || pct > 100) {
    showToast(t('partner_percentage_range'), 'error');
    return;
  }

  const currentTotal = partnersList.reduce((sum, p) => sum + p.percentage, 0);
  if (currentTotal + pct > 100) {
    showToast(t('partner_percentage_exceeds_total'), 'error');
    return;
  }

  partnersList.push({ name, percentage: pct });
  nameInput.value = '';
  pctInput.value = '';

  renderPartners();
  showToast(t('partner_distribution_added'), 'success');
}

export function renderPartnersView({ isYearClosed, partnersList, partnerWithdrawalsMap, safeParseFloat, removePartner }) {
  const tbody = document.getElementById('partners-tbody');
  if (!tbody) return;
  clearElement(tbody);

  const distributableVal = safeParseFloat(document.getElementById('closing-distributable').getAttribute('data-raw')) || 0;

  if (partnersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--muted);">${t('partner_distribution_empty')}</td></tr>`;
    document.getElementById('distribution-total-pct').innerText = `${t('partner_distribution_total')}: 0%`;
    return;
  }

  partnersList.forEach((p, idx) => {
    const tr = createElement('tr');
    tr.appendChild(createElement('td', { textContent: p.name }));
    tr.appendChild(createElement('td', { textContent: p.percentage + '%' }));

    const share = distributableVal * (p.percentage / 100);
    const shareTd = createElement('td', { style: 'font-weight:bold; color:var(--primary);' });
    shareTd.textContent = (window.appSettings?.currency || '') + share.toLocaleString('en-US', { minimumFractionDigits: 2 });
    tr.appendChild(shareTd);

    const withdrawals = partnerWithdrawalsMap[p.name] || 0;
    const withdrawTd = createElement('td', { style: 'color:var(--red);' });
    withdrawTd.textContent = (window.appSettings?.currency || '') + withdrawals.toLocaleString('en-US', { minimumFractionDigits: 2 });
    tr.appendChild(withdrawTd);

    const netRemaining = share - withdrawals;
    const netTd = createElement('td', { style: 'font-weight:bold; color:var(--green2);' });
    netTd.textContent = (window.appSettings?.currency || '') + netRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 });
    tr.appendChild(netTd);

    const actionTd = createElement('td', { class: 'no-print' });
    if (isYearClosed) {
      actionTd.textContent = '-';
    } else {
      const deleteBtn = createElement('button', { class: 'btn-danger', style: 'padding:2px 6px; font-size:11px;', textContent: t('delete_button') });
      deleteBtn.addEventListener('click', () => removePartner(idx));
      actionTd.appendChild(deleteBtn);
    }
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  });

  const totalPct = partnersList.reduce((sum, p) => sum + p.percentage, 0);
  document.getElementById('distribution-total-pct').innerText = `${t('partner_distribution_total')}: ${totalPct}%`;
}

export function removePartnerAt(idx, { partnersList, renderPartners }) {
  partnersList.splice(idx, 1);
  renderPartners();
}

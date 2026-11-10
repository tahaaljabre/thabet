import { updateClosingPartners, closeYear, reopenYear } from './api.js';
import { getAccountingPeriods } from '../../core/ipc.js';
import { showToast } from '../../core/notifications.js';
import { showConfirm } from '../../components/modal.js';

export async function executeYearEndClosingOrReopen({ isYearClosed, currentYearId, currentYearName, currentUser, partnersList, partnerWithdrawalsMap, t, safeParseFloat, getLocalDateString }) {
  if (isYearClosed) {
    // Reopen logic
  const confirmed = await showConfirm(t('reopen_year_title'), t('confirm_reopen_year'));
    if (confirmed) {
      try {
        const res = await reopenYear(currentYearId);
        if (res.success) {
          showToast(t('msg_year_reopened'), 'success');
          // Reload page router or restart window
          window.location.reload();
        } else {
          showToast(`${t('reopen_year_failed')}: ${res.error}`, 'error');
        }
      } catch (err) {
    showToast(`${t('reopen_year_failed')}: ${err.message}`, 'error');
      }
    }
  } else {
    // Closing logic
    const rawProfit = safeParseFloat(document.getElementById('closing-netprofit').getAttribute('data-raw')) || 0;
    const rawZakat = safeParseFloat(document.getElementById('closing-zakat').getAttribute('data-raw')) || 0;
    const rawDistributable = safeParseFloat(document.getElementById('closing-distributable').getAttribute('data-raw')) || 0;

    if (rawProfit <= 0) {
      showToast(t('err_no_profit_to_close'), 'error');
      return;
    }

    const totalPct = partnersList.reduce((sum, p) => sum + p.percentage, 0);
    if (totalPct !== 100) {
      showToast(t('err_distribute_100_pct'), 'error');
      return;
    }

  const confirmed = await showConfirm(t('closing_final_confirm_title'), t('confirm_execute_closing'));
    if (confirmed) {
      try {
        const periods = await getAccountingPeriods(currentYearId);
        if (periods.length !== 12 || periods.some(period => period.status !== 'closed')) {
          showToast(t('monthly_error_all_months_required'), 'error');
          return;
        }
        const nextYearName = (parseInt(currentYearName) + 1).toString();

        // Closing records obligations only. Actual Zakat and partner payments
        // are entered later as cash vouchers against their real payment dates.
        await updateClosingPartners(currentYearId, partnersList);

        // Lock financial year and create next year.
        const closeRes = await closeYear(currentYearId, nextYearName);
        if (closeRes.success) {
          showToast(t('msg_year_closed_success') + nextYearName, 'success');
          // Reload application years listing and refresh
          window.location.reload();
        } else {
          showToast(`${t('closing_failed')}: ${closeRes.error}`, 'error');
        }
      } catch (err) {
        showToast(t('err_execute_closing') + err.message, 'error');
      }
    }
  }
}

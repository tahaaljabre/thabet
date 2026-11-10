async function executeYearEndClosing() {
  const rawProfit = window.safeParseFloat(document.getElementById('closing-netprofit').getAttribute('data-raw')) || 0;
  const rawZakat = window.safeParseFloat(document.getElementById('closing-zakat').getAttribute('data-raw')) || 0;
  const rawDistributable = window.safeParseFloat(document.getElementById('closing-distributable').getAttribute('data-raw')) || 0;

  if (rawProfit <= 0) return alert(t('err_no_profit_to_close'));

  if (typeof hasNegativeBankBalance !== 'undefined' && hasNegativeBankBalance) {
    return alert(t('negative_balance_closing_error'));
  }

  const totalPct = partnersList.reduce((sum, p) => sum + p.percentage, 0);
  if (totalPct !== 100) return alert(t('err_distribute_100_pct'));

  const closingExplanation = window.currentLang?.() === 'en'
    ? 'The closing will record Zakat as payable and deduct it from distributable profit. No bank or cash balance will be reduced until you create the actual payment voucher. Continue?'
    : 'سيتم تسجيل الزكاة كمبلغ مستحق وخصمها من الربح القابل للتوزيع فقط. لن ينخفض أي بنك أو صندوق حتى تسجل سند الدفع الفعلي. هل تريد المتابعة؟';
  if (await window.api.confirmDialog(closingExplanation)) {
    const nextYearName = (parseInt(window.currentYearName) + 1).toString();
    try {
      // Save the closing figures as obligations. Paying Zakat or partner shares
      // is a separate cash event and must be recorded later against the actual account.
      await window.api.saveClosingReport({
        yearId: window.currentYearId,
        closingDate: window.getLocalDateString(),
        netProfit: rawProfit,
        zakat: rawZakat,
        distributableProfit: rawDistributable,
        pdfBase64: ''
      });

      // Save partners list to database for historical retrieval
      await window.api.saveClosingPartners(window.currentYearId, partnersList);

      // Lock financial year and create next year. Bank balances are carried
      // forward unchanged until real payment vouchers are posted.
      const closeRes = await window.api.closeFinancialYear(window.currentYearId, nextYearName);
      if (closeRes.success) {
        alert(t('msg_year_closed_success') + nextYearName);
        window.location.reload();
      }
    } catch (err) {
      alert(t('err_execute_closing') + err.message);
    }
  }
}


// Partner Statement of Account
async function reopenActiveYear() {
  if (await window.api.confirmDialog(t('confirm_reopen_year'))) {
    try {
      const res = await window.api.reopenFinancialYear(window.currentYearId);
      if (res.success) {
        alert(t('msg_year_reopened'));

        // Reload list of years
        const years = await window.api.getFinancialYears();
        window.financialYears = years;
        const optionsHtml = years.map(y => `<option value="${y.YearID}">${y.YearName}${y.IsClosed ? ` (${t('closed_year_suffix')})` : ''}</option>`).join('');
        document.getElementById('select-financial-year').innerHTML = optionsHtml;
        document.getElementById('header-year-select').innerHTML = optionsHtml;

        document.getElementById('select-financial-year').value = window.currentYearId;
        document.getElementById('header-year-select').value = window.currentYearId;

        if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('stateChanged'));
      }
    } catch (err) {
      alert(t('err_prefix') + err.message);
    }
  }
}
window.reopenActiveYear = reopenActiveYear;

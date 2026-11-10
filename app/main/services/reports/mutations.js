const { dbGet, dbAll, dbRun, isYearClosed, assertAccountingDateOpen, logActivity, getActiveUser } = require('../database');
const { getNextVoucherNumber } = require('../voucher-sequence.service');
const accounting = require('../accounting.service');
const { normalizeVatSettings, splitInclusiveVat } = require('../vat.service');
const { moveToTrash } = require('../trash.service');
const { withTransaction } = require('../database/transaction');

function salesSourceKey(reportDate, cashierName) {
  return `${reportDate}|${cashierName}`;
}

async function deleteDailyReport(reportDate, cashierName, yearId) {
  return withTransaction(async () => {
    await assertAccountingDateOpen(yearId, reportDate);
    const activeReport = await dbGet(
      `SELECT * FROM daily_reports WHERE report_date=? AND cashier_name=?
     AND year_id=? AND COALESCE(is_voided,0)=0`,
      [reportDate, cashierName, yearId]
    );
    if (!activeReport) return { success: true, alreadyDeleted: true };
    await accounting.reverseSourceEntries(
      yearId,
      'sales',
      salesSourceKey(reportDate, cashierName),
      reportDate,
      `عكس مبيعات ${reportDate} - ${cashierName}`
    );
    await dbRun(
      `UPDATE daily_reports
       SET is_voided = 1, voided_at = CURRENT_TIMESTAMP, voided_by = ?,
           void_reason = ?
       WHERE report_date = ? AND cashier_name = ?
         AND (year_id = ? OR year_id IS NULL) AND COALESCE(is_voided, 0) = 0`,
      [getActiveUser(), `إلغاء تقرير مبيعات ${reportDate}`, reportDate, cashierName, yearId]
    );
    const cancelledReport = await dbGet(
      'SELECT * FROM daily_reports WHERE report_date=? AND cashier_name=? AND year_id=?',
      [reportDate, cashierName, yearId]
    );
    await moveToTrash(
      'daily_reports',
      cancelledReport,
      `سند مبيعات #${cancelledReport?.voucher_number || '—'} - ${reportDate}`,
      yearId
    );
    await dbRun(
      'DELETE FROM DailyReportChannelSales WHERE report_date = ? AND cashier_name = ? AND year_id = ?',
      [reportDate, cashierName, yearId]
    );
    await dbRun(
      `UPDATE BankTransactions
       SET is_voided = 1, voided_at = CURRENT_TIMESTAMP, voided_by = ?, void_reason = ?
       WHERE tx_date = ? AND reference_type = 'commission'
         AND (year_id = ? OR year_id IS NULL) AND created_by = ? AND COALESCE(is_voided, 0) = 0`,
      [getActiveUser(), `إلغاء عمولة مرتبطة بمبيعات ${reportDate}`, reportDate, yearId, cashierName]
    );
    await logActivity('CANCEL', 'daily_reports', null, `إلغاء تقرير مبيعات يوم: ${reportDate} للكاشير ${cashierName}`, null, yearId);
    return { success: true };
  }, { immediate: true });
}

async function saveReportState(state) {
  const yearId = state.year_id || state.yearId || 1;
  await assertAccountingDateOpen(yearId, state.reportDate);
  const cashierName = state.cashierName || 'الدور الأول';
  const cashierUser = state.cashierUser || 'الموظف المسؤول';

  return withTransaction(async () => {
    const existingReport = await dbGet('SELECT * FROM daily_reports WHERE report_date = ? AND cashier_name = ? AND year_id = ?', [state.reportDate, cashierName, yearId]);
    
    let voucherNum = null;
    if (existingReport && existingReport.voucher_number) {
        voucherNum = existingReport.voucher_number;
    } else {
        voucherNum = await getNextVoucherNumber('sales', yearId);
    }

    let salesData = state.sales;
    let actualCash = state.cashierActual;
    if (!salesData) {
      if (existingReport) {
        salesData = {
          cash: existingReport.cash_sales,
          kbank: existingReport.kbank,
          grab: existingReport.grab,
          lineman: existingReport.lineman,
          krungsri: existingReport.krungsri
        };
        actualCash = existingReport.cashier_actual;
      } else {
        salesData = { cash: 0, kbank: 0, grab: 0, lineman: 0, krungsri: 0 };
        actualCash = 0;
      }
    }

    const settingsRow = await dbGet("SELECT value FROM settings WHERE key = 'app_settings'");
    const appSettings = settingsRow ? JSON.parse(settingsRow.value) : {};
    const vatSettings = normalizeVatSettings(appSettings);
    const grossSalesMinor = Object.values(salesData)
      .reduce((sum, value) => sum + accounting.toMinor(value || 0), 0);
    const vatSplit = splitInclusiveVat(grossSalesMinor, vatSettings);
    const vatRateBasisPoints = Math.round(vatSplit.rate * 100);

    if (existingReport) {
      await dbRun(`UPDATE daily_reports SET cashier_user = ?, cash_sales = ?, kbank = ?, grab = ?, lineman = ?, krungsri = ?, cashier_actual = ?, voucher_number = ?, vat_rate_basis_points = ?, vat_minor = ?, net_sales_minor = ?, is_voided = 0, voided_at = NULL, voided_by = NULL, void_reason = NULL WHERE report_date = ? AND cashier_name = ? AND year_id = ?`,
      [cashierUser, salesData.cash || 0, salesData.kbank || 0, salesData.grab || 0, salesData.lineman || 0, salesData.krungsri || 0, actualCash || 0, voucherNum, vatRateBasisPoints, vatSplit.vatMinor, vatSplit.netMinor, state.reportDate, cashierName, yearId]);
    } else {
      await dbRun(`INSERT INTO daily_reports (report_date, cashier_name, cashier_user, cash_sales, kbank, grab, lineman, krungsri, cashier_actual, year_id, voucher_number, vat_rate_basis_points, vat_minor, net_sales_minor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [state.reportDate, cashierName, cashierUser, salesData.cash || 0, salesData.kbank || 0, salesData.grab || 0, salesData.lineman || 0, salesData.krungsri || 0, actualCash || 0, yearId, voucherNum, vatRateBasisPoints, vatSplit.vatMinor, vatSplit.netMinor]);
    }

    await dbRun(
      'DELETE FROM DailyReportChannelSales WHERE report_date = ? AND cashier_name = ? AND year_id = ?',
      [state.reportDate, cashierName, yearId]
    );
    const channelSales = state.channelSales && typeof state.channelSales === 'object' ? state.channelSales : {};
    for (const [channelKey, rawAmount] of Object.entries(channelSales)) {
      const amount = parseFloat(rawAmount) || 0;
      await dbRun(
        'INSERT INTO DailyReportChannelSales (report_date, cashier_name, year_id, channel_key, amount) VALUES (?, ?, ?, ?, ?)',
        [state.reportDate, cashierName, yearId, channelKey, amount]
      );
    }

    await dbRun(
      `UPDATE BankTransactions SET is_voided = 1, voided_at = CURRENT_TIMESTAMP,
       voided_by = ?, void_reason = ?
       WHERE tx_date = ? AND reference_type = 'commission'
         AND (year_id = ? OR year_id IS NULL) AND created_by = ? AND COALESCE(is_voided, 0) = 0`,
      [getActiveUser(), 'استبدال عمولة بعد تعديل المبيعات', state.reportDate, yearId, cashierName]
    );

    try {
      const grabCommissionRate = parseFloat(appSettings.grabCommission) || 0;
      const linemanCommissionRate = parseFloat(appSettings.linemanCommission) || 0;
      
      const grabSales = parseFloat(salesData.grab) || 0;
      const linemanSales = parseFloat(salesData.lineman) || 0;
      
      const mappings = await dbAll("SELECT * FROM BankSalesMapping WHERE year_id = ?", [yearId]);
      
      if (grabSales > 0 && grabCommissionRate > 0) {
          const grabCommAmt = grabSales * (grabCommissionRate / 100);
          const mapping = mappings.find(m => m.channel_name === 'grab');
          if (mapping && mapping.bank_account_id) {
              await dbRun(
                'INSERT INTO BankTransactions (tx_date, tx_type, from_account_id, to_account_id, amount, description, created_by, year_id, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [state.reportDate, 'Withdrawal', mapping.bank_account_id, null, grabCommAmt, `عمولة مبيعات GrabFood (${grabCommissionRate}%)`, cashierName, yearId, 'commission', null]
              );
          }
      }
      
      if (linemanSales > 0 && linemanCommissionRate > 0) {
          const linemanCommAmt = linemanSales * (linemanCommissionRate / 100);
          const mapping = mappings.find(m => m.channel_name === 'lineman');
          if (mapping && mapping.bank_account_id) {
              await dbRun(
                'INSERT INTO BankTransactions (tx_date, tx_type, from_account_id, to_account_id, amount, description, created_by, year_id, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [state.reportDate, 'Withdrawal', mapping.bank_account_id, null, linemanCommAmt, `عمولة مبيعات LineMan (${linemanCommissionRate}%)`, cashierName, yearId, 'commission', null]
              );
          }
      }
    } catch(e) {
      console.error('Failed to process commissions:', e);
    }

    const revenueAccount = await accounting.getAccountByCode(yearId, '4010');
    const vatPayableAccount = vatSplit.vatMinor > 0
      ? await accounting.getAccountByCode(yearId, '2030')
      : null;
    const undepositedAccount = await accounting.getAccountByCode(yearId, '1010');
    const salesMappings = await dbAll('SELECT * FROM BankSalesMapping WHERE year_id = ?', [yearId]);
    const vault = await dbGet(
      'SELECT * FROM BankAccounts WHERE year_id = ? AND is_cash_vault = 1 LIMIT 1',
      [yearId]
    );
    const debitLines = [];
    for (const [channel, rawAmount] of Object.entries(salesData)) {
      const amountMinor = accounting.toMinor(rawAmount || 0);
      if (amountMinor <= 0) continue;
      const mapping = salesMappings.find(item => item.channel_name === channel);
      let debitAccount = undepositedAccount;
      const bank = mapping
        ? await dbGet('SELECT * FROM BankAccounts WHERE id = ? AND year_id = ?', [mapping.bank_account_id, yearId])
        : (channel === 'cash' ? vault : null);
      if (bank) {
        debitAccount = await accounting.ensureBankLedgerAccount(
          bank.id,
          yearId,
          bank.bank_name,
          bank.is_cash_vault
        );
      }
      debitLines.push({
        accountId: debitAccount.id,
        debitMinor: amountMinor,
        creditMinor: 0,
        description: channel
      });
    }
    const salesTotalMinor = debitLines.reduce((sum, line) => sum + line.debitMinor, 0);
    if (salesTotalMinor > 0) {
      await accounting.postSourceEntry({
        yearId,
        date: state.reportDate,
        description: `مبيعات يوم ${state.reportDate} - ${cashierName}`,
        sourceType: 'sales',
        sourceKey: salesSourceKey(state.reportDate, cashierName),
        lines: [
          ...debitLines,
          { accountId: revenueAccount.id, debitMinor: 0, creditMinor: vatSplit.netMinor },
          ...(vatSplit.vatMinor > 0 ? [{
            accountId: vatPayableAccount.id,
            debitMinor: 0,
            creditMinor: vatSplit.vatMinor,
            description: `VAT ${vatSplit.rate}%`
          }] : [])
        ]
      });
    } else {
      await accounting.reverseSourceEntries(
        yearId,
        'sales',
        salesSourceKey(state.reportDate, cashierName),
        state.reportDate,
        `إلغاء مبيعات ${state.reportDate} - ${cashierName}`
      );
    }

    await logActivity('UPDATE', 'daily_reports', null, `حفظ تقرير مبيعات يوم: ${state.reportDate} للكاشير ${cashierName} (نقد: ${salesData.cash || 0})`, null, yearId);
    return {
      success: true,
      voucherNumber: voucherNum
    };
  });
}

module.exports = { deleteDailyReport, saveReportState };

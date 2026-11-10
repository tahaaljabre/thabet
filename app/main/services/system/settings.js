const { dbGet, dbRun, logActivity } = require('../database');

const DEFAULT_SALARY_ACCRUAL_DAY = 28;
const { normalizeVatSettings } = require('../vat.service');

function normalizeSalaryAccrualDay(day) {
  const parsed = parseInt(day, 10);
  if (!Number.isInteger(parsed)) return DEFAULT_SALARY_ACCRUAL_DAY;
  if (parsed < 1) return 1;
  if (parsed > 31) return 31;
  return parsed;
}
// App Settings
async function getAppSettings() {
  const row = await dbGet("SELECT value FROM settings WHERE key = 'app_settings'");
  const parsed = row ? JSON.parse(row.value) : {};
  parsed.salaryAccrualDay = normalizeSalaryAccrualDay(parsed.salaryAccrualDay);
  Object.assign(parsed, normalizeVatSettings(parsed));
  return parsed;
}

async function saveAppSettings(settings) {
  const previous = await getAppSettings();
  const payload = { ...(settings || {}) };
  payload.salaryAccrualDay = normalizeSalaryAccrualDay(payload.salaryAccrualDay);
  Object.assign(payload, normalizeVatSettings(payload));
  const value = JSON.stringify(payload);
  await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('app_settings', ?)", [value]);
  const changedKeys = [...new Set([...Object.keys(previous), ...Object.keys(payload)])]
    .filter(key => JSON.stringify(previous[key]) !== JSON.stringify(payload[key]));
  if (changedKeys.length > 0) {
    await logActivity('UPDATE', 'settings', 'app_settings',
      `تعديل إعدادات التطبيق | الحقول المتغيرة: ${changedKeys.join(', ')}`, null, 1);
  }
  return { success: true };
}

async function importLegacyData(jsonString) {
  const data = JSON.parse(jsonString);
  let importedDates = 0;
  for (const dateStr of Object.keys(data)) {
    const state = data[dateStr];
    if (state && state.reportDate) {
      const cashierName = 'كاشير عام'; // Default for legacy data
      const cashierUser = 'admin'; // Default for legacy data
      const yearId = 1; // Default for legacy data

      const existingReport = await dbGet('SELECT * FROM daily_reports WHERE report_date = ? AND cashier_name = ? AND year_id = ?', [state.reportDate, cashierName, yearId]);
      if (existingReport) {
        await dbRun(`UPDATE daily_reports SET cashier_user = ?, cash_sales = ?, kbank = ?, grab = ?, lineman = ?, krungsri = ?, cashier_actual = ? WHERE report_date = ? AND cashier_name = ? AND year_id = ?`,
        [cashierUser, state.sales?.cash || 0, state.sales?.kbank || 0, state.sales?.grab || 0, state.sales?.lineman || 0, state.sales?.krungsri || 0, state.cashierActual || 0, state.reportDate, cashierName, yearId]);
      } else {
        await dbRun(`INSERT INTO daily_reports (report_date, cashier_name, cashier_user, cash_sales, kbank, grab, lineman, krungsri, cashier_actual, year_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [state.reportDate, cashierName, cashierUser, state.sales?.cash || 0, state.sales?.kbank || 0, state.sales?.grab || 0, state.sales?.lineman || 0, state.sales?.krungsri || 0, state.cashierActual || 0, yearId]);
      }

      await dbRun('DELETE FROM expenses WHERE report_date = ?', [state.reportDate]);
      if (state.purchases && Array.isArray(state.purchases)) {
         for (const exp of state.purchases) {
           await dbRun(
             'INSERT INTO expenses (report_date, name, qty, amount, category) VALUES (?, ?, ?, ?, ?)',
             [state.reportDate, exp.name, exp.qty, exp.amount, exp.category]
           );
         }
      }
      importedDates++;
    }
  }
  return { success: true, count: importedDates };
}
module.exports = {
  getAppSettings,
  saveAppSettings,
  importLegacyData
};

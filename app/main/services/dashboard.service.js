const { dbGet, dbAll, dbRun } = require('./database');

const { getFinancialSummary } = require('./finance.service');

async function getHomeActivity(yearId) {
  const [sales, vault, banks] = await Promise.all([
    dbAll(`SELECT report_date AS date, voucher_number AS id, cashier_name AS detail,
      COALESCE(cash_sales, 0) + COALESCE(kbank, 0) + COALESCE(grab, 0) + COALESCE(lineman, 0) + COALESCE(krungsri, 0) +
      COALESCE((SELECT SUM(amount) FROM DailyReportChannelSales c WHERE c.report_date = d.report_date AND c.cashier_name = d.cashier_name AND c.year_id = d.year_id), 0) AS amount
      FROM daily_reports d WHERE year_id = ? AND COALESCE(is_voided, 0) = 0 ORDER BY report_date DESC LIMIT 6`, [yearId]),
    dbAll(`SELECT voucher_date AS date, id, category AS detail, amount FROM CashGeneralVouchers
      WHERE year_id = ? AND COALESCE(is_voided, 0) = 0 ORDER BY voucher_date DESC, id DESC LIMIT 6`, [yearId]),
    dbAll(`SELECT tx_date AS date, id, description AS detail, amount,
      COALESCE(from_account_id, to_account_id) AS accountId FROM BankTransactions
      WHERE year_id = ? AND COALESCE(is_voided, 0) = 0 ORDER BY tx_date DESC, id DESC LIMIT 6`, [yearId])
  ]);
  return [
    ...sales.map(row => ({ ...row, type: 'sales' })),
    ...vault.map(row => ({ ...row, type: 'vault' })),
    ...banks.map(row => ({ ...row, type: 'banks' }))
  ].sort((a, b) => b.date.localeCompare(a.date) || Number(b.id || 0) - Number(a.id || 0)).slice(0, 6);
}

async function getDashboardStats(startDate, endDate, yearId, cashierName) {
  try {
    const stats = await getFinancialSummary(startDate, endDate, yearId, cashierName);
    return { success: true, stats: stats };
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return { success: false, error: error.message };
  }
}

async function getSettingsPartners() {
  const vPartners = await dbAll("SELECT DISTINCT partner_name FROM CashGeneralVouchers WHERE partner_name IS NOT NULL AND partner_name != ''").catch(() => []);
  const bPartners = await dbAll("SELECT DISTINCT partner_name FROM BankTransactions WHERE partner_name IS NOT NULL AND partner_name != ''").catch(() => []);
  const dbPartners = await dbAll("SELECT id, name, phone FROM partners").catch(() => []);
  
  // Migrate legacy partners from app_settings JSON if any
  try {
    const settingsRow = await dbGet("SELECT value FROM settings WHERE key = 'app_settings'");
    if (settingsRow && settingsRow.value) {
      const parsed = JSON.parse(settingsRow.value);
      if (parsed && Array.isArray(parsed.partners)) {
        for (let p of parsed.partners) {
          if (!dbPartners.some(dbP => dbP.name === p.name)) {
            dbPartners.push({ id: p.id || null, name: p.name, phone: p.phone || '' });
            // Save to DB for future
            await dbRun("INSERT OR IGNORE INTO partners (name, phone) VALUES (?, ?)", [p.name, p.phone || '']);
          }
        }
      }
    }
  } catch (e) {
    console.log("Legacy partners migration error:", e);
  }

  const partnerMap = new Map();
  dbPartners.forEach(p => partnerMap.set(p.name, p));
  
  vPartners.forEach(r => {
    if (!partnerMap.has(r.partner_name)) {
      partnerMap.set(r.partner_name, { id: null, name: r.partner_name, phone: '' });
    }
  });
  bPartners.forEach(r => {
    if (!partnerMap.has(r.partner_name)) {
      partnerMap.set(r.partner_name, { id: null, name: r.partner_name, phone: '' });
    }
  });
  
  return Array.from(partnerMap.values());
}

async function updatePartner(data) {
  const { oldName, newName, phone } = data;
  const existing = await dbGet('SELECT * FROM partners WHERE name = ?', [oldName || newName]);
  if (existing) {
    await dbRun('UPDATE partners SET name = ?, phone = ? WHERE id = ?', [newName, phone, existing.id]);
  } else {
    await dbRun('INSERT INTO partners (name, phone) VALUES (?, ?)', [newName, phone]);
  }
  if (oldName && oldName !== newName) {
    await dbRun('UPDATE CashGeneralVouchers SET partner_name = ? WHERE partner_name = ?', [newName, oldName]);
    await dbRun('UPDATE BankTransactions SET partner_name = ? WHERE partner_name = ?', [newName, oldName]);
  }
  return { success: true };
}

async function deletePartner(name) {
  // Reference checks must fail closed: if the database cannot confirm that a
  // partner is unused, propagate the error and do not attempt the deletion.
  const v = await dbAll("SELECT id FROM CashGeneralVouchers WHERE partner_name = ? LIMIT 1", [name]);
  const b = await dbAll("SELECT id FROM BankTransactions WHERE partner_name = ? LIMIT 1", [name]);
  const c = await dbAll("SELECT id FROM ClosingPartners WHERE partner_name = ? LIMIT 1", [name]);
  
  if (v.length > 0 || b.length > 0 || c.length > 0) {
    return { success: false, error: 'لا يمكن حذف هذا الشريك لوجود حركات مالية مسجلة باسمه في السندات أو البنوك أو الإقفال.' };
  }
  
  await dbRun('DELETE FROM partners WHERE name = ?', [name]);
  return { success: true };
}

async function savePartner(partner) {
  const existing = await dbGet('SELECT * FROM partners WHERE name = ?', [partner.name]);
  if (existing) {
    if (partner.phone) {
      await dbRun('UPDATE partners SET phone = ? WHERE id = ?', [partner.phone, existing.id]);
    }
  } else {
    await dbRun('INSERT INTO partners (name, phone) VALUES (?, ?)', [partner.name, partner.phone]);
  }
  return { success: true };
}

async function getAllPartners(yearId) {
  const vPartners = await dbAll("SELECT DISTINCT partner_name FROM CashGeneralVouchers WHERE year_id = ? AND partner_name IS NOT NULL AND partner_name != ''", [yearId]);
  const bPartners = await dbAll("SELECT DISTINCT partner_name FROM BankTransactions WHERE year_id = ? AND partner_name IS NOT NULL AND partner_name != ''", [yearId]);
  const dbPartners = await dbAll("SELECT DISTINCT name FROM partners");
  
  const names = new Set();
  vPartners.forEach(r => names.add(r.partner_name));
  bPartners.forEach(r => names.add(r.partner_name));
  dbPartners.forEach(r => names.add(r.name));
  
  return Array.from(names);
}

async function getCashiers() {
  const dbCashiers = await dbAll('SELECT * FROM cashiers ORDER BY id ASC').catch(() => []);
  
  // Migrate legacy cashiers from app_settings JSON if any
  try {
    const settingsRow = await dbGet("SELECT value FROM settings WHERE key = 'app_settings'");
    if (settingsRow && settingsRow.value) {
      const parsed = JSON.parse(settingsRow.value);
      if (parsed && Array.isArray(parsed.cashiers)) {
        for (let c of parsed.cashiers) {
          if (!dbCashiers.some(dbC => dbC.name === c.name)) {
            const activeUser = c.activeUser || c.active_user || 'admin';
            dbCashiers.push({ id: c.id || null, name: c.name, active_user: activeUser });
            // Save to DB for future
            await dbRun("INSERT OR IGNORE INTO cashiers (name, active_user) VALUES (?, ?)", [c.name, activeUser]);
          }
        }
      }
    }
  } catch (e) {
    console.log("Legacy cashiers migration error:", e);
  }

  return dbCashiers;
}

async function saveCashier(cashier) {
  if (cashier.id) {
    const oldCashier = await dbGet('SELECT name FROM cashiers WHERE id = ?', [cashier.id]);
    const oldName = oldCashier ? oldCashier.name : null;
    
    await dbRun('UPDATE cashiers SET name = ?, active_user = ? WHERE id = ?', [cashier.name, cashier.active_user, cashier.id]);
    
    if (oldName) {
      await dbRun('UPDATE daily_reports SET cashier_name = ?, cashier_user = ? WHERE cashier_name = ? AND is_closed = 0', [cashier.name, cashier.active_user, oldName]);
    }
    return { success: true };
  } else {
    return await dbRun('INSERT INTO cashiers (name, active_user) VALUES (?, ?)', [cashier.name, cashier.active_user]);
  }
}

async function deleteCashier(id) {
  return await dbRun('DELETE FROM cashiers WHERE id = ?', [id]);
}

module.exports = {
  getHomeActivity,
  getDashboardStats,
  getSettingsPartners,
  updatePartner,
  deletePartner,
  savePartner,
  getAllPartners,
  getCashiers,
  saveCashier,
  deleteCashier
};

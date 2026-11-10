jest.mock('../../main/services/database', () => ({
  dbGet: jest.fn(),
  dbAll: jest.fn(),
  dbRun: jest.fn()
}));

const database = require('../../main/services/database');
const {
  getHomeActivity,
  deletePartner,
  getSettingsPartners,
  getCashiers
} = require('../../main/services/dashboard.service');

describe('Dashboard Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('combines recent sales, cash, and bank activity for the active year', async () => {
    database.dbAll
      .mockResolvedValueOnce([{ date: '2026-11-09', id: 4, detail: 'Cashier', amount: 120 }])
      .mockResolvedValueOnce([{ date: '2026-11-08', id: 8, detail: 'Cash', amount: 30 }])
      .mockResolvedValueOnce([{ date: '2026-11-10', id: 3, detail: 'Transfer', amount: 50, accountId: 2 }]);

    const rows = await getHomeActivity(7);

    expect(rows.map(row => row.type)).toEqual(['banks', 'sales', 'vault']);
    expect(database.dbAll).toHaveBeenCalledTimes(3);
    expect(database.dbAll.mock.calls.every(([, params]) => params[0] === 7)).toBe(true);
  });

  it('should not delete a partner when a reference check fails', async () => {
    database.dbAll.mockRejectedValueOnce(new Error('Reference check failed'));

    await expect(deletePartner('Protected Partner')).rejects.toThrow('Reference check failed');
    expect(database.dbRun).not.toHaveBeenCalled();
  });

  it('should not delete a partner that has financial transactions', async () => {
    database.dbAll
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await deletePartner('Used Partner');

    expect(result.success).toBe(false);
    expect(database.dbRun).not.toHaveBeenCalled();
  });

  it('should wait for legacy partner migration before returning', async () => {
    database.dbAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    database.dbGet.mockResolvedValue({
      value: JSON.stringify({ partners: [{ name: 'Legacy Partner', phone: '123' }] })
    });
    let finishInsert;
    database.dbRun.mockReturnValue(new Promise(resolve => {
      finishInsert = resolve;
    }));

    let settled = false;
    const resultPromise = getSettingsPartners().then(result => {
      settled = true;
      return result;
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(settled).toBe(false);
    finishInsert({ success: true });
    const result = await resultPromise;
    expect(result).toEqual([{ id: null, name: 'Legacy Partner', phone: '123' }]);
  });

  it('should wait for legacy cashier migration before returning', async () => {
    database.dbAll.mockResolvedValue([]);
    database.dbGet.mockResolvedValue({
      value: JSON.stringify({ cashiers: [{ name: 'Legacy Cashier', activeUser: 'admin' }] })
    });
    let finishInsert;
    database.dbRun.mockReturnValue(new Promise(resolve => {
      finishInsert = resolve;
    }));

    let settled = false;
    const resultPromise = getCashiers().then(result => {
      settled = true;
      return result;
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(settled).toBe(false);
    finishInsert({ success: true });
    const result = await resultPromise;
    expect(result).toEqual([{ id: null, name: 'Legacy Cashier', active_user: 'admin' }]);
  });
});

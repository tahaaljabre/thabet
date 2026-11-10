const ExcelJS = require('exceljs');
const { createExcelReport, parseExcelDate } = require('../../main/services/excel.service');

describe('Excel report dates', () => {
  it('parses an ISO calendar date at UTC midnight without shifting to the previous day', () => {
    const date = parseExcelDate('2026-07-23');

    expect(date).toBeInstanceOf(Date);
    expect(date.toISOString()).toBe('2026-07-23T00:00:00.000Z');
  });

  it('preserves the requested calendar date after writing and reading an Excel workbook', async () => {
    const workbook = await createExcelReport({
      sheetName: 'Date Test',
      title: 'Date Test',
      columns: [{ key: 'date', header: 'Date', type: 'date' }],
      rows: [{ date: '2026-07-23' }]
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(buffer);

    expect(reopened.getWorksheet('Date Test').getCell('A7').value.toISOString())
      .toBe('2026-07-23T00:00:00.000Z');
  });
});

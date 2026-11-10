const ExcelJS = require('exceljs');
const path = require('path');

const COLORS = {
  primary: '7A1A22',
  primaryDark: '4A0F14',
  beige: 'F3E5D3',
  light: 'F8FAFC',
  border: 'D8C2AA',
  white: 'FFFFFF',
  red: 'C62828'
};

function safeFileName(value) {
  return String(value || 'report').replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').trim();
}

function addLogo(workbook, sheet, logo) {
  if (!logo || typeof logo !== 'string' || !logo.startsWith('data:image/')) return;
  const match = logo.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
  if (!match) return;
  const extension = match[1].toLowerCase() === 'png' ? 'png' : 'jpeg';
  const imageId = workbook.addImage({ buffer: Buffer.from(match[2], 'base64'), extension });
  sheet.addImage(imageId, { tl: { col: 0.15, row: 0.15 }, ext: { width: 90, height: 58 } });
}

function applyCellType(cell, type, currency) {
  if (type === 'date') cell.numFmt = 'yyyy-mm-dd';
  if (type === 'number') cell.numFmt = '#,##0.00';
  if (type === 'currency') cell.numFmt = `${currency ? `"${currency}"` : ''}#,##0.00;[Red]-${currency ? `"${currency}"` : ''}#,##0.00`;
}

function parseExcelDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return value;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  ) ? parsed : value;
}

async function createExcelReport(spec) {
  if (!spec || !Array.isArray(spec.columns) || !Array.isArray(spec.rows)) throw new Error('بيانات تقرير Excel غير صالحة');
  if (spec.columns.length < 1 || spec.columns.length > 40 || spec.rows.length > 100000) throw new Error('حجم تقرير Excel غير مسموح');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Thabit';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  const sheet = workbook.addWorksheet(String(spec.sheetName || 'التقرير').slice(0, 31), {
    views: [{ rightToLeft: spec.rtl !== false, state: 'frozen', ySplit: 6, activeCell: 'A7' }],
    pageSetup: {
      orientation: spec.columns.length > 6 ? 'landscape' : 'portrait',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 }
    },
    properties: { showGridLines: false }
  });

  const lastColumn = Math.max(spec.columns.length, 1);
  sheet.mergeCells(1, 1, 1, lastColumn);
  const companyCell = sheet.getCell(1, 1);
  companyCell.value = spec.companyName || '';
  companyCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: COLORS.primary } };
  companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, lastColumn);
  sheet.getCell(2, 1).value = [spec.address, spec.phone].filter(Boolean).join(' | ');
  sheet.getCell(2, 1).font = { name: 'Arial', size: 9, color: { argb: '64748B' } };
  sheet.getCell(2, 1).alignment = { horizontal: 'center' };

  sheet.mergeCells(3, 1, 3, lastColumn);
  sheet.getCell(3, 1).value = spec.title || 'تقرير';
  sheet.getCell(3, 1).font = { name: 'Arial', size: 15, bold: true, color: { argb: COLORS.white } };
  sheet.getCell(3, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
  sheet.getCell(3, 1).alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(3).height = 28;

  sheet.mergeCells(4, 1, 4, lastColumn);
  sheet.getCell(4, 1).value = spec.subtitle || '';
  sheet.getCell(4, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.light } };
  sheet.getCell(4, 1).font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.primaryDark } };
  sheet.getCell(4, 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sheet.getRow(4).height = 24;

  addLogo(workbook, sheet, spec.logo);

  const headerRowNumber = 6;
  const headerRow = sheet.getRow(headerRowNumber);
  spec.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: COLORS.primaryDark } } };
    sheet.getColumn(index + 1).width = Math.min(Math.max(Number(column.width) || 14, 8), 45);
  });
  headerRow.height = 30;

  spec.rows.forEach((data, rowIndex) => {
    const row = sheet.getRow(headerRowNumber + 1 + rowIndex);
    spec.columns.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      let value = Array.isArray(data) ? data[columnIndex] : data[column.key];
      if (column.type === 'date' && value) {
        value = parseExcelDate(value);
      } else if (column.type === 'number' || column.type === 'currency') {
        value = Number(value) || 0;
      }
      cell.value = value ?? '';
      cell.font = { name: 'Arial', size: 10, color: { argb: '1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowIndex % 2 ? 'FFF9F2' : COLORS.white } };
      cell.alignment = { horizontal: column.type === 'currency' || column.type === 'number' ? 'right' : 'center', vertical: 'middle', wrapText: true };
      cell.border = { bottom: { style: 'thin', color: { argb: COLORS.border } } };
      applyCellType(cell, column.type, spec.currency || '');
    });
    row.height = 22;
  });

  const firstDataRow = headerRowNumber + 1;
  const lastDataRow = headerRowNumber + spec.rows.length;
  if (spec.rows.length > 0) sheet.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: lastDataRow, column: lastColumn } };

  const totalRowNumber = lastDataRow + 1;
  if (spec.showTotals !== false) {
    const totalRow = sheet.getRow(totalRowNumber);
    totalRow.getCell(1).value = spec.totalLabel || 'الإجمالي';
    totalRow.getCell(1).font = { bold: true, color: { argb: COLORS.primary } };
    spec.columns.forEach((column, index) => {
      const cell = totalRow.getCell(index + 1);
      if (index > 0 && (column.total === true || (column.type === 'currency' && column.total !== false))) {
        cell.value = spec.rows.length ? { formula: `SUM(${cell.address.replace(/\d+$/, firstDataRow)}:${cell.address.replace(/\d+$/, lastDataRow)})` } : 0;
        applyCellType(cell, column.type, spec.currency || '');
      }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.beige } };
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: column.type === 'currency' ? COLORS.red : COLORS.primaryDark } };
      cell.border = { top: { style: 'medium', color: { argb: COLORS.primary } }, bottom: { style: 'double', color: { argb: COLORS.primary } } };
    });
    totalRow.height = 25;
  }

  const finalRowNumber = spec.showTotals === false ? Math.max(lastDataRow, headerRowNumber) : totalRowNumber;
  sheet.pageSetup.printArea = `A1:${sheet.getColumn(lastColumn).letter}${finalRowNumber}`;
  sheet.headerFooter.oddFooter = `&Cصفحة &P من &N`;
  return workbook;
}

async function saveExcelReport(spec, dialog) {
  const defaultName = `${safeFileName(spec.fileName || spec.title)}.xlsx`;
  const result = await dialog.showSaveDialog({
    title: 'حفظ تقرير Excel',
    defaultPath: path.join(require('electron').app.getPath('documents'), defaultName),
    filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
  });
  if (result.canceled || !result.filePath) return { success: false, canceled: true };
  const workbook = await createExcelReport(spec);
  await workbook.xlsx.writeFile(result.filePath);
  return { success: true, filePath: result.filePath };
}

module.exports = { createExcelReport, saveExcelReport, parseExcelDate };

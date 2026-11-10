import {
  getDashboardStats,
  printHtmlToPDF
} from '../../core/ipc.js';

export async function fetchDashboardStats(startDate, endDate) {
  return await getDashboardStats(startDate, endDate);
}

export async function generatePDF(html, format = 'A4') {
  return await printHtmlToPDF(html, format);
}

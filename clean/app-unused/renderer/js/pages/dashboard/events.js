import {
  fetchDashboardStats,
  generatePDF
} from './api.js';

import { showToast } from '../../core/notifications.js';
import { escapeHtml } from '../../core/dom.js';

let barChartInstance = null;
let doughnutChartInstance = null;
let lineChartInstance = null;

export async function initEvents() {
  // Bind UI buttons
  const btnRefresh = document.getElementById('btn-refresh-dash');
  if (btnRefresh) btnRefresh.addEventListener('click', loadDashboardData);

  const btnPrint = document.getElementById('btn-print-dash');
  if (btnPrint) btnPrint.addEventListener('click', printDashboard);

  // Set default dates: Start of current month to Today
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const formatDateStr = (date) => {
    let month = '' + (date.getMonth() + 1),
        day = '' + date.getDate(),
        year = date.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
  };

  const startInput = document.getElementById('dash-start-date');
  const endInput = document.getElementById('dash-end-date');

  if (startInput) startInput.value = formatDateStr(firstDay);
  if (endInput) endInput.value = formatDateStr(today);

  // Load stats initially
  await loadDashboardData();
}

async function loadDashboardData() {
  const startDate = document.getElementById('dash-start-date').value;
  const endDate = document.getElementById('dash-end-date').value;

  try {
    const res = await fetchDashboardStats(startDate, endDate);
    if (!res.success) {
      showToast('حدث خطأ أثناء جلب الإحصائيات: ' + res.error, 'error');
      console.error('Error loading dashboard stats:', res.error);
      return;
    }

    const stats = res.stats;

    // 1. Update summary cards
    const salesEl = document.getElementById('dash-val-totalsales');
    if (salesEl) salesEl.textContent = (window.appSettings?.currency || '฿') + stats.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 });
    
    const purchasesEl = document.getElementById('dash-val-totalpurchases');
    if (purchasesEl) purchasesEl.textContent = (window.appSettings?.currency || '฿') + stats.totalPurchases.toLocaleString('en-US', { minimumFractionDigits: 2 });

    const profitEl = document.getElementById('dash-val-profit');
    const deficitEl = document.getElementById('dash-val-deficit');
    
    if (stats.netProfit < 0) {
      if (deficitEl) deficitEl.textContent = (window.appSettings?.currency || '฿') + Math.abs(stats.netProfit).toLocaleString('en-US', { minimumFractionDigits: 2 });
      if (profitEl) profitEl.textContent = '${window.appSettings?.currency || '฿'}0.00';
    } else {
      if (deficitEl) deficitEl.textContent = '${window.appSettings?.currency || '฿'}0.00';
      if (profitEl) profitEl.textContent = (window.appSettings?.currency || '฿') + stats.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 });
    }

    const debtsEl = document.getElementById('dash-val-debts');
    if (debtsEl) debtsEl.textContent = (window.appSettings?.currency || '฿') + stats.totalSupplierDebts.toLocaleString('en-US', { minimumFractionDigits: 2 });
    
    const salariesEl = document.getElementById('dash-val-salaries');
    if (salariesEl) salariesEl.textContent = (window.appSettings?.currency || '฿') + stats.totalSalaries.toLocaleString('en-US', { minimumFractionDigits: 2 });

    const totalAllExpenses = stats.totalExpenses + stats.totalSalaries + (stats.totalPurchases || 0);
    const totalExpEl = document.getElementById('dash-val-total-expenses');
    if (totalExpEl) totalExpEl.textContent = (window.appSettings?.currency || '฿') + totalAllExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 });

    // Make sure Chart library is globally available (loaded in index.html)
    const Chart = window.Chart;
    if (!Chart) {
      console.error('Chart.js is not loaded globally.');
      return;
    }

    // 2. Bar Chart: Sales vs Expenses (Daily)
    const labels = stats.dailySales.map(d => d.date);
    const salesData = stats.dailySales.map(d => d.amount);
    const expensesData = stats.dailyExpenses.map(d => d.amount);

    if (barChartInstance) barChartInstance.destroy();
    const ctxBar = document.getElementById('barChart').getContext('2d');
    barChartInstance = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'المبيعات',
            data: salesData,
            backgroundColor: 'rgba(34, 197, 94, 0.7)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'المصروفات',
            data: expensesData,
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    // 3. Doughnut Chart: Expenses Distribution
    const expenseKeys = Object.keys(stats.expensesCategories);
    const expenseValues = Object.values(stats.expensesCategories);
    
    if (doughnutChartInstance) doughnutChartInstance.destroy();
    const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
    doughnutChartInstance = new Chart(ctxDoughnut, {
      type: 'doughnut',
      data: {
        labels: expenseKeys,
        datasets: [{
          data: expenseValues,
          backgroundColor: [
            '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'
          ],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right' }
        }
      }
    });

    // 4. Line Chart: Net Profit Over Time
    const profitData = labels.map((date, idx) => {
      return salesData[idx] - expensesData[idx];
    });

    if (lineChartInstance) lineChartInstance.destroy();
    const ctxLine = document.getElementById('lineChart').getContext('2d');
    lineChartInstance = new Chart(ctxLine, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'صافي الربح اليومي',
          data: profitData,
          fill: true,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgb(59, 130, 246)',
          tension: 0.4,
          pointBackgroundColor: 'rgb(59, 130, 246)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  } catch (err) {
    console.error(err);
    showToast('حدث خطأ غير متوقع أثناء تحديث لوحة التحكم', 'error');
  }
}

async function printDashboard() {
  const from = document.getElementById('dash-start-date').value;
  const to = document.getElementById('dash-end-date').value;
  
  let dateText = 'جميع البيانات';
  if (from && to) dateText = 'من ' + from + ' إلى ' + to;
  else if (from) dateText = 'من ' + from;
  else if (to) dateText = 'حتى ' + to;

  // Convert charts to images
  const barCanvas = document.getElementById('barChart');
  const doughnutCanvas = document.getElementById('doughnutChart');
  const lineCanvas = document.getElementById('lineChart');
  
  const barImg = barCanvas ? barCanvas.toDataURL('image/png') : '';
  const doughnutImg = doughnutCanvas ? doughnutCanvas.toDataURL('image/png') : '';
  const lineImg = lineCanvas ? lineCanvas.toDataURL('image/png') : '';

  // Clean cards HTML (using only styling)
  const summaryCardsNode = document.querySelector('.dash-summary-cards');
  const summaryCardsHtml = summaryCardsNode ? summaryCardsNode.innerHTML : '';

  // Construct HTML for printing
  const printHtml = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>طباعة الشاشة التفاعلية</title>
      <style>
        @page { size: A4 landscape; margin: 6mm; }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box;
        }
        body { font-family: 'Cairo', Tahoma, sans-serif; background: #fff; color: #000; padding: 5px; margin: 0; }
        h2 { text-align: center; margin: 0 0 2px 0; font-size: 18px; color: #1e293b; }
        h4 { text-align: center; margin: 0 0 10px 0; font-size: 12px; color: #64748b; }
        
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 12px;
        }
        .dash-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 12px;
          background: #f8fafc;
          display: flex;
          align-items: center;
          gap: 12px;
          direction: rtl;
        }
        .dash-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .dash-info {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          text-align: right;
        }
        .dash-info p {
          margin: 0;
          font-size: 10px;
          color: #64748b;
          font-weight: 600;
        }
        .dash-info h3 {
          margin: 2px 0 0 0;
          font-size: 14px;
          font-weight: bold;
          direction: ltr;
          text-align: left;
        }
        
        .charts-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        .chart-box {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px;
          background: #fff;
          text-align: center;
        }
        .chart-box.doughnut { flex: 1; }
        .chart-box.bar { flex: 2; }
        .chart-box h3 {
          margin: 0 0 6px 0;
          font-size: 12px;
          color: #334155;
          font-weight: 700;
        }
        .chart-box img {
          max-width: 100%;
          max-height: 200px;
          object-fit: contain;
          display: block;
          margin: 0 auto;
        }
        
        .line-chart-box {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px;
          background: #fff;
          text-align: center;
        }
        .line-chart-box h3 {
          margin: 0 0 6px 0;
          font-size: 12px;
          color: #334155;
          font-weight: 700;
        }
        .line-chart-box img {
          max-width: 100%;
          max-height: 120px;
          object-fit: contain;
          display: block;
          margin: 0 auto;
        }
      </style>
    </head>
    <body>
      <h2>الشاشة التفاعلية والإحصائيات</h2>
      <h4>الفترة: ${escapeHtml(dateText)}</h4>
      
      <div class="summary-cards">
        ${summaryCardsHtml}
      </div>
      
      <div class="charts-row">
        <div class="chart-box doughnut">
          <h3>توزيع المصروفات</h3>
          <img src="${doughnutImg}" />
        </div>
        <div class="chart-box bar">
          <h3>المبيعات مقابل المصروفات</h3>
          <img src="${barImg}" />
        </div>
      </div>
      
      <div class="line-chart-box" ${!lineImg ? 'style="display:none;"' : ''}>
        <h3>مسار الأرباح والإيرادات</h3>
        <img src="${lineImg}" />
      </div>
    </body>
    </html>
  `;

  try {
    await generatePDF(printHtml, 'A4');
    showToast('تم إرسال لوحة التحكم للطباعة بنجاح', 'success');
  } catch (err) {
    showToast('فشلت طباعة لوحة التحكم', 'error');
  }
}

let barChartInstance = null;
let doughnutChartInstance = null;
let lineChartInstance = null;

function renderDashboardCharts(stats) {
  // 2. Bar Chart: Sales vs Expenses (Daily)
  const labels = stats.dailySales.map(d => d.date);
  const salesData = stats.dailySales.map(d => d.amount);
  const expensesData = stats.dailyExpenses.map(d => d.amount);

  if (barChartInstance) {
    try { barChartInstance.destroy(); } catch (e) { console.error('Error destroying barChartInstance:', e); }
  }
  const canvasBar = document.getElementById('barChart');
  if (!canvasBar) {
    console.error("Canvas element 'barChart' is missing from DOM!");
    return;
  }
  const ctxBar = canvasBar.getContext('2d');
  barChartInstance = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: t('dashboard_sales_chart'),
          data: salesData,
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: t('dashboard_expenses_chart'),
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
      animation: false,
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
  
  if (doughnutChartInstance) {
    try { doughnutChartInstance.destroy(); } catch (e) { console.error('Error destroying doughnutChartInstance:', e); }
  }
  const canvasDoughnut = document.getElementById('doughnutChart');
  if (!canvasDoughnut) {
    console.error("Canvas element 'doughnutChart' is missing from DOM!");
    return;
  }
  const ctxDoughnut = canvasDoughnut.getContext('2d');
  doughnutChartInstance = new Chart(ctxDoughnut, {
    type: 'doughnut',
    data: {
      labels: expenseKeys.map(key => key.startsWith('dashboard_') ? t(key) : key),
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
      animation: false,
      plugins: {
        legend: { position: 'right' }
      }
    }
  });

  // 4. Line Chart: Revenue and accrual profit over time
  const profitData = labels.map((date, idx) => {
    return salesData[idx] - expensesData[idx];
  });

  if (lineChartInstance) {
    try { lineChartInstance.destroy(); } catch (e) { console.error('Error destroying lineChartInstance:', e); }
  }
  const canvasLine = document.getElementById('lineChart');
  if (!canvasLine) {
    console.error("Canvas element 'lineChart' is missing from DOM!");
    return;
  }
  const ctxLine = canvasLine.getContext('2d');
  lineChartInstance = new Chart(ctxLine, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: t('dashboard_revenue_chart'),
          data: salesData,
          fill: false,
          borderColor: 'rgb(34, 197, 94)',
          tension: 0.35,
          pointBackgroundColor: 'rgb(34, 197, 94)'
        },
        {
          label: t('dashboard_daily_net_profit'),
          data: profitData,
          fill: true,
          backgroundColor: 'rgba(59, 130, 246, 0.16)',
          borderColor: 'rgb(59, 130, 246)',
          tension: 0.35,
          pointBackgroundColor: 'rgb(59, 130, 246)'
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

window.renderDashboardCharts = renderDashboardCharts;

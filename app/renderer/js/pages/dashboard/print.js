async function printDashboard() {
  const fromElement = document.getElementById('dash-start-date');
  const toElement = document.getElementById('dash-end-date');
  const from = fromElement ? fromElement.value : '';
  const to = toElement ? toElement.value : '';
  
  let dateText = '\u062c\u0645\u064a\u0639 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a';
  if (from && to) dateText = '\u0645\u0646 ' + from + ' \u0625\u0644\u0649 ' + to;
  else if (from) dateText = '\u0645\u0646 ' + from;
  else if (to) dateText = '\u062d\u062a\u0649 ' + to;

  // Convert charts to images
  const barCanvas = document.getElementById('barChart');
  const doughnutCanvas = document.getElementById('doughnutChart');
  const lineCanvas = document.getElementById('lineChart');
  
  const barImg = barCanvas ? barCanvas.toDataURL('image/png') : '';
  const doughnutImg = doughnutCanvas ? doughnutCanvas.toDataURL('image/png') : '';
  
  // Optional: include the line chart if it exists, otherwise leave empty
  const lineImg = lineCanvas ? lineCanvas.toDataURL('image/png') : '';

  // Get summary cards HTML (clean up any non-print classes if needed)
  const summaryCardsNode = document.querySelector('.dash-summary-cards');
  const summaryCardsHtml = summaryCardsNode ? summaryCardsNode.innerHTML : '';

  // Construct HTML for printing
  const printHtml = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0634\u0627\u0634\u0629 \u0627\u0644\u062a\u0641\u0627\u0639\u0644\u064a\u0629</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 landscape; margin: 6mm; }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box;
        }
        body { font-family: 'Cairo', sans-serif; background: #fff; color: #000; padding: 5px; margin: 0; }
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
          direction: ${typeof window.currentLang === 'function' && window.currentLang() === 'en' ? 'ltr' : 'rtl'};
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
      <h2>\u0627\u0644\u0634\u0627\u0634\u0629 \u0627\u0644\u062a\u0641\u0627\u0639\u0644\u064a\u0629 \u0648\u0627\u0644\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a</h2>
      <h4>\u0627\u0644\u0641\u062a\u0631\u0629: ${dateText}</h4>
      
      <div class="summary-cards">
        ${summaryCardsHtml}
      </div>
      
      <div class="charts-row">
        <div class="chart-box doughnut">
          <h3>\u062a\u0648\u0632\u064a\u0639 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a</h3>
          <img src="${doughnutImg}" />
        </div>
        <div class="chart-box bar">
          <h3>\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0645\u0642\u0627\u0628\u0644 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a</h3>
          <img src="${barImg}" />
        </div>
      </div>
      
      <!-- Optional Line Chart at bottom -->
      <div class="line-chart-box" ${!lineImg ? 'style="display:none;"' : ''}>
        <h3>\u0645\u0633\u0627\u0631 \u0627\u0644\u0623\u0631\u0628\u0627\u062d \u0648\u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a</h3>
        <img src="${lineImg}" />
      </div>
    </body>
    </html>
  `;

  if (window.api && window.api.printHtmlToPDF) {
    // We pass the raw HTML string. The backend will render it and open PDF.
    window.api.printHtmlToPDF(printHtml, 'A4');
  } else {
    alert('\u062e\u0627\u0635\u064a\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631\u0629');
  }
}

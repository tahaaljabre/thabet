/**
 * Chart.js wrapper.
 */

export function initChart(canvasId, type, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Chart canvas #${canvasId} not found`);
    return null;
  }
  // Ensure Chart.js is loaded globally (already included via js/lib/chart.umd.js)
  if (typeof Chart === 'undefined') {
    console.error('Chart.js library not loaded');
    return null;
  }
  return new Chart(canvas, { type, data, options });
}

export function destroyChart(chartInstance) {
  if (chartInstance) {
    chartInstance.destroy();
  }
}

export async function exportExcelReport(spec) {
  if (!window.api?.exportExcelReport) throw new Error(window.t?.('excel_service_unavailable') || 'خدمة Excel غير متاحة');
  const settings = window.appSettings || {};
  const result = await window.api.exportExcelReport({
    rtl: typeof window.currentLang === 'function' ? window.currentLang() !== 'en' : true,
    companyName: settings.companyName || '',
    address: settings.address || '',
    phone: settings.phone || '',
    logo: settings.logo || '',
    currency: settings.currency || '',
    ...spec
  });
  if (result?.success && typeof window.showToast === 'function') window.showToast(window.t('excel_export_success'), 'success');
  return result;
}

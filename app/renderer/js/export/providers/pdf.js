export const pdfProvider = {
  type: 'pdf',
  label: 'PDF',
  available: true,
  async export(document = {}) {
    if (!window.api?.printToPDF) throw new Error('خدمة PDF غير متاحة');

    const payload = {
      html: document.html || '',
      title: document.title || 'Thabit Report',
      options: document.options || {}
    };
    return await window.api.printToPDF(payload);
  }
};

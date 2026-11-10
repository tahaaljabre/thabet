import { printProvider } from './providers/print.js';
import { pdfProvider } from './providers/pdf.js';
import { excelProvider } from './providers/excel.js';

const providers = new Map();

export function registerExportProvider(provider) {
  if (!provider?.type || typeof provider.export !== 'function') {
    throw new TypeError('Export provider must define a type and export function');
  }
  providers.set(provider.type, provider);
}

export function getExportProvider(type) {
  return providers.get(type) || null;
}

export function getAvailableExportTypes() {
  return Array.from(providers.values())
    .filter(provider => provider.available !== false)
    .map(provider => ({ type: provider.type, label: provider.label }));
}

export async function exportDocument(type, document) {
  const provider = getExportProvider(type);
  if (!provider) throw new Error(`نوع التصدير غير مسجل: ${type}`);
  if (provider.available === false) throw new Error(provider.unavailableMessage || 'نوع التصدير غير متاح حاليًا');
  return await provider.export(document);
}

export function initializeExportSystem() {
  registerExportProvider(printProvider);
  registerExportProvider(pdfProvider);
  registerExportProvider(excelProvider);

  window.thabitExport = Object.freeze({
    export: exportDocument,
    availableTypes: getAvailableExportTypes
  });
}

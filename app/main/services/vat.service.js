const DEFAULT_VAT_RATE = 15;

function normalizeVatSettings(settings = {}) {
  const rate = Number(settings.vatRate);
  return {
    vatEnabled: settings.vatEnabled === true,
    vatRate: Number.isFinite(rate) ? Math.min(100, Math.max(0, rate)) : DEFAULT_VAT_RATE
  };
}

function splitInclusiveVat(grossMinor, settings = {}) {
  const gross = Math.max(0, Math.round(Number(grossMinor) || 0));
  const normalized = normalizeVatSettings(settings);
  if (!normalized.vatEnabled || normalized.vatRate <= 0 || gross === 0) {
    return { grossMinor: gross, netMinor: gross, vatMinor: 0, rate: normalized.vatRate };
  }
  const rateBasisPoints = Math.round(normalized.vatRate * 100);
  const netMinor = Math.round((gross * 10000) / (10000 + rateBasisPoints));
  return {
    grossMinor: gross,
    netMinor,
    vatMinor: gross - netMinor,
    rate: normalized.vatRate
  };
}

module.exports = { DEFAULT_VAT_RATE, normalizeVatSettings, splitInclusiveVat };

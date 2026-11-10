const { normalizeVatSettings, splitInclusiveVat } = require('../../main/services/vat.service');

describe('VAT service', () => {
  test('uses a configurable inclusive VAT rate with exact minor-unit totals', () => {
    const result = splitInclusiveVat(11500, { vatEnabled: true, vatRate: 15 });
    expect(result).toEqual({
      grossMinor: 11500,
      netMinor: 10000,
      vatMinor: 1500,
      rate: 15
    });
  });

  test('supports non-standard decimal rates', () => {
    const result = splitInclusiveVat(10750, { vatEnabled: true, vatRate: 7.5 });
    expect(result.netMinor + result.vatMinor).toBe(10750);
    expect(result.rate).toBe(7.5);
  });

  test('does not extract VAT when disabled and safely normalizes the rate', () => {
    expect(splitInclusiveVat(5000, { vatEnabled: false, vatRate: 20 }).vatMinor).toBe(0);
    expect(normalizeVatSettings({ vatEnabled: true, vatRate: 150 }).vatRate).toBe(100);
  });
});

import { formatRupiah, formatSigned } from '../currency';

describe('formatRupiah', () => {
  test('groups thousands with a dot separator', () => {
    expect(formatRupiah(8420000)).toBe('Rp8.420.000');
  });

  test('rounds fractional amounts', () => {
    expect(formatRupiah(1999.6)).toBe('Rp2.000');
  });

  test('treats negative amounts as their absolute value', () => {
    expect(formatRupiah(-3240000)).toBe('Rp3.240.000');
  });

  test('formats small amounts without separators', () => {
    expect(formatRupiah(500)).toBe('Rp500');
  });
});

describe('formatSigned', () => {
  test('prefixes positive amounts with a plus sign', () => {
    expect(formatSigned(68000)).toBe('+Rp68.000');
  });

  test('prefixes negative amounts with a minus sign and drops the raw negative', () => {
    expect(formatSigned(-68000)).toBe('−Rp68.000');
  });
});

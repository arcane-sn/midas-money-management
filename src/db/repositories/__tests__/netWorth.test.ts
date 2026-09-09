import { computeNetWorth } from '../netWorth';

describe('computeNetWorth', () => {
  test('sums assets and liabilities separately, and nets them together', () => {
    const result = computeNetWorth([
      { kind: 'assets', balance: 8420000 },
      { kind: 'assets', balance: 640000 },
      { kind: 'liabilities', balance: -3240000 },
      { kind: 'liabilities', balance: -9600000 },
    ]);
    expect(result.assetsTotal).toBe(9060000);
    expect(result.liabilitiesTotal).toBe(-12840000);
    expect(result.netWorth).toBe(-3780000);
  });

  test('returns zeros for an empty account list', () => {
    expect(computeNetWorth([])).toEqual({ assetsTotal: 0, liabilitiesTotal: 0, netWorth: 0 });
  });
});

import { computeSpent, computeRemain, isLocked, isTight, percentSpent, findBudgetFor, RAISE_INCREMENT } from '../budgetLogic';

describe('computeSpent', () => {
  test('adds matching expense sum on top of the pre-tracking baseline', () => {
    expect(computeSpent(332000, 68000)).toBe(400000);
  });
});

describe('computeRemain', () => {
  test('subtracts spent from limit plus any raise', () => {
    expect(computeRemain(400000, 0, 400000)).toBe(0);
    expect(computeRemain(400000, RAISE_INCREMENT, 400000)).toBe(RAISE_INCREMENT);
  });
});

describe('isLocked', () => {
  test('locks exactly at zero remaining', () => {
    expect(isLocked(0)).toBe(true);
  });
  test('locks when overspent', () => {
    expect(isLocked(-1)).toBe(true);
  });
  test('does not lock while there is remaining budget', () => {
    expect(isLocked(1)).toBe(false);
  });
});

describe('isTight', () => {
  test('is tight below 15% of the limit remaining', () => {
    expect(isTight(50000, 400000)).toBe(true); // 12.5%
  });
  test('is not tight at or above 15%', () => {
    expect(isTight(60000, 400000)).toBe(false); // 15%
  });
  test('a locked budget is never reported as merely tight', () => {
    expect(isTight(0, 400000)).toBe(false);
  });
});

describe('percentSpent', () => {
  test('caps the reported percentage at 100 when overspent', () => {
    expect(percentSpent(500000, 400000)).toBe(100);
  });
  test('rounds to the nearest percent', () => {
    expect(percentSpent(332000, 400000)).toBe(83);
  });
});

describe('findBudgetFor', () => {
  const budgets = [
    { id: 'b1', categoryId: 'food-drink', subcategoryId: 'food-drink__coffee' },
    { id: 'b4', categoryId: 'transport', subcategoryId: null },
  ];

  test('matches an exact category + sub-category budget first', () => {
    expect(findBudgetFor(budgets, 'food-drink', 'food-drink__coffee')?.id).toBe('b1');
  });

  test('falls back to the whole-category budget when no exact sub-category match exists', () => {
    expect(findBudgetFor(budgets, 'transport', 'transport__fuel')?.id).toBe('b4');
  });

  test('returns null when neither an exact nor a category-level budget exists', () => {
    expect(findBudgetFor(budgets, 'home', 'home__rent')).toBeNull();
  });
});

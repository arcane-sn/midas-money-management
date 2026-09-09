import { startOfWeekISO, endOfWeekISO } from '../date';

describe('startOfWeekISO / endOfWeekISO', () => {
  test('a Wednesday resolves to the Monday-Sunday week containing it', () => {
    // 2026-09-09 is a Wednesday
    expect(startOfWeekISO('2026-09-09')).toBe('2026-09-07');
    expect(endOfWeekISO('2026-09-09')).toBe('2026-09-13');
  });

  test('a Monday is its own week start', () => {
    expect(startOfWeekISO('2026-09-07')).toBe('2026-09-07');
  });

  test('a Sunday is its own week end', () => {
    expect(endOfWeekISO('2026-09-13')).toBe('2026-09-13');
    expect(startOfWeekISO('2026-09-13')).toBe('2026-09-07');
  });

  test('a week can span across a month boundary', () => {
    // 2026-08-31 is a Monday
    expect(startOfWeekISO('2026-09-01')).toBe('2026-08-31');
    expect(endOfWeekISO('2026-08-31')).toBe('2026-09-06');
  });
});

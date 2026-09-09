import { groupDigits, sanitizeDigits } from '../digits';

describe('groupDigits', () => {
  test('groups thousands with a dot separator', () => {
    expect(groupDigits('8420000')).toBe('8.420.000');
  });
  test('returns "0" for an empty string', () => {
    expect(groupDigits('')).toBe('0');
  });
  test('leaves short digit strings unseparated', () => {
    expect(groupDigits('42')).toBe('42');
  });
});

describe('sanitizeDigits', () => {
  test('strips non-digit characters', () => {
    expect(sanitizeDigits('1.234abc')).toBe('1234');
  });
  test('drops leading zeros but keeps a lone zero', () => {
    expect(sanitizeDigits('007')).toBe('7');
    expect(sanitizeDigits('0')).toBe('0');
  });
});

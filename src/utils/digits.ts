export function groupDigits(digits: string): string {
  if (!digits) return '0';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function sanitizeDigits(value: string): string {
  return value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
}

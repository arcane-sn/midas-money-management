export function formatRupiah(amount: number): string {
  const rounded = Math.round(Math.abs(amount));
  const grouped = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp${grouped}`;
}

export function formatSigned(amount: number): string {
  const sign = amount < 0 ? '−' : '+';
  return `${sign}${formatRupiah(amount)}`;
}

// Shared Rupiah formatter (no DB / UI dependencies).
// fmtRupiah(10000) -> 'Rp 10.000,00'; negatives -> '-Rp 5.000,00'; null/undefined/NaN -> 'Rp 0,00'.

const nf = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function fmtRupiah(n) {
  const v = Number(n ?? 0)
  const x = Number.isFinite(v) ? v : 0
  const s = nf.format(Math.abs(x))
  return (x < 0 && s !== nf.format(0) ? '-' : '') + 'Rp ' + s
}

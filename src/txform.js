// Pure state + validation logic for the "Transaksi Baru" form (no UI).
export const TYPES = ['expense', 'income', 'transfer']

export const MSG = {
  amount: 'Nominal harus lebih dari 0.',
  dateEmpty: 'Tanggal wajib diisi.',
  dateInvalid: 'Tanggal tidak valid.',
  account: 'Akun wajib dipilih.',
  fromAccount: 'Akun asal wajib dipilih.',
  toAccount: 'Akun tujuan wajib dipilih.',
  sameAccount: 'Akun tujuan tidak boleh sama dengan akun asal.',
  category: 'Kategori wajib dipilih.',
  saveFailed: 'Transaksi gagal disimpan. Silakan coba lagi.',
}

const pad = n => String(n).padStart(2, '0')
export const todayLocal = (now = new Date()) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

export const initialState = (today = todayLocal()) => ({
  type: 'expense', amount: '', date: today,
  accountId: null, fromAccountId: null, toAccountId: null,
  categoryId: null, subCategoryId: null,
})

const blank = v => v === null || v === undefined || v === ''

// true only for a real calendar date in YYYY-MM-DD form (rejects e.g. 2026-02-31)
export function isValidDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s))
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
}

// Returns { field: message }; empty object means valid. Future dates are allowed.
export function validate(state) {
  const e = {}
  const amount = typeof state.amount === 'string' ? state.amount.trim() : state.amount
  const n = blank(amount) ? NaN : Number(amount)
  if (!Number.isFinite(n) || n <= 0) e.amount = MSG.amount

  const date = typeof state.date === 'string' ? state.date.trim() : state.date
  if (blank(date)) e.date = MSG.dateEmpty
  else if (!isValidDate(date)) e.date = MSG.dateInvalid

  if (state.type === 'transfer') {
    if (blank(state.fromAccountId)) e.fromAccountId = MSG.fromAccount
    if (blank(state.toAccountId)) e.toAccountId = MSG.toAccount
    else if (!blank(state.fromAccountId) && String(state.fromAccountId) === String(state.toAccountId)) e.toAccountId = MSG.sameAccount
  } else {
    if (blank(state.accountId)) e.accountId = MSG.account
    if (blank(state.categoryId)) e.categoryId = MSG.category
  }
  return e
}

export const isValid = state => Object.keys(validate(state)).length === 0

// Reducer. Actions: setType, setCategory, set {field,value}, reset.
export function reduce(state, action) {
  switch (action.type) {
    case 'setType':
      if (!TYPES.includes(action.value) || action.value === state.type) return state
      return { ...state, type: action.value, categoryId: null, subCategoryId: null }
    case 'setCategory':
      if (String(action.value ?? '') === String(state.categoryId ?? '')) return state
      return { ...state, categoryId: action.value ?? null, subCategoryId: null }
    case 'set':
      if (action.field === 'type') return reduce(state, { type: 'setType', value: action.value })
      if (action.field === 'categoryId') return reduce(state, { type: 'setCategory', value: action.value })
      return { ...state, [action.field]: action.value }
    case 'reset':
      return initialState(action.today)
    default:
      return state
  }
}

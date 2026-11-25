// Category name (top-level) -> inline SVG icon (24x24, stroke = currentColor). Unknown names fall back to a tag icon.
const CATEGORY_ICONS = {
  Food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2.2 1.5-3 4-3 7v3h3"/>',
  Transport: '<path d="M5 16V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8H5zM5 12h14M8 19v2M16 19v2"/><circle cx="8.5" cy="15" r=".6"/><circle cx="15.5" cy="15" r=".6"/>',
  Shopping: '<path d="M6 7h12l1 13H5L6 7zM9 10V6a3 3 0 0 1 6 0v4"/>',
  Bills: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6"/>',
  Transfer: '<path d="M4 8h14m-4-4 4 4-4 4M20 16H6m4-4-4 4 4 4"/>',
  Income: '<path d="M12 20V6m-6 6 6-6 6 6"/>',
  Saving: '<path d="M4 20h16M6 20v-7M12 20V8M18 20v-4M5 9l5-4 4 3 5-4"/>',
  Family: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-1a5 5 0 0 1 10 0v1M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1"/>',
  Heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
  Work: '<path d="M4 8h16v11H4V8zM9 8V5h6v3M4 13h16"/>',
  Home: '<path d="M4 11l8-7 8 7v9H5v-9zM10 20v-6h4v6"/>',
  Health: '<path d="M12 5v14M5 12h14"/>',
  Education: '<path d="M2 9l10-5 10 5-10 5L2 9zM6 11v5c3 2 9 2 12 0v-5"/>',
  Fun: '<path d="M5 8h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-3l-2-2h-4l-2 2H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zM8 10v4M6 12h4"/>',
  Gift: '<path d="M4 11h16v9H4v-9zM3 8h18v3H3V8zM12 8v12M12 8c-3 0-4-4-1-4 2 0 1 4 1 4zm0 0c3 0 4-4 1-4-2 0-1 4-1 4z"/>',
  User: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  _default: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1"/>',
}
// Selectable icons (value stored in categories.icon) -> label + path.
const ICON_CHOICES = {
  tag: ['Tag', CATEGORY_ICONS._default],
  food: ['Food', CATEGORY_ICONS.Food],
  transport: ['Transport', CATEGORY_ICONS.Transport],
  shopping: ['Shopping', CATEGORY_ICONS.Shopping],
  bills: ['Bills', CATEGORY_ICONS.Bills],
  transfer: ['Transfer', CATEGORY_ICONS.Transfer],
  income: ['Income', CATEGORY_ICONS.Income],
  saving: ['Saving', CATEGORY_ICONS.Saving],
  family: ['Family', CATEGORY_ICONS.Family],
  heart: ['Heart', CATEGORY_ICONS.Heart],
  work: ['Work', CATEGORY_ICONS.Work],
  home: ['Home', CATEGORY_ICONS.Home],
  health: ['Health', CATEGORY_ICONS.Health],
  education: ['Education', CATEGORY_ICONS.Education],
  fun: ['Fun', CATEGORY_ICONS.Fun],
  gift: ['Gift', CATEGORY_ICONS.Gift],
  user: ['Person', CATEGORY_ICONS.User],
}
// Keyword guess for categories still on the default tag icon (first match wins).
const ICON_GUESS = [
  [/sav|invest|tabung/i, 'Saving'], [/family|keluarga/i, 'Family'], [/girl|boy|love|pacar|partner/i, 'Heart'],
  [/admin|work|salary|gaji|office|kerja/i, 'Work'], [/solo|personal|me\b/i, 'User'], [/home|rent|kost|house/i, 'Home'],
  [/health|medic|doctor|gym/i, 'Health'], [/educ|school|course|book/i, 'Education'], [/game|fun|movie|hobby|entertain/i, 'Fun'],
  [/gift|donat|charity|zakat/i, 'Gift'], [/food|eat|makan|coffee|grocer/i, 'Food'], [/transport|fuel|bensin|ojek|grab|gojek/i, 'Transport'],
  [/shop|belanja/i, 'Shopping'], [/bill|tagihan|utilit|pulsa|internet/i, 'Bills'], [/transfer/i, 'Transfer'], [/income|bonus|interest/i, 'Income'],
]
// categoryIcon(name, icon): a chosen icon (non-default key) wins; otherwise map from the name.
function categoryIcon(name, icon) {
  const chosen = icon && icon !== 'tag' ? ICON_CHOICES[icon]?.[1] : null
  const guess = ICON_GUESS.find(([re]) => re.test(name || ''))?.[1]
  const p = chosen ?? CATEGORY_ICONS[name] ?? CATEGORY_ICONS[guess] ?? CATEGORY_ICONS._default
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`
}

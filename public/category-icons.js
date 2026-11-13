// Category name (top-level) -> inline SVG icon (24x24, stroke = currentColor). Unknown names fall back to a tag icon.
const CATEGORY_ICONS = {
  Food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2.2 1.5-3 4-3 7v3h3"/>',
  Transport: '<path d="M5 16V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8H5zM5 12h14M8 19v2M16 19v2"/><circle cx="8.5" cy="15" r=".6"/><circle cx="15.5" cy="15" r=".6"/>',
  Shopping: '<path d="M6 7h12l1 13H5L6 7zM9 10V6a3 3 0 0 1 6 0v4"/>',
  Bills: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6"/>',
  Transfer: '<path d="M4 8h14m-4-4 4 4-4 4M20 16H6m4-4-4 4 4 4"/>',
  Income: '<path d="M12 20V6m-6 6 6-6 6 6"/>',
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
}
// categoryIcon(name, icon): a chosen icon (non-default key) wins; otherwise map from the name.
function categoryIcon(name, icon) {
  const chosen = icon && icon !== 'tag' ? ICON_CHOICES[icon]?.[1] : null
  const p = chosen ?? CATEGORY_ICONS[name] ?? CATEGORY_ICONS._default
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`
}

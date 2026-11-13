// Categories screen (More > Categories, design v2 `isCategories`): read/display part.
// Loaded as a classic script in the browser and importable in node tests; exposes globalThis.CategoriesView.
// Input is the flat list from GET /api/categories: { id, name, kind, parent_id }.
;(function () {
  const defEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  const TYPES = [['expense', 'Expense'], ['income', 'Income']]

  // Top-level categories of a type, each with its subs; "Uncategorized / Other" (is_system) last.
  function tree(cats, type) {
    return cats.filter(c => c.kind === type && !c.parent_id)
      .map(c => ({ ...c, subs: cats.filter(s => s.parent_id === c.id) }))
      .sort((a, b) => (a.is_system ? 1 : 0) - (b.is_system ? 1 : 0))
  }

  // Segmented Expense / Income tabs. Buttons carry data-a="sKind" + data-v.
  const tabs = type => `<div class="seg" role="tablist">${TYPES.map(([k, l]) =>
    `<button role="tab" aria-selected="${type === k}" data-a="sKind" data-v="${k}" class="${type === k ? 'on' : ''}">${l}</button>`).join('')}</div>`

  function render({ cats, type, icon = () => '', esc = defEsc }) {
    const list = tree(cats, type)
    const rows = list.length
      ? list.map(c => {
        const n = c.subs.length
        const subs = n ? `<small>${c.subs.map(s => esc(s.name)).join(', ')}</small>` : ''
        return `<div class="row cat-row"${c.is_system ? '' : ` data-a="catEdit" data-id="${c.id}"`}><div class="ico" aria-hidden="true">${icon(c.name, c.icon)}</div>` +
          `<div class="n"><span>${esc(c.name)}</span>${subs}</div>${n ? `<span class="badge" aria-label="${n} sub-kategori">${n}</span>` : '<span></span>'}</div>`
      }).join('')
      : '<div class="empty">Belum ada kategori.</div>'
    return tabs(type) + rows
  }

  globalThis.CategoriesView = { tree, render }
})()

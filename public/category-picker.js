// Category / sub-category picker for the "Transaksi Baru" form (design v2 state `showCats`).
// Loaded as a classic script in the browser and importable in node tests; exposes globalThis.CategoryPicker.
;(function () {
  const G = '#1e5a43', INK = '#16211c', MUTED = '#6f7a73', LINE = '#ecebe4', MINT = '#e4f1e9'
  const defEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

  // Top-level categories matching the transaction type (transfer has none).
  const categoryOptions = (cats, type) => type === 'transfer' ? [] : cats.filter(c => c.kind === type && !c.parent_id)
  // Only sub-categories of the selected category; empty while no category is chosen.
  const subOptions = (cats, catId) => catId ? cats.filter(c => c.parent_id === catId) : []
  // Changing the category clears the sub-category.
  const selectCategory = (sel, id) => sel.cat === id ? sel : { cat: id, sub: null }
  // Tapping the selected sub-category again deselects it; a sub must belong to the current category.
  const selectSub = (sel, id, cats) => {
    if (!sel.cat || !subOptions(cats, sel.cat).some(s => s.id === id)) return sel
    return { ...sel, sub: sel.sub === id ? null : id }
  }

  // HTML for the picker. Buttons carry data-nf="cat"/"sub" + data-v=<id>.
  function render({ cats, type, cat, sub, error = '', icon = () => '', esc = defEsc }) {
    if (type === 'transfer') return ''
    const list = categoryOptions(cats, type), subs = subOptions(cats, cat)
    const sel = cats.find(c => c.id === cat)
    const pill = on => `border:1px solid ${on ? G : LINE};background:${on ? MINT : '#fff'};color:${on ? G : INK}`
    const grid = list.map(c => {
      const on = cat === c.id
      return `<button data-nf="cat" data-v="${c.id}" aria-pressed="${on}" style="display:flex;flex-direction:column;align-items:flex-start;gap:8px;min-height:84px;padding:12px;border-radius:16px;border:1.5px solid ${on ? G : LINE};background:${on ? MINT : '#fff'};font-size:12px;font-weight:600;text-align:left;line-height:1.25"><span style="width:32px;height:32px;border-radius:50%;background:${on ? G : MINT};color:${on ? '#fff' : G};display:flex;align-items:center;justify-content:center">${icon(c.name)}</span>${esc(c.name)}</button>`
    }).join('')
    const subHtml = subs.length
      ? `<div style="font-size:13px;color:${MUTED};margin:16px 0 8px">${esc(sel.name)}</div><div style="display:flex;flex-wrap:wrap;gap:8px">${subs.map(s => `<button data-nf="sub" data-v="${s.id}" aria-pressed="${sub === s.id}" style="height:36px;padding:0 14px;border-radius:999px;font-size:13px;font-weight:500;${pill(sub === s.id)}">${esc(s.name)}</button>`).join('')}</div>`
      : ''
    const errHtml = error ? `<div role="alert" style="color:#c0392b;font-size:12px;margin-top:6px">${esc(error)}</div>` : ''
    return `<div style="padding:20px 20px 0"><div style="font-size:14px;font-weight:700;margin-bottom:10px">Kategori</div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${grid}</div>${errHtml}${subHtml}</div>`
  }

  globalThis.CategoryPicker = { categoryOptions, subOptions, selectCategory, selectSub, render }
})()

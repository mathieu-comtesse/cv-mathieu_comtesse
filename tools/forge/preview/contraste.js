(function () {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 } }
  const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4) }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b) }
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 })
  const fond = (el) => { let pile = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none' && !/^linear-gradient\(transparent/.test(cs.backgroundImage)) { pile.push('IMG'); break } const c = parse(cs.backgroundColor); if (c && c.a > 0) { pile.push(c); if (c.a >= 1) break } } let res = { r: 255, g: 255, b: 255, a: 1 }; for (let i = pile.length - 1; i >= 0; i--) { if (pile[i] === 'IMG') return null; res = over(pile[i], res) } return res }
  const vus = new Set(), mauvais = []
  const racine = document.querySelector('main') || document.body
  const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT)
  while (w.nextNode()) {
    const t = w.currentNode, txt = t.textContent.trim(); if (!txt) continue
    const el = t.parentElement; if (!el || vus.has(el)) continue; vus.add(el)
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue
    if (el.closest('[hidden],script,style,noscript,.shade-bar')) continue
    const fg = parse(cs.color), bg = fond(el); if (!fg || !bg) continue
    const f = over(fg, bg), l1 = lum(f), l2 = lum(bg), ratio = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05)
    const gros = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && parseInt(cs.fontWeight) >= 700)
    if (ratio < (gros ? 3 : 4.5)) mauvais.push([ratio.toFixed(2), el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ').join('.') : ''), txt.slice(0, 50), cs.color, 'sur', 'rgb(' + [bg.r, bg.g, bg.b].map(Math.round) + ')'])
  }
  return JSON.stringify({ theme: document.documentElement.dataset.theme, n: mauvais.length, ex: mauvais.slice(0, 40) })
})()

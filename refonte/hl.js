// Coloration légère des extraits de code des études (JavaScript, TypeScript, PowerShell, DAX, Power Query, texte).
const KW = {
  js: 'function return if else for while do const let var new try catch throw continue break await async typeof of in switch case import export from null true false undefined this',
  powershell: 'function param if else elseif foreach for while return throw try catch finally switch continue break begin process end',
  dax: 'EVALUATE VAR RETURN MEASURE ORDER BY IN NOT TRUE FALSE',
  powerquery: 'let in each if then else and or not null true false type',
  text: '',
};
KW.ts = KW.js;
const C_SLASH = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/;
const COMMENT = { js: C_SLASH, ts: C_SLASH, powershell: /<#[\s\S]*?#>|#[^\n]*/, dax: /--[^\n]*|\/\/[^\n]*/, powerquery: /\/\/[^\n]*/, text: /\/\/[^\n]*/ };
const STRING = /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/;
const NUMBER = /\b\d+(?:[.,]\d+)?\b/;
const WORD = /[A-Za-z_][\w-]*/;
const FUNCS = /^(CALCULATE|CALCULATETABLE|FILTER|SUMMARIZE|SELECTCOLUMNS|ROUND|SUM|COUNTROWS|DISTINCTCOUNT|DIVIDE|FORMAT|MIN|ISBLANK|COALESCE|TODAY)$/;
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
for (const code of document.querySelectorAll('.rf-code code[data-lang]')) {
  const lang = code.dataset.lang, words = new Set((KW[lang] || '').split(' ').filter(Boolean));
  const re = new RegExp('(' + (COMMENT[lang] || C_SLASH).source + ')|(' + STRING.source + ')|(' + NUMBER.source + ')|(' + WORD.source + ')', 'g');
  // chaque ligne est un élément numéroté (.ln) : on colore ligne par ligne
  for (const ln of code.querySelectorAll('.ln')) {
    const src = ln.textContent;
    let out = '', last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index)); last = re.lastIndex;
      const t = esc(m[0]);
      if (m[1]) out += '<span class="hl-c">' + t + '</span>';
      else if (m[2]) out += '<span class="hl-s">' + t + '</span>';
      else if (m[3]) out += '<span class="hl-n">' + t + '</span>';
      else if (words.has(m[4]) || (lang === 'dax' && FUNCS.test(m[4].toUpperCase()))) out += '<span class="hl-k">' + t + '</span>';
      else out += t;
    }
    ln.innerHTML = out + esc(src.slice(last));
  }
}

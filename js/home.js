import { PRO_CARDS, PERSO_CARDS, UNIV, CV } from './projects-data.js?v=ce185e0';
import { playFullscreen } from './play.js?v=ce185e0';
import { dbtn } from './dbtn.js?v=ce185e0';
import { initHoverDiagrams } from './hoverdiag.js?v=ce185e0';
import { initFlip } from './flip.js?v=ce185e0';
import { initFlipText } from './fliptext.js?v=ce185e0';
import { createMarquee } from './marquee.js?v=ce185e0';

// le site s'adresse à « vous » : on écarte les phrases à la 1re personne des textes repris du CV
const vous = (t) => String(t || '').split(/(?<=[.!?])\s+/).filter((x) => !/\b(j[’']|je|mon|ma|mes|moi)\b/i.test(x)).join(' ');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function card(p, i, kind) {
  return `<button class="pc ${kind}" type="button" data-i="${i}" data-k="${kind}" aria-label="${esc(p.title)}">
    <span class="pc-img${p.pixel ? ' px' : ''}" style="background-image:url('${p.img}')"></span>
    <span class="pc-body"><b>${esc(p.title)}</b><span class="pc-sub">${esc(p.sub)}</span>
    ${kind === 'pro' ? `<span class="pc-gains"><small>Gains</small><strong>${esc(p.time)}</strong><strong class="m">${esc(p.money)}</strong><em>${esc(p.timeCtx)}</em></span>` : ''}</span></button>`;
}

/* fiche synthétique d'un projet : image, gain, trois lignes ; Échap ou clic à côté pour fermer */
function initDetail() {
  const ov = document.createElement('div'); ov.className = 'detail'; ov.hidden = true;
  ov.innerHTML = '<div class="detail-card" role="dialog" aria-modal="true"><button class="detail-x" type="button" aria-label="Fermer">×</button><div class="detail-img"></div><div class="detail-txt"></div></div>';
  document.body.append(ov);
  const img = ov.querySelector('.detail-img'), txt = ov.querySelector('.detail-txt');
  const close = () => { ov.classList.remove('on'); setTimeout(() => { ov.hidden = true; }, 220); document.body.classList.remove('lock'); };
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.closest('.detail-x')) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !ov.hidden) close(); });
  return (p, kind) => {
    img.style.backgroundImage = `url('${p.img}')`; img.classList.toggle('px', !!p.pixel);
    if (kind === 'pro') {
      const d = p.pro;
      txt.innerHTML = `<p class="k">Projet professionnel</p><h3>${esc(p.title)}</h3><p class="s">${esc(p.sub)}</p>
        <div class="g"><small>Gains</small><strong>${esc(p.time)}</strong><span>${esc(p.timeCtx)}</span><strong class="m">${esc(p.money)}</strong><span>${esc(p.moneyCtx)}</span></div>
        ${d && vous(d.lead) ? `<p>${esc(vous(d.lead))}</p>` : ''}${d && vous(d.gain) ? `<p><b>Gain.</b> ${esc(vous(d.gain))}</p>` : ''}${d && vous(d.team) ? `<p><b>Pour l’équipe.</b> ${esc(vous(d.team))}</p>` : ''}`;
    } else {
      txt.innerHTML = `<p class="k">Projet personnel · ${esc(p.sub)}</p><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p><p>${dbtn('Jouer', { tag: 'a', href: CV + p.url })}</p>`;
    }
    ov.hidden = false; requestAnimationFrame(() => ov.classList.add('on')); document.body.classList.add('lock');
    ov.querySelector('.detail-x').focus();
  };
}

function initUniv() {
  const host = document.getElementById('univ'); if (!host) return;
  host.innerHTML = `<button class="univ-card" type="button" aria-label="Jouer à ${esc(UNIV.title)}"><span class="univ-img" style="background-image:url('${UNIV.img}')"></span>
    <span class="univ-txt"><span class="k">Projet universitaire · ${esc(UNIV.sub)}</span><h3>${esc(UNIV.title)}</h3><p>${esc(UNIV.desc)}</p>${dbtn('Jouer en plein écran')}</span></button>`;
  host.querySelector('.univ-card').addEventListener('click', () => playFullscreen(CV + UNIV.url, UNIV.title));
  initHoverDiagrams(host, [UNIV], { sel: '.univ-card', kicker: 'CONSTRUIT AVEC' });
}

export function initHome() {
  initUniv();
  initFlipText(); initFlip();
  const open = initDetail();
  for (const [id, list, kind, dir] of [['mq-pro', PRO_CARDS, 'pro', 1], ['mq-perso', PERSO_CARDS, 'perso', -1]]) {
    const root = document.getElementById(id); if (!root) continue;
    root.innerHTML = `<div class="mq-track">${list.map((p, i) => card(p, i, kind)).join('')}</div>`;
    root.addEventListener('click', (e) => { const b = e.target.closest('.pc'); if (b) open(list[+b.dataset.i], kind); });
    createMarquee(root);
    initHoverDiagrams(root, list, kind === 'pro' ? {} : { kicker: 'CONSTRUIT AVEC' });
  }
}

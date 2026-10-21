import { initProjectFigures } from './project-figures.js?v=cv-light-v19';
import { initPiggyBank } from './piggy-bank.js?v=cv-scene-v64';
import { ANNUAL_GAINS, ANNUAL_TOTAL, ANNUAL_DECLARED, ANNUAL_ESTIMATED, ANNUAL_COST, ANNUAL_NET, HOURS_PER_FTE, calendarGainState, rollGainHistory } from './annual-gains.js?v=cv-scene-v59';
import { PRO_CARDS, PERSO_CARDS, UNIV, CV } from './projects-data.js?v=cv-projects-v20';
import { playFullscreen } from './play.js?v=bf01a16';
import { dbtn } from './dbtn.js?v=bf01a16';
import { initHoverDiagrams } from './hoverdiag.js?v=bf01a16';
import { initFlip } from './flip.js?v=bf01a16';
import { initFlipText } from './fliptext.js?v=bf01a16';
import { createMarquee } from './marquee.js?v=cv-projects-v15';

// Les descriptions parlent de Mathieu à la troisième personne et restent complètes.
const texteProjet = (t) => String(t || '');
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
        ${d && texteProjet(d.lead) ? `<p>${esc(texteProjet(d.lead))}</p>` : ''}${d && texteProjet(d.gain) ? `<p><b>Gain.</b> ${esc(texteProjet(d.gain))}</p>` : ''}${d && texteProjet(d.team) ? `<p><b>Pour l’équipe.</b> ${esc(texteProjet(d.team))}</p>` : ''}`;
    } else {
      txt.innerHTML = `<p class="k">Projet personnel · ${esc(p.sub)}</p><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p><p>${dbtn(p.cta || 'Jouer', { tag: 'a', href: CV + p.url })}</p>`;
    }
    ov.hidden = false; requestAnimationFrame(() => ov.classList.add('on')); document.body.classList.add('lock');
    ov.querySelector('.detail-x').focus();
  };
}

function initUniv() {
  const host = document.getElementById('univ'); if (!host) return;
  host.innerHTML = `<button class="univ-card" type="button" aria-label="Jouer à ${esc(UNIV.title)}"><span class="univ-img" style="background-image:url('${UNIV.img}')"></span>
    <span class="univ-txt"><span class="k">Projet universitaire · ${esc(UNIV.sub)}</span><h3>${esc(UNIV.title)}</h3><p>${esc(UNIV.desc)}</p>${dbtn('Jouer en plein écran', { tag: 'span' })}</span></button>`;
  host.querySelector('.univ-card').addEventListener('click', () => playFullscreen(CV + UNIV.url, UNIV.title));
  initHoverDiagrams(host.querySelector('.univ-img'), [UNIV], { sel: '.univ-img', kicker: 'CONSTRUIT AVEC' });
}


const numberFR=(n,digits=0)=>n.toLocaleString('fr-FR',{maximumFractionDigits:digits});
const fteFR=(t)=>numberFR(t.minHours/HOURS_PER_FTE,1)+' à '+numberFR(t.maxHours/HOURS_PER_FTE,1)+' postes';
const rangeFR=(min,max,digits=0)=>min===max?numberFR(min,digits):numberFR(min,digits)+'–'+numberFR(max,digits);
export function initAnnualGains(){
 const head=document.querySelector('#work > .strip-head');
 if(!head||head.querySelector('.annual-gains'))return;
 head.classList.add('pro-gains-heading');
 const title=document.createElement('div');title.className='pro-gains-title';
 for(const child of [...head.children])title.append(child);head.append(title);
 const box=document.createElement('aside');box.className='annual-gains';box.setAttribute('aria-label','Tirelire des gains annuels');
 box.innerHTML=`<div class="annual-pig-wrap"></div><div class="annual-values"><span class="annual-kicker">Temps libéré · par an · volumes fournis</span><strong data-annual-fte>${fteFR(ANNUAL_DECLARED)}</strong><b data-annual-hours>${rangeFR(ANNUAL_DECLARED.minHours,ANNUAL_DECLARED.maxHours)} heures · ≈ ${rangeFR(ANNUAL_DECLARED.minMoney,ANNUAL_DECLARED.maxMoney)} €</b><small>+ ${fteFR(ANNUAL_ESTIMATED)} estimés (${rangeFR(ANNUAL_ESTIMATED.minHours,ANNUAL_ESTIMATED.maxHours)} h), non comptés ici · 104,74 €/h · du temps libéré, pas de l’argent encaissé.</small><small data-annual-net>Net de l’année 1 : ${rangeFR(ANNUAL_NET.minHours,ANNUAL_NET.maxHours)} h, après ${numberFR(ANNUAL_COST.build+ANNUAL_COST.upkeep)} h de construction et d’entretien.</small></div><div class="annual-calendar"><span data-calendar-label></span><strong data-calendar-money></strong><b data-calendar-hours></b><small>Volumes fournis, au prorata de l’année calendaire, actualisée chaque minute.</small></div><details class="annual-memory"><summary>Bilans annuels mémorisés</summary><div data-calendar-history></div><small>Mémoire locale sur ce navigateur. Le bilan précédent est conservé lors du changement d’année.</small></details><details class="annual-breakdown"><summary>Voir les projets et le calcul</summary><div class="piggy-work-basis"><b>Base du rythme des pièces de 1 €</b><label>Jours travaillés/an <input data-working-days type="number" min="1" max="366" step="1" value="225"></label><label>Heures/jour <input data-working-hours type="number" min="1" max="24" step="0.5" value="7"></label><small data-coin-rate></small></div><p>Heures cumulées entre tâches et équipes, et non le temps de travail d’une seule personne : un poste vaut 225 jours de 7 h. Hypothèse : 225 jours/an pour les gains quotidiens. Les montants valorisent du temps libéré, pas un encaissement. Le haut de page ne compte que les volumes fournis ; le tableau ajoute les estimations (capacité théorique de l’extracteur VRE, consultations supposées).</p><div class="annual-table-wrap"><table><caption>Contributions au total annuel</caption><thead><tr><th scope="col">Projet / action</th><th scope="col">Base</th><th scope="col">Heures/an</th><th scope="col">Valorisation/an</th></tr></thead><tbody>${ANNUAL_GAINS.map(r=>`<tr data-annual-project="${r.id}"><th scope="row">${esc(r.title)}<small>${esc(r.basis)}</small></th><td>${r.estimated?'Estimé':'Volumes fournis'}</td><td>${rangeFR(r.minHours,r.maxHours,2)}</td><td>${rangeFR(r.minMoney,r.maxMoney,2)} €</td></tr>`).join('')}</tbody></table></div><p>PP & MOSO est compté une seule fois : la carte « Chaîne des PP » n’est pas ajoutée séparément, pour éviter un double comptage. VM (30 min), Reporteur Q18 (15 min) et extraction VRE (25 min) portent sur les mêmes 4 000 à 5 000 rapports : 70 min libérées par rapport au total.</p><p>Coût : ${ANNUAL_COST.tools} outils construits en ${numberFR(ANNUAL_COST.buildDays,1)} jours de 7 h au total (${ANNUAL_COST.build} h), essais auprès des équipes compris. ${ANNUAL_COST.upkeepTools} est amélioré une fois par mois pour une demi-journée, le Point financier n’a reçu qu’une seule amélioration, deux mois après sa mise en service (${ANNUAL_COST.upkeep} h par an au total) ; VRE traitement par VM, Reporteur Q18, Extracteur VRE, Gares prioritaires et la chaîne des PP sont autonomes, sans maintenance. Le net de l’année 1 retire ces heures des volumes fournis ; Studio, CERFA et Retrouver tout le suivi n’y figurent pas.</p><p>CERFA : les pénalités applicables, les non-conformités remontées et l’audit national sur les fluides frigorigènes sont des résultats, sans montant annuel. CERFA, Studio, Retrouver tout le suivi n’ajoutent aucun montant annuel faute de base annuelle confirmée.</p></details>`;
 head.prepend(box);initPiggyBank(box.querySelector('.annual-pig-wrap'));
 const cascade=document.createElement('section');cascade.className='automation-cascade';cascade.setAttribute('aria-labelledby','cascade-title');
 cascade.innerHTML='<div class="cascade-copy"><span class="cascade-kicker">Effet cascade</span><h3 id="cascade-title">Un processus fiable, du temps libéré pour plusieurs équipes</h3><p>Lorsqu’un agent produit une information, d’autres équipes en dépendent. En fiabilisant et en automatisant ce processus, Mathieu réduit aussi leur attente, leurs recherches et leurs ressaisies. Il fait également ressortir des données et des aspects jusque-là difficiles à lire ou invisibles. Les agents et les équipes peuvent ainsi repérer les points de blocage de processus devenus routiniers, dont le fonctionnement était jusqu’alors accepté en l’état, et disposer de repères concrets pour les améliorer.</p></div><p class="cascade-note">Les gains portent sur des tâches distinctes, réparties entre agents et équipes. La tirelire valorise chaque périmètre une seule fois, sans appliquer de multiplicateur à l’effet cascade.</p>';
 head.after(cascade);

 const storageKey='cv-annual-gain-history-v1';let saved;
 try{saved=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
 const update=()=>{
  const date=new Date(),year=date.getFullYear(),next=rollGainHistory(saved,year);
  if(JSON.stringify(next)!==JSON.stringify(saved)){saved=next;try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}}
  const current=calendarGainState(date);
  box.querySelector('[data-calendar-label]').textContent='Depuis le 1er janvier '+year;
  box.querySelector('[data-calendar-money]').textContent=rangeFR(current.minMoney,current.maxMoney)+' €';
  box.querySelector('[data-calendar-hours]').textContent=rangeFR(current.minHours,current.maxHours,1)+' h de temps économisé ou réaffectable';
  const history=box.querySelector('[data-calendar-history]');history.replaceChildren();
  if(!saved.history.length){const p=document.createElement('p');p.textContent='Le premier bilan sera conservé à la fin de '+year+'.';history.append(p);}
  for(const entry of [...saved.history].sort((a,b)=>b.year-a.year)){const p=document.createElement('p');p.textContent=entry.year+' : '+rangeFR(entry.total.minMoney,entry.total.maxMoney)+' € · '+rangeFR(entry.total.minHours,entry.total.maxHours)+' h';history.append(p);}
  box.dataset.calendarYear=String(year);
 };
 update();const calendarTimer=setInterval(update,60000);
 addEventListener('pagehide',()=>clearInterval(calendarTimer),{once:true});
 const observer=new IntersectionObserver(([entry])=>box.classList.toggle('pig-visible',entry.isIntersecting));observer.observe(box);

}

export function initHome() {
  initAnnualGains();
  initUniv();
  initFlipText(); initFlip();
  const open = initDetail();
  for (const [id, list, kind, dir] of [['mq-pro', PRO_CARDS, 'pro', 1], ['mq-perso', PERSO_CARDS, 'perso', -1]]) {
    const root = document.getElementById(id); if (!root) continue;
    if(kind==='pro'){initProjectFigures(root,list);continue;}
    root.innerHTML = `<div class="mq-track">${list.map((p, i) => card(p, i, kind)).join('')}</div>`;
    root.addEventListener('click', (e) => { const b = e.target.closest('.pc'); if (b) open(list[+b.dataset.i], kind); });
    createMarquee(root);
    initHoverDiagrams(root, list, kind === 'pro' ? {} : { kicker: 'CONSTRUIT AVEC' });
  }
}

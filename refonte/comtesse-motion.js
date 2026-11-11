/* Couche d'interactions éditoriales de comtesse.me.
   Aucun canvas, rendu Three.js, géométrie ou lien n'est remplacé.
   Un seul listener délégué et une seule écriture CSS par frame active. */
(() => {
  "use strict";
  if (window.__comtesseMotionLayer) return;
  window.__comtesseMotionLayer = true;
  const start = () => {
    const root = document.documentElement;
    const body = document.body;
    if (!body) return;
    /* Le CSS est appliqué après les autres feuilles, sans deuxième téléchargement. */
    if (!document.querySelector('link[href*="comtesse-motion.css"]')) {
      const sheet = document.createElement("link");
      sheet.rel = "stylesheet";
      sheet.href = "/refonte/comtesse-motion.css?v=20261111";
      sheet.dataset.cmStyle = "";
      document.head.append(sheet);
    }
    root.classList.add("cm-enhanced");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(hover:hover) and (pointer:fine)");
    const interactives = 'a[href],button,[role="button"],summary,select,input[type="range"],[tabindex="0"]';
    const surfaces = '.product-card,.rf-tile,.rf-d,.rf-post-fig,.pc-card,.rf-cta,.cv-magic3d,.cv-explore3d';
    const getNode = (target, selector) => target instanceof Element ? target.closest(selector) : null;
    let pointerX = -100, pointerY = -100, active = null, frame = 0, dot = null, enabled = false;

    function mountCursor() {
      const should = fine.matches && !reduce.matches;
      if (should === enabled) return;
      enabled = should;
      root.classList.toggle("cm-cursor", enabled);
      root.classList.remove("cm-pointer-seen","cm-pointer-hot","cm-pointer-down","cm-pointer-edit");
      if (enabled) {
        if (!dot) {
          dot = document.createElement("div");
          dot.className = "cm-cursor-dot";
          dot.setAttribute("aria-hidden","true");
          body.append(dot);
        }
      } else if (dot) {
        dot.remove();
        dot = null;
      }
    }
    mountCursor();
    fine.addEventListener?.("change",mountCursor);
    reduce.addEventListener?.("change",mountCursor);

    function paint() {
      frame = 0;
      if (enabled && dot) {
        dot.style.transform = "translate3d(" + pointerX + "px," + pointerY + "px,0) translate(-50%,-50%)";
      }
      if (active?.isConnected) {
        const r = active.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          active.style.setProperty("--cm-pointer-x", ((pointerX-r.left)/r.width*100).toFixed(2)+"%");
          active.style.setProperty("--cm-pointer-y", ((pointerY-r.top)/r.height*100).toFixed(2)+"%");
        }
      }
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(paint); }
    document.addEventListener("pointermove", e => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      pointerX = e.clientX; pointerY = e.clientY;
      const target = e.target;
      const hover = getNode(target,surfaces);
      if (active !== hover) {
        if (active) active.classList.remove("cm-hovered");
        active = hover;
        if (active) active.classList.add("cm-hovered");
      }
      if (enabled) {
        root.classList.add("cm-pointer-seen");
        root.classList.toggle("cm-pointer-hot",!!getNode(target,interactives));
        root.classList.toggle("cm-pointer-edit",!!getNode(target,'input:not([type="range"]),textarea,[contenteditable="true"]'));
      }
      schedule();
    },{passive:true});
    document.addEventListener("pointerdown",e => { if (e.pointerType === "mouse") root.classList.add("cm-pointer-down"); },{passive:true});
    const pointerUp = () => root.classList.remove("cm-pointer-down");
    document.addEventListener("pointerup",pointerUp,{passive:true});
    document.addEventListener("pointercancel",pointerUp,{passive:true});
    window.addEventListener("blur",() => root.classList.remove("cm-pointer-seen","cm-pointer-down"));
    document.addEventListener("mouseout",e => {
      if (e.relatedTarget === null) root.classList.remove("cm-pointer-seen");
    },{passive:true});
    document.addEventListener("visibilitychange",() => {
      if (document.hidden) root.classList.remove("cm-pointer-seen","cm-pointer-down");
    });

    /* Une révélation uniquement pour les surfaces textuelles, jamais les
       conteneurs 3D, ni les cartes utilisées comme solides HTML-in-Canvas. */
    const candidates = [...document.querySelectorAll('.rf-bmain .rf-tile,.rf-exp-main .rf-tile,.rf-post-body .rf-marche')];
    if (!reduce.matches && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("cm-visible");
          io.unobserve(entry.target);
        }
      },{threshold:.09,rootMargin:"0px 0px 12% 0px"});
      for (const el of candidates) {
        el.classList.add("cm-reveal");
        io.observe(el);
      }
    }
    /* Des mises à jour de contenu ne relancent pas la boucle graphique.
       Les CSS :hover et :focus-visible restent délégués naturellement. */
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",start,{once:true});
  } else start();
})();

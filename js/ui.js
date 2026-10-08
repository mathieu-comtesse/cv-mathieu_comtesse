import { PAGES } from './pages.js?v=cv-scene-v18';
import { PERSO, PRO, CV } from './data.js?v=cv-scene-v18';

/* Deux interfaces plein écran ouvertes depuis la pièce 3D :
 *  - « retro » : la télé cathodique + PS1 → menu de jeux façon console (projets perso), écran de chargement, écran titre, jeu, bouton retour ;
 *  - « xp »    : le PC de bureau → bureau Windows XP (Bliss), dossier « Projets pro », explorateur, fenêtres de projet. */

const CSS = `
.ov{position:fixed;inset:0;z-index:100;display:none;opacity:0;transition:opacity .35s}
.ov.on{display:block}.ov.show{opacity:1}
.ov *{box-sizing:border-box}
/* ───── console ───── */
#retro{background:#000;font-family:"Press Start 2P","Courier New",monospace;color:#cfe6ff;image-rendering:pixelated}
#retro .scr{position:absolute;inset:0;display:flex;flex-direction:column;padding:clamp(14px,3vw,34px);background:radial-gradient(ellipse at 50% 40%,#0c1a4a 0%,#050a1f 62%,#02040c 100%);animation:flick 4s infinite}
#retro .lines{position:absolute;inset:0;pointer-events:none;z-index:3;background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 1px,transparent 1px 3px),radial-gradient(ellipse at center,transparent 58%,rgba(0,0,0,.65) 100%)}
@keyframes flick{0%,100%{filter:brightness(1)}48%{filter:brightness(1.04)}50%{filter:brightness(.96)}52%{filter:brightness(1.02)}}
#retro h1{margin:0;font-size:clamp(12px,2.2vw,22px);font-weight:400;letter-spacing:.06em;color:#ffd34a;text-shadow:2px 2px 0 #3a2a00}
#retro .sub{font-size:clamp(7px,1vw,10px);color:#7fa6d6;margin-top:10px}
#retro .head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:2px solid #28418a;padding-bottom:14px}
#retro .body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:clamp(12px,2.4vw,30px);padding:18px 0}
#retro ul{list-style:none;margin:0;padding:0;overflow:auto;display:flex;flex-direction:column;gap:6px}
#retro li{display:flex;gap:10px;align-items:center;padding:9px 10px;font-size:clamp(8px,1.15vw,12px);line-height:1.5;cursor:pointer;border:2px solid transparent;color:#a9c4ee}
#retro li i{font-style:normal;color:#5d79b8;min-width:2ch}
#retro li.sel{background:#1a2f78;border-color:#5f86ff;color:#fff}
#retro li.sel::before{content:"";border:6px solid transparent;border-left:10px solid #ffd34a;animation:blk 1s steps(2) infinite}
#retro li:not(.sel)::before{content:"";width:10px}
@keyframes blk{50%{opacity:0}}
#retro .card{border:2px solid #28418a;background:#07123a;padding:clamp(10px,1.6vw,18px);display:flex;flex-direction:column;gap:14px;min-height:0;overflow:auto}
#retro .cover{aspect-ratio:4/3;max-height:36vh;align-self:center;max-width:100%;border:2px solid #000;position:relative;display:flex;align-items:flex-end;padding:0;background-size:100% 100%;image-rendering:pixelated;filter:saturate(.78) contrast(1.08) sepia(.12);box-shadow:0 0 0 2px #28418a,0 0 18px rgba(80,120,255,.35);font-size:clamp(10px,1.8vw,18px);line-height:1.4;color:#fff;text-shadow:2px 2px 0 rgba(0,0,0,.6);overflow:hidden}
#retro .cover::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.25) 0 1px,transparent 1px 3px)}
#retro .cover span{position:relative;width:100%;padding:18px 12px 8px;background:linear-gradient(transparent,rgba(2,6,24,.9))}
#retro .tag{font-size:clamp(7px,1vw,10px);color:#ffd34a}
#retro .desc{font-family:"Courier New",monospace;font-size:clamp(12px,1.5vw,16px);line-height:1.5;color:#d6e4ff}
#retro .btns{display:flex;gap:10px;flex-wrap:wrap;margin-top:auto}
#retro button,#retro a.b{font:inherit;font-size:clamp(8px,1.1vw,11px);color:#fff;background:#2144c9;border:2px solid #7f9cff;padding:10px 14px;cursor:pointer;text-decoration:none;display:inline-block;text-shadow:1px 1px 0 #000}
#retro button:hover,#retro a.b:hover{background:#3558ea}
#retro button.alt{background:#2b2f40;border-color:#6a728f}
#retro .foot{display:flex;gap:clamp(12px,3vw,34px);align-items:center;border-top:2px solid #28418a;padding-top:12px;font-size:clamp(7px,1vw,10px);color:#9db6e2;flex-wrap:wrap}
#retro .foot span{display:flex;align-items:center;gap:8px;cursor:pointer}
#retro .foot svg{width:22px;height:22px}
#retro .center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;text-align:center}
#retro .bar{width:min(420px,70vw);height:22px;border:2px solid #7f9cff;padding:2px}
#retro .bar b{display:block;height:100%;width:0;background:repeating-linear-gradient(90deg,#ffd34a 0 12px,transparent 12px 15px)}
#retro .play{flex:1;min-height:0;display:flex;flex-direction:column;gap:10px;padding-top:12px}
#retro iframe{flex:1;min-height:0;width:100%;border:2px solid #28418a;background:#000}
#retro .title{font-size:clamp(16px,4vw,38px);color:#fff;text-shadow:4px 4px 0 var(--c,#2144c9);line-height:1.3}
#retro .press{color:#ffd34a;animation:blk 1s steps(2) infinite;font-size:clamp(9px,1.4vw,14px)}
#retro.off .scr{animation:none}
#retro .collapse{position:absolute;inset:0;background:#000;z-index:5;pointer-events:none;opacity:0}
#retro.closing .scr{animation:crt .45s forwards}
@keyframes crt{0%{transform:scale(1,1);filter:brightness(1)}60%{transform:scale(1,.004);filter:brightness(4)}100%{transform:scale(0,0);filter:brightness(0)}}
@media (max-width:720px){#retro .body{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) minmax(0,1fr)}}
/* ───── Windows XP ───── */
#xp{background:#3a6ea5;font-family:Tahoma,"Segoe UI",Verdana,sans-serif;font-size:12px;color:#000;user-select:none}
#xp .wall{position:absolute;inset:0 0 30px 0;overflow:hidden}
#xp .wall svg{width:100%;height:100%;display:block}
#xp .icons{position:absolute;left:14px;top:14px;display:flex;flex-direction:column;gap:14px}
#xp .ico{width:76px;display:flex;flex-direction:column;align-items:center;gap:4px;color:#fff;text-shadow:1px 1px 1px #000;cursor:pointer;text-align:center;font-size:11.5px;padding:2px;line-height:1.2}
#xp .ico.sel span{background:#316ac5;outline:1px dotted #fff}
#xp .ico svg{width:42px;height:42px;filter:drop-shadow(1px 2px 1px rgba(0,0,0,.45))}
#xp .bin{position:absolute;right:14px;bottom:44px}
#xp .win{position:absolute;display:flex;flex-direction:column;background:#ece9d8;border:1px solid #0831d9;border-radius:8px 8px 0 0;box-shadow:3px 3px 12px rgba(0,0,0,.5);min-width:280px}
#xp .win.max{inset:0 0 30px 0!important;width:auto!important;height:auto!important;border-radius:0}
#xp .tb{height:30px;flex:none;border-radius:7px 7px 0 0;background:linear-gradient(#0997ff 0%,#0053ee 8%,#0050ee 40%,#06f 88%,#06f 93%,#005bff 95%,#003dd7 96%,#003dd7 100%);display:flex;align-items:center;gap:6px;padding:0 5px 0 7px;color:#fff;font-weight:700;font-size:13px;text-shadow:1px 1px 0 #0f1089;cursor:default}
#xp .win.blur .tb{background:linear-gradient(#7697e7 0%,#7e9ee3 8%,#7a9ae3 40%,#85a6ea 88%,#6b8fe0 100%)}
#xp .tb svg{width:16px;height:16px;flex:none}
#xp .tb em{font-style:normal;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#xp .tbb{width:21px;height:21px;border:1px solid #fff;border-radius:3px;background:linear-gradient(135deg,#6a97f5,#2a62e0);color:#fff;font:700 11px/17px Tahoma;text-align:center;cursor:pointer;padding:0}
#xp .tbb.x{background:linear-gradient(135deg,#e9886d,#c13c1c)}
#xp .menu{display:flex;gap:2px;padding:2px 4px;border-bottom:1px solid #aca899;background:#ece9d8}
#xp .menu span{padding:2px 7px}
#xp .menu span:hover{background:#316ac5;color:#fff}
#xp .tool{display:flex;gap:6px;align-items:center;padding:4px 6px;border-bottom:1px solid #aca899}
#xp .tool button{font:inherit;display:flex;align-items:center;gap:4px;border:1px solid transparent;background:none;padding:2px 5px;border-radius:3px;cursor:pointer}
#xp .tool button:hover{border-color:#aca899;background:#f4f2e8}
#xp .tool button:disabled{opacity:.4;cursor:default}
#xp .addr{display:flex;align-items:center;gap:6px;padding:3px 6px;border-bottom:1px solid #aca899}
#xp .addr div{flex:1;background:#fff;border:1px solid #7f9db9;padding:2px 5px;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
#xp .exp{flex:1;display:flex;min-height:0;background:#fff;border-top:1px solid #aca899}
#xp .side{width:190px;flex:none;background:linear-gradient(#7ba2e7,#6375d6);padding:10px;display:flex;flex-direction:column;gap:10px;overflow:auto}
#xp .pane{background:#d6dff7;border-radius:6px 6px 0 0;overflow:hidden}
#xp .pane h4{margin:0;padding:5px 8px;font-size:12px;background:linear-gradient(90deg,#fff,#c6d3f7);color:#215dc6}
#xp .pane div{padding:8px;font-size:11.5px;color:#215dc6;line-height:1.5}
#xp .pane a{color:#215dc6;text-decoration:underline;cursor:pointer;display:block;margin-bottom:4px}
#xp .files{flex:1;padding:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;align-content:start;overflow:auto}
#xp .file{display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center;padding:6px 4px;cursor:pointer;line-height:1.25;border:1px solid transparent}
#xp .file:hover{background:#eaf1fd;border-color:#a8c3ea}
#xp .file svg{width:46px;height:46px}
#xp .st{display:flex;gap:16px;padding:3px 8px;border-top:1px solid #aca899;background:#ece9d8;font-size:11px}
#xp .doc{padding:10px;display:flex;flex-direction:column;gap:10px;flex:1;min-height:0}
#xp .tabs{display:flex;gap:1px;padding-left:6px}
#xp .tabs button{font:inherit;padding:4px 12px;border:1px solid #919b9c;border-bottom:0;border-radius:3px 3px 0 0;background:#f5f4ea;cursor:pointer;position:relative;top:1px}
#xp .tabs button.on{background:#fcfcfe;border-top:2px solid #f8b330;top:1px;font-weight:700}
#xp .sheet{background:#fcfcfe;border:1px solid #919b9c;padding:14px;flex:1;min-height:0;overflow:auto;line-height:1.55;font-size:12.5px;user-select:text}
#xp .sheet h3{margin:0 0 4px;font-size:15px;color:#003399}
#xp .sheet .sub{color:#6d6d6d;margin-bottom:10px}
#xp .sheet fieldset{border:1px solid #d0d0bf;border-radius:4px;margin:10px 0 0;padding:8px 10px}
#xp .sheet legend{color:#0046d5;padding:0 4px}

#xp .tool{display:flex;gap:6px;padding:3px 6px;border-bottom:1px solid #aca899;background:#ece9d8}
#xp .tool button{font:inherit;padding:3px 10px;border:1px solid transparent;border-radius:3px;background:transparent;cursor:pointer}
#xp .tool button:hover{border-color:#a8c3ea;background:#eaf1fd}
#xp .pg{flex:1;min-height:0;overflow:auto;background:#fff;border-top:1px solid #7f9db9;user-select:text}
#xp .pgin{padding:0 0 30px;font:12.5px/1.6 Verdana,Tahoma,sans-serif;color:#000;max-width:100%}
#xp .pgin .case-heading{background:linear-gradient(#245edb,#1941a5);color:#fff;padding:16px 22px;display:flex;flex-wrap:wrap;gap:4px 14px;align-items:baseline;border-bottom:3px solid #f8b330}
#xp .pgin .case-number{background:#f8b330;color:#222;font-weight:700;padding:1px 9px;border-radius:10px;font-size:12px}
#xp .pgin .page-title{margin:0;max-width:none;letter-spacing:0;text-wrap:wrap;animation:none;font:700 20px/1.25 Trebuchet MS,Tahoma,sans-serif;flex:1 1 0;min-width:0;color:#fff;text-shadow:1px 1px 0 #0b2a82}
#xp .pgin .case-category{flex-basis:100%;color:#cfe0ff;font-size:12px}
#xp .pgin>article{margin:0}
#xp .pgin p{margin:10px 22px}
#xp .pgin .case-description{font-size:13px}
#xp .pgin video,#xp .pgin img{display:block;max-width:100%;height:auto;border:2px inset #d4d0c8;background:#000}
#xp .pgin figure{margin:14px 22px;border:1px solid #0831d9;border-radius:7px 7px 0 0;background:#ece9d8;box-shadow:2px 2px 6px rgba(0,0,0,.25);overflow:hidden}
#xp .pgin figure video,#xp .pgin figure img{width:100%;border:0;border-top:1px solid #7f9db9}
#xp .pgin figcaption{padding:6px 10px;font-size:11.5px;color:#333}
#xp .pgin .xw{border:1px solid #0831d9;border-radius:7px 7px 0 0;background:#ece9d8;overflow:hidden;margin:10px 0}
#xp .pgin .xw__title{display:flex;align-items:center;gap:6px;padding:4px 5px 4px 8px;color:#fff;font-weight:700;font-size:12px;background:linear-gradient(#0997ff,#0053ee 10%,#0050ee 80%,#003dd7)}
#xp .pgin .xw--grey .xw__title{background:linear-gradient(#9aa4b8,#6f7a90)}
#xp .pgin .xw__title span:first-child{flex:1}
#xp .pgin .xw__title span:last-child{display:flex;gap:3px}
#xp .pgin .xw__title i{width:16px;height:16px;border:1px solid #fff;border-radius:3px;background:linear-gradient(135deg,#6a97f5,#2a62e0)}
#xp .pgin .xw__title i.x{background:linear-gradient(135deg,#e9886d,#c13c1c)}
#xp .pgin .xw__body{padding:8px}
#xp .pgin pre,#xp .pgin .term{margin:0;padding:8px 10px;background:#fff;border:2px inset #d4d0c8;font:11.5px/1.5 "Lucida Console",Consolas,monospace;white-space:pre-wrap;word-break:break-word;color:#000}
#xp .pgin pre b{color:#003399}
#xp .pgin .xw__foot{display:flex;justify-content:space-between;gap:10px;padding:3px 8px;border-top:1px solid #aca899;font-size:10.5px;color:#444;background:#ece9d8}
#xp .pgin .dotgrid,#xp .pgin .before-after{margin:14px 22px;padding:14px 10px 4px;border:1px solid #d0d0bf;border-radius:4px;position:relative;background:#fcfcfe}
#xp .pgin .dotgrid>.xw{margin:10px 0}
#xp .pgin .chip{position:absolute;top:-9px;left:12px;background:#fff;padding:0 6px;color:#0046d5;font-size:11.5px}
#xp .pgin .panel-caption{display:grid;gap:8px;margin:8px 0 10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
#xp .pgin .panel-caption>div{padding:6px 8px;border:1px solid #d0d0bf;background:#fffef6}
#xp .pgin .outcome-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:14px;margin-bottom:6px}
#xp .pgin .outcome-grid>div,#xp .pgin .cost-grid>div{border:1px solid #7f9db9;background:#fff}
#xp .pgin .outcome-grid h4,#xp .pgin h4{margin:0;padding:4px 9px;font:700 12px Tahoma;background:linear-gradient(90deg,#fff,#c6d3f7);color:#215dc6}
#xp .pgin .outcome-grid p{margin:0;padding:7px 9px;font-size:12px}
#xp .pgin .cost-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
#xp .pgin .case-benefit,#xp .pgin .case-gain,#xp .pgin .case-critique{display:flex;flex-direction:column;gap:2px;padding:8px 10px 8px 42px;margin:10px 22px;border:1px solid #c9c291;background:#ffffe1;position:relative}
#xp .pgin .case-benefit::before,#xp .pgin .case-gain::before,#xp .pgin .case-critique::before{content:"i";position:absolute;left:10px;top:9px;width:20px;height:20px;border-radius:50%;background:#2f6fd6;color:#fff;font:700 13px/20px Georgia,serif;text-align:center}
#xp .pgin .case-gain::before{background:#3c9a2c;content:"\\2713"}
#xp .pgin .case-critique::before{background:#e8a317;content:"!";font-family:Tahoma}
#xp .pgin .case-benefit>span:first-child,#xp .pgin .case-gain>span:first-child,#xp .pgin .case-critique>span:first-child{font-weight:700;color:#003399;font-size:11.5px}
#xp .pgin .ok{color:#1d7a1d;font-weight:700}#xp .pgin .ko{color:#c01818;font-weight:700}#xp .pgin .dim{color:#777}
#xp .pgin ol,#xp .pgin ul{margin:8px 22px;padding-left:22px}
#xp .pgin ol li{margin:4px 0}
#xp .pgin .flow-diagram{margin:12px 22px}
#xp .pgin .flow-steps{list-style:none;padding:0;margin:0;display:grid;gap:6px}
#xp .pgin .flow-steps li{padding:6px 10px;border:1px solid #7f9db9;border-left:6px solid #245edb;background:#f4f8ff}
#xp .pgin .flow-index{display:inline-block;min-width:22px;margin-right:6px;text-align:center;background:#245edb;color:#fff;border-radius:3px;font-weight:700}
#xp .pgin a{color:#0000cc}
#xp .pgin .moso-note,#xp .pgin .pillar-callout,#xp .pgin aside{padding:8px 12px;border:1px solid #c9c291;background:#ffffe1;margin:12px 22px}
#xp .pgin h3{margin:16px 22px 6px;font:700 15px Trebuchet MS,Tahoma;color:#003399;border-bottom:1px solid #aca899}
#xp .btnrow{display:flex;gap:8px;justify-content:flex-end}
#xp .xb{font:inherit;min-width:78px;padding:4px 12px;border:1px solid #003c74;border-radius:3px;background:linear-gradient(#fff,#ecebe5 86%,#d6d0c5);cursor:pointer}
#xp .xb:hover{box-shadow:inset 0 0 0 2px #f8b330}
#xp .xb.def{box-shadow:inset 0 0 0 2px #7ba2e7}
#xp .task{position:absolute;left:0;right:0;bottom:0;height:30px;background:linear-gradient(#245edb 0%,#3f8cf3 9%,#245edb 18%,#245edb 92%,#1941a5 100%);display:flex;align-items:center;z-index:5}
#xp .start{height:30px;padding:0 20px 0 10px;border:0;border-radius:0 12px 12px 0;background:linear-gradient(#5aa84b 0%,#3c9a2c 12%,#3c9a2c 80%,#2e7d22 100%);color:#fff;font:italic 700 17px Tahoma,sans-serif;text-shadow:1px 1px 2px #1d4d15;display:flex;align-items:center;gap:6px;cursor:pointer;box-shadow:1px 0 3px rgba(0,0,0,.4)}
#xp .start svg{width:20px;height:20px}
#xp .tasks{flex:1;display:flex;gap:3px;padding:0 6px;min-width:0}
#xp .tasks button{max-width:160px;flex:1;height:24px;display:flex;align-items:center;gap:5px;border:1px solid #1941a5;border-radius:3px;background:linear-gradient(#3c8ae6,#2f6fd6);color:#fff;font:12px Tahoma,Verdana,sans-serif;padding:0 6px;cursor:pointer;overflow:hidden;white-space:nowrap}
#xp .tasks button.on{background:linear-gradient(#1c4fc0,#2a5fd0);box-shadow:inset 1px 1px 2px rgba(0,0,0,.5)}
#xp .tasks svg{width:14px;height:14px;flex:none}
#xp .tray{height:30px;display:flex;align-items:center;padding:0 12px;background:linear-gradient(#0f8ff0,#1299ea 10%,#0b81d6 90%);border-left:1px solid #1a50b8;color:#fff;font-size:12px}
#xp .smenu{position:absolute;left:0;bottom:30px;width:min(380px,96vw);z-index:6;border-radius:8px 8px 0 0;overflow:hidden;box-shadow:2px -2px 8px rgba(0,0,0,.5);display:none;border:1px solid #0831d9;background:#fff}
#xp .smenu.on{display:block}
#xp .sm-h{background:linear-gradient(#1c63d9,#3f8cf3);color:#fff;padding:9px 12px;font-weight:700;font-size:15px;display:flex;align-items:center;gap:10px;text-shadow:1px 1px 1px #003}
#xp .sm-h i{width:38px;height:38px;border-radius:5px;border:2px solid #fff;background:linear-gradient(#e9c37a,#b67b2f);display:block}
#xp .sm-b{display:grid;grid-template-columns:1fr 1fr}
#xp .sm-b div{padding:6px}
#xp .sm-b .r{background:#d3e5fa;border-left:1px solid #95bdee}
#xp .sm-b a{display:flex;gap:8px;align-items:center;padding:7px;cursor:pointer;border-radius:2px;color:#000;text-decoration:none}
#xp .sm-b a:hover{background:#316ac5;color:#fff}
#xp .sm-b a svg{width:26px;height:26px;flex:none}
#xp .sm-f{background:linear-gradient(#3f8cf3,#1c63d9);padding:6px 10px;display:flex;justify-content:flex-end;gap:14px}
#xp .sm-f a{color:#fff;display:flex;gap:6px;align-items:center;cursor:pointer;font-size:12px;text-decoration:none}
#xp .shut{position:absolute;inset:0;background:#5a7edc;z-index:20;display:none;align-items:center;justify-content:center;color:#fff;font-size:20px;font-family:"Trebuchet MS",Tahoma,sans-serif}
#xp .shut.on{display:flex}
@media (max-width:640px){#xp .side{display:none}#xp .win{min-width:0}}
`;

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const FOLDER = (id = 'f') => `<svg viewBox="0 0 48 48"><defs><linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a0"/><stop offset="1" stop-color="#e9b83a"/></linearGradient><linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6d36a"/><stop offset="1" stop-color="#d79c1d"/></linearGradient></defs><path d="M3 11h14l4 4h24v6H3z" fill="#d79c1d"/><path d="M3 18h42l-2 22a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="url(#${id}a)" stroke="#b8860b" stroke-width="1.2"/><path d="M3 18h42v3H3z" fill="url(#${id}b)" opacity=".7"/></svg>`;
const IE = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="#2f9be8" stroke-width="3"/><path d="M4 12h16" stroke="#fff" stroke-width="0"/><ellipse cx="12" cy="12" rx="12" ry="4" transform="rotate(-28 12 12)" fill="none" stroke="#f6c431" stroke-width="1.6"/></svg>`;
const WINLOGO = `<svg viewBox="0 0 24 24"><path d="M2 5l9-1.4v8H2z" fill="#f25022"/><path d="M12.4 3.4L22 2v9.6h-9.6z" fill="#7fba00"/><path d="M2 13h9v8L2 19.6z" fill="#00a4ef"/><path d="M12.4 13H22v9.2l-9.6-1.4z" fill="#ffb900"/></svg>`;
const PSX = { x: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#7aa2ff" stroke-width="2"/><path d="M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="#7aa2ff" stroke-width="2.2"/></svg>`, o: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#ff7a7a" stroke-width="2"/><circle cx="12" cy="12" r="5.2" fill="none" stroke="#ff7a7a" stroke-width="2.2"/></svg>`, t: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#6fe3a0" stroke-width="2"/><path d="M12 6.5l5.2 9H6.8z" fill="none" stroke="#6fe3a0" stroke-width="2.2" stroke-linejoin="round"/></svg>` };

let css = null;
function inject() {
  if (css) return; css = el('style', null, CSS); document.head.append(css);
  const l = el('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'; document.head.append(l);
}
function show(root) { root.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('show'))); }
function hide(root, cb) { root.classList.remove('show'); setTimeout(() => { root.classList.remove('on'); cb && cb(); }, 360); }

/* ───────────────────────── Console : projets perso ───────────────────────── */
function retroApp(onClose) {
  const root = el('div', 'ov'); root.id = 'retro';
  const scr = el('div', 'scr'); const lines = el('div', 'lines'); root.append(scr, lines); document.body.append(root);
  let view = 'boot', idx = 0, timer = null;
  const done = () => { clearTimeout(timer); root.classList.add('closing'); setTimeout(() => { hide(root, () => { root.remove(); root.classList.remove('closing'); }); onClose(); }, 420); window.removeEventListener('keydown', key); };
  const foot = (a) => `<div class="foot">${a.map(([ic, t, k]) => `<span data-k="${k}">${PSX[ic]}${t}</span>`).join('')}</div>`;
  const bind = () => scr.querySelectorAll('[data-k]').forEach((n) => n.addEventListener('click', (e) => { e.stopPropagation(); act(n.dataset.k); }));
  function act(k) {
    if (k === 'back') { if (view === 'menu') done(); else if (view === 'title' || view === 'play') menu(); }
    else if (k === 'ok') { if (view === 'menu') load(); else if (view === 'title') play(); }
    else if (k === 'up' && view === 'menu') { idx = (idx + PERSO.length - 1) % PERSO.length; menu(true); }
    else if (k === 'down' && view === 'menu') { idx = (idx + 1) % PERSO.length; menu(true); }
  }
  function key(e) {
    const m = { ArrowUp: 'up', ArrowDown: 'down', Enter: 'ok', ' ': 'ok', Escape: 'back', Backspace: 'back' }[e.key];
    if (m) { e.preventDefault(); act(m); }
  }
  function boot() {
    view = 'boot';
    scr.innerHTML = `<div class="center"><h1>PROJETS PERSO</h1><div class="sub">MATHIEU ENTERTAINMENT SYSTEM</div><div class="bar"><b></b></div><div class="sub">LECTURE DE LA CARTE MEMOIRE 1…</div></div>`;
    const b = scr.querySelector('b'); let p = 0;
    (function step() { p += 8 + Math.random() * 10; b.style.width = Math.min(p, 100) + '%'; if (p < 100) timer = setTimeout(step, 90); else timer = setTimeout(() => menu(), 250); })();
  }
  function menu(keep) {
    view = 'menu'; clearTimeout(timer);
    const g = PERSO[idx];
    const top = keep ? scr.querySelector('ul')?.scrollTop : 0;
    scr.innerHTML = `<div class="head"><div><h1>SELECTION DU JEU</h1><div class="sub">MEMORY CARD 1 · ${PERSO.length} PROJETS</div></div><div class="sub">${String(idx + 1).padStart(2, '0')}/${PERSO.length}</div></div>
      <div class="body"><ul>${PERSO.map((p, i) => `<li data-i="${i}" class="${i === idx ? 'sel' : ''}"><i>${String(i + 1).padStart(2, '0')}</i>${esc(p.n)}</li>`).join('')}</ul>
      <div class="card"><div class="cover" style="background-image:url('${g.img}')"><span>${esc(g.n)}</span></div><div class="tag">${esc(g.genre).toUpperCase()}</div><div class="desc">${esc(g.desc)}</div>
      <div class="btns"><button data-k="ok">▶ START</button><a class="b alt" target="_blank" rel="noopener" href="${CV}${g.url}">↗ NOUVEL ONGLET</a></div></div></div>
      ${foot([['x', 'VALIDER', 'ok'], ['o', 'QUITTER', 'back'], ['t', 'HAUT', 'up']])}`;
    const ul = scr.querySelector('ul'); if (top) ul.scrollTop = top; ul.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
    ul.querySelectorAll('li').forEach((li) => li.addEventListener('click', () => { const i = +li.dataset.i; if (i === idx) act('ok'); else { idx = i; menu(true); } }));
    bind();
  }
  function load() {
    view = 'load'; const g = PERSO[idx];
    scr.innerHTML = `<div class="center"><div class="cover" style="background-image:url('${g.img}');width:min(300px,50vw);max-height:30vh"><span></span></div><div class="title" style="--c:${g.color}">${esc(g.n)}</div><div class="sub">NOW LOADING</div><div class="bar"><b></b></div></div>`;
    const b = scr.querySelector('b'); let p = 0;
    (function step() { p += 6 + Math.random() * 14; b.style.width = Math.min(p, 100) + '%'; if (p < 100) timer = setTimeout(step, 80); else timer = setTimeout(title, 220); })();
  }
  function title() {
    view = 'title'; const g = PERSO[idx];
    scr.innerHTML = `<div class="center"><div class="cover" style="background-image:url('${g.img}');width:min(300px,45vw);max-height:26vh"><span></span></div><div class="tag">${esc(g.genre).toUpperCase()}</div><div class="title" style="--c:${g.color}">${esc(g.n)}</div><div class="desc" style="max-width:62ch">${esc(g.desc)}</div><div class="press" data-k="ok" style="cursor:pointer">PRESS START</div>
      <div class="btns"><button data-k="ok">▶ START</button><a class="b alt" target="_blank" rel="noopener" href="${CV}${g.url}">↗ NOUVEL ONGLET</a></div></div>${foot([['x', 'START', 'ok'], ['o', 'RETOUR', 'back']])}`;
    bind();
  }
  function play() {
    view = 'play'; const g = PERSO[idx];
    scr.innerHTML = `<div class="head"><div><h1>${esc(g.n)}</h1><div class="sub">${esc(g.genre).toUpperCase()} · EN COURS</div></div><button class="alt" data-k="back">◀ RETOUR</button></div>
      <div class="play"><iframe title="${esc(g.n)}" allow="autoplay; fullscreen" src="${CV}${g.url}"></iframe>
      <div class="sub">SI L’ECRAN RESTE NOIR, OUVREZ LE JEU DANS UN ONGLET : <a style="color:#ffd34a" target="_blank" rel="noopener" href="${CV}${g.url}">${CV}${g.url}</a></div></div>${foot([['o', 'RETOUR AU MENU', 'back']])}`;
    bind();
  }
  window.addEventListener('keydown', key);
  show(root); boot();
  return { close: done };
}

/* ───────────────────────── Windows XP : projets pro ───────────────────────── */
function bliss() {
  return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="bs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d5fd0"/><stop offset=".55" stop-color="#5fa3ee"/><stop offset="1" stop-color="#bfe0ff"/></linearGradient><linearGradient id="bh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ec43a"/><stop offset=".5" stop-color="#4f9a1c"/><stop offset="1" stop-color="#2e6f10"/></linearGradient><filter id="bb"><feGaussianBlur stdDeviation="16"/></filter></defs>
    <rect width="1600" height="900" fill="url(#bs)"/>
    <g filter="url(#bb)" fill="#fff" opacity=".92"><ellipse cx="320" cy="210" rx="190" ry="48"/><ellipse cx="480" cy="190" rx="150" ry="42"/><ellipse cx="1180" cy="150" rx="230" ry="46"/><ellipse cx="1380" cy="190" rx="160" ry="38"/><ellipse cx="800" cy="300" rx="220" ry="34" opacity=".7"/><ellipse cx="170" cy="340" rx="140" ry="30" opacity=".7"/></g>
    <path d="M0 640 C 260 520 620 470 980 560 C 1240 620 1440 560 1600 500 L1600 900 L0 900Z" fill="url(#bh)"/>
    <path d="M0 740 C 380 640 820 600 1200 700 C 1400 750 1520 720 1600 690 L1600 900 L0 900Z" fill="#3f8a14" opacity=".55"/>
    <path d="M0 640 C 260 520 620 470 980 560 C 1240 620 1440 560 1600 500" fill="none" stroke="#c6f08a" stroke-width="5" opacity=".6"/></svg>`;
}

function xpApp(onClose) {
  const root = el('div', 'ov'); root.id = 'xp';
  const wall = el('div', 'wall', bliss());
  const icons = el('div', 'icons');
  const winL = el('div'); winL.style.cssText = 'position:absolute;inset:0 0 30px 0;pointer-events:none';
  const task = el('div', 'task');
  const start = el('button', 'start', `${WINLOGO}démarrer`);
  const tasks = el('div', 'tasks'); const tray = el('div', 'tray', '');
  task.append(start, tasks, tray);
  const smenu = el('div', 'smenu', `<div class="sm-h"><i></i>Mathieu</div><div class="sm-b"><div>
      <a data-a="pro">${FOLDER('s1')}<b>Projets pro</b></a><a href="mailto:mathieu@comtesse.me">${FOLDER('s3')}Me contacter</a></div>
      <div class="r"><a href="https://github.com/mathieu-comtesse" target="_blank" rel="noopener">GitHub</a></div></div>
      <div class="sm-f"><a data-a="off">Arrêter l’ordinateur</a></div>`);
  const shut = el('div', 'shut', 'Arrêt de Windows en cours…');
  const ico = el('div', 'ico', `${FOLDER('d1')}<span>Projets pro</span>`);
  const bin = el('div', 'ico bin', `<svg viewBox="0 0 48 48"><path d="M12 14h24l-2 28H14z" fill="#cfd8e3" stroke="#6b7a8c" stroke-width="1.5"/><path d="M9 11h30v4H9z" fill="#aab6c6" stroke="#6b7a8c" stroke-width="1.5"/><path d="M18 20v18M24 20v18M30 20v18" stroke="#8896aa" stroke-width="1.5"/></svg><span>Corbeille</span>`);
  icons.append(ico); root.append(wall, icons, bin, winL, task, smenu, shut); document.body.append(root);

  const wins = new Set(); let z = 10, sx = 0;
  const clock = () => { const d = new Date(); tray.textContent = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); };
  clock(); const clk = setInterval(clock, 15000);
  function focus(w) { wins.forEach((x) => { x.el.classList.add('blur'); x.btn.classList.remove('on'); }); w.el.classList.remove('blur'); w.btn.classList.add('on'); w.el.style.zIndex = ++z; w.el.style.display = ''; }
  function win({ title, icon, w = 640, h = 440, body, x, y }) {
    const e = el('div', 'win'); e.style.pointerEvents = 'auto';
    const vw = innerWidth, vh = innerHeight - 30;
    const W = Math.min(w, vw - 12), Hh = Math.min(h, vh - 12);
    sx = (sx + 1) % 5;
    e.style.cssText += `;width:${W}px;height:${Hh}px;left:${x ?? Math.max(6, (vw - W) / 2 + (sx - 2) * 26)}px;top:${y ?? Math.max(6, (vh - Hh) / 2 + (sx - 2) * 22)}px`;
    e.innerHTML = `<div class="tb">${icon}<em>${esc(title)}</em><button class="tbb" data-b="min">_</button><button class="tbb" data-b="max">□</button><button class="tbb x" data-b="x">✕</button></div>`;
    e.append(body);
    const btn = el('button', null, `${icon}<span>${esc(title)}</span>`); tasks.append(btn);
    const rec = { el: e, btn }; wins.add(rec); winL.append(e);
    const closeW = () => { wins.delete(rec); e.remove(); btn.remove(); const l = [...wins].pop(); if (l) focus(l); };
    e.addEventListener('pointerdown', () => focus(rec));
    e.querySelector('[data-b=x]').onclick = closeW;
    e.querySelector('[data-b=min]').onclick = () => { e.style.display = 'none'; btn.classList.remove('on'); };
    e.querySelector('[data-b=max]').onclick = () => e.classList.toggle('max');
    btn.onclick = () => (e.style.display === 'none' || !btn.classList.contains('on') ? focus(rec) : (e.style.display = 'none', btn.classList.remove('on')));
    const tb = e.querySelector('.tb'); let d = null;
    tb.addEventListener('pointerdown', (ev) => { if (ev.target.closest('.tbb') || e.classList.contains('max')) return; d = { x: ev.clientX - e.offsetLeft, y: ev.clientY - e.offsetTop }; tb.setPointerCapture(ev.pointerId); });
    tb.addEventListener('pointermove', (ev) => { if (!d) return; e.style.left = Math.max(-200, Math.min(innerWidth - 80, ev.clientX - d.x)) + 'px'; e.style.top = Math.max(0, Math.min(innerHeight - 60, ev.clientY - d.y)) + 'px'; });
    tb.addEventListener('pointerup', () => { d = null; });
    tb.addEventListener('dblclick', () => e.classList.toggle('max'));
    focus(rec); return { close: closeW, el: e };
  }
  let explorer = null;
  function openProject(p) {
    if (p.play) {                                    // projet jouable (Village Talas) : fenêtre agrandie plein écran avec le jeu
      const body = el('div'); body.style.cssText = 'display:flex;flex:1;min-height:0;background:#000';
      body.innerHTML = `<iframe title="${esc(p.title)}" allow="autoplay; fullscreen; gamepad" allowfullscreen src="${CV}${p.url}" style="flex:1;border:0;width:100%;height:100%"></iframe>`;
      const w = win({ title: `${p.title} - Windows Media Player`, icon: FOLDER('g' + p.id), w: innerWidth, h: innerHeight - 30, body, x: 0, y: 0 });
      w.el.classList.add('max'); const r = [...wins].find((x) => x.el === w.el); if (r) focus(r);
      return;
    }
    const pg = PAGES[p.id]; if (!pg) return;
    const body = el('div'); body.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0';
    body.innerHTML = `<div class="menu"><span>Fichier</span><span>Edition</span><span>Affichage</span><span>Favoris</span><span>Outils</span><span>?</span></div>
      <div class="tool"><button data-r>Actualiser</button></div>
      <div class="addr">Adresse<div>C:\\Projets pro\\${esc(p.title)}.htm</div></div>
      <div class="pg"><div class="pgin">${pg.html}</div></div>
      <div class="st"><span>Terminé</span><span>Internet</span></div>`;
        const w = win({ title: `${p.title} - Microsoft Internet Explorer`, icon: IE, w: 820, h: 600, body, x: Math.max(6, innerWidth * 0.1), y: 20 });
    body.querySelector('[data-r]').onclick = () => { body.querySelector('.pg').scrollTop = 0; };
  }
  function openExplorer() {
    if (explorer && wins.has([...wins].find((r) => r.el === explorer.el))) { const r = [...wins].find((x) => x.el === explorer.el); focus(r); return; }
    const body = el('div'); body.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0';
    body.innerHTML = `<div class="menu"><span>Fichier</span><span>Edition</span><span>Affichage</span><span>Favoris</span><span>Outils</span><span>?</span></div>
      <div class="tool"><button disabled>◀ Précédent</button><button disabled>▶</button><button disabled>▲</button></div>
      <div class="addr">Adresse<div>C:\\Documents and Settings\\Mathieu\\Projets pro</div></div>
      <div class="exp"><div class="side"><div class="pane"><h4>Gestion des fichiers</h4><div><a>Ouvrir un projet</a></div></div><div class="pane"><h4>Détails</h4><div><b>Projets pro</b><br>Dossier de fichiers<br>${PRO.length} projets</div></div></div>
      <div class="files"></div></div><div class="st"><span>${PRO.length} objet(s)</span><span>Poste de travail</span></div>`;
    const files = body.querySelector('.files');
    PRO.forEach((p, i) => { const f = el('div', 'file', `${FOLDER('p' + i)}<span>${esc(p.title)}</span>`); f.title = p.sub; f.onclick = () => openProject(p); files.append(f); });
    body.querySelector('.pane a').onclick = () => openProject(PRO[0]);
    explorer = win({ title: 'Projets pro', icon: FOLDER('ex'), w: 700, h: 470, body, x: Math.max(6, innerWidth * 0.12), y: 40 });
  }
  ico.onclick = () => { ico.classList.add('sel'); openExplorer(); };
  wall.onclick = () => { ico.classList.remove('sel'); smenu.classList.remove('on'); };
  start.onclick = (e) => { e.stopPropagation(); smenu.classList.toggle('on'); };
  smenu.addEventListener('click', (e) => { const a = e.target.closest('[data-a]'); if (!a) return; smenu.classList.remove('on'); if (a.dataset.a === 'pro') openExplorer(); else off(); });
  function off() { shut.classList.add('on'); clearInterval(clk); setTimeout(() => { hide(root, () => { root.remove(); }); onClose(); }, 900); window.removeEventListener('keydown', key); }
  function key(e) { if (e.key === 'Escape') { if (smenu.classList.contains('on')) smenu.classList.remove('on'); else { const l = [...wins].pop(); if (l) l.el.querySelector('[data-b=x]').click(); else off(); } } }
  window.addEventListener('keydown', key);
  show(root);
  setTimeout(openExplorer, 450);
  return { close: off };
}

/* ───────────────────────── liaison avec la pièce 3D ───────────────────────── */
export function initUI() {
  inject();
  let cur = null;
  window.addEventListener('room-open', (e) => {
    if (cur) return;
    const done = () => { cur = null; window.dispatchEvent(new CustomEvent('room-close', { detail: e.detail })); };
    cur = e.detail.kind === 'xp' ? xpApp(done) : retroApp(done);
  });
}

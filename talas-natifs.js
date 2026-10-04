/* Ressources natives : Atomiswave TEXH/ANMH et PS1 PIN/GT3/GT4.
 * Le moteur TALAS reste responsable des questions, dégâts, collisions et sauvegardes.
 * Décors et effets natifs ; personnages TALAS redessinés dans chaque direction artistique.
 * Les durées des séquences Atomiswave et PS1 pilotent les poses personnalisées. */
(() => {
  'use strict';
  const BASE = 'assets/talas-natifs/', images = new Map(), textures = new Map();
  function json(url) {
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest(); x.open('GET', url);
      x.onload = () => { try { if (x.status && x.status !== 200) throw Error(url + ': ' + x.status); resolve(JSON.parse(x.responseText)); } catch (e) { reject(e); } };
      x.onerror = () => reject(Error('Lecture impossible : ' + url)); x.send();
    });
  }
  function image(url) {
    if (!images.has(url)) images.set(url, new Promise((resolve, reject) => {
      const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(Error(url)); im.src = url;
    }));
    return images.get(url);
  }
  const N = window.TALAS_NATIFS = { ready: false, error: null, stats: { combatFrames: 0, pinkFrames: 0 }, json, image };
  N.preload = Promise.all([json(BASE + 'runtime.json'), json(BASE + 'pink/runtime.json'), json(BASE + 'characters/characters.json')]).then(async ([hk, pink, characters]) => {
    N.hk = hk; N.pink = pink; N.characters = characters;
    for (const f of [...Object.values(characters.combat), characters.pink]) f.sheets = await Promise.all(f.atlases.map(x => image(BASE + 'characters/' + x)));
    N.portraits = { d: await image(BASE + 'characters/portrait-d.png'), c: await image(BASE + 'characters/portrait-c.png') };
    N.loadOriginalSprites = () => N.originalSprites || (N.originalSprites = Promise.all(Object.values(hk.fighters).map(async f => f.sheets = await Promise.all(f.atlases.map(x => image(BASE + x))))));
    hk.bg = await Promise.all(hk.backgrounds.map(x => image(BASE + x)));
    hk.fx = {};
    for (const [k, files] of Object.entries(hk.effects)) hk.fx[k] = await Promise.all(files.map(x => image(BASE + x)));
    pink.surfaceImages = {};
    for (const [k, f] of Object.entries(pink.surfaces)) pink.surfaceImages[k] = await image(BASE + 'pink/' + f);
    const files = [...new Set(Object.values(pink.models).flatMap(m => Object.keys(m.materials)))];
    await Promise.all(files.map(async file => {
      const im = await image(BASE + 'pink/' + file), t = new THREE.Texture(im); t.needsUpdate = true;
      t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; textures.set(file, t);
    }));
    N.combat = await window.TALAS_COMBAT.preload(N);
    N.ready = true; return N;
  }).catch(e => { N.error = String(e); console.error('[ressources natives]', e); throw e; });

  function clipFrame(clip, ticks, loop = true) {
    let t = loop ? ticks % Math.max(1, clip.ticks) : Math.min(ticks, clip.ticks - 1);
    for (const f of clip.frames) { t -= Math.max(1, f.ticks); if (t < 0) return f; }
    return clip.frames[clip.frames.length - 1];
  }
  function sprite(g, data, sp, x, y, scale, flip) {
    const im = data.images[sp.image]; if (!im) return;
    const [sx, sy, w, h] = im.rect;
    g.save(); g.translate(x, y); g.scale(flip ? -scale : scale, scale);
    g.drawImage(data.sheets[im.sheet], sx, sy, w, h, sp.x + im.crop[0], sp.y + im.crop[1], w, h); g.restore();
  }
  N.drawMotion = (g, role, id, ticks, x, y, scale, flip = false) => {
    const data = N.hk.fighters[role], clip = data.clips[id] || data.clips[0];
    if (!data.sheets) { N.loadOriginalSprites(); return; }
    for (const sp of clipFrame(clip, ticks).sprites) sprite(g, data, sp, x, y, scale, flip);
  };
  function drawCharacter(g, data, index, x, y, scale, flip = false) {
    if(!Number.isInteger(index)||!data.frames[index]){N.stats.invalidPose={index};index=0;}
    const f = data.frames[index], [sx, sy, w, h] = f.rect;
    g.save(); g.translate(x, y); g.scale((flip ? -1 : 1) * scale * data.scale, scale * data.scale);
    g.drawImage(data.sheets[f.sheet], sx, sy, w, h, f.x, f.y, w, h); g.restore();
  }
  N.drawCharacter = drawCharacter;
  function personalSprite(kind = 'd') {
    const root = new THREE.Group(), canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const texture = new THREE.CanvasTexture(canvas); texture.magFilter = texture.minFilter = THREE.NearestFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:texture, transparent:true, alphaTest:.03, depthWrite:false, fog:true}));
    sp.scale.set(4.8,4.8,1); sp.position.y=2.25; sp.userData.talasDrawing=true; root.add(sp);
    let previous=-1, facing=0;
    root.userData.update=(id,frame,face=1)=>{
      const data=N.characters.pink, seq=data.sequences[kind==='c'?'boss':id]||data.sequences['0'];
      const index=seq[Math.floor(frame/3)%seq.length]; if(index===previous&&face===facing)return;
      previous=index;facing=face; const g=canvas.getContext('2d');g.clearRect(0,0,512,512);g.imageSmoothingEnabled=false;
      drawCharacter(g,data,index,256,490,1.5,face<0);texture.needsUpdate=true;N.stats.pinkPose=index;
    };
    root.userData.update(0,0); return root;
  }
  N.personalSprite=personalSprite;
  if (window.TALAS_HK) {
    TALAS_HK.arene = () => {};
    TALAS_HK.attacher = c => window.TALAS_COMBAT.attach(c,N);
  }

  function mesh(name) {
    const T = THREE, model = N.pink.models[name]; if (!model) return null;
    const root = new T.Group(), parts = [];
    for (const [file, faces] of Object.entries(model.materials)) {
      const p = [], uv = [], color = [], ids = [];
      for (const f of faces) for (const k of (f.indices.length === 4 ? [0, 1, 2, 1, 3, 2] : [0, 1, 2])) {
        const id = f.indices[k], v = model.vertices[id]; ids.push(id); p.push(v[0], -v[1], -v[2]);
        uv.push((f.uv[k][0] + .5) / 256, 1 - (f.uv[k][1] + .5) / 256);
        color.push(...f.color[k].map(x => Math.min(1, x / 128)));
      }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(p, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new T.Float32BufferAttribute(color, 3));
      const m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: textures.get(file), vertexColors: true, side: T.DoubleSide, alphaTest: .05, transparent: false, fog: true }));
      m.frustumCulled = false; root.add(m); parts.push({ geo, ids });
    }
    root.userData.native = { model, parts }; return root;
  }
  function skeleton(name, clipId, frame, attachment) {
    const T = THREE, a = N.pink.animations[name], clip = a.clips[clipId] || a.clips[0] || { frames: 1, tracks: [] }, transforms = [];
    for (let i = 0; i < a.bones.length; i++) {
      const bone = a.bones[i], track = clip.tracks.find(t => t.bone === i), pos = new T.Vector3(...bone.translation), q = new T.Quaternion();
      if (track?.keys.length) {
        const keys = track.keys, t = frame % Math.max(1, clip.frames); let j = 0; while (j < keys.length - 1 && keys[j + 1].frame <= t) j++;
        const k0 = keys[j], k1 = keys[Math.min(j + 1, keys.length - 1)], u = Math.max(0, Math.min(1, (t - k0.frame) / Math.max(1, k1.frame - k0.frame)));
        pos.set(...k0.p).lerp(new T.Vector3(...k1.p), u); q.set(...k0.q).normalize().slerp(new T.Quaternion(...k1.q).normalize(), u);
      }
      const m = new T.Matrix4().compose(pos, q, new T.Vector3(1, 1, 1));
      if (bone.parent >= 0) m.premultiply(transforms[bone.parent]); else if (attachment) m.premultiply(attachment);
      transforms.push(m);
    }
    return transforms;
  }
  function deform(obj, name, mats) {
    const a = N.pink.animations[name], { model, parts } = obj.userData.native, order = a.bones.map((b, i) => [b.first, i]).filter(x => x[0] >= 0).sort((x, y) => x[0] - y[0]);
    const vs = model.vertices.map((v, id) => {
      let bone = order[0]?.[1] || 0; for (const [first, i] of order) { if (first > id) break; bone = i; }
      const p = new THREE.Vector3(...v).applyMatrix4(mats[bone]); return [p.x, -p.y, -p.z];
    });
    for (const { geo, ids } of parts) { const p = geo.attributes.position; ids.forEach((id, i) => p.setXYZ(i, ...vs[id])); p.needsUpdate = true; }
  }
  function actor() {
    const root = new THREE.Group(), bottom = mesh('PINKY_BOTTOM'), top = mesh('PINKY_TOP'); root.add(bottom, top);
    function update(id, frame) {
      const b = skeleton('PINKY_BOTTOM', id, frame); deform(bottom, 'PINKY_BOTTOM', b);
      const t = skeleton('PINKY_TOP', id, frame, b[1]); deform(top, 'PINKY_TOP', t);
    }
    update(0, 0); root.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(root), height = bb.max.y - bb.min.y;
    root.scale.setScalar(4.2 / Math.max(1, height)); root.position.y = -bb.min.y * root.scale.x;
    root.userData.update = update; root.userData.nativeHeight = height; return root;
  }
  N.mesh = mesh; N.actor = actor;
  const sounds = { jump: 'SOUND-21-p_saut.wav', spin: 'SOUND-12-p_attac.wav', coin: 'SOUND-25-piece1.wav', heart: 'SOUND-08-coeur.wav', hurt: 'SOUND-11-p_aie.wav', land: 'SOUND-20-p_recep.wav' };
  function sound(name) { const a = new Audio(BASE + 'sounds/' + sounds[name]); a.volume = .4; a.play().catch(() => {}); N.stats.lastSound = name; if (N.audioEvents) N.audioEvents.push({ time: performance.now(), name, file: BASE + 'sounds/' + sounds[name] }); }
  let world = null;
  if (window.TALAS_DA) {
    const DA = window.TALAS_DA, oldPatch = DA.patch, oldApply = DA.apply;
    DA.rendu=DA.rendu||{exp:1,contraste:1.04,sat:1.14,ombre:[.95,.95,1.12],lumiere:[1.06,1.02,.94],split:.4,ao:.35,ct:.18,encre:.14,encreCouleur:[.14,.06,.14],bloom:.18,seuil:.85,vignette:.55,grain:.03,dof:0,peint:1,rim:0,rimCouleur:'#ffd0e0'};
    function nativePaint(pt, np) {
      for (const [k, file] of Object.entries({ floor: '011-PATH_01.png', wood: '013-PATH_01.png', crate: '023-PATH_01.png', fence: '024-PATH_01.png', cladding: '028-PATH_01.png', concrete: '030-PATH_02.png', steel: '056-TABLE_02.png', yellow: '058-TABLE_02.png', checker: '058-TABLE_02.png', hangar: '028-PATH_01.png' })) {
        const draw = (g, w, h) => {
          const im = N.pink?.surfaceImages[k]; if (!im) { N.preload.then(() => draw(g, w, h)); return; }
          g.imageSmoothingEnabled = false; const pattern = g.createPattern(im, 'repeat'); g.fillStyle = pattern; g.fillRect(0, 0, w, h);
        };
        pt[k] = [128, 128, draw]; np[k] = 1;
      }
    }
    DA.apply = () => { oldApply.call(DA); nativePaint(DA.PTD, DA.NOP); };
    DA.patch = (pt, np) => { oldPatch.call(DA, pt, np); if (DA.on) nativePaint(pt, np); };
    DA.decor = () => {};
    DA.monde = c => {
      world = { ...c, t: 0, current: -1, actor: null, pending: true };
      const w = world;
      N.preload.then(() => {
        if (world !== w || !c.body) return;
        c.body.traverse(o => { if (o.isMesh || o.isSprite) o.visible = false; });
        const a = personalSprite('d'); c.body.add(a); c.body.userData.pinkNative = true; w.actor = a; w.pending = false;
        if(c.boss){c.boss.traverse(o=>{if(o.isMesh||o.isSprite)o.visible=false});w.boss=personalSprite('c');c.boss.add(w.boss);}
        w.previous = { ground: c.st.ground, spin: c.st.spinT, coins: c.st.coins, hp: c.st.hp };
        w.spin = mesh('TORNADE');
        if (w.spin) {
          if (N.pink.animations.TORNADE) deform(w.spin, 'TORNADE', skeleton('TORNADE', 0, 0));
          const b = new THREE.Box3().setFromObject(w.spin), z = new THREE.Vector3(); b.getSize(z); w.spin.scale.setScalar(2.5 / Math.max(1, z.x, z.y, z.z)); w.spin.visible = false; c.s.add(w.spin);
        }
        c.s.background = new THREE.Color('#7991c2');
        const names = ['ECHAFO_03','SAC','BETO_05','BOIS_09','BOIS2_09','TUYO_07','FOND_04'];
        for (let i = 0; i < 24; i++) {
          const o = mesh(names[i % names.length]); if (!o) continue;
          const bb = new THREE.Box3().setFromObject(o), sz = new THREE.Vector3(); bb.getSize(sz); const sc = (i % 7 === 0 ? 12 : 5) / Math.max(1, sz.x, sz.y);
          o.scale.setScalar(sc); o.position.set(8 + i * 10, -bb.min.y * sc, -6 - (i % 3) * 2); c.s.add(o);
        }
        for (const it of c.PICK) if (it.kind === 'coin' || it.kind === 'heart') {
          const o = mesh(it.kind === 'coin' ? 'PIECE' : 'COEUR'); if (!o) continue;
          const anim = N.pink.animations[it.kind === 'coin' ? 'PIECE' : 'COEUR'];
          if (anim) deform(o, it.kind === 'coin' ? 'PIECE' : 'COEUR', skeleton(it.kind === 'coin' ? 'PIECE' : 'COEUR', 0, 0));
          const bb = new THREE.Box3().setFromObject(o), sz = new THREE.Vector3(); bb.getSize(sz); o.scale.setScalar(.75 / Math.max(1, sz.x, sz.y, sz.z));
          it.m.children.forEach(k => k.visible = false); it.m.add(o);
        }
      });
    };
    DA.tick = dt => {
      if (!world?.actor) return; const w = world, st = w.st; w.t += dt;
      let id = st.stun ? 12 : st.spinT > 0 ? 8 : !st.ground ? (st.vel.y > 0 ? 5 : 6) : Math.abs(st.vel.x) > .3 ? 3 : 0;
      if (id !== w.current) { w.current = id; w.t = 0; }
      w.actor.userData.update(st.climb?'climb':id, w.t * 30,st.face||1); N.stats.pinkFrames++; N.stats.pinkClip = id;
      w.body.traverse(o=>{if((o.isMesh||o.isSprite)&&!o.userData.talasDrawing){let p=o,held=false;while(p&&p!==w.body){if(p===w.held){held=true;break;}p=p.parent;}if(!held)o.visible=false}});
      w.actor.children[0].material.rotation=w.body.rotation.z;
      if(w.boss)w.boss.userData.update(0,w.t*8,-1);
      if (w.spin) { w.spin.visible = st.spinT > 0; w.spin.position.copy(st.pos); w.spin.position.y += .75; w.spin.rotation.y += dt * 20; }
      const p = w.previous;
      if (p.ground && !st.ground && st.vel.y > 1) sound('jump');
      if (!p.ground && st.ground) sound('land');
      if (st.spinT > 0 && p.spin <= 0) sound('spin');
      if (st.coins > p.coins) sound('coin');
      if (st.hp < p.hp) sound('hurt'); else if (st.hp > p.hp) sound('heart');
      w.previous = { ground: st.ground, spin: st.spinT, coins: st.coins, hp: st.hp };
    };
    N.getWorld = () => world;
  }
})();

const instrument = document.querySelector('[data-mqse-inspector]');

if (instrument) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let hovered = false, pinned = false, px = 0, py = 0;
  let redraw = () => {};
  function update() {
    instrument.toggleAttribute('data-open', hovered || pinned);
    instrument.setAttribute('aria-pressed', String(pinned));
    redraw();
  }
  instrument.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      hovered = true;
      update();
    }
  });
  instrument.addEventListener('pointermove', event => {
    if (!hovered || reduced.matches) return;
    const bounds = instrument.getBoundingClientRect();
    px = (event.clientX - bounds.left) / bounds.width - .5;
    py = (event.clientY - bounds.top) / bounds.height - .5;
    redraw();
  });
  instrument.addEventListener('pointerleave', () => {
    hovered = false;
    px = py = 0;
    update();
  });
  instrument.addEventListener('click', () => {
    pinned = !pinned;
    update();
  });
  instrument.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    hovered = pinned = false;
    px = py = 0;
    update();
  });

  import('three').then(T => {
    const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    const scene = new T.Scene(), device = new T.Group();
    const camera = new T.OrthographicCamera(-3,3,1.7,-1.7,.1,40);
    camera.position.set(0,0,9);
    scene.add(device, new T.HemisphereLight(0xffffff,0x4b6490,2.25));
    const key = new T.DirectionalLight(0xfff1dc,3.1);
    key.position.set(-3,5,7);
    const rim = new T.DirectionalLight(0x8ecaff,1.8);
    rim.position.set(4,1,-3);
    scene.add(key,rim);

    const metal = new T.MeshStandardMaterial({ color: 0xc6d7db, roughness: .32, metalness: .26 });
    const shell = new T.MeshStandardMaterial({ color: 0x54717c, roughness: .43, metalness: .2 });
    const black = new T.MeshStandardMaterial({ color: 0x112234, roughness: .38 });
    const rubber = new T.MeshStandardMaterial({ color: 0x293f46, roughness: .76 });
    const orange = new T.MeshStandardMaterial({ color: 0xff973b, roughness: .52 });
    const pcb = new T.MeshStandardMaterial({ color: 0x226952, roughness: .63 });
    const copper = new T.MeshStandardMaterial({ color: 0xe3af64, roughness: .44, metalness: .42 });
    const glass = new T.MeshStandardMaterial({ color: 0x174c46, roughness: .18, emissive: 0x063e30, emissiveIntensity: .25 });
    const display = new T.MeshBasicMaterial({ color: 0xbaf7d7 });
    const rear = new T.Group(), board = new T.Group(), face = new T.Group(), reader = new T.Group();
    device.add(rear, board, face, reader);

    function rounded(w,h,d,r,mat,g,x=0,y=0,z=0) {
      const a=-w/2,b=-h/2,c=w/2,e=h/2, shape=new T.Shape();
      shape.moveTo(a+r,b);shape.lineTo(c-r,b);shape.quadraticCurveTo(c,b,c,b+r);
      shape.lineTo(c,e-r);shape.quadraticCurveTo(c,e,c-r,e);
      shape.lineTo(a+r,e);shape.quadraticCurveTo(a,e,a,e-r);
      shape.lineTo(a,b+r);shape.quadraticCurveTo(a,b,a+r,b);
      const bevel=Math.min(.055,d*.25);
      const geo=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,steps:1,curveSegments:8});
      geo.translate(0,0,-d/2);
      const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);g.add(mesh);return mesh;
    }
    function disk(r,d,mat,g,x,y,z) {
      const mesh=new T.Mesh(new T.CylinderGeometry(r,r,d,24),mat);
      mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);g.add(mesh);
    }
    rounded(1.34,1.86,.34,.18,shell,rear,0,-.06,-.24);
    rounded(.98,1.20,.1,.13,rubber,rear,0,-.18,-.44);
    for (const y of [-.61,-.37,-.13,.11]) rounded(.86,.045,.035,.021,metal,rear,0,y,-.5);
    rounded(1.10,1.63,.07,.12,pcb,board,0,-.06,-.015);
    rounded(.46,.35,.1,.04,black,board,-.05,.22,.07);
    for (const x of [-.46,-.34,-.22,-.1,.02,.14,.26,.38]) {
      rounded(.048,.34,.015,.018,copper,board,x,-.43,.045);
    }
    for (const x of [-.44,.43]) for (const y of [-.73,.62]) disk(.044,.022,copper,board,x,y,.05);
    rounded(1.37,1.86,.20,.19,metal,face,0,-.06,.18);
    rounded(1.14,1.62,.065,.13,black,face,0,-.06,.31);
    rounded(.91,.68,.07,.075,glass,face,0,.30,.37);
    rounded(.62,.023,.015,.01,display,face,0,.49,.42);
    for (const [index,height] of [.10,.19,.14,.28,.34].entries()) {
      rounded(.078,height,.015,.017,display,face,-.28+index*.14,.07+height/2,.42);
    }
    disk(.17,.065,orange,face,0,-.39,.38);
    for (const x of [-.33,.33]) disk(.081,.038,shell,face,x,-.42,.37);
    for (const x of [-.43,.43]) disk(.035,.018,metal,face,x,-.73,.37);
    rounded(1.18,.23,.42,.10,orange,reader,0,.912,-.02);
    rounded(.79,.094,.075,.039,black,reader,0,.92,.24);
    rounded(.58,.025,.024,.011,glass,reader,0,.92,.285);
    instrument.append(renderer.domElement);
    instrument.dataset.ready = '';

    let frame = 0, blend = 0, rx = .12, ry = -.38, last = 0, visible = true;
    function draw(now) {
      frame = 0;
      if (!visible || !instrument.clientWidth || !instrument.clientHeight) return;
      const factor = reduced.matches ? 1 : 1 - Math.exp(-Math.min(50, last ? now-last : 16)/145);
      const target = Number(hovered || pinned), destX = .12 + py*.48, destY = -.38 + px*.68;
      last = now;
      blend += (target-blend)*factor;
      rx += (destX-rx)*factor; ry += (destY-ry)*factor;
      device.rotation.set(rx,ry,-.13+.18*blend);
      device.position.y=-.16;
      rear.position.set(-1.03*blend,-.14*blend,-.18*blend);
      board.position.set(.05*blend,-.27*blend,.12*blend);
      face.position.set(1.03*blend,.04*blend,.24*blend);
      reader.position.set(.04*blend,.42*blend,-.13*blend);
      rear.rotation.y=-.36*blend; face.rotation.y=.31*blend;
      renderer.render(scene,camera);
      if (Math.max(Math.abs(target-blend),Math.abs(destX-rx),Math.abs(destY-ry))>.001) redraw();
      else last = 0;
    }
    redraw = () => { if (visible && !frame) frame = requestAnimationFrame(draw); };
    function resize() {
      const width=instrument.clientWidth,height=instrument.clientHeight;
      if (!width || !height) return;
      const ratio=width/height, halfHeight=Math.max(1.84,2.42/ratio);
      camera.left=-halfHeight*ratio; camera.right=halfHeight*ratio;
      camera.top=halfHeight; camera.bottom=-halfHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(width,height,false);
      redraw();
    }
    new ResizeObserver(resize).observe(instrument);
    new IntersectionObserver(([entry]) => {
      visible=entry.isIntersecting;
      if (visible) redraw();
    }).observe(instrument);
    reduced.addEventListener('change', redraw);
    renderer.domElement.addEventListener('webglcontextlost', () => { delete instrument.dataset.ready; renderer.domElement.hidden = true; });
    resize();
  }).catch(() => {
    // Le dessin CSS conserve la vue éclatée si le navigateur ne dispose pas de WebGL.
  });
}

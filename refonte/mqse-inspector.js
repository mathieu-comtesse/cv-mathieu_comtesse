const instrument = document.querySelector('[data-mqse-inspector]');

if (instrument) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const circuit = document.createElement('canvas');
  circuit.className = 'cv-inspector-circuit';
  circuit.setAttribute('aria-hidden', 'true');
  instrument.prepend(circuit);
  const ink = circuit.getContext('2d');
  const labels = [...instrument.querySelectorAll('.cv-inspector-flow')];
  let hover = 0, selection = 0, px = 0, py = 0;
  let shown = 0, direction = 0, iris = 0, frame = 0, previous = 0, inView = true;
  let redraw = () => {};
  labels.forEach(flow => [...flow.children].forEach((label,index) => {
    label.style.setProperty('--cv-route-delay', index*40+'ms');
  }));

  function paint(now) {
    frame = 0;
    const target = hover || selection;
    const dt = Math.min(50, previous ? now - previous : 16);
    previous = now;
    const approach = (value, end, delay) => reduced.matches || Math.abs(end-value)<.003
      ? end : value + (end-value)*(1-Math.exp(-dt/delay));
    const previousDirection = direction, previousIris = iris;
    direction = approach(direction, target, 102);
    iris = approach(iris, Number(target !== 0), target ? 125 : 86);
    if (target) shown = target;
    if (previousDirection !== direction || previousIris !== iris) {
      instrument.style.setProperty('--cv-device-x', String(-direction));
      redraw();
    }
    if (ink) drawCircuit(now);
    if ((!reduced.matches && iris) || direction !== target) schedule();
    else previous = 0;
  }

  function drawCircuit(now) {
    const width = instrument.clientWidth, height = instrument.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    if (circuit.width !== Math.round(width*ratio) || circuit.height !== Math.round(height*ratio)) {
      circuit.width = Math.round(width*ratio);
      circuit.height = Math.round(height*ratio);
    }
    ink.setTransform(ratio,0,0,ratio,0,0);
    ink.clearRect(0,0,width,height);
    if (!iris) return;
    const cx = width*(.5-direction*.23), cy = height*.55;
    const radius = Math.min(width*.155,height*.33);
    const junction = cx + shown*radius;
    ink.globalAlpha = iris;
    ink.strokeStyle = '#b8dcff66';
    ink.lineWidth = .8;
    ink.beginPath();
    ink.ellipse(cx,cy,radius,radius*.88,0,0,Math.PI*2);
    ink.stroke();
    for (let index=0;index<labels[shown===-1?0:1].childElementCount;index++) {
      const x = shown === 1 ? width*.96 : width*.04;
      const y = cy + (index-1)*Math.min(34,height*.21);
      const end = shown === 1 ? width*.65 : width*.35;
      const length = iris*iris*(3-2*iris);
      const point = t => ({
        x: junction+(end-junction)*t,
        y: cy+(y-cy)*t*t*(3-2*t)
      });
      ink.beginPath();
      for (let j=0;j<=20;j++) {
        const p = point(Math.min(1,(j/20)*length*1.12));
        if(j) ink.lineTo(p.x,p.y);
        else ink.moveTo(p.x,p.y);
      }
      if(length>.9) ink.lineTo(end+(x-end)*(length-.9)*10,y);
      ink.stroke();
      if (!reduced.matches) {
        const phase = (now/1350 + index*.26)%1;
        const p = point(shown === 1 ? phase : 1-phase);
        ink.globalAlpha = iris*Math.sin(phase*Math.PI);
        ink.fillStyle = '#ecfaff';
        ink.beginPath();
        ink.arc(p.x,p.y,1.8,0,Math.PI*2);
        ink.fill();
        ink.globalAlpha = iris;
      }
    }
    ink.fillStyle = '#ecfaff';
    ink.beginPath();
    ink.arc(junction,cy,2.7,0,Math.PI*2);
    ink.fill();
    ink.globalAlpha = 1;
  }

  function schedule() {
    if (!frame && inView) frame = requestAnimationFrame(paint);
  }

  function update() {
    const view = hover || selection;
    instrument.toggleAttribute('data-open', view !== 0);
    instrument.dataset.view = view === -1 ? 'terrain' : view === 1 ? 'suivi' : 'overview';
    instrument.setAttribute('aria-pressed', String(selection !== 0));
    redraw();
    schedule();
  }

  instrument.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const bounds = instrument.getBoundingClientRect();
    px = (event.clientX - bounds.left) / bounds.width - .5;
    py = (event.clientY - bounds.top) / bounds.height - .5;
    // Une bande centrale évite de changer de côté au moindre mouvement du pointeur.
    if (!selection && (Math.abs(px) > .10 || !hover)) hover = px < 0 ? -1 : 1;
    update();
  });
  instrument.addEventListener('pointerleave', () => {
    hover = px = py = 0;
    update();
  });
  instrument.addEventListener('click', event => {
    const bounds = instrument.getBoundingClientRect();
    const side = event.detail ? (event.clientX < bounds.left+bounds.width/2 ? -1 : 1) : 0;
    selection = side ? (selection === side ? 0 : side) : selection === 0 ? -1 : selection === -1 ? 1 : 0;
    hover = 0;
    update();
  });
  instrument.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Escape'].includes(event.key)) return;
    event.preventDefault();
    selection = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    hover = px = py = 0;
    update();
  });
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) schedule();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = previous = 0;
    }
  }).observe(instrument);
  new ResizeObserver(schedule).observe(instrument);
  reduced.addEventListener('change', schedule);

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

    let renderFrame = 0, blend = 0, rx = .12, ry = -.38, last = 0, visible = true;
    function draw(now) {
      renderFrame = 0;
      if (!visible || !instrument.clientWidth || !instrument.clientHeight) return;
      const factor = reduced.matches ? 1 : 1 - Math.exp(-Math.min(50, last ? now-last : 16)/145);
      const target = .40*iris, destX = .12 + py*.36, destY = -.34 + px*.4;
      last = now;
      blend += (target-blend)*factor;
      rx += (destX-rx)*factor; ry += (destY-ry)*factor;
      device.rotation.set(rx,ry,-.13+.18*blend);
      device.position.set(-direction*camera.right*.46,-.16,0);
      device.scale.setScalar(1-.15*iris);
      rear.position.set(-1.03*blend,-.14*blend,-.18*blend);
      board.position.set(.05*blend,-.27*blend,.12*blend);
      face.position.set(1.03*blend,.04*blend,.24*blend);
      reader.position.set(.04*blend,.42*blend,-.13*blend);
      rear.rotation.y=-.36*blend; face.rotation.y=.31*blend;
      renderer.render(scene,camera);
      if (Math.max(Math.abs(target-blend),Math.abs(destX-rx),Math.abs(destY-ry))>.001) redraw();
      else last = 0;
    }
    redraw = () => { if (visible && !renderFrame) renderFrame = requestAnimationFrame(draw); };
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

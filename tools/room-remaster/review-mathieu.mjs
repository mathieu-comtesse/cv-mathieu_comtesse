import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const base = 'http://room.test';
const target = resolve(process.argv[2] || 'test-results/mathieu');
const remaster = process.argv.includes('--remaster');
const mime = {'.html':'text/html','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp'};
const fixture = '<!doctype html><html><meta charset="UTF-8"><style>body{margin:0;background:#e9e6dd}</style>'
  + '<script type="importmap">{"imports":{"three":"/vendor/three.module.min.js","three/addons/":"/vendor/"}}</script>'
  + '<script type="module">import * as T from "three";import {createCharacter} from "/js/character.js";window.T=T;'
  + 'window.hero=await createCharacter({remaster:' + remaster + '});hero.poseStanding();</script></html>';
await mkdir(target, {recursive:true});
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE, args: ['--enable-webgl','--ignore-gpu-blocklist','--use-angle=' + (process.env.SCENE_WEBGL_BACKEND || 'swiftshader')] });
try {
  const page = await browser.newPage({ viewport: {width:720,height:800} });
  page.on('pageerror', e => console.error(e.message));
  await page.route(base + '/**', async route => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    if (pathname === '/_hero') return route.fulfill({body:fixture,contentType:'text/html'});
    const file = resolve(root, '.' + pathname);
    if (!file.startsWith(resolve(root) + sep)) return route.abort();
    try { return route.fulfill({body:await readFile(file),contentType:mime[extname(file)]||'application/octet-stream'}); }
    catch { return route.fulfill({status:404}); }
  });
  await page.goto(base+'/_hero');
  await page.waitForFunction(() => window.hero, null, {timeout:45_000});
  const rig = await page.evaluate(() => {
    const { hero, T } = window;
    const anchors = Object.fromEntries(Object.entries(hero.bones).map(([n,b]) => [n, {
      p: b.getWorldPosition(new T.Vector3()).toArray(),
      q: b.getWorldQuaternion(new T.Quaternion()).toArray(),
      m: b.matrixWorld.toArray(),
    }]));
    const names=['Head','jacket','legs','arm','shoes','NB992:left','NB992:right','hair'];
    const bounds=Object.fromEntries(names.map(n => {
      const object=hero.group.getObjectByName(n);
      if(!object) return [n,null];
      const box=new T.Box3().setFromObject(object,true);
      return [n, [box.min.toArray(),box.max.toArray()]];
    }));
    return {anchors,bounds,mesh:hero.group.getObjectByName('MathieuMesh-v2')?.geometry.attributes.position.count};
  });
  if (remaster) {
    const evidence = await page.evaluate(() => {
      const mesh = hero.group.getObjectByName('MathieuMesh-v2');
      const shoes = hero.group.getObjectByName('MathieuSneakers-v2');
      const socks = hero.group.getObjectByName('MathieuSocks-v2');
      hero.setBase('happy');
      const smile = mesh.morphTargetInfluences[mesh.morphTargetDictionary.smile] === 1;
      hero.setShoes(false);
      const bare = !shoes.visible && socks.visible;
      hero.setBase('neutral');
      hero.setShoes(true);
      return {
        smile, bare, hip: hero.hipContactY(),
        liveJoints: mesh.skeleton.bones.every(joint => hero.bones[joint.name] === joint),
        restoredShoes: shoes.visible && !socks.visible,
      };
    });
    for (const key of ['smile','bare','liveJoints','restoredShoes']) assert.ok(evidence[key], key);
    assert.ok(Number.isFinite(evidence.hip) && evidence.hip > .55 && evidence.hip < .75, 'hip contact envelope');
    rig.evidence = evidence;
  }
  await writeFile(resolve(target,'rig.json'), JSON.stringify(rig,null,2)+'\n');
  await page.evaluate(() => {
    const {T,hero}=window;
    const scene=new T.Scene(), renderer=new T.WebGLRenderer({alpha:false,antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(720,800);
    renderer.setClearColor('#e9e6dd');
    renderer.toneMapping=T.NeutralToneMapping;
    scene.add(hero.group);
    const key=new T.DirectionalLight('#ffe4c5',2.1);
    key.position.set(-2,4,3);
    scene.add(key,new T.HemisphereLight('#dae7ff','#9e84a0',1.38));
    const cam=new T.OrthographicCamera(-.9,.9,1,-1,.01,20);
    document.body.append(renderer.domElement);
    window.renderHero=(angle, head=false) => {
      const target=head ? new T.Vector3(0,1.48,.04):new T.Vector3(0,.86,.04);
      const span=head ? .41 : 1.02;
      cam.left=-span*.9;cam.right=span*.9;cam.top=span;cam.bottom=-span;
      cam.updateProjectionMatrix();
      cam.position.set(4*Math.sin(angle),target.y+.14,4*Math.cos(angle));
      cam.lookAt(target);
      renderer.render(scene,cam);
    };
  });
  for (const [name,angle] of [['face',0],['profil',Math.PI/2],['trois-quarts',.57],['dos',Math.PI]]) {
    await page.evaluate(angle=>window.renderHero(angle),angle);
    await page.screenshot({path:resolve(target,name+'.png')});
  }
  await page.evaluate(()=>window.renderHero(.44,true));
  await page.screenshot({path:resolve(target,'portrait.png')});
} finally { await browser.close(); }

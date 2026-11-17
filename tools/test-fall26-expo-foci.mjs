import assert from 'node:assert/strict';
import {cvView,cvAnchor,p,cvUnproject} from '../refonte/moteur.js';
import {chapterStarAnchor} from '../refonte/fall26-chapter-transition.js';

for(const [W,H] of [[1440,900],[1920,1080],[390,844]]){
  const lead=Math.max(0,Math.round(cvAnchor(H).row-H/2));
  for(const mode of [0.6,0.85,1]){
    const view=cvView(mode,W,H,lead);
    const timeline={from:0,to:1,active:1,progress:.5};
    for(const index of [0,1]){
      const target=chapterStarAnchor(index,timeline,W,H);
      // The projected focal point is placed at the same depth as the
      // native 3D chapter constellation, rather than as a detached 2D layer.
      const world=cvUnproject(view,target.x,target.y,75);
      assert.ok(world,`Cannot unproject focus, ${W}x${H} mode=${mode} star=${index}`);
      const projected=p(view,world[0],world[1],75);
      assert.ok(projected,`Cannot project 3D focus, ${W}x${H} mode=${mode}`);
      const error=Math.hypot(target.x-projected.x,target.y-projected.y);
      assert.ok(error<12,`3D focus is ${error.toFixed(2)}px away from calibrated reference`);
    }
  }
}
console.log('PASS projected distinct chapter foci across desktop/mobile Expo cameras');

// Points calculés avec les équations du module Expo Shopify, build 5090151.
// Chaque point est sur la rangée lead + 0,31H, à la hauteur 38.
const projections = [
  { width: 1470, height: 802, samples: [
    [0, 352.800, 248.620], [.25, 372.938, 256.923], [.5, 461.454, 297.981],
    [.75, 510.274, 330.326], [1, 515.383, 334.571]
  ] },
  { width: 390, height: 844, samples: [
    [0, 93.600, 261.640], [.25, 98.943, 270.378], [.5, 122.479, 314.029],
    [.75, 135.419, 348.553], [1, 136.771, 353.087]
  ] }
];
for (const {width, height, samples} of projections) {
  const lead = Math.round(cvAnchor(height).row - height / 2);
  for (const [progress, x, y] of samples) {
    const view = cvView(progress, width, height, lead);
    const point = p(view, width * .24, lead + height * .31, 38);
    const error = Math.hypot(point.x - x, point.y - y);
    assert.ok(error < .01, `Projection Shopify à ${width} × ${height}, phase ${progress}, écart ${error} px`);
  }
}
console.log('PASS 10 Shopify reference camera projections within 0.01 px');

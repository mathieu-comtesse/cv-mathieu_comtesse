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

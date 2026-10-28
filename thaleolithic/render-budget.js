/* Pixel budgets apply to the real Unity framebuffer, including fullscreen and rotation. */
(function(root){
  'use strict';
  function pixelRatio(width,height,dpr,profile){
    const sizes=profile===2?[1920,1080]:profile===1?[1600,900]:[1280,720];
    const landscape=width>=height;
    const maxWidth=landscape?sizes[0]:sizes[1],maxHeight=landscape?sizes[1]:sizes[0];
    return Math.max(.05,Math.min(Math.max(1,dpr||1),maxWidth/Math.max(1,width),maxHeight/Math.max(1,height)));
  }
  root.ThaleolithicRenderBudget=Object.freeze({pixelRatio});
  if(typeof module!=='undefined')module.exports=root.ThaleolithicRenderBudget;
})(typeof window!=='undefined'?window:globalThis);

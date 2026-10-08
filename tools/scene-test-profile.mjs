// Software runners have no graphics card. Keep complete scene/pose assertions
// while caching shadow maps already checked in full GPU visual captures.
export async function sceneTestProfile(page) {
  page.setDefaultTimeout(120000);
  if ((process.env.SCENE_WEBGL_BACKEND || 'swiftshader') !== 'swiftshader') return;
  const profile=await page.evaluate(()=>{
    const r=window.room; r.opts.noAdapt=true; r.renderer.setPixelRatio(.5);
    r.renderer.shadowMap.autoUpdate=false;
    const source=document.querySelector('iframe')?.contentWindow?.shupiHeader?.scene?.shupi;
    if(source?.renderer?.shadowMap) source.renderer.shadowMap.autoUpdate=false;
    return {pixelRatio:r.renderer.getPixelRatio(),liveShadows:false,sourceShadowCache:!!source?.renderer?.shadowMap};
  });
  console.log('SOFTWARE_TEST_PROFILE',JSON.stringify(profile));
}

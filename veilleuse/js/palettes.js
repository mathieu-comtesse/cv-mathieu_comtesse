// Quatre rampes de 6 teintes par région (sombre vers clair). Le shader choisit la rampe d'après la teinte du matériau :
// 0 neutre, 1 chaud, 2 accent froid, 3 vert. Valeurs sRGB brutes, sans conversion.
const hex=h=>[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];
const ramp=a=>a.map(hex);
export const PALETTES={
  forest:{
    ramps:[ramp([0x0a121a,0x13212c,0x20374a,0x33566b,0x587d92,0x9dbac6]),
           ramp([0x120d09,0x33220f,0x6e4a1f,0xc48a3c,0xe8b360,0xffdc92]),
           ramp([0x0c1822,0x17303d,0x274c5e,0x3d6d82,0x6b97aa,0xb6d0da]),
           ramp([0x08140f,0x10261f,0x1b3d33,0x2b5a4b,0x4a7a68,0x7fa597])],
    gamma:0.9,spread:1.0,fog:0x1c3340,rain:[.16,0.4,0.9]},
  crystal:{
    ramps:[ramp([0x14152a,0x20224a,0x2f3470,0x4048a8,0x5a66dc,0x93a0ff]),
           ramp([0x1a1a12,0x3a3a1a,0x757a2a,0xb8c448,0xdce868,0xf8ffa0]),
           ramp([0x1b1d3a,0x2b2f66,0x3c46a0,0x5365d8,0x7e92ff,0xc4ceff]),
           ramp([0x0e1a14,0x17291e,0x233c2b,0x335538,0x4b7249,0x6f9a60])],
    gamma:0.85,spread:1.0,fog:0x2b2e4d,rain:null},
  shore:{
    ramps:[ramp([0x1d1a28,0x35314a,0x4e4d7c,0x6a6aa5,0x8a8fcc,0xb4c0f4]),
           ramp([0x1f1a12,0x3a3226,0x574636,0x76604b,0x9a8466,0xc8b48e]),
           ramp([0x2b3270,0x3f4d9a,0x5570c4,0x6f93e8,0x8fb4f8,0xc2d8ff]),
           ramp([0x1c1f12,0x2f3320,0x434a2c,0x5a6238,0x75804a,0x9aa868])],
    gamma:0.8,spread:1.0,fog:0x5f7fd0,rain:null}
};
// Teintes matériau, multipliées par la lumière. Classe choisie par chroma normalisée dans le shader de post.
export const TINT={neutral:[1,1,1],warm:[1,.62,.34],accent:[.42,.55,1],green:[.4,1,.4]};
export const flatPalette=(id)=>PALETTES[id].ramps.flat().flat();

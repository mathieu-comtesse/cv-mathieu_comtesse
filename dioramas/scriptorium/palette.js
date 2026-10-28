// 64 couleurs : pierre chaude, bois, vélin, encres, habits, peau, laiton, flamme, jardin.
export const P = {
  paper: '#ffffff', vellum: '#f6efdc', vellum2: '#ece0c2', vellum3: '#dccaa0', page: '#fbf6e8',
  stone0: '#e8dfcc', stone1: '#d9ceb7', stone2: '#c8bba1', stone3: '#b5a78b', stone4: '#9d8f74', stone5: '#82765f', stone6: '#665c4a', stone7: '#4b4337',
  wood0: '#c99a62', wood1: '#ad7e4b', wood2: '#8f633a', wood3: '#714c2c', wood4: '#553821', wood5: '#3b2717',
  ink: '#1f1a17', inkLine: '#4a3f36', soot: '#2b2622', dark: '#141110',
  robeBrown0: '#8a6a4a', robeBrown1: '#6e523a', robeBrown2: '#54402e',
  robeGrey0: '#a7a29a', robeGrey1: '#86817a', robeGrey2: '#66625c',
  robeWhite0: '#f1ede4', robeWhite1: '#d8d2c6',
  robeBlack0: '#3a3836', robeBlack1: '#262423',
  cloak0: '#4f6a52', cloak1: '#3a5040',
  skin0: '#f2d3b5', skin1: '#e2b896', skin2: '#c9966c', skin3: '#9c6a46',
  hair0: '#2e241d', hair1: '#5a4231', hair2: '#9a8a78',
  rubric0: '#d2452f', rubric1: '#a8301f', lapis0: '#3f6fb0', lapis1: '#2c4f86', teal0: '#3d8f8a', teal1: '#2a6a67',
  gold0: '#e6c35a', gold1: '#c39a35', brass: '#b08a43',
  iron0: '#6f7275', iron1: '#4a4d50',
  flame0: '#ffe9a0', flame1: '#ffb84d', flame2: '#f07a2a',
  leaf0: '#9cbd6a', leaf1: '#6f9a48', leaf2: '#4b7335', soil: '#6b5340',
  water: '#6aa6b8', ok: '#7fbf5a', rope: '#b89a6a', glass: '#cfe3e6',
};
export const HEX = Object.values(P);
if (HEX.length !== 64) throw new Error('palette : ' + HEX.length + ' couleurs au lieu de 64');

// 64 couleurs : pierre froide, bois, herbe, terre, eau, fer, bannières, papier des assaillants, peau, feu.
export const P = {
  paper: '#ffffff', page: '#fbf7ec', page2: '#efe6cf', page3: '#ddd0b0',
  stone0: '#dcdcd4', stone1: '#c9c9c0', stone2: '#b3b3aa', stone3: '#9a9a91', stone4: '#808078', stone5: '#66665f', stone6: '#4d4d48',
  wood0: '#c7975c', wood1: '#a87a47', wood2: '#8a5f35', wood3: '#6c4727', wood4: '#4f331c',
  grass0: '#b8d27a', grass1: '#9cc05e', grass2: '#7fa84a', grass3: '#628a3a', grass4: '#4a6b2e', moss: '#5f7d3c',
  dirt0: '#d2b483', dirt1: '#b8976a', dirt2: '#977a53',
  water0: '#8cc7d3', water1: '#5fa6b8', water2: '#3e7f94',
  iron0: '#8a9094', iron1: '#666c70', iron2: '#45494c', ink: '#1d1b19',
  lapis0: '#4f7fc4', lapis1: '#345c96', rubric0: '#d6492f', rubric1: '#a8331f', gold0: '#e8c45a', gold1: '#c29a36',
  teal0: '#45a39b', teal1: '#2e7671', teal2: '#1f524f',
  skin0: '#f2d3b5', skin1: '#e0b592', skin2: '#c48f64', skin3: '#93603f',
  hair0: '#2b221c', hair1: '#5c4330', hair2: '#a08b74',
  cloth0: '#7d6a55', cloth1: '#5a6f86', cloth2: '#8a4a3a', leather: '#6b4a2e',
  fire0: '#fff1b0', fire1: '#ffc04d', fire2: '#f2762a', ember: '#b33a1e',
  smoke0: '#e4e2de', smoke1: '#b9b6b0',
  ok: '#7fc25a', leaf0: '#3f6a34', leaf1: '#2f5228', bark: '#5a4632', rope: '#c2a574', glass: '#d3e8ec',
};
export const HEX = Object.values(P);
if (HEX.length !== 64) throw new Error('palette : ' + HEX.length + ' couleurs au lieu de 64');

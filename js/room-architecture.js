import * as THREE from 'three';

const outline = [
  [-4.45, -3.74], [-3.95, -4.45], [3.35, -4.45], [3.92, -3.88],
  [3.92, 3.87], [3.49, 4.48], [1.29, 4.94], [-2.63, 4.94],
  [-4.12, 4.32], [-4.45, 3.66],
];

const bridge = [
  [-4.19, 3.47], [-3.18, 4.44], [-4.80, 6.21], [-6.13, 6.21],
  [-6.34, 5.83], [-5.34, 5.78],
];

function slab(points, depth, lip, top, edge, y) {
  const path = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geometry = new THREE.ExtrudeGeometry(path, {
    depth, bevelEnabled: true, bevelSize: lip, bevelThickness: lip, bevelSegments: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, [top, edge]);
  mesh.position.y = y - depth - lip;
  mesh.receiveShadow = true;
  return mesh;
}

function parquet(points) {
  const timber = ['#826a62', '#8f776b', '#856e67', '#957f71', '#8c7468', '#8e796d', '#82706c']
    .map(hex => new THREE.Color(hex));
  const warm = new THREE.Color('#ce9b63');
  const tint = new THREE.Color();
  const positions = [];
  const colors = [];
  const indices = [];

  // For a convex plan, intersect each slat's horizontal edge with the room
  // perimeter. This gives the actual chamfered endpoints without overdraw.
  function extents(z) {
    const cuts = [];
    for (let i = 0; i < points.length; i++) {
      const [x0, z0] = points[i], [x1, z1] = points[(i + 1) % points.length];
      if ((z0 <= z && z < z1) || (z1 <= z && z < z0)) cuts.push(x0 + (x1 - x0) * (z - z0) / (z1 - z0));
    }
    return [Math.min(...cuts) + .028, Math.max(...cuts) - .028];
  }
  function plank(x0, x1, x2, x3, z0, z1, color) {
    const start = positions.length / 3;
    positions.push(x0, -.004, z0, x1, -.004, z0, x2, -.004, z1, x3, -.004, z1);
    for (const [x, z] of [[x0, z0], [x1, z0], [x2, z1], [x3, z1]]) {
      const desk = Math.exp(-((x + 2.9) ** 2 * .96 + (z - .24) ** 2 * .83));
      const audio = Math.exp(-((x + .72) ** 2 * .49 + (z + 2.3) ** 2 * .98));
      tint.copy(color).lerp(warm, Math.min(.44, desk * .35 + audio * .41));
      colors.push(tint.r, tint.g, tint.b);
    }
    indices.push(start, start + 3, start + 1, start + 1, start + 3, start + 2);
  }
  let row = 0;
  for (let z = -4.422; z < 4.914; z += .295, row++) {
    const z1 = Math.min(z + .289, 4.914);
    const [a, b] = extents(z), [d, c] = extents(z1);
    const joints = Array.from({ length: 3 }, (_, n) => -2.83 + n * 2.47 + (row % 4) * .32);
    const start = Math.max(a, d), end = Math.min(b, c);
    const inside = joints.filter(x => x > start + .11 && x < end - .11);
    for (let k = 0; k <= inside.length; k++) {
      const left = k > 0 ? inside[k - 1] + .004 : null;
      const right = k < inside.length ? inside[k] - .004 : null;
      plank(left ?? a, right ?? b, right ?? c, left ?? d, z, z1, timber[(row * 3 + k * 5) % timber.length]);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .86 }));
  mesh.name = 'Parquet à joints décalés';
  mesh.receiveShadow = true;
  return mesh;
}

export function addRoomArchitecture(scene, withTea) {
  const base = new THREE.Group();
  base.name = 'Socle de la pièce';
  const finish = (color, roughness = .88) => new THREE.MeshStandardMaterial({ color, roughness });
  const shale = finish('#34334a');
  const trim = finish('#9a7d70', .64);
  const seams = finish('#4b414b');
  base.add(slab(outline, .20, .058, shale, shale, -.052));
  base.add(slab(outline, .019, .018, seams, trim, -.008));
  base.add(parquet(outline));

  if (withTea) {
    base.add(slab(bridge, .089, .035, finish('#817161'), shale, -.024));
    const tea = [[-7.03, 5.41], [-3.96, 5.41], [-3.96, 9.14], [-4.18, 9.36], [-6.81, 9.36], [-7.03, 9.14]];
    base.add(slab(tea, .15, .05, finish('#675649'), shale, -.014));
  }

  const frameStand = new THREE.Mesh(
    new THREE.BoxGeometry(1.12, .033, .31), finish('#5a4f63', .7),
  );
  frameStand.name = 'Pied du support de tableau';
  frameStand.position.set(-.70, .014, -3.07);
  frameStand.receiveShadow = true;
  base.add(frameStand);
  const metal = finish('#64576d', .56);
  for (const x of [-1.03, -.37]) {
    const upright = new THREE.Mesh(new THREE.BoxGeometry(.035, 1.43, .044), metal);
    upright.name = 'Montant du support de tableau';
    upright.position.set(x, .723, -3.11);
    upright.castShadow = upright.receiveShadow = true;
    base.add(upright);
  }
  scene.add(base);
}

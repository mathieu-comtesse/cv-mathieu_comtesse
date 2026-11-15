import * as THREE from 'three';

export const mathieuRemasterUrl = 'assets/room-remaster/character/mathieu-v2.glb';

export function attachMathieuRemaster(gltf, group, model, bones) {
  const names = ['MathieuMesh-v2','MathieuSneakers-v2','MathieuSocks-v2'];
  const parts = names.map(name => gltf.scene.getObjectByName(name));
  if (parts.some(part => !part?.isSkinnedMesh)) return null;
  const source = parts[0].skeleton;
  const joints = source.bones.map(joint => bones[joint.name]);
  if (joints.some(joint => !joint)) return null;
  const skeleton = new THREE.Skeleton(joints, source.boneInverses.map(matrix => matrix.clone()));
  const inverse = new THREE.Matrix4();
  const oldSurfaces = [];
  model.traverse(object => { if (object.isMesh) oldSurfaces.push(object); });
  for (const object of oldSurfaces) object.visible = false;
  for (const part of parts) {
    group.add(part);
    part.bind(skeleton, inverse);
    part.frustumCulled = false;
    part.castShadow = part.receiveShadow = true;
  }
  const [body, shoes, socks] = parts;
  const position = body.geometry.attributes.position;
  const indices = body.geometry.attributes.skinIndex;
  const weightsAttribute = body.geometry.attributes.skinWeight;
  const pelvis = joints.indexOf(bones.pelvis);
  const hipVertices = [];
  for (let vertex = 0; vertex < position.count; vertex++) {
    if (position.getY(vertex) < .595 || position.getY(vertex) > .68 ||
        Math.abs(position.getX(vertex)) > .175) continue;
    for (let component = 0; component < 4; component++) {
      if (indices.getComponent(vertex, component) === pelvis &&
          weightsAttribute.getComponent(vertex, component) > .95) {
        hipVertices.push(vertex);
        break;
      }
    }
  }
  const contact = new THREE.Vector3();
  const channels = body.morphTargetDictionary;
  const weights = body.morphTargetInfluences;
  socks.visible = false;
  let last = '';
  return {
    hipContactY() {
      group.updateMatrixWorld(true);
      skeleton.update();
      let lowest = Infinity;
      for (const vertex of hipVertices) {
        body.getVertexPosition(vertex, contact).applyMatrix4(body.matrixWorld);
        lowest = Math.min(lowest, contact.y);
      }
      return lowest;
    },
    setFace(kind) {
      if (last === kind) return;
      last = kind;
      weights[channels.blink] = Number(kind === 'blink');
      weights[channels.smile] = Number(kind === 'happy');
      weights[channels.open] = Number(kind === 'amazed' || kind === 'talkA');
      weights[channels.round] = Number(kind === 'sip' || kind === 'talkO');
    },
    setShoes(on) {
      shoes.visible = on;
      socks.visible = !on;
    },
  };
}

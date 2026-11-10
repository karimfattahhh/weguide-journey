// Loads a WeGuide World avatar exported with Object3D.toJSON() and gives it simple motions.
// The game rigs avatars with plain Groups as bones, which ObjectLoader cannot find,
// so we re-link the skeleton to those Groups by uuid after parsing.
import * as THREE from 'three';

const cache = new Map();

export async function loadAvatar(url) {
  if (!cache.has(url)) cache.set(url, fetch(url).then(r => r.json()));
  const data = await cache.get(url);
  const root = new THREE.ObjectLoader().parse(data);
  const byUuid = {};
  root.traverse(n => { byUuid[n.uuid] = n; });
  let skinned = null;
  root.traverse(n => { if (n.isSkinnedMesh) skinned = n; });
  const skJson = (data.skeletons || [])[0];
  if (skinned && skJson) {
    skinned.skeleton.bones = skJson.bones.map(u => byUuid[u]);
    skinned.bind(skinned.skeleton, skinned.bindMatrix);
  }
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  fixDrawstrings(root);
  root.traverse(n => { if (n.isMesh) { n.castShadow = true; n.frustumCulled = false; } });
  return new Avatar(root, skinned);
}

// Hoodie drawstrings come out of the export as 1-unit capsules centred on the collar, so half of each
// string runs up over the face. Shorten them so they hang down from the collar.
function fixDrawstrings(root) {
  root.traverse(n => {
    const p = n.isMesh && n.geometry.type === 'CapsuleGeometry' && n.geometry.parameters;
    if (!p || p.radius > 0.02 || p.length < 0.6) return;
    const len = 0.24;                       // hanging length in the avatar's local units
    n.scale.y = len / p.length;
    n.position.y -= len / 2;                // keep the top end at the collar
    n.rotation.x = -0.12;                   // rest lightly on the chest
  });
}

// Bone order in the game rig: 0 hips, 1 chest, 2 R upper arm, 3 R forearm, 4 L upper arm,
// 5 L forearm, 6 R thigh, 7 R shin, 8 L thigh, 9 L shin.
export class Avatar {
  constructor(model, skinned) {
    this.model = model;
    this.group = new THREE.Group();
    // Normalise: feet on y=0, 1.6 units tall.
    const box = new THREE.Box3().setFromObject(model);
    const h = box.max.y - box.min.y;
    this.scale = 1.6 / h;
    model.scale.setScalar(this.scale);
    model.position.y = -box.min.y * this.scale;
    this.group.add(model);
    this.bones = skinned ? skinned.skeleton.bones : [];
    if (this.bones.length >= 10) this.attachSleeves();
    this.rest = this.bones.map(b => b.rotation.clone());
    this.restPos = this.bones.map(b => b.position.clone());
    this.mode = 'idle';
    this.t = Math.random() * 10;
    this.speed = 1;
    this.blend = 0;
  }
  // Clothing sleeves, cuffs and hands are parented to the chest in the export, so the arms move
  // invisibly inside them. Re-parent each arm-side piece to its upper arm or forearm bone.
  attachSleeves() {
    const b = this.bones, chest = b[1];
    this.model.updateWorldMatrix(true, true);
    const elbowY = b[2].position.y + b[3].position.y;   // forearm joint height in chest space
    const pieces = [];
    chest.traverse(n => {
      if (!n.isMesh) return;
      for (let p = n.parent; p && p !== chest; p = p.parent) if (b.includes(p)) return;
      const c = new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3());
      chest.worldToLocal(c);
      if (Math.abs(c.x) > 0.15 && c.y < b[2].position.y + 0.08) pieces.push([n, c]);
    });
    for (const [n, c] of pieces) {
      const upper = c.x > 0 ? b[2] : b[4], fore = c.x > 0 ? b[3] : b[5];
      (c.y < elbowY ? fore : upper).attach(n);
    }
    this.sleeves = pieces.length;
  }
  // Facial expressions. The game face has one mesh for both brows and a quarter-torus smile;
  // 'worried' swaps in two tilted brows ( / \ ), turns the smile into a small frown and adds a sweat drop.
  setExpression(kind = 'neutral') {
    if (this.expression === kind) return;
    this.expression = kind;
    const f = this.face || (this.face = this.findFace());
    if (!f.brow || !f.mouth) return;
    if (kind === 'worried') {
      f.brow.visible = false;
      if (!f.extra) {
        const P = f.brow.parent, mat = f.brow.material, box = new THREE.Box3().setFromObject(f.brow);
        const w = box.max.x - box.min.x, cy = (box.min.y + box.max.y) / 2 + (box.max.y - box.min.y) * 0.6, cz = box.max.z;
        f.extra = new THREE.Group();
        for (const side of [-1, 1]) {
          const len = w * 0.36, br = new THREE.Mesh(new THREE.CapsuleGeometry(w * 0.03, len, 4, 8), mat);
          const world = new THREE.Vector3((box.min.x + box.max.x) / 2 + side * w * 0.26, cy, cz);
          br.position.copy(P.worldToLocal(world.clone())); br.rotation.z = Math.PI / 2 - side * 0.42;   // inner ends up: worried ( / \ )
          br.scale.setScalar(1 / P.getWorldScale(new THREE.Vector3()).x); f.extra.add(br);
        }
        // sweat drop at the temple
        const dropM = new THREE.MeshStandardMaterial({color: '#8FD3FF', roughness: 0.2, metalness: 0.1, emissive: '#5FB8F0', emissiveIntensity: 0.25});
        const drop = new THREE.Group(), ball = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), dropM), tip = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.4, 16), dropM);
        tip.position.y = 0.95; drop.add(ball, tip);
        const sc = w * 0.07 / P.getWorldScale(new THREE.Vector3()).x; drop.scale.setScalar(sc);
        drop.position.copy(P.worldToLocal(new THREE.Vector3(box.max.x + w * 0.12, cy + w * 0.05, cz - w * 0.1)));
        f.extra.add(drop); f.drop = drop; P.add(f.extra);
        // frown: flip the smile about its own centre
        const c0 = new THREE.Box3().setFromObject(f.mouth).getCenter(new THREE.Vector3());
        f.mouthRot = f.mouth.rotation.z; f.mouthPos = f.mouth.position.clone();
        f.mouth.rotation.z += Math.PI; f.mouth.updateWorldMatrix(true, false);
        const c1 = new THREE.Box3().setFromObject(f.mouth).getCenter(new THREE.Vector3());
        f.frownPos = f.mouth.position.clone().add(f.mouth.parent.worldToLocal(c0.clone()).sub(f.mouth.parent.worldToLocal(c1.clone())));
        f.mouth.rotation.z = f.mouthRot;
      }
      f.extra.visible = true; f.mouth.rotation.z = f.mouthRot + Math.PI; f.mouth.position.copy(f.frownPos);
    } else {
      f.brow.visible = true; if (f.extra) { f.extra.visible = false; f.mouth.rotation.z = f.mouthRot; f.mouth.position.copy(f.mouthPos); }
    }
  }
  findFace() {
    this.model.updateWorldMatrix(true, true);
    const inv = this.model.matrixWorld.clone().invert(); let brow = null, mouth = null, browY = Infinity;
    this.model.traverse(n => {
      if (!n.isMesh) return;
      const b = new THREE.Box3().setFromObject(n).applyMatrix4(inv), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      const col = n.material && n.material.color ? n.material.color : null;
      if (n.geometry.type === 'TorusGeometry' && n.geometry.parameters.arc < 3 && sz.x < 0.2) mouth = mouth || n;
      if (col && col.r + col.g + col.b < 0.3 && c.z > 0.12 && sz.x > sz.y * 4 && sz.x < 0.7 && sz.y < 0.12 && n.geometry.type === 'BufferGeometry' && c.y < browY) { brow = n; browY = c.y; }   // the dark strip nearest above the eyes (a hair piece sits higher)
    });
    return {brow, mouth};
  }
  setMode(mode) { if (mode !== this.mode) { this.mode = mode; this.blend = 0; } }
  update(dt) {
    this.t += dt * this.speed;
    this.blend = Math.min(1, this.blend + dt * 4);
    const b = this.bones, r = this.rest, t = this.t;
    if (b.length < 10) return;
    for (let i = 0; i < b.length; i++) b[i].rotation.copy(r[i]);
    b[0].position.copy(this.restPos[0]);
    const k = this.blend;
    if (this.mode === 'walk' || this.mode === 'run') {
      const run = this.mode === 'run';
      const f = run ? 9 : 6.2, amp = run ? 0.75 : 0.5;
      const s = Math.sin(t * f);
      b[6].rotation.x += s * amp * k;
      b[8].rotation.x -= s * amp * k;
      b[7].rotation.x += Math.max(0, -s) * amp * 1.2 * k;
      b[9].rotation.x += Math.max(0, s) * amp * 1.2 * k;
      b[2].rotation.x -= s * amp * 0.9 * k;
      b[4].rotation.x += s * amp * 0.9 * k;
      b[1].rotation.y += s * 0.08 * k;
      b[0].position.y += Math.abs(Math.cos(t * f)) * (run ? 0.05 : 0.03) * k;
    } else if (this.mode === 'wave') {
      // left arm (bone 2) up beside the head, forearm swinging from the elbow
      b[2].rotation.z += 2.55 * k; b[2].rotation.x += 0.34 * k;
      b[3].rotation.x += 0.34 * k; b[3].rotation.z += (0.25 + Math.sin(t * 8) * 0.38) * k;
      b[1].rotation.z -= 0.05 * k;
    } else if (this.mode === 'shrug') {
      // helpless: palms up, shoulders lifting with a small sigh, head a little down
      const sigh = (Math.sin(t * 1.4) + 1) * 0.5;
      b[2].rotation.z += 0.38 * k; b[4].rotation.z -= 0.38 * k;
      b[3].rotation.x -= 1.25 * k; b[5].rotation.x -= 1.25 * k;
      b[3].rotation.z += 0.35 * k; b[5].rotation.z -= 0.35 * k;
      b[1].rotation.x += (0.08 + sigh * 0.03) * k; b[0].position.y -= sigh * 0.01 * k;
    } else if (this.mode === 'think') {
      b[4].rotation.x -= 1.2 * k; b[5].rotation.x -= 1.6 * k; b[4].rotation.z -= 0.25 * k;
      b[1].rotation.x += 0.05 * k;
    } else if (this.mode === 'cheer') {
      const s = Math.abs(Math.sin(t * 6));
      b[2].rotation.z += 2.7 * k; b[4].rotation.z -= 2.7 * k;
      b[0].position.y += s * 0.12 * k;
    } else if (this.mode === 'sit') {
      b[6].rotation.x -= 1.5 * k; b[8].rotation.x -= 1.5 * k;
      b[7].rotation.x += 1.5 * k; b[9].rotation.x += 1.5 * k;
    } else {
      // idle: breathe and sway
      b[1].rotation.x += Math.sin(t * 1.6) * 0.02;
      b[1].rotation.z += Math.sin(t * 0.8) * 0.015;
      b[2].rotation.z += Math.sin(t * 1.6) * 0.03;
      b[4].rotation.z -= Math.sin(t * 1.6) * 0.03;
    }
  }
}

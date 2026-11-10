// One shared WebGL stage behind the slides. Sets are built from simple toy-like shapes in the
// WeGuide palette so the extracted WeGuide World avatars feel at home in them.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {loadAvatar} from './avatar.js';

const C = {
  violet: '#6E41F4', peri: '#A3A9FE', mist: '#D3D5FD', haze: '#F5F3FF', ink: '#212121',
  floor: '#EFEBFF', wall: '#FAF8FF', wood: '#E9D8C4', woodDark: '#C9A884', green: '#9BCB6A',
  sky: '#EAF0FF', teal: '#5FC7B5', sun: '#FFD27A', grey: '#E4E2EE',
};
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: 0.85, ...o});
const rbox = (w, h, d, r, m) => { const g = new RoundedBoxGeometry(w, h, d, 4, r); const x = new THREE.Mesh(g, m); x.castShadow = x.receiveShadow = true; return x; };
const mesh = (g, m) => { const x = new THREE.Mesh(g, m); x.castShadow = x.receiveShadow = true; return x; };
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true});
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral tone mapping keeps the WeGuide violets true; ACES shifted them towards blue-grey.
    r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(32, 16 / 9, 0.05, 400);
    this.cam.position.set(0, 1.4, 6); this.look = new THREE.Vector3(0, 1, 0);
    // Soft studio reflections give the avatars' standard materials real shading.
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    this.hemi = new THREE.HemisphereLight('#ffffff', '#d9d2fb', 0.9); this.scene.add(this.hemi);
    // rim light from behind separates the silhouette from the pale background
    const rim = this.rim = new THREE.DirectionalLight('#b9a6ff', 1.7); rim.position.set(-3, 4, -6); this.scene.add(rim);
    const sun = this.sun = new THREE.DirectionalLight('#fff4e8', 2.1);
    sun.position.set(4, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12; sun.shadow.camera.right = 12; sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
    sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
    this.scene.add(sun, sun.target);
    this.sets = {}; this.actors = {}; this.tweens = []; this.updaters = []; this.pins = []; this.offset = 0;
    this.pointer = {x: 0, y: 0};
    addEventListener('pointermove', e => { this.pointer.x = e.clientX / innerWidth * 2 - 1; this.pointer.y = e.clientY / innerHeight * 2 - 1; });
    this.clock = new THREE.Clock();
    this.gltf = new GLTFLoader(); this.gltf.setMeshoptDecoder(MeshoptDecoder);
    this.resize(); addEventListener('resize', () => this.resize());
    this.running = true;
    r.setAnimationLoop(() => this.frame());
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false); this.cam.aspect = w / h;
    this.setOffset(this.offset);
  }
  // Shift the frame so the subject sits off-centre (e.g. 0.18 = 18% right of centre) at any aspect ratio.
  offsetTo(f = 0, dur = 900) { const f0 = this.offset; if (Math.abs(f - f0) < 1e-4) return; this.tween(dur, e => this.setOffset(f0 + (f - f0) * e), 'offset'); }
  setOffset(f = 0) {
    this.offset = f; const w = innerWidth, h = innerHeight;
    if (f) this.cam.setViewOffset(w, h, -w * f, 0, w, h); else this.cam.clearViewOffset();
    this.cam.updateProjectionMatrix();
  }
  // Keep a DOM element pinned above a 3D object (name plates).
  pin(el, obj, dy = 0) { this.pins.push({el, obj, dy}); }
  clearPins() { this.pins = []; }
  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05), now = performance.now();
    this.tweens = this.tweens.filter(tw => { const k = Math.min(1, (now - tw.t0) / tw.dur); tw.fn(ease(k), k); return k < 1; });
    for (const u of this.updaters) u(dt, now / 1000);
    for (const a of Object.values(this.actors)) if (a.group.visible && a.group.parent) a.update(dt);
    // subtle camera parallax with the pointer (applied only for this frame)
    const off = this._off || (this._off = new THREE.Vector3());
    if (this.parallax) { off.x += (this.pointer.x * this.parallax - off.x) * Math.min(1, dt * 2); off.y += (-this.pointer.y * this.parallax * 0.5 - off.y) * Math.min(1, dt * 2); this.cam.position.add(off); }
    this.cam.lookAt(this.look);
    if (this.pins.length) {
      this.cam.updateMatrixWorld();
      const v = new THREE.Vector3();
      for (const p of this.pins) { p.obj.getWorldPosition(v); v.y += p.dy; v.project(this.cam); const off = v.z > 1 || Math.abs(v.x) > 1.15 || Math.abs(v.y) > 1.15; p.el.style.visibility = off ? 'hidden' : ''; p.el.style.transform = `translate(${(v.x + 1) / 2 * innerWidth}px, ${(1 - v.y) / 2 * innerHeight}px) translate(-50%, -100%)`; }
    }
    this.renderer.render(this.scene, this.cam);
    if (this.parallax) this.cam.position.sub(off);
  }
  // Tweens can carry a key; starting a new one with the same key cancels (and resolves) the old one,
  // so a slide that starts before the previous one finished never has two motions fighting.
  tween(dur, fn, key) {
    if (key) this.cancel(key);
    return new Promise(res => this.tweens.push({t0: performance.now(), dur, key, res, fn: (e, k) => { fn(e); if (k >= 1) res(); }}));
  }
  cancel(key) { this.tweens = this.tweens.filter(tw => { if (tw.key === key) { tw.res(); return false; } return true; }); }
  stopActor(a) { this.cancel('act:' + a.group.uuid); a._walk = null; }
  shot(pos, look, dur = 1400) {
    const p0 = this.cam.position.clone(), l0 = this.look.clone(), p1 = new THREE.Vector3(...pos), l1 = new THREE.Vector3(...look);
    if (!dur) { this.cancel('cam'); this.cam.position.copy(p1); this.look.copy(l1); return Promise.resolve(); }
    return this.tween(dur, e => { this.cam.position.lerpVectors(p0, p1, e); this.look.lerpVectors(l0, l1, e); }, 'cam');
  }
  moveActor(a, to, dur, mode = 'walk') {
    const g = a.group, p0 = g.position.clone(), p1 = new THREE.Vector3(...to);
    const dir = p1.clone().sub(p0); if (dir.lengthSq() > 1e-4) g.rotation.y = Math.atan2(dir.x, dir.z);
    a.setMode(mode); a._walk = null;
    return this.tween(dur, e => g.position.lerpVectors(p0, p1, e), 'act:' + g.uuid).then(() => a.setMode('idle'));
  }
  // Walk along a polyline at constant speed, turning smoothly into each segment.
  walkPath(a, pts, speed = 1.6) {
    this.cancel('act:' + a.group.uuid);
    const P = []; for (const p of pts) { const v = new THREE.Vector3(...p); if (!P.length || v.distanceTo(P[P.length - 1]) > 0.05) P.push(v); }
    if (P.length < 2) return Promise.resolve();
    const seg = [], my = a._walk = {};
    let total = 0; for (let i = 1; i < P.length; i++) { const l = P[i].distanceTo(P[i - 1]); seg.push(l); total += l; }
    a.setMode('walk'); const g = a.group;
    return new Promise(res => {
        const t0 = performance.now(), dur = total / speed * 1000;
        const f = (dt) => {
          if (a._walk !== my) { this.updaters.splice(this.updaters.indexOf(f), 1); res(); return; }   // superseded
          const k = Math.min(1, (performance.now() - t0) / dur); let d = k * total, i = 0;
          while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
          const p = P[i].clone().lerp(P[i + 1], seg[i] ? d / seg[i] : 1); g.position.copy(p);
          const dir = P[i + 1].clone().sub(P[i]); const target = Math.atan2(dir.x, dir.z);
          let dy = target - g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); g.rotation.y += dy * Math.min(1, dt * 8);
          if (k >= 1) { this.updaters.splice(this.updaters.indexOf(f), 1); a.setMode('idle'); res(); }
        };
        this.updaters.push(f);
      });
  }
  turn(a, yaw, dur = 500) {
    a._walk = null; const y0 = a.group.rotation.y; let d = yaw - y0; d = Math.atan2(Math.sin(d), Math.cos(d));   // shortest way round
    return this.tween(dur, e => { a.group.rotation.y = y0 + d * e; }, 'act:' + a.group.uuid);
  }
  async actor(key, file, scale = 1) {
    if (!this.actors[key]) { const a = await loadAvatar('assets/avatars/' + file + '.json'); a.group.scale.setScalar(scale); this.actors[key] = a; }
    return this.actors[key];
  }
  place(a, set, pos, yaw = 0, mode = 'idle') {
    this.sets[set].add(a.group); a.group.position.set(...pos); a.group.rotation.y = yaw; a.setMode(mode); a.group.visible = true; return a;
  }
  async model(name) { const g = (await this.gltf.loadAsync('assets/models/' + name + '.glb')).scene; g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } }); return g; }
  showSet(name) {
    for (const [k, s] of Object.entries(this.sets)) s.visible = k === name;
    this.current = name;
    const set = this.sets[name];
    this.sun.castShadow = !(set && set.userData.noShadow);   // hero uses a soft contact shadow instead: no shadow pass
    // per-set light profile (the house brings its own warm point lights)
    const L = Object.assign({hemi: 0.9, rim: 1.7, env: 0.55, sun: 2.1, sunPos: [4, 9, 6], target: [0, 0, 0], exposure: 1.0}, set && set.userData.light);
    this.hemi.intensity = L.hemi; this.rim.intensity = L.rim; this.scene.environmentIntensity = L.env; this.sun.intensity = L.sun;
    this.sun.position.set(...L.sunPos); this.sun.target.position.set(...L.target); this.renderer.toneMappingExposure = L.exposure;
    this.cam.fov = L.fov || 32; this.cam.updateProjectionMatrix();
    this.renderer.toneMapping = L.aces ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
    this.parallax = (set && set.userData.parallax) || 0;
    this.scene.fog = L.fog ? new THREE.Fog(L.fog[0], L.fog[1], L.fog[2]) : null;
  }
  // ---------- sets ----------
  async build() {
    const S = this.sets;
    // crossroads: many paths into fog, each ending at a different door; a signpost of question marks
    S.crossroads = new THREE.Group(); S.crossroads.userData.light = {hemi: 0.9, rim: 1.4, env: 0.5, sun: 1.8, sunPos: [3, 9, 6], target: [0, 0, -2], exposure: 1.0, fov: 34, fog: ['#EFEBFC', 9, 34]};
    this.buildCrossroads(S.crossroads);
    // universe: the Universe of Majors, a night sky where every star is a career (built on demand)
    S.universe = new THREE.Group(); S.universe.userData.light = {hemi: 0.35, rim: 2.0, env: 0.25, sun: 0.9, sunPos: [3, 6, 6], target: [0, 1, 0], exposure: 1.0, fov: 50};
    // counsel: the counseling room (built on demand)
    S.counsel = new THREE.Group(); S.counsel.userData.light = {hemi: 0.22, rim: 0.8, env: 0.22, sun: 1.5, sunPos: [3, 8, 7], target: [1.5, 0, 0], exposure: 0.92, fov: 50, aces: true}; S.counsel.userData.parallax = 0.2;
    // town: the real WeGuide World town (built on demand)
    S.town = new THREE.Group(); S.town.userData.light = {hemi: 0.75, rim: 0.7, env: 0.45, sun: 2.6, sunPos: [-40, 70, 60], target: [0, 0, 15], exposure: 0.98, fov: 52, aces: true, fog: ['#E4ECF7', 70, 240]};
    // house: Maya's real Central House room, exported from WeGuide World (built on demand)
    S.house = new THREE.Group(); S.house.userData.light = {hemi: 0.12, rim: 0.9, env: 0.14, sun: 1.5, sunPos: [3.5, 8, 7], target: [0.6, 0, -0.6], exposure: 0.86, fov: 50, aces: true};   // ACES like the game: warmer, more contrast S.house.userData.parallax = 0.22;
    // hero: nothing but the character and a soft contact shadow, like WeGuide's own sign-in page
    S.hero = new THREE.Group(); S.hero.userData.noShadow = true;
    // void: a soft disc for introductions
    S.void = new THREE.Group();
    const disc = mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.16, 64), mat(C.mist)); disc.position.y = -0.08; S.void.add(disc);
    const ring = mesh(new THREE.TorusGeometry(1.45, 0.035, 12, 96), mat(C.violet, {roughness: 0.4})); ring.rotation.x = Math.PI / 2; ring.position.y = 0.0; S.void.add(ring);
    S.void.add(this.shadowFloor(30));
    // home: breakfast table
    S.home = new THREE.Group(); S.home.add(this.shadowFloor(40, C.floor));
    const back = rbox(9, 4, 0.2, 0.08, mat(C.wall)); back.position.set(0, 2, -2.6); S.home.add(back);
    const win = rbox(2.2, 1.4, 0.12, 0.05, mat(C.sky, {emissive: '#dfe7ff', emissiveIntensity: 0.4})); win.position.set(-1.8, 2.3, -2.48); S.home.add(win);
    const frame = mesh(new THREE.BoxGeometry(0.06, 1.4, 0.14), mat(C.violet)); frame.position.set(-1.8, 2.3, -2.42); S.home.add(frame);
    const frame2 = mesh(new THREE.BoxGeometry(2.2, 0.06, 0.14), mat(C.violet)); frame2.position.set(-1.8, 2.3, -2.42); S.home.add(frame2);
    const pic = rbox(0.9, 0.7, 0.06, 0.03, mat(C.sun)); pic.position.set(1.6, 2.5, -2.48); S.home.add(pic);
    const top = rbox(2.6, 0.12, 1.2, 0.05, mat(C.wood)); top.position.set(0, 0.62, -0.3); S.home.add(top);
    for (const [x, z] of [[-1.15, -0.8], [1.15, -0.8], [-1.15, 0.2], [1.15, 0.2]]) { const l = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.62), mat(C.woodDark)); l.position.set(x, 0.31, z); S.home.add(l); }
    for (const [x, c] of [[-0.8, C.sun], [0, C.teal], [0.8, C.peri]]) { const cup = mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 20), mat(c)); cup.position.set(x, 0.74, -0.15); S.home.add(cup); }
    const plant = mesh(new THREE.SphereGeometry(0.45, 20, 16), mat(C.green)); plant.position.set(3.2, 0.9, -1.9); S.home.add(plant);
    const pot = mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.5, 20), mat('#E79A6B')); pot.position.set(3.2, 0.25, -1.9); S.home.add(pot);
    // street: buildings slide past while Maya walks
    S.street = new THREE.Group(); S.street.add(this.shadowFloor(80, '#F1EEFB'));
    const path = mesh(new THREE.BoxGeometry(80, 0.02, 1.6), mat('#FFFFFF')); path.position.set(0, 0.011, 0); S.street.add(path);
    this.streetRow = new THREE.Group(); S.street.add(this.streetRow);
    const cols = [C.peri, C.mist, '#FFE3B8', '#CDEFE6', '#F8D2E2', C.mist];
    for (let i = 0; i < 16; i++) {
      const h = 1.4 + ((i * 37) % 5) * 0.45, w = 1.3 + ((i * 13) % 3) * 0.35;
      const b = rbox(w, h, 1.2, 0.08, mat(cols[i % cols.length])); b.position.set(-20 + i * 2.6, h / 2, -2.2); this.streetRow.add(b);
      for (let r = 0; r < Math.floor(h / 0.7); r++) { const wdw = rbox(w * 0.6, 0.28, 0.05, 0.03, mat('#FFFFFF', {emissive: '#ffffff', emissiveIntensity: 0.2})); wdw.position.set(b.position.x, 0.5 + r * 0.6, -1.58); this.streetRow.add(wdw); }
      if (i % 2) { const t = mesh(new THREE.SphereGeometry(0.42, 16, 12), mat(C.green)); t.position.set(-18.7 + i * 2.6, 1.15, -1.1); const tr = mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.8), mat(C.woodDark)); tr.position.set(t.position.x, 0.4, -1.1); this.streetRow.add(t, tr); }
    }
    // school: counselor desk
    S.school = new THREE.Group(); S.school.add(this.shadowFloor(40, C.floor));
    const sw = rbox(10, 4, 0.2, 0.08, mat('#F3F0FF')); sw.position.set(0, 2, -2.6); S.school.add(sw);
    const board = rbox(2.8, 1.3, 0.08, 0.04, mat('#3A3F55')); board.position.set(-2.2, 2.2, -2.45); S.school.add(board);
    const desk = rbox(1.8, 0.1, 0.9, 0.04, mat(C.wood)); desk.position.set(0.6, 0.7, -0.6); S.school.add(desk);
    const dbase = rbox(1.7, 0.66, 0.1, 0.03, mat(C.woodDark)); dbase.position.set(0.6, 0.35, -1.0); S.school.add(dbase);
    const shelf = rbox(1.6, 2.2, 0.4, 0.04, mat(C.mist)); shelf.position.set(3.2, 1.1, -2.3); S.school.add(shelf);
    for (let i = 0; i < 9; i++) { const bk = mesh(new THREE.BoxGeometry(0.12, 0.4, 0.28), mat([C.violet, C.teal, C.sun, C.peri][i % 4])); bk.position.set(2.65 + (i % 9) * 0.14, 1.75 - Math.floor(i / 9) * 0.6, -2.2); S.school.add(bk); }
    // studio: WeGuide World home with the round platform, like Central House
    S.studio = new THREE.Group(); S.studio.add(this.shadowFloor(40, '#E9DCCB'));
    const sw2 = rbox(12, 5, 0.2, 0.08, mat('#FBF7F0')); sw2.position.set(0, 2.5, -3); S.studio.add(sw2);
    const trim = mesh(new THREE.BoxGeometry(12, 0.08, 0.06), mat(C.violet)); trim.position.set(0, 1.0, -2.88); S.studio.add(trim);
    for (const x of [-3.6, 3.6]) { const w2 = rbox(1.8, 2.2, 0.1, 0.05, mat('#DDEBFF', {emissive: '#e8f0ff', emissiveIntensity: 0.5})); w2.position.set(x, 2.6, -2.88); S.studio.add(w2); }
    for (const [x, c] of [[-1.2, '#A8D08D'], [1.0, '#F2C27A']]) { const p2 = rbox(0.7, 0.55, 0.05, 0.02, mat(c)); p2.position.set(x, 2.9, -2.86); S.studio.add(p2); }
    const plat = mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.22, 64), mat('#B9774A')); plat.position.y = 0.11; S.studio.add(plat);
    const platR = mesh(new THREE.TorusGeometry(1.3, 0.05, 12, 96), mat(C.violet, {roughness: 0.4})); platR.rotation.x = Math.PI / 2; platR.position.y = 0.22; S.studio.add(platR);
    const rug = mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.02, 64), mat('#E8823F')); rug.position.y = 0.01; S.studio.add(rug);
    // door on the right wall
    this.doorPivot = new THREE.Group(); this.doorPivot.position.set(4.6, 0, -2.85); S.studio.add(this.doorPivot);
    const door = rbox(1.1, 2.3, 0.08, 0.04, mat(C.violet)); door.position.set(-0.55, 1.15, 0.05); this.doorPivot.add(door);
    const knob = mesh(new THREE.SphereGeometry(0.05, 12, 10), mat(C.sun, {metalness: 0.5, roughness: 0.3})); knob.position.set(-0.95, 1.15, 0.12); this.doorPivot.add(knob);
    this.doorLight = mesh(new THREE.PlaneGeometry(1.1, 2.3), new THREE.MeshBasicMaterial({color: '#ffffff'})); this.doorLight.position.set(4.05, 1.15, -2.89); S.studio.add(this.doorLight);
    // tower + trail are built on demand
    S.tower = new THREE.Group(); S.tower.add(this.shadowFloor(80, '#E9E5FB')); S.tower.userData.light = {hemi: 0.85, rim: 1.5, env: 0.5, sun: 2.4, sunPos: [-6, 12, 9], target: [0, 2, 0], exposure: 1.0, fov: 34, fog: ['#ECE8FB', 22, 60]}; this.buildTower(S.tower);
    S.trail = new THREE.Group(); S.trail.add(this.shadowFloor(80, '#E9E5FB')); S.trail.userData.light = {hemi: 0.85, rim: 1.4, env: 0.5, sun: 2.3, sunPos: [-5, 11, 8], target: [0, 0, 0], exposure: 1.0, fov: 34, fog: ['#ECE8FB', 24, 60]};
    S.island = new THREE.Group();
    for (const s of Object.values(S)) { s.visible = false; this.scene.add(s); }
    // swap in the generated Decision Tower as soon as it loads (the procedural one is the fallback)
    this.towerReady = this.useTowerModel('assets/models/game/decision-tower.glb', {width: 7.6, padFrac: 0.775, tiers: [[0.09, 0.37], [0.40, 0.585], [0.60, 0.745]], signAt: 0.55}).catch(e => console.warn('tower model', e));
  }
  // Blurred radial shadow under a character: soft, cheap, no shadow map.
  contactShadow(radius = 0.62, opacity = 0.32) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, `rgba(48,24,120,${opacity})`); grd.addColorStop(0.45, `rgba(48,24,120,${opacity * 0.45})`); grd.addColorStop(1, 'rgba(48,24,120,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false}));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.002; m.renderOrder = -1; return m;
  }
  shadowFloor(size, color) {
    const m = color ? mat(color) : new THREE.ShadowMaterial({opacity: 0.12});
    const f = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; return f;
  }
  buildTower(g) {
    // The Decision Tower: stepped plinth, three tapered levels with glowing windows, a launch pad and rocket,
    // set on a lawn with a path ring, trees and lamps, in the WeGuide World toy style.
    const lawn = mesh(new THREE.CylinderGeometry(10, 10.3, 0.12, 72), mat('#9DCB72')); lawn.position.y = -0.04; g.add(lawn);
    const ringPath = new THREE.Mesh(new THREE.RingGeometry(5.6, 6.6, 72), mat('#F7F5FF')); ringPath.rotation.x = -Math.PI / 2; ringPath.position.y = 0.03; ringPath.receiveShadow = true; g.add(ringPath);
    const front = mesh(new THREE.BoxGeometry(1.4, 0.02, 4.2), mat('#F7F5FF')); front.position.set(0, 0.03, 8.0); g.add(front);
    const before = g.children.length;
    const trimM = () => new THREE.MeshStandardMaterial({color: '#8E6BFF', emissive: '#7B52FF', emissiveIntensity: 0.6, roughness: 0.4});
    const p1 = mesh(new THREE.CylinderGeometry(3.3, 3.45, 0.32, 64), mat('#FFFFFF')); p1.position.y = 0.16; g.add(p1);
    const p2 = mesh(new THREE.CylinderGeometry(2.75, 2.85, 0.26, 64), mat('#EEEAFF')); p2.position.y = 0.45; g.add(p2);
    for (const [r, y] of [[3.37, 0.32], [2.81, 0.58]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 8, 96), trimM()); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }
    // window texture: soft glass with mullions
    const winTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 64; const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#EAF0FF'); gr.addColorStop(1, '#BFD0FF'); x.fillStyle = gr; x.fillRect(0, 0, 512, 64); x.fillStyle = '#FFFFFF'; for (let i = 0; i < 512; i += 32) x.fillRect(i, 0, 5, 64); x.fillRect(0, 0, 512, 5); x.fillRect(0, 59, 512, 5); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const plaque = (n, grade) => { const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d'); x.fillStyle = '#FFFFFF'; x.beginPath(); x.roundRect(4, 4, 504, 152, 40); x.fill(); x.fillStyle = '#6E41F4'; x.font = '700 64px Inter, sans-serif'; x.textAlign = 'center'; x.fillText('Level ' + n, 256, 84); x.fillStyle = '#7C78A0'; x.font = '600 38px Inter, sans-serif'; x.fillText(grade, 256, 132); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const cols = ['#D9D3FF', '#B9A9FB', '#9479F6'], levels = this.towerLevels = [];
    let y = 0.58;
    for (let i = 0; i < 3; i++) {
      const r = 2.15 - i * 0.36, H = 1.42, lv = new THREE.Group(); lv.position.y = y; g.add(lv);
      const body = mesh(new THREE.CylinderGeometry(r * 0.93, r, H, 56), mat(cols[i], {roughness: 0.55})); body.position.y = H / 2; lv.add(body);
      const winM = new THREE.MeshStandardMaterial({map: winTex, emissive: '#C8D6FF', emissiveIntensity: 0.15, roughness: 0.2, metalness: 0.1});
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.955 + 0.012, r * 0.985 + 0.012, 0.5, 56, 1, true), winM); glass.position.y = H * 0.42; lv.add(glass);
      const terrace = mesh(new THREE.CylinderGeometry(r * 1.07, r * 1.07, 0.1, 56), mat('#FFFFFF')); terrace.position.y = H + 0.05; lv.add(terrace);
      const bandM = new THREE.MeshStandardMaterial({color: '#FFFFFF', emissive: '#000000', emissiveIntensity: 1, roughness: 0.3});
      const band = new THREE.Mesh(new THREE.TorusGeometry(r * 1.07, 0.045, 8, 96), bandM); band.rotation.x = Math.PI / 2; band.position.y = H + 0.05; lv.add(band);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.3), new THREE.MeshBasicMaterial({map: plaque(i + 1, ['Grade 10', 'Grade 11', 'Grade 12'][i]), transparent: true, toneMapped: false}));
      sign.position.set(0, H * 0.82, r * 0.94 + 0.02); sign.rotation.x = -0.04; lv.add(sign);
      levels.push({group: lv, band, bandM, winM});
      y += H + 0.1;
    }
    // launch pad, gantry and rocket
    const padY = y;
    const pad = mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.14, 40), mat('#EEEAFF')); pad.position.y = padY + 0.07; g.add(pad);
    const padRing = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.03, 8, 64), trimM()); padRing.rotation.x = Math.PI / 2; padRing.position.y = padY + 0.15; g.add(padRing);
    const gantry = new THREE.Group(); gantry.position.set(0.72, padY, -0.15); g.add(gantry);
    const mast = mesh(new THREE.BoxGeometry(0.1, 2.1, 0.1), mat('#CFC8F4')); mast.position.y = 1.05; gantry.add(mast);
    for (const ay of [0.8, 1.55]) { const arm = mesh(new THREE.BoxGeometry(0.42, 0.06, 0.06), mat('#CFC8F4')); arm.position.set(-0.2, ay, 0); gantry.add(arm); }
    const rocket = this.rocket = new THREE.Group(); rocket.position.y = padY + 0.14; this.rocketY = rocket.position.y; g.add(rocket);
    const prof = []; for (let k = 0; k <= 16; k++) { const t = k / 16, yy = t * 1.5; const rr = t < 0.7 ? 0.27 + Math.sin(t / 0.7 * Math.PI) * 0.03 : 0.27 * Math.cos((t - 0.7) / 0.3 * Math.PI / 2) + 0.005; prof.push(new THREE.Vector2(rr, yy)); }
    const rb = mesh(new THREE.LatheGeometry(prof, 40), mat('#FFFFFF', {roughness: 0.35})); rb.position.y = 0.15; rocket.add(rb);
    const nose = mesh(new THREE.SphereGeometry(0.1, 16, 12), mat('#6E41F4')); nose.position.y = 1.62; rocket.add(nose);
    const stripe = mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.1, 40), mat('#6E41F4')); stripe.position.y = 0.95; rocket.add(stripe);
    const win = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 24), mat('#A3A9FE', {emissive: '#A3A9FE', emissiveIntensity: 0.5})); win.rotation.x = Math.PI / 2; win.position.set(0, 0.62, 0.27); rocket.add(win);
    for (let k = 0; k < 3; k++) { const fin = mesh(new THREE.BoxGeometry(0.05, 0.42, 0.32), mat('#6E41F4')); const a = k * Math.PI * 2 / 3 + 0.5; fin.position.set(Math.sin(a) * 0.29, 0.32, Math.cos(a) * 0.29); fin.rotation.y = a; rocket.add(fin); }
    const flame = this.flame = mesh(new THREE.ConeGeometry(0.2, 0.8, 24), new THREE.MeshBasicMaterial({color: '#FFB547', transparent: true, opacity: 0, toneMapped: false})); flame.rotation.x = Math.PI; flame.position.y = -0.25; rocket.add(flame);
    this.towerTop = padY;
    this.towerProc = g.children.slice(before).filter(o => o !== this.rocket);
    // trees and lamps around the lawn, like the town's
    const treeCols = ['#7FBF5E', '#6FB257', '#9BCB6A', '#F2B640', '#E79A6B'];
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2 + 0.2, r = 7.6 + (k % 3) * 0.7; if (Math.abs(Math.sin(a)) < 0.25 && Math.cos(a) > 0) continue;   // keep the front path clear
      if (Math.sin(a) < 0.15 && Math.cos(a) > -0.2) continue;   // and the camera side (front-left) free of trees
      const t = new THREE.Group(); t.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); g.add(t);
      const trunk = mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.7, 8), mat('#9C6A42')); trunk.position.y = 0.35; t.add(trunk);
      const crown = mesh(new THREE.IcosahedronGeometry(0.55 + (k % 2) * 0.15, 0), mat(treeCols[k % treeCols.length])); crown.position.y = 1.05; t.add(crown);
    }
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2 + Math.PI / 8, r = 6.9; const l = new THREE.Group(); l.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); g.add(l);
      const pole = mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.4, 8), mat('#3A3F55')); pole.position.y = 0.7; l.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshBasicMaterial({color: '#FFF1C9', toneMapped: false})); bulb.position.y = 1.45; l.add(bulb);
    }
    // real WeGuide World clouds drifting behind
    this.gltf.loadAsync('assets/models/game/cloud.glb').then(gl => {
      const cloudM = new THREE.MeshStandardMaterial({color: '#FFFFFF', emissive: '#F3F0FF', emissiveIntensity: 0.55, roughness: 1});
      [[-13, 7.5, -22, 2.4], [-5, 11.5, -28, 3.0], [-17, 4.5, -14, 1.7]].forEach(([x, yy, z, sc]) => { const c = gl.scene.clone(); c.position.set(x, yy, z); c.scale.setScalar(sc); c.traverse(n => { if (n.isMesh) { n.castShadow = false; n.material = cloudM; } }); g.add(c); });
      // a column of clouds above the Tower (out of frame in normal shots) that the launch climbs through
      this._skyClouds = [[-6, 17, -7, 2.2], [5.5, 21, -9, 2.6], [-2.5, 26, 3.5, 1.4], [7, 30, -3, 2.0], [-8, 34, -11, 3.0], [2.5, 38, -6, 2.3], [-4.5, 43, 1.5, 1.6], [6, 47, -10, 2.8]].map(([x, yy, z, sc]) => {
        const c = gl.scene.clone(); c.position.set(x, yy, z); c.scale.setScalar(sc); c.userData.home = c.position.clone(); c.traverse(n => { if (n.isMesh) { n.castShadow = false; n.material = cloudM; } }); g.add(c); return c; });
    }).catch(() => {});
  }
  // The generated Decision Tower (image-to-3D, matching the game's buildings). The procedural tower stays as a
  // fallback; when the model loads it takes over: trimmed above the launch pad (our own rocket stands there),
  // each tier gets a glow shell that follows the model's silhouette, and a plaque on its front face.
  async useTowerModel(url, cfg) {
    if (this.towerModel) return this.towerModel;
    const g = this.sets.tower;
    const gl = await this.gltf.loadAsync(url); const m = gl.scene;
    m.traverse(n => { if (n.isMesh) { n.castShadow = n.receiveShadow = true; } });
    const b0 = new THREE.Box3().setFromObject(m), sz = b0.getSize(new THREE.Vector3());
    const k = cfg.width / Math.max(sz.x, sz.z); m.scale.setScalar(k);
    const b1 = new THREE.Box3().setFromObject(m), c = b1.getCenter(new THREE.Vector3());
    m.position.set(-c.x, -b1.min.y, -c.z); m.rotation.y = cfg.rotY || 0;
    const holder = new THREE.Group(); holder.add(m); g.add(holder); holder.updateMatrixWorld(true);
    const H = new THREE.Box3().setFromObject(holder).max.y;
    this.renderer.localClippingEnabled = true;
    const padY = H * cfg.padFrac, clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), padY);
    m.traverse(n => { if (n.isMesh) { const ms = Array.isArray(n.material) ? n.material : [n.material]; ms.forEach(mm => { mm.clippingPlanes = [clip]; mm.clipShadows = true; }); } });
    // hide the procedural tower parts (keep the lawn, path ring, trees, lamps and clouds)
    this.towerProc.forEach(o => { o.visible = false; });
    // per-tier glow shells and plaques, measured from the model's own vertices
    const meshes = []; m.traverse(n => { if (n.isMesh) meshes.push(n); });
    const v = new THREE.Vector3(), front = (y0, y1) => { let zmax = -1e9, xs = []; for (const ms of meshes) { const pa = ms.geometry.attributes.position; for (let i = 0; i < pa.count; i += 7) { v.fromBufferAttribute(pa, i).applyMatrix4(ms.matrixWorld); if (v.y > y0 && v.y < y1) { if (v.z > zmax) zmax = v.z; } } } return zmax; };
    const levels = this.towerLevels = cfg.tiers.map(([f0, f1], i) => {
      const y0 = H * f0, y1 = H * f1;
      const shellM = new THREE.MeshBasicMaterial({color: '#FFD27A', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
        clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, -1, 0), y1), new THREE.Plane(new THREE.Vector3(0, 1, 0), -y0)]});
      const shell = new THREE.Group(); meshes.forEach(ms => { const cl = new THREE.Mesh(ms.geometry, shellM); cl.matrixAutoUpdate = false; cl.matrix.copy(ms.matrixWorld); shell.add(cl); });
      shell.scale.setScalar(1.004); g.add(shell);
      const zf = front(y0 + (y1 - y0) * 0.3, y0 + (y1 - y0) * 0.7);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.3), new THREE.MeshBasicMaterial({map: this._plaque(i + 1, ['Grade 10', 'Grade 11', 'Grade 12'][i]), transparent: true, toneMapped: false}));
      sign.position.set(cfg.signX || 0, y0 + (y1 - y0) * (cfg.signAt || 0.55), zf + 0.06); g.add(sign);
      return {shellM, sign, group: shell};
    });
    // our rocket and gantry stand on the model's pad
    this.rocket.position.set(cfg.padX || 0, padY + (cfg.rocketLift || 0), cfg.padZ || 0); this.rocket.scale.setScalar(cfg.rocketScale || 0.9); this.rocketY = this.rocket.position.y; this.rocket.visible = true;
    this.towerTop = padY;
    this.towerModel = {holder, H, padY};
    return this.towerModel;
  }
  _plaque(n, grade) { const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d'); x.fillStyle = '#FFFFFF'; x.beginPath(); x.roundRect(4, 4, 504, 152, 40); x.fill(); x.strokeStyle = '#E3DCFF'; x.lineWidth = 6; x.stroke(); x.fillStyle = '#6E41F4'; x.font = '700 64px Inter, sans-serif'; x.textAlign = 'center'; x.fillText('Level ' + n, 256, 84); x.fillStyle = '#7C78A0'; x.font = '600 38px Inter, sans-serif'; x.fillText(grade, 256, 132); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  litLevel(i) { this.towerLevels.forEach((l, k) => { const on = k <= i; if (l.shellM) { const o0 = l.shellM.opacity; this.tween(600, e => { l.shellM.opacity = o0 + ((on ? 0.32 : 0) - o0) * e; }, 'lvl' + k); return; } l.bandM.color.set(on ? '#FFE9A8' : '#FFFFFF'); l.bandM.emissive.set(on ? '#FFC94D' : '#000000'); l.bandM.emissiveIntensity = on ? 1.4 : 0; l.winM.emissiveIntensity = on ? 0.55 : 0.15; }); }
  async launchRocket() {
    const r = this.rocket, y0 = r.position.y; this.flame.material.opacity = 1;
    const flick = (dt, t) => { this.flame.scale.set(1, 1 + Math.sin(t * 40) * 0.2, 1); };
    this.updaters.push(flick);
    await this.tween(600, e => { r.position.x = Math.sin(e * 60) * 0.02 * (1 - e); });
    // a soft violet contrail grows behind it, then fades
    if (!this._trail) { this._trail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.22, 1, 20, 1, true), new THREE.MeshBasicMaterial({color: '#B6A6FF', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false})); r.parent.add(this._trail); }
    const tr = this._trail; tr.visible = true; tr.material.opacity = 0.42;
    await this.tween(2600, e => { r.position.y = y0 + e * e * 22; r.rotation.y = e * 3; const h = Math.max(0.01, r.position.y - y0); tr.scale.set(1, h, 1); tr.position.set(r.position.x, y0 + h / 2, r.position.z); });
    this.updaters.splice(this.updaters.indexOf(flick), 1);
    // then it keeps climbing (easing from launch speed to a cruise), the contrail keeps growing and the
    // clouds keep streaming past, until the slide changes
    let t = 0; this.stopCruise();
    this._cruise = (dt, tt) => {
      t += dt; r.position.y += (5 + 12 * Math.exp(-t * 1.3)) * dt; r.rotation.y += dt * 0.8; this.flame.scale.set(1, 1 + Math.sin(tt * 40) * 0.2, 1);
      const h = r.position.y - y0; tr.scale.set(1, h, 1); tr.position.y = y0 + h / 2;
      (this._skyClouds || []).forEach(c => { if (c.position.y < r.position.y - 10) c.position.y += 40; });
    };
    this.updaters.push(this._cruise);
  }
  stopCruise() { if (this._cruise) { const i = this.updaters.indexOf(this._cruise); if (i > -1) this.updaters.splice(i, 1); this._cruise = null; } }
  resetRocket() {
    this.stopCruise(); this.rocket.position.set(0, this.rocketY, 0); this.rocket.rotation.set(0, 0, 0); this.flame.material.opacity = 0; this.flame.scale.set(1, 1, 1);
    if (this._trail) { this.cancel('trail'); this._trail.visible = false; }
    (this._skyClouds || []).forEach(c => c.position.copy(c.userData.home));
  }
  // Behind the three Mayas (void set): a landing pad and a copy of the rocket that comes down onto it
  landing(on) {
    const g = this.sets.void;
    if (!this._land) {
      const root = new THREE.Group(); root.position.set(1.45, 0, -2.4); g.add(root);   // in the gap beside the Grade 12 Maya
      const pad = mesh(new THREE.CylinderGeometry(0.9, 0.98, 0.12, 56), mat('#FFFFFF')); pad.position.y = 0.06; pad.castShadow = false; root.add(pad);
      const ringM = new THREE.MeshBasicMaterial({color: '#8A6CF7', toneMapped: false, transparent: true, opacity: 0.85});
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.03, 8, 80), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.13; root.add(ring);
      const mark = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.48, 48), new THREE.MeshBasicMaterial({color: '#C9C4FF', toneMapped: false})); mark.rotation.x = -Math.PI / 2; mark.position.y = 0.125; root.add(mark);
      const rocket = this.rocket.clone(true); rocket.position.set(0, 0.12, 0); rocket.rotation.set(0, 0, 0); rocket.scale.setScalar(1.0); root.add(rocket);
      let flame = null; rocket.traverse(n => { if (n.isMesh && n.geometry.type === 'ConeGeometry') { flame = n; n.material = n.material.clone(); } });
      // a soft ring of dust that spreads when it touches down
      const dust = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.78, 48), new THREE.MeshBasicMaterial({color: '#FFFFFF', transparent: true, opacity: 0, depthWrite: false, toneMapped: false}));
      dust.rotation.x = -Math.PI / 2; dust.position.y = 0.14; root.add(dust);
      this._land = {root, rocket, flame, ring, dust, padY: 0.12};
    }
    this._land.root.visible = on;
    return this._land;
  }
  // a few clouds above the pedestals that the landing descends through (above the final frame, hidden after)
  landClouds(on) {
    if (!this._landClouds && on && this._skyClouds && this._skyClouds.length) {
      this._landClouds = [[-3.2, 11.5, -1.5, 1.3], [3.6, 9, -5, 1.7], [-4.8, 6.6, -7, 2.0], [2.4, 5.2, 1.2, 0.9], [5.2, 12.8, -8, 2.2]].map(([x, y, z, sc]) => {
        const c = this._skyClouds[0].clone(); c.position.set(x, y, z); c.scale.setScalar(sc); this.sets.void.add(c); return c; });
    }
    (this._landClouds || []).forEach(c => { c.visible = on; });
  }
  async buildHouse() {
    if (this.houseSpot) return this.houseSpot;
    const data = this._roomData = this._roomData || await fetch('assets/rooms/central-house.json').then(r => r.json());
    const room = new THREE.ObjectLoader().parse(data.room);
    room.position.set(0, 0, 0); room.updateMatrixWorld(true);
    // take the game's own avatar off the platform, but remember where and how tall it stood
    let sk = null; room.traverse(n => { if (n.isSkinnedMesh) sk = n; });
    const av = sk.parent.parent.parent.parent, box = new THREE.Box3().setFromObject(av);
    let top = av; while (top.parent && top.parent !== room) top = top.parent;   // the platform group that held the avatar
    av.parent.remove(av);
    const platTop = new THREE.Box3().setFromObject(top).max.y;
    const spot = this.houseSpot = {pos: [(box.min.x + box.max.x) / 2, platTop, (box.min.z + box.max.z) / 2], h: box.max.y - platTop};
    // pieces at the very front of the room would sit around the camera: hide them
    room.children.forEach(c => { const bb = new THREE.Box3().setFromObject(c); if (!bb.isEmpty() && bb.min.z > 3.3) c.visible = false; });
    room.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } if (n.isPointLight) n.intensity *= 0.9; });
    const g = this.sets.house; g.add(room);
    // breakfast corner in the same room, front-right of the platform (room units: Maya is ~2.9 tall)
    const floorY = this.houseFloor = 0.1, T = this.houseTable = [4.5, floorY, 1.4];
    const wood = mat('#C98D5A', {roughness: 0.7}), woodDark = mat('#9C6A42', {roughness: 0.7});
    const tbl = new THREE.Group(); tbl.position.set(...T); g.add(tbl);
    const tTop = mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.12, 64), wood); tTop.position.y = 1.1; tbl.add(tTop);
    const edge = mesh(new THREE.TorusGeometry(1.25, 0.04, 10, 80), woodDark); edge.rotation.x = Math.PI / 2; edge.position.y = 1.1; tbl.add(edge);
    const leg = mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.05, 24), woodDark); leg.position.y = 0.55; tbl.add(leg);
    const foot = mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.08, 40), woodDark); foot.position.y = 0.04; tbl.add(foot);
    const cloth = mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.01, 48), mat('#F4EEFF')); cloth.position.y = 1.165; tbl.add(cloth);
    const bowl = mesh(new THREE.SphereGeometry(0.28, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#FFFFFF')); bowl.rotation.x = Math.PI; bowl.position.y = 1.44; tbl.add(bowl);
    [['#F2994A', -0.08, 0.02], ['#9BCB6A', 0.1, -0.06], ['#E5484D', 0.0, 0.12]].forEach(([c, x, z]) => { const f = mesh(new THREE.SphereGeometry(0.11, 16, 12), mat(c)); f.position.set(x, 1.47, z); tbl.add(f); });
    [[-0.75, -0.55, '#6E41F4'], [0.75, -0.55, '#5FC7B5'], [0.95, 0.35, '#FFD27A'], [-0.95, 0.4, '#A3A9FE']].forEach(([x, z, c]) => {
      const plate = mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.03, 32), mat('#FFFFFF')); plate.position.set(x, 1.18, z); tbl.add(plate);
      const cup = mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.16, 20), mat(c)); cup.position.set(x * 0.72 + 0.12, 1.24, z * 0.72); tbl.add(cup);
    });
    // Maya's place at the table, marked like an interaction spot in the game
    const spotPos = this.houseSeat = [T[0] - 1.85, floorY, T[2] - 0.1];
    const marker = this.seatMarker = new THREE.Group(); marker.position.set(spotPos[0], floorY + 0.015, spotPos[2]); g.add(marker);
    const ringM = new THREE.MeshBasicMaterial({color: '#7B52FF', transparent: true, opacity: 0.95, toneMapped: false});
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 64), ringM); ring.rotation.x = -Math.PI / 2; marker.add(ring);
    const glowC = document.createElement('canvas'); glowC.width = glowC.height = 128; const gx = glowC.getContext('2d'), gg = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gg.addColorStop(0, 'rgba(140,100,255,0.55)'); gg.addColorStop(1, 'rgba(140,100,255,0)'); gx.fillStyle = gg; gx.fillRect(0, 0, 128, 128);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(glowC), transparent: true, depthWrite: false, toneMapped: false})); glow.rotation.x = -Math.PI / 2; glow.position.y = -0.005; marker.add(glow);
    marker.visible = false;
    this.updaters.push((dt, t) => { if (!marker.visible) return; const k = 1 + Math.sin(t * 4) * 0.06; ring.scale.set(k, k, k); });
    // uplift: warm dust drifting through the room (sun shafts were tried and washed the colours out)
    const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,248,230,1)'); gr.addColorStop(1, 'rgba(255,248,230,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const N = 170, pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 9; pos[i * 3 + 1] = 0.3 + Math.random() * 4; pos[i * 3 + 2] = -5.6 + Math.random() * 6.5; seed[i] = Math.random() * 100; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const motes = new THREE.Points(geo, new THREE.PointsMaterial({map: dotTex, size: 0.05, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false}));
    g.add(motes);
    this.updaters.push((dt, t) => { if (!g.visible) return; const a = geo.attributes.position.array; for (let i = 0; i < N; i++) { a[i * 3 + 1] += Math.sin(t * 0.4 + seed[i]) * 0.0016 + 0.0009; a[i * 3] += Math.cos(t * 0.3 + seed[i]) * 0.0012; if (a[i * 3 + 1] > 4.4) a[i * 3 + 1] = 0.3; } geo.attributes.position.needsUpdate = true; });
    return spot;
  }
  // WeGuide World town, exported from the game with its 23 heavy building meshes replaced by references;
  // the real geometry comes back from the game's own GLB files, matched by vertex and index count.
  async buildTown() {
    if (this.townData) return this.townData;
    const [data] = await Promise.all([fetch('assets/rooms/town.json').then(r => r.json())]);
    const town = new THREE.ObjectLoader().parse(data.town);
    const files = ['voxel-villa', 'crescent-courtyard', 'lumen-pavilion', 'lau-sage', 'academy-gateway', 'news-headquarters', 'question-hub', 'progress-vault', 'circle-achievement', 'market-stall', 'train-station', 'neon-sky-terminal', 'ultraviolet-express', 'cloud', 'plane-opt'];
    const index = {}, from = {};
    await Promise.all(files.map(async f => {
      const g = (await this.gltf.loadAsync('assets/models/game/' + f + '.glb')).scene;
      g.traverse(n => { if (n.isMesh) { const ge = n.geometry, key = ge.attributes.position.count + '/' + (ge.index ? ge.index.count : 0); index[key] = ge; from[key] = f; } });
    }));
    const placed = {}; let missing = 0;
    town.traverse(n => {
      const r = n.isMesh && data.refs[n.uuid]; if (!r) return;
      const key = r.v + '/' + r.i, ge = index[key];
      if (ge) { n.geometry = ge; let top = n; while (top.parent && top.parent !== town) top = top.parent; (placed[from[key]] = placed[from[key]] || []).push(top); } else { missing++; n.visible = false; }
    });
    // take the player's avatar out; remember where it stood and how tall it was
    town.updateMatrixWorld(true);
    let sk = null; town.traverse(n => { if (n.isSkinnedMesh) sk = n; });
    let spot = null;
    if (sk) { const av = sk.parent.parent.parent.parent, box = new THREE.Box3().setFromObject(av); spot = {pos: [(box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2], h: box.max.y - box.min.y}; av.parent.remove(av); }
    town.traverse(n => {
      if (!n.isMesh) return; n.castShadow = true; n.receiveShadow = true;
      // vertex colours added at runtime don't survive the export; without them a surface renders black
      const m = n.material; if (m && m.vertexColors && !n.geometry.attributes.color) {
        m.vertexColors = false; m.needsUpdate = true;
        const sz = new THREE.Box3().setFromObject(n).getSize(new THREE.Vector3());
        if (sz.x > 200) m.color.set('#8CC261');           // the grass
      }
    });
    const buildings = {}; for (const [f, tops] of Object.entries(placed)) buildings[f] = tops.map(t => t.getWorldPosition(new THREE.Vector3()).toArray().map(v => +v.toFixed(2)));
    this.sets.town.add(town);
    this.townData = {spot, buildings, missing, bg: data.bg, fog: data.fog, root: town};
    return this.townData;
  }
  // Counseling room: the game's own room shell (walls, windows, doorway, ceiling lamp) in calm WeGuide
  // lavender and violet, furnished for a conversation. Same world, its own mood.
  async buildCounsel() {
    if (this.counselBuilt) return this.counselSpots;
    this.counselBuilt = true;
    const data = this._roomData = this._roomData || await fetch('assets/rooms/central-house.json').then(r => r.json());
    const room = new THREE.ObjectLoader().parse(data.room); room.position.set(0, 0, 0);
    const keep = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 13, 17]);          // lights, shell, windows, floor light, door wall, ceiling lamp
    room.children.slice().forEach((c, i) => { if (!keep.has(i)) room.remove(c); });
    const recolor = {'f7eed9': '#EEF0FC', 'f3e7cc': '#F5F4FC', 'eccfa4': '#CEC8F4', 'b9a1ea': '#6E41F4', 'ffffff': '#E6CDA8'};
    room.traverse(n => { if (n.isMesh) { n.castShadow = n.receiveShadow = true; const m = n.material; if (m && m.color) { const hex = m.color.getHexString(); if (recolor[hex]) { n.material = m.clone(); n.material.color.set(recolor[hex]); } } } if (n.isPointLight) n.intensity *= 0.85; });
    const g = this.sets.counsel; g.add(room);
    const wood = mat('#C98D5A', {roughness: 0.7}), woodD = mat('#9C6A42', {roughness: 0.7});
    const add = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o; };
    // round rug and two armchairs facing each other across a low table
    add(mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.03, 64), mat('#D9D3FA')), 2.2, 0.12, 0.2);
    add(mesh(new THREE.TorusGeometry(2.55, 0.05, 8, 96), mat('#B6ABF4')), 2.2, 0.14, 0.2).rotation.x = Math.PI / 2;
    const chair = (color) => { const c = new THREE.Group();
      const seat = rbox(1.5, 0.45, 1.4, 0.18, mat(color)); seat.position.y = 0.55; c.add(seat);
      const back = rbox(1.5, 1.2, 0.35, 0.16, mat(color)); back.position.set(0, 1.15, -0.55); c.add(back);
      for (const sx of [-0.7, 0.7]) { const arm = rbox(0.3, 0.75, 1.4, 0.12, mat(color)); arm.position.set(sx, 0.85, 0); c.add(arm); }
      const cush = rbox(1.1, 0.18, 1.0, 0.08, mat('#FFFFFF')); cush.position.set(0, 0.85, 0.08); c.add(cush);
      for (const [lx, lz] of [[-0.6, -0.55], [0.6, -0.55], [-0.6, 0.55], [0.6, 0.55]]) { const l = mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.32), woodD); l.position.set(lx, 0.16, lz); c.add(l); }
      return c; };
    add(chair('#7D5CF6'), 0.5, 0.12, -1.15, 0.9);      // Maya's chair, behind her
    add(chair('#5FC7B5'), 4.0, 0.12, 1.65, -2.25);     // the counselor's chair
    const tbl = new THREE.Group(); add(tbl, 2.25, 0.12, 0.25);
    const tt = mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 40), wood); tt.position.y = 0.62; tbl.add(tt);
    const tl = mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.6, 16), woodD); tl.position.y = 0.3; tbl.add(tl);
    const mug = (c, x, z) => { const u = mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.16, 18), mat(c)); u.position.set(x, 0.74, z); tbl.add(u); };
    mug('#FFD27A', -0.3, 0.15); mug('#A3A9FE', 0.28, -0.2);
    const pot = mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.22, 18), mat('#E79A6B')); pot.position.set(0.05, 0.77, 0.3); tbl.add(pot);
    const leaf = mesh(new THREE.IcosahedronGeometry(0.22, 0), mat('#7FBF5E')); leaf.position.set(0.05, 1.0, 0.3); tbl.add(leaf);
    // counselor's desk with a laptop showing WeGuide, desk lamp and chair
    const desk = new THREE.Group(); add(desk, -3.4, 0.12, -3.6, 0.35);
    const dt = rbox(3.0, 0.12, 1.3, 0.05, wood); dt.position.y = 1.15; desk.add(dt);
    for (const sx of [-1.35, 1.35]) { const side = rbox(0.12, 1.1, 1.2, 0.03, woodD); side.position.set(sx, 0.57, 0); desk.add(side); }
    const scr = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const x = c.getContext('2d'); x.fillStyle = '#F5F3FF'; x.fillRect(0, 0, 256, 160); x.fillStyle = '#6E41F4'; x.font = '600 34px Inter, sans-serif'; x.textAlign = 'center'; x.fillText('weguide.', 128, 92); return new THREE.CanvasTexture(c); })();
    scr.colorSpace = THREE.SRGBColorSpace;
    const lap = rbox(0.9, 0.04, 0.6, 0.02, mat('#C9CCD8')); lap.position.set(0.4, 1.23, 0.1); desk.add(lap);
    const lid = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.54), new THREE.MeshBasicMaterial({map: scr, toneMapped: false})); lid.position.set(0.4, 1.52, -0.2); lid.rotation.x = -0.18; desk.add(lid);
    const lampP = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6), mat('#3A3F55')); lampP.position.set(-1.0, 1.5, -0.2); desk.add(lampP);
    const lampS = mesh(new THREE.ConeGeometry(0.25, 0.3, 24, 1, true), mat('#FFD27A', {side: THREE.DoubleSide, emissive: '#FFD27A', emissiveIntensity: 0.4})); lampS.position.set(-1.0, 1.85, -0.2); desk.add(lampS);
    const dchair = chair('#B6ABF4'); dchair.scale.setScalar(0.8); dchair.position.set(0, 0, 1.0); dchair.rotation.y = Math.PI; desk.add(dchair);
    const glow = new THREE.PointLight('#FFD9A0', 6, 7, 2); glow.position.set(-1.0, 1.7, -0.1); desk.add(glow);
    // bookshelf on the left wall
    const shelf = new THREE.Group(); add(shelf, -7.15, 0.12, 0.2, Math.PI / 2);
    const frame = rbox(3.6, 3.0, 0.6, 0.06, mat('#FFFFFF')); frame.position.y = 1.5; shelf.add(frame);
    const bookC = ['#6E41F4', '#5FC7B5', '#FFD27A', '#F48FB1', '#A3A9FE', '#E79A6B'];
    for (let r = 0; r < 3; r++) { const board = mesh(new THREE.BoxGeometry(3.4, 0.06, 0.55), mat('#E9E4FF')); board.position.set(0, 0.45 + r * 0.95, 0.04); shelf.add(board);
      for (let i = 0; i < 11; i++) { if ((i + r) % 5 === 4) continue; const h = 0.5 + ((i * 7 + r * 3) % 4) * 0.08; const bk = mesh(new THREE.BoxGeometry(0.2, h, 0.42), mat(bookC[(i + r * 2) % bookC.length])); bk.position.set(-1.5 + i * 0.29, 0.48 + r * 0.95 + h / 2, 0.06); shelf.add(bk); } }
    // pinboard of notes and the room's sign
    const board = new THREE.Group(); add(board, -7.4, 2.75, 3.4, Math.PI / 2);
    board.add(rbox(2.4, 1.5, 0.06, 0.04, mat('#F7F1E6')));
    [['#FFD27A', -0.7, 0.3, 0.1], ['#A3A9FE', 0.1, 0.35, -0.08], ['#5FC7B5', 0.8, 0.25, 0.12], ['#F48FB1', -0.4, -0.35, -0.1], ['#FFD27A', 0.5, -0.3, 0.06]].forEach(([c, x, y, r]) => { const n = mesh(new THREE.BoxGeometry(0.5, 0.5, 0.02), mat(c)); n.position.set(x, y, 0.05); n.rotation.z = r; board.add(n); });
    const sign = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#6E41F4'; x.font = '650 92px Inter, sans-serif'; x.textAlign = 'center'; x.fillText('Counseling Center', 512, 120); x.fillStyle = '#7C78A0'; x.font = '500 46px Inter, sans-serif'; x.fillText('Find your direction', 512, 200); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    add(new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({map: sign, transparent: true, toneMapped: false})), 0, 4.55, -6.03);
    // plants in two corners
    for (const [x, z, sc] of [[6.5, -5.1, 1.2], [-6.4, 4.9, 1.0], [6.6, 4.6, 0.9]]) {
      const p2 = new THREE.Group(); add(p2, x, 0.12, z); const pp = mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.7, 20), mat('#FFFFFF')); pp.position.y = 0.35; p2.add(pp);
      [[0, 1.25, 0, 0.62], [0.28, 1.65, 0.1, 0.42], [-0.22, 1.7, -0.12, 0.38]].forEach(([lx, ly, lz, r]) => { const f = mesh(new THREE.IcosahedronGeometry(r, 0), mat('#6FB257')); f.position.set(lx, ly, lz); p2.add(f); });
      p2.scale.setScalar(sc);
    }
    // where people stand (room units: Maya ~2.9 tall here, as in the house)
    this.counselSpots = {door: [0, 0.12, 6.6], maya: [1.2, 0.12, -0.6], counselor: [3.3, 0.12, 1.1]};   // facing each other across the table, side-on to the camera
    return this.counselSpots;
  }
  buildCrossroads(g) {
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), mat('#ECE7FB')); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
    const pathM = mat('#FFFFFF', {roughness: 0.9}), doorCols = ['#6E41F4', '#5FC7B5', '#FFD27A', '#F48FB1', '#A3A9FE', '#E79A6B', '#7D5CF6'];
    const N = 7;
    for (let i = 0; i < N; i++) {
      const a = (-0.62 + i * (1.24 / (N - 1))) * Math.PI / 2 * 1.25, dist = 9 + (i % 3) * 3.2;        // a fan behind her
      const dx = Math.sin(a), dz = -Math.cos(a);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.75, dist), pathM); strip.rotation.x = -Math.PI / 2; strip.rotation.z = -a;
      strip.position.set(dx * dist / 2, 0.01 + i * 0.0005, dz * dist / 2); strip.receiveShadow = true; g.add(strip);
      // the door at the end of the path, facing her
      const door = new THREE.Group(); door.position.set(dx * dist, 0, dz * dist); door.rotation.y = -a; g.add(door);
      const frame = rbox(1.5, 2.6, 0.22, 0.06, mat('#FFFFFF')); frame.position.y = 1.3; door.add(frame);
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.25), new THREE.MeshBasicMaterial({color: i % 2 ? '#FFF6DA' : '#F3F0FF', toneMapped: false})); hole.position.set(0, 1.2, 0.115); door.add(hole);
      const pivot = new THREE.Group(); pivot.position.set(-0.575, 0, 0.13); door.add(pivot);
      const leaf = rbox(1.13, 2.23, 0.07, 0.03, mat(doorCols[i % doorCols.length])); leaf.position.set(0.565, 1.2, 0); pivot.add(leaf);
      const knob = mesh(new THREE.SphereGeometry(0.05, 10, 8), mat('#FFFFFF')); knob.position.set(0.98, 1.2, 0.06); pivot.add(knob);
      pivot.rotation.y = i % 2 ? -0.75 : -0.12;          // some ajar, some barely open
    }
    // three choice pads on the paths ahead of her (slide 6), each with a light beam that shows when chosen
    this.choicePads = [-0.62, 0, 0.62].map((a, i) => {
      const pad = new THREE.Group(); pad.position.set(Math.sin(a) * 3.3, 0, -Math.cos(a) * 3.3); g.add(pad);
      const disc = mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.08, 48), mat('#FFFFFF')); disc.position.y = 0.04; pad.add(disc);
      const ringM = new THREE.MeshBasicMaterial({color: '#7B52FF', transparent: true, opacity: 0.55, toneMapped: false});
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.03, 10, 72), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.09; pad.add(ring);
      const beamM = new THREE.MeshBasicMaterial({color: '#8E6BFF', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, blending: THREE.AdditiveBlending});
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 4.2, 40, 1, true), beamM); beam.position.y = 2.15; pad.add(beam);
      return {pad, ring, ringM, beam, beamM, angle: a};
    });
    this.updaters.push((dt, t) => { if (!g.visible) return; this.choicePads.forEach((c, i) => { c.ring.scale.setScalar(1 + Math.sin(t * 2.4 + i) * 0.04); }); });
    // a signpost beside her: every arrow says "?"
    const qTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d'); x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, 256, 96); x.fillStyle = '#6E41F4'; x.font = '700 68px Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', 128, 52); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const post = new THREE.Group(); post.position.set(1.55, 0, -0.9); g.add(post); this.signpost = post;
    const pole = mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.6, 12), mat('#9C6A42')); pole.position.y = 1.3; post.add(pole);
    [[2.25, 0.5], [1.9, -0.9], [1.55, 2.4], [1.2, -2.3]].forEach(([y, ry]) => {
      const arm = new THREE.Group(); arm.position.y = y; arm.rotation.y = ry; post.add(arm);
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.05), [mat('#E8E3FF'), mat('#E8E3FF'), mat('#E8E3FF'), mat('#E8E3FF'), new THREE.MeshStandardMaterial({map: qTex}), new THREE.MeshStandardMaterial({map: qTex})]);
      board.position.x = 0.5; board.castShadow = true; arm.add(board);
      const tip = mesh(new THREE.ConeGeometry(0.17, 0.22, 3), mat('#E8E3FF')); tip.rotation.z = -Math.PI / 2; tip.position.x = 1.05; arm.add(tip);
    });
  }
  // The WeGuide door: violet, carrying the weguide. mark, rising out of the fog at the end of the centre path
  async buildWeguideDoor() {
    if (this.wgDoor) return this.wgDoor;
    const g = new THREE.Group(); g.position.set(0, 0, -5.2); this.sets.crossroads.add(g);
    const logo = await new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const x = c.getContext('2d'); const k = Math.min(940 / im.width, 200 / im.height); x.drawImage(im, (1024 - im.width * k) / 2, (256 - im.height * k) / 2, im.width * k, im.height * k); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }; im.src = 'assets/brand/weguide-white.svg'; });
    const frame = rbox(2.1, 3.4, 0.32, 0.08, mat('#FFFFFF', {emissive: '#ffffff', emissiveIntensity: 0.15})); frame.position.y = 1.7; g.add(frame);
    const lightM = new THREE.MeshBasicMaterial({color: '#FBF8FF', toneMapped: false});
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.66, 2.98), lightM); inner.position.set(0, 1.6, 0.165); g.add(inner);
    const pivot = new THREE.Group(); pivot.position.set(-0.83, 0, 0.2); g.add(pivot);
    const leaf = rbox(1.64, 2.96, 0.1, 0.04, mat('#6E41F4', {roughness: 0.45, emissive: '#3B1FB0', emissiveIntensity: 0.35})); leaf.position.set(0.82, 1.6, 0); pivot.add(leaf);
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.325), new THREE.MeshBasicMaterial({map: logo, transparent: true, toneMapped: false})); mark.position.set(0.82, 2.15, 0.056); pivot.add(mark);
    const knob = mesh(new THREE.SphereGeometry(0.06, 14, 10), mat('#FFFFFF', {metalness: 0.3, roughness: 0.3})); knob.position.set(1.42, 1.5, 0.08); pivot.add(knob);
    const haloC = document.createElement('canvas'); haloC.width = haloC.height = 256; const hx = haloC.getContext('2d'), hg = hx.createRadialGradient(128, 128, 0, 128, 128, 128);
    hg.addColorStop(0, 'rgba(150,110,255,0.9)'); hg.addColorStop(0.35, 'rgba(130,90,250,0.35)'); hg.addColorStop(1, 'rgba(120,80,240,0)'); hx.fillStyle = hg; hx.fillRect(0, 0, 256, 256);
    const haloM = new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(haloC), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.8});
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), haloM); halo.position.set(0, 1.8, -0.3); g.add(halo);
    const glow = new THREE.PointLight('#9B7BFF', 0, 9, 2); glow.position.set(0, 1.8, 1.2); g.add(glow);
    const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5), new THREE.MeshBasicMaterial({map: haloM.map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.5}));
    floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.set(0, 0.02, 1.0); g.add(floorGlow);
    this.wgDoor = {g, pivot, haloM, glow, floorGlow, lightM};
    this.updaters.push((dt, t) => { if (!g.visible || !this.sets.crossroads.visible) return; haloM.opacity = this.wgDoor.haloBase * (0.85 + Math.sin(t * 2) * 0.15); });
    this.resetDoor();
    return this.wgDoor;
  }
  resetDoor() { const d = this.wgDoor; if (!d) return; d.g.visible = false; d.g.scale.set(1, 0.001, 1); d.pivot.rotation.y = 0; d.haloBase = 0; d.glow.intensity = 0; d.floorGlow.material.opacity = 0; }
  raiseDoor(dur = 1800) {
    const d = this.wgDoor; d.g.visible = true;
    if (!dur) { d.g.scale.y = 1; d.haloBase = 0.75; d.glow.intensity = 6; d.floorGlow.material.opacity = 0.45; return Promise.resolve(); }
    return this.tween(dur, e => { d.g.scale.y = Math.max(0.001, e); d.haloBase = 0.75 * e; d.glow.intensity = 6 * e; d.floorGlow.material.opacity = 0.45 * e; }, 'wgdoor');
  }
  openDoor(dur = 1100) {
    const d = this.wgDoor;
    if (!dur) { d.pivot.rotation.y = -1.9; d.haloBase = 1.2; d.glow.intensity = 14; return Promise.resolve(); }
    return this.tween(dur, e => { d.pivot.rotation.y = -1.9 * e; d.haloBase = 0.75 + 0.45 * e; d.glow.intensity = 6 + 8 * e; }, 'wgdoor');
  }
  // "How it fits together": a numbered trail (curriculum) past real town buildings (the City) to the Tower
  async buildDiorama() {
    if (this.dio) return this.dio;
    const g = new THREE.Group(); g.visible = false; this.sets.tower.add(g);
    const stones = [], P0 = new THREE.Vector3(-8.5, 0, 21), C1 = new THREE.Vector3(-7.5, 0, 11), P1 = new THREE.Vector3(0, 0, 9.4);
    const num = n => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI * 2); x.fill(); x.fillStyle = '#6E41F4'; x.font = '700 60px Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), 64, 68); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    for (let i = 0; i < 10; i++) {
      const t = i / 9, p = new THREE.Vector3().copy(P0).multiplyScalar((1 - t) * (1 - t)).addScaledVector(C1, 2 * (1 - t) * t).addScaledVector(P1, t * t);
      const st = new THREE.Group(); st.position.copy(p); g.add(st);
      const body = mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.16, 40), mat('#EEEAFF')); body.position.y = 0.08; st.add(body);
      const topM = new THREE.MeshBasicMaterial({map: num(i + 1), transparent: true, toneMapped: false});
      const top = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), topM); top.rotation.x = -Math.PI / 2; top.position.y = 0.165; st.add(top);
      const glowM = new THREE.MeshStandardMaterial({color: '#FFFFFF', emissive: '#7B52FF', emissiveIntensity: 0});
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.035, 8, 48), glowM); rim.rotation.x = Math.PI / 2; rim.position.y = 0.16; st.add(rim);
      stones.push({st, glowM, body});
    }
    const spots = [['progress-vault', -11.5, 14.5, 4.6, 0.6], ['question-hub', -3.6, 17.0, 4.0, -0.5], ['news-headquarters', -11.8, 7.4, 4.4, 0.9], ['lau-sage', 3.8, 14.6, 4.8, -0.8]];
    const blds = await Promise.all(spots.map(async ([n, x, z, size, ry]) => {
      const m = await this.model(n); const bb = new THREE.Box3().setFromObject(m), sz = bb.getSize(new THREE.Vector3()); m.scale.setScalar(size / Math.max(sz.x, sz.z));
      const b2 = new THREE.Box3().setFromObject(m), c = b2.getCenter(new THREE.Vector3()); const holder = new THREE.Group(); holder.position.set(x, 0, z); holder.rotation.y = ry; g.add(holder);
      m.position.set(-c.x, -b2.min.y, -c.z); holder.add(m); holder.scale.set(1, 0.001, 1);
      const base = mesh(new THREE.CylinderGeometry(size * 0.62, size * 0.64, 0.08, 40), mat('#9DCB72')); base.position.set(x, 0.04, z); g.add(base);
      return holder;
    }));
    const anchors = {trail: new THREE.Object3D(), city: new THREE.Object3D(), tower: new THREE.Object3D()};
    anchors.trail.position.copy(stones[6].st.position).add(new THREE.Vector3(0, 0.6, 0));
    anchors.city.position.set(-11.6, 4.6, 11.2); anchors.tower.position.set(3.4, this.towerTop + 0.5, 0.6);   // beside the top, clear of the nav bar
    Object.values(anchors).forEach(a => g.add(a));
    this.dio = {g, stones, blds, anchors};
    return this.dio;
  }
  dioReset() { const d = this.dio; if (!d) return; d.stones.forEach(s => { s.glowM.emissiveIntensity = 0; s.body.material.color.set('#EEEAFF'); }); d.blds.forEach(b => b.scale.set(1, 0.001, 1)); }
  dioStones(instant) {
    const d = this.dio; d.stones.forEach((s, i) => {
      const run = () => { s.body.material.color.set('#D9CFFF'); this.tween(500, e => { s.glowM.emissiveIntensity = 1.3 * e; }, 'dst' + i); };
      if (instant) { s.body.material.color.set('#D9CFFF'); s.glowM.emissiveIntensity = 1.3; } else setTimeout(run, i * 120);
    });
  }
  dioBuildings(instant) { this.dio.blds.forEach((b, i) => { if (instant) b.scale.y = 1; else setTimeout(() => this.tween(900, e => { b.scale.y = Math.max(0.001, 1 - Math.pow(1 - e, 3) * (1 + 0.15 * Math.sin(e * Math.PI))); }, 'dbl' + i), i * 140); }); }
  // Three pedestals on the intro disc (for the three-years slide); hides the big disc while shown
  pedestals(on) {
    const g = this.sets.void;
    if (!this._peds) {
      this._peds = [-2.75, 0, 2.75].map((x, i) => {
        const p = new THREE.Group(); p.position.x = x; g.add(p);
        const d = mesh(new THREE.CylinderGeometry(0.85, 0.92, 0.16, 48), mat('#FFFFFF')); d.castShadow = false; d.position.y = 0.08; p.add(d);
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.035, 8, 72), new THREE.MeshStandardMaterial({color: ['#C9C4FF', '#A99CFB', '#8A6CF7'][i], emissive: ['#C9C4FF', '#A99CFB', '#8A6CF7'][i], emissiveIntensity: 0.8})); r.rotation.x = Math.PI / 2; r.position.y = 0.16; p.add(r);
        return p;
      });
    }
    this._peds.forEach(p => { p.visible = on; });
    g.children.slice(0, 2).forEach(c => { c.visible = !on; });   // the big intro disc and its ring
    return this._peds.map(p => p.position);
  }
  // How the method works: an open framework book, an AI orb sorting evidence cards, and a light pulse that runs
  // from the book through the orb to the counselor's pedestal. Built once in the void set, toggled per scene.
  methodProps(on) {
    const g = this.sets.void;
    if (!this._mp) {
      const V = '#6E41F4', L = '#B6A6FF';
      const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(160,130,255,1)'); gr.addColorStop(0.35, 'rgba(130,95,250,.45)'); gr.addColorStop(1, 'rgba(110,65,244,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
      const glow = (sc, op = 0.9) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({map: glowTex, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false})); sp.scale.setScalar(sc); return sp; };
      const pageTex = right => { const c = document.createElement('canvas'); c.width = 360; c.height = 500; const x = c.getContext('2d'); x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, 360, 500);
        if (!right) { x.fillStyle = V; x.fillRect(40, 54, 150, 22); x.fillStyle = '#D9D3FA'; for (let i = 0; i < 9; i++) x.fillRect(40, 120 + i * 38, i % 3 === 2 ? 180 : 270, 12); }
        else { x.strokeStyle = '#CFC4FF'; x.lineWidth = 8; x.beginPath(); x.moveTo(180, 120); x.lineTo(90, 300); x.moveTo(180, 120); x.lineTo(270, 300); x.moveTo(90, 300); x.lineTo(270, 300); x.stroke();
          [[180, 120, V], [90, 300, '#A99CFB'], [270, 300, '#A99CFB']].forEach(([cx, cy, col]) => { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, 34, 0, 7); x.fill(); });
          x.fillStyle = '#D9D3FA'; x.fillRect(60, 400, 240, 12); x.fillRect(60, 436, 170, 12); }
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
      // 1. the framework, designed by people: an open book
      const book = new THREE.Group(), bookIn = new THREE.Group(); book.add(bookIn);
      const cover = rbox(1.56, 0.07, 1.08, 0.03, mat(V, {roughness: 0.6})); bookIn.add(cover);
      [-1, 1].forEach(side => { const pg = new THREE.Group(); pg.position.set(side * 0.02, 0.05, 0); pg.rotation.z = -side * 0.12; bookIn.add(pg);
        const leaf = rbox(0.74, 0.05, 1.0, 0.02, mat('#FBFAFF')); leaf.position.x = side * 0.38; pg.add(leaf);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.94), new THREE.MeshBasicMaterial({map: pageTex(side > 0), toneMapped: false})); face.rotation.x = -Math.PI / 2; face.position.set(side * 0.38, 0.027, 0); pg.add(face); });
      bookIn.rotation.x = 0.62; book.position.set(-2.75, 1.0, 0.1); book.add(glow(1.6, 0.35)); g.add(book);
      // 2. AI assists: a soft core inside an icosahedron, evidence cards circling it
      const orb = new THREE.Group(); orb.position.set(0, 1.08, 0.1); g.add(orb);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 24), new THREE.MeshStandardMaterial({color: '#9A80FF', emissive: V, emissiveIntensity: 1.1, roughness: 0.25})); orb.add(core);
      const shell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.52, 1)), new THREE.LineBasicMaterial({color: L, transparent: true, opacity: 0.85, toneMapped: false})); orb.add(shell);
      orb.add(glow(1.9, 0.8));
      const cards = [0, 1, 2, 3, 4].map(i => { const cd = new THREE.Group(); const b = rbox(0.34, 0.22, 0.025, 0.03, mat('#FFFFFF', {roughness: 0.5})); cd.add(b);
        const st = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.12), new THREE.MeshBasicMaterial({color: ['#6E41F4', '#5FC7B5', '#FFB547', '#F48FB1', '#A99CFB'][i], toneMapped: false})); st.position.set(-0.11, 0.02, 0.014); cd.add(st);
        const ln = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.025), new THREE.MeshBasicMaterial({color: '#D9D3FA', toneMapped: false})); ln.position.set(0.03, 0.04, 0.014); cd.add(ln);
        const ln2 = ln.clone(); ln2.scale.x = 0.65; ln2.position.set(0.006, -0.02, 0.014); cd.add(ln2); orb.add(cd); return cd; });
      // the flow line and its travelling pulse
      const curve = new THREE.CatmullRomCurve3([[-2.75, 1.45, 0.1], [-1.4, 1.95, 0.25], [0, 1.6, 0.1], [1.4, 1.95, 0.25], [2.4, 1.9, 0.1]].map(v => new THREE.Vector3(...v)));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.009, 6), new THREE.MeshBasicMaterial({color: L, transparent: true, opacity: 0.55, toneMapped: false})); g.add(tube);
      const pulse = new THREE.Group(); pulse.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({color: '#FFFFFF', toneMapped: false})), glow(0.6, 1)); g.add(pulse);
      // the Counselor Academy certificate, floating beside the counselor
      const cert = (() => { const W = 1100, H = 760, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
        x.fillStyle = '#FFFFFF'; x.beginPath(); x.roundRect(6, 6, W - 12, H - 12, 44); x.fill();
        x.strokeStyle = '#CFC4FF'; x.lineWidth = 5; x.beginPath(); x.roundRect(34, 34, W - 68, H - 68, 26); x.stroke();
        x.strokeStyle = '#EEE9FF'; x.lineWidth = 2; x.beginPath(); x.roundRect(50, 50, W - 100, H - 100, 18); x.stroke();
        x.textAlign = 'center'; x.fillStyle = V; x.font = '650 52px Inter, sans-serif'; x.fillText('weguide.', W / 2, 140);
        x.fillStyle = '#7C78A0'; x.font = '700 30px Inter, sans-serif'; x.letterSpacing = '6px'; x.fillText('COUNSELOR ACADEMY', W / 2, 205); x.letterSpacing = '0px';
        x.fillStyle = '#1E1B2E'; x.font = '650 86px Inter, sans-serif'; x.fillText('Training certificate', W / 2, 318);
        x.fillStyle = '#6E7386'; x.font = '500 36px Inter, sans-serif'; x.fillText('Awarded after practical checks', W / 2, 382);
        x.textAlign = 'left'; x.strokeStyle = '#D9D3FA'; x.lineWidth = 3; x.beginPath(); x.moveTo(120, 590); x.lineTo(560, 590); x.stroke();
        x.fillStyle = '#9A97B5'; x.font = '600 28px Inter, sans-serif'; x.fillText('Counselor', 120, 632);
        // seal with ribbons
        x.fillStyle = '#8E6BFF'; x.beginPath(); x.moveTo(860, 600); x.lineTo(830, 700); x.lineTo(862, 680); x.lineTo(880, 712); x.lineTo(900, 610); x.fill();
        x.beginPath(); x.moveTo(940, 600); x.lineTo(970, 700); x.lineTo(938, 680); x.lineTo(920, 712); x.lineTo(900, 610); x.fill();
        const gr = x.createRadialGradient(880, 560, 10, 900, 580, 96); gr.addColorStop(0, '#9A80FF'); gr.addColorStop(1, '#6E41F4'); x.fillStyle = gr; x.beginPath(); x.arc(900, 570, 88, 0, 7); x.fill();
        x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 3; x.beginPath(); x.arc(900, 570, 70, 0, 7); x.stroke();
        x.strokeStyle = '#FFFFFF'; x.lineWidth = 12; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(862, 572); x.lineTo(890, 600); x.lineTo(942, 542); x.stroke();
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
        const grp = new THREE.Group(), face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.105), new THREE.MeshBasicMaterial({map: tex, transparent: true, toneMapped: false}));
        const back = rbox(1.57, 1.075, 0.04, 0.04, mat('#E9E4FF')); back.position.z = -0.03; grp.add(back, face); return grp; })();
      cert.scale.setScalar(0.72); cert.position.set(4.05, 1.6, 0.35); cert.rotation.y = -0.35; g.add(cert);
      this._mp = {book, orb, cards, tube, pulse, cert, shell, curve, items: [book, orb, tube, pulse]};
      this.updaters.push((dt, t) => {
        const m = this._mp; if (!m.book.visible && !m.cert.visible) return;
        m.book.position.y = 1.0 + Math.sin(t * 1.3) * 0.05; m.book.rotation.y = Math.sin(t * 0.5) * 0.18;
        m.shell.rotation.y = t * 0.35; m.shell.rotation.x = t * 0.2; m.orb.position.y = 1.08 + Math.sin(t * 1.1 + 1) * 0.04;
        m.cards.forEach((cd, i) => { const a = t * 0.55 + i * Math.PI * 2 / 5; cd.position.set(Math.cos(a) * 0.82, Math.sin(a * 2 + i) * 0.12, Math.sin(a) * 0.82); cd.rotation.set(0, -a + Math.PI / 2, 0); });
        const k = (t % 3.4) / 3.4; m.pulse.position.copy(m.curve.getPointAt(k)); m.pulse.scale.setScalar(Math.min(1, k * 8, (1 - k) * 8));
        m.cert.position.y = 1.6 + Math.sin(t * 1.2 + 2) * 0.05;
      });
    }
    const m = this._mp;
    m.items.forEach(o => { o.visible = on; o.scale.setScalar(1); }); m.cert.visible = false;
    return m;
  }
  // The price staircase: one step per graduated band (higher price, higher step), and a cohort of small
  // student figures (one per 10 students) that fills the steps from the left as the slider moves.
  stairs(on) {
    const g = this.sets.void;
    if (!this._st) {
      const BANDS = [[100, 90, 'First 100'], [100, 80, '101–200'], [200, 70, '201–400'], [300, 65, '401–700'], [200, 60, '701 onward']];
      const ROWS = 5, SP = 0.42, PAD = 0.34, GAP = 0.16, D = ROWS * SP + PAD;
      const root = new THREE.Group(); g.add(root);
      let x = 0; const steps = [], slots = [];
      BANDS.forEach(([size, rate, name], b) => {
        const cols = Math.ceil(size / 10 / ROWS), w = cols * SP + PAD, h = 0.4 + (rate - 55) / 35 * 1.35;
        const topM = mat('#FFFFFF', {roughness: 0.6}), step = rbox(w, h, D, 0.06, topM); step.position.set(x + w / 2, h / 2, 0); root.add(step);
        // the price label on the step's front face
        const c = document.createElement('canvas'); c.width = 512; c.height = 256; const t = c.getContext('2d');
        t.fillStyle = '#6E41F4'; t.font = '700 118px Inter, sans-serif'; t.textAlign = 'center'; t.fillText('$' + rate, 256, 128);
        t.fillStyle = '#7C78A0'; t.font = '600 46px Inter, sans-serif'; t.fillText(name, 256, 206);
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
        const lw = Math.min(w - 0.12, 1.5), lh = lw / 2;
        const lbl = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), new THREE.MeshBasicMaterial({map: tex, transparent: true, toneMapped: false}));
        lbl.position.set(x + w / 2, Math.max(lh / 2 + 0.04, h - lh / 2 - 0.06), D / 2 + 0.004); root.add(lbl);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.025, 0.025), new THREE.MeshBasicMaterial({color: '#B6A6FF', toneMapped: false})); edge.position.set(x + w / 2, h + 0.005, D / 2 - 0.02); root.add(edge);
        steps.push({step, topM, lbl, edge, size, h});
        for (let k = 0; k < size / 10; k++) { const col = Math.floor(k / ROWS), row = k % ROWS; slots.push({band: b, x: x + PAD / 2 + SP / 2 + col * SP, y: h, z: -D / 2 + PAD / 2 + SP / 2 + (ROWS - 1 - row) * SP}); }
        x += w + GAP;
      });
      root.position.x = -(x - GAP) / 2;
      // the cohort: instanced bodies and heads in a mix of colours
      const N = slots.length, bodyG = new THREE.CapsuleGeometry(0.11, 0.2, 4, 12), headG = new THREE.SphereGeometry(0.105, 18, 12);
      const bodies = new THREE.InstancedMesh(bodyG, mat('#FFFFFF', {roughness: 0.7}), N), heads = new THREE.InstancedMesh(headG, mat('#FFFFFF', {roughness: 0.6}), N);
      bodies.castShadow = heads.castShadow = true; root.add(bodies, heads);
      const shirts = ['#6E41F4', '#5FC7B5', '#FFC94D', '#F48FB1', '#A3A9FE', '#E79A6B', '#7D5CF6', '#4FB3D9'], skins = ['#F3D5B5', '#E2B68F', '#C99067', '#8E5B3C', '#F0C8A4'], col = new THREE.Color();
      slots.forEach((sl, i) => { const r = (i * 7919) % 97; bodies.setColorAt(i, col.set(shirts[r % shirts.length])); heads.setColorAt(i, col.set(skins[(r >> 2) % skins.length])); sl.cur = 0; sl.tgt = 0; sl.delay = 0; sl.seed = r * 0.13; });
      bodies.instanceColor.needsUpdate = heads.instanceColor.needsUpdate = true;
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3();
      this._st = {root, steps, slots, bodies, heads, count: -1};
      this.updaters.push((dt, t) => {
        const st = this._st; if (!st.root.visible) return;
        st.slots.forEach((sl, i) => {
          if (sl.delay > 0) { sl.delay -= dt; } else sl.cur += (sl.tgt - sl.cur) * Math.min(1, dt * 9);
          const k = sl.cur < 0.002 ? 0.0001 : sl.cur, hop = Math.max(0, Math.sin(t * 2.2 + sl.seed)) * 0.025 * k;
          P.set(sl.x, sl.y + 0.21 * k + hop, sl.z); S.setScalar(k); M.compose(P, Q, S); st.bodies.setMatrixAt(i, M);
          P.y = sl.y + 0.52 * k + hop; M.compose(P, Q, S); st.heads.setMatrixAt(i, M);
        });
        st.bodies.instanceMatrix.needsUpdate = st.heads.instanceMatrix.needsUpdate = true;
      });
    }
    this._st.root.visible = on;
    g.children.slice(0, 2).forEach(c => { c.visible = !on; });   // the intro disc and its ring
    return this._st;
  }
  // Fill the staircase for n contracted students (one figure per 10)
  setCohort(n, instant) {
    const st = this._st; if (!st) return;
    let left = n; const per = st.steps.map(s => { const k = Math.min(left, s.size); left -= k; return Math.ceil(k / 10); });
    let order = 0;
    st.slots.forEach(sl => { const b = sl.band, idx = st.slots.filter(o => o.band === b).indexOf(sl), want = idx < per[b] ? 1 : 0;
      if (want !== sl.tgt) { sl.delay = instant ? 0 : (want ? order++ * 0.012 : 0); sl.tgt = want; if (instant) sl.cur = want; } });
    st.steps.forEach((s, b) => { const used = per[b] > 0; s.topM.color.set(used ? '#EEE9FF' : '#FFFFFF'); s.lbl.material.opacity = used ? 1 : 0.4; s.edge.visible = used; });
  }
  // Highlight one choice pad (or none with -1)
  pickPad(i, dur = 700) {
    this.choicePads.forEach((c, k) => {
      const on = k === i, b0 = c.beamM.opacity, r0 = c.ringM.opacity;
      this.tween(dur, e => { c.beamM.opacity = b0 + ((on ? 0.34 : 0) - b0) * e; c.ringM.opacity = r0 + ((i < 0 ? 0.55 : on ? 1 : 0.18) - r0) * e; }, 'pad' + k);
    });
  }
  // A floating information card: a crisp canvas texture on a thin rounded slab (used for Maya's scattered pieces)
  infoCard(label, title, accent = '#6E41F4') {
    const W = 1024, H = 600, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const r = 56; x.fillStyle = '#FFFFFF'; x.beginPath(); x.roundRect(8, 8, W - 16, H - 16, r); x.fill();
    x.strokeStyle = '#E3DCFF'; x.lineWidth = 6; x.stroke();
    x.fillStyle = accent; x.beginPath(); x.roundRect(70, 74, 18, 120, 9); x.fill();
    x.fillStyle = '#7C78A0'; x.font = '700 40px Inter, sans-serif'; x.fillText(label.toUpperCase(), 120, 118);
    x.fillStyle = '#212121'; x.font = '650 74px Inter, sans-serif';
    const words = title.split(' '); let line = '', y = 250;
    for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > W - 190) { x.fillText(line, 120, y); line = w; y += 92; } else line = t; }
    x.fillText(line, 120, y);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const card = new THREE.Group();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.94), new THREE.MeshBasicMaterial({map: tex, transparent: true, toneMapped: false}));
    const back = rbox(1.56, 0.9, 0.04, 0.03, mat('#EDE8FF')); back.position.z = -0.03;
    card.add(back, face); return card;
  }
  // The Universe of Majors: ten fields of study as slowly turning star clusters. Stars are drawn by a small shader
  // (crisp core, soft halo, twinkle) so they stay sharp at any pixel ratio. 408 career stars and 114 brighter
  // major stars (the app's own counts), a soft nebula and faint constellation lines per field. Hover a field to
  // light it up; focus(k) flies the camera to it.
  buildUniverse() {
    if (this.uni) return this.uni;
    const g = this.sets.universe; g.userData.parallax = 0.45;
    const fields = ['Education', 'Arts and humanities', 'Social sciences, journalism and information', 'Business, administration and law', 'Engineering, manufacturing and construction', 'Natural sciences, mathematics and statistics', 'Information and communication technologies', 'Agriculture, forestry, fisheries and veterinary', 'Health and welfare', 'Services'];
    const cols = ['#A3A9FE', '#F48FB1', '#FFD27A', '#7FD6C2', '#FFB36B', '#8FC8FF', '#B79CFF', '#9BDB7E', '#FF9AA8', '#E6E1FF'];
    const PR = this.renderer.getPixelRatio();
    const starShader = () => new THREE.ShaderMaterial({
      uniforms: {uTime: {value: 0}, uPR: {value: PR}, uHi: {value: 0}, uDim: {value: 0}},
      vertexShader: `attribute float aSize; attribute float aSeed; attribute vec3 aColor; uniform float uTime, uPR, uHi, uDim; varying vec3 vCol; varying float vA;
        void main() { vec4 mv = modelViewMatrix * vec4(position * (1.0 + uHi * 0.16), 1.0);
          float tw = 0.72 + 0.28 * sin(uTime * (1.2 + aSeed * 2.3) + aSeed * 50.0);
          gl_PointSize = aSize * uPR * (300.0 / -mv.z) * (1.0 + uHi * 0.45); gl_Position = projectionMatrix * mv;
          vCol = aColor; vA = tw * (1.0 - uDim * 0.5); }`,
      fragmentShader: `varying vec3 vCol; varying float vA;
        void main() { vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; if (r > 1.0) discard;
          float core = smoothstep(0.32, 0.0, r), halo = pow(1.0 - r, 2.6) * 0.6, a = (core + halo) * vA;
          gl_FragColor = vec4(mix(vCol, vec3(1.0), core * 0.8) * a, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false});
    const pointsOf = (n, place, sizeFn, colFn) => {
      const P = new Float32Array(n * 3), S = new Float32Array(n), D = new Float32Array(n), C = new Float32Array(n * 3), c = new THREE.Color();
      for (let i = 0; i < n; i++) { const v = place(i); P.set([v.x, v.y, v.z], i * 3); S[i] = sizeFn(i); D[i] = Math.random(); c.set(colFn(i)); C.set([c.r, c.g, c.b], i * 3); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('aSize', new THREE.BufferAttribute(S, 1)); geo.setAttribute('aSeed', new THREE.BufferAttribute(D, 1)); geo.setAttribute('aColor', new THREE.BufferAttribute(C, 3));
      const m = starShader(), pts = new THREE.Points(geo, m); pts.frustumCulled = false; return pts;
    };
    // a deep field of small background stars
    const sky = pointsOf(2600, () => { const th = Math.random() * Math.PI * 2, ph = Math.acos(1 - Math.random() * 1.1), r = 70 + Math.random() * 20; return new THREE.Vector3(Math.sin(ph) * Math.cos(th) * r, Math.cos(ph) * r * 0.85 - 6, Math.sin(ph) * Math.sin(th) * r); },
      () => 0.12 + Math.pow(Math.random(), 3) * 0.55, () => ['#FFFFFF', '#DCD6FF', '#C9D8FF', '#FFE9D0'][(Math.random() * 4) | 0]);
    g.add(sky);
    // lay the ten fields out on screen (two staggered rows right of the copy, under the menu, above the phone clip)
    const cam = new THREE.PerspectiveCamera(50, 1440 / 900, 0.1, 400); cam.position.set(-2.1, 1.35, 5.8); cam.lookAt(0.8, 6.4, -12); cam.updateMatrixWorld();
    const ndc = [[0.02, 0.48, 27], [0.2, 0.64, 29], [0.4, 0.66, 30], [0.58, 0.6, 29], [0.38, 0.26, 25], [0.7, 0.42, 30], [0.56, 0.2, 27], [0.68, 0.04, 28], [0.18, 0.2, 26], [0.02, -0.1, 25]];
    const centers = ndc.map(([x, y, d]) => { const v = new THREE.Vector3(x, y, 0.5).unproject(cam).sub(cam.position).normalize(); return cam.position.clone().addScaledVector(v, d); });
    // a soft nebula glow drawn in the shader (smooth Gaussian in full precision, lightly dithered, so no banding ring)
    const quad = new THREE.PlaneGeometry(2, 2);
    const nebula = (col, sx, sy) => new THREE.ShaderMaterial({
      uniforms: {uColor: {value: new THREE.Color(col)}, uOpacity: {value: 0.16}, uScale: {value: new THREE.Vector2(sx, sy)}},
      vertexShader: `uniform vec2 uScale; varying vec2 vUv; void main() { vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); mv.xy += position.xy * uScale; vUv = position.xy; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
        void main() { float r = length(vUv); float a = exp(-r * r * 4.2) * (1.0 - smoothstep(0.7, 1.0, r)) * uOpacity;
          a += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 400.0; a = max(a, 0.0);
          gl_FragColor = vec4(uColor * a, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false});
    const careersPer = fields.map((_, k) => Math.floor(408 / 10) + (k < 408 % 10 ? 1 : 0)), majorsPer = fields.map((_, k) => Math.floor(114 / 10) + (k < 114 % 10 ? 1 : 0));
    const clusters = fields.map((f, k) => {
      const grp = new THREE.Group(); grp.position.copy(centers[k]); grp.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 6, (Math.random() - 0.5) * 0.4); g.add(grp);
      const spread = 1.85, gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      const careers = pointsOf(careersPer[k], () => new THREE.Vector3(gauss() * spread, gauss() * spread * 0.55, gauss() * spread), () => 0.45 + Math.random() * 0.4, () => cols[k]);
      const majorPos = []; const majors = pointsOf(majorsPer[k], i => { const a = i / majorsPer[k] * Math.PI * 2 + Math.random() * 0.4, r = 0.7 + Math.random() * 1.15, v = new THREE.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 1.0, Math.sin(a) * r); majorPos.push(v); return v; }, () => 1.15 + Math.random() * 0.5, () => cols[k]);
      grp.add(careers, majors);
      // constellation: each major linked to the next
      const lp = []; majorPos.forEach((v, i) => { const w = majorPos[(i + 1) % majorPos.length]; lp.push(v.x, v.y, v.z, w.x, w.y, w.z); });
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
      const lineM = new THREE.LineBasicMaterial({color: cols[k], transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false}); grp.add(new THREE.LineSegments(lg, lineM));
      const nebA = nebula(cols[k], 4, 4), nebB = nebula(cols[k], 2.8, 1.8), n1 = new THREE.Mesh(quad, nebA), n2 = new THREE.Mesh(quad, nebB); n2.position.set(0.9, 0.3, 0.4); n1.frustumCulled = n2.frustumCulled = false; grp.add(n1, n2);
      const nebM = {set opacity(v) { nebA.uniforms.uOpacity.value = v; nebB.uniforms.uOpacity.value = v * 0.8; }};
      const anchor = new THREE.Object3D(); anchor.position.copy(centers[k]).add(new THREE.Vector3(0, 2.3, 0)); g.add(anchor);
      const hit = new THREE.Object3D(); hit.position.copy(centers[k]); g.add(hit);
      return {grp, mats: [careers.material, majors.material], lineM, nebM, anchor, hit, hi: 0, want: 0, spin: 0.05 + Math.random() * 0.05};
    });
    // the star she saves: architecture, in engineering, manufacturing and construction (turns with its field)
    const archM = starShader(); const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.Float32BufferAttribute([0.9, -0.35, 0.3], 3)); ag.setAttribute('aSize', new THREE.Float32BufferAttribute([2.6], 1)); ag.setAttribute('aSeed', new THREE.Float32BufferAttribute([0.3], 1)); ag.setAttribute('aColor', new THREE.Float32BufferAttribute([1, 0.89, 0.66], 3));
    const arch = new THREE.Points(ag, archM); arch.frustumCulled = false; clusters[4].grp.add(arch);
    const archAnchor = new THREE.Object3D(); archAnchor.position.set(0.9, 0.5, 0.3); clusters[4].grp.add(archAnchor);
    // a glowing platform under her feet
    const plat = mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.12, 48), mat('#2C2560', {emissive: '#3A2C8C', emissiveIntensity: 0.5})); plat.position.y = 0.06; g.add(plat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.03, 8, 80), new THREE.MeshBasicMaterial({color: '#9C84FF', toneMapped: false})); ring.rotation.x = Math.PI / 2; ring.position.y = 0.13; g.add(ring);
    const u = this.uni = {fields, cols, clusters, anchors: clusters.map(c => c.anchor), arch, archM, archAnchor, archBoost: 0, focused: -1,
      hover: (k, on) => { clusters.forEach((c, i) => { if (i === k) c.want = on ? 1 : 0; }); },
      home: [[-2.1, 1.35, 5.8], [0.8, 6.4, -12]],
      focus: (k, dur = 1500) => {
        u.focused = k; if (k < 0) return this.shot(u.home[0], u.home[1], dur);
        const c = centers[k], from = new THREE.Vector3(...u.home[0]), to = from.clone().lerp(c, 0.42); to.y = Math.max(to.y, c.y - 3.5);
        const look = c.clone().add(new THREE.Vector3(-1.6, 0, 0));
        return this.shot(to.toArray(), look.toArray(), dur);
      }};
    this.updaters.push((dt, t) => {
      if (!g.visible) return;
      const any = Math.max(...clusters.map(c => Math.max(c.want, u.focused === clusters.indexOf(c) ? 1 : 0)));
      sky.material.uniforms.uTime.value = t;
      clusters.forEach((c, i) => {
        const want = Math.max(c.want, u.focused === i ? 1 : 0); c.hi += (want - c.hi) * Math.min(1, dt * 6);
        c.grp.rotation.y += dt * c.spin * (1 + c.hi * 1.5);
        c.mats.forEach(m => { m.uniforms.uTime.value = t; m.uniforms.uHi.value = c.hi; m.uniforms.uDim.value = any * (1 - c.hi); });
        c.lineM.opacity = 0.16 + c.hi * 0.4; c.nebM.opacity = (0.34 + c.hi * 0.42) * (1 - any * 0.5 * (1 - c.hi));
      });
      archM.uniforms.uTime.value = t; archM.uniforms.uHi.value = u.archBoost * (0.8 + Math.sin(t * 4) * 0.2);
    });
    return u;
  }
  // Compile a set's shaders ahead of time without showing it (avoids a hitch on first view).
  async prewarm(name) {
    const g = this.sets[name]; if (!g || this.current === name) return;
    // shader variants depend on fog and tone mapping, so compile with the set's own settings
    const L = g.userData.light || {}, fog = this.scene.fog, tm = this.renderer.toneMapping;
    this.scene.remove(g); g.visible = true;
    this.scene.fog = L.fog ? new THREE.Fog(...L.fog) : null; this.renderer.toneMapping = L.aces ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
    try { await (this.renderer.compileAsync ? this.renderer.compileAsync(g, this.cam, this.scene) : this.renderer.compile(g, this.cam, this.scene)); }
    finally { g.visible = this.current === name; this.scene.add(g); if (this.current !== name) { this.scene.fog = fog; this.renderer.toneMapping = tm; } }
  }
  async buildTrail(n) {
    // A grade "land": a lawn island with a winding trail of numbered Destination stones, each with a flag
    const g = this.sets.trail;
    if (!this.trailIsland) {
      const isl = new THREE.Group(); this.trailIsland = isl; g.add(isl);
      const top = mesh(new THREE.CylinderGeometry(9.4, 9.6, 0.5, 72), mat('#9DCB72')); top.position.y = -0.21; isl.add(top);   // top sits just above the floor plane (no z-fighting)
      const side = mesh(new THREE.CylinderGeometry(9.6, 8.6, 1.6, 72), mat('#B9A9FB')); side.position.y = -1.3; isl.add(side);
      const treeCols = ['#7FBF5E', '#6FB257', '#9BCB6A', '#F2B640'];
      for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2, r = 7.6 + (k % 3) * 0.55; if (Math.sin(a) > 0.2 && Math.cos(a) < 0.6 && Math.cos(a) > -0.6) continue;
        const t = new THREE.Group(); t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r * 0.8); isl.add(t);
        const tr = mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.7, 8), mat('#9C6A42')); tr.position.y = 0.35; t.add(tr);
        const cr = mesh(new THREE.IcosahedronGeometry(0.5 + (k % 2) * 0.18, 0), mat(treeCols[k % 4])); cr.position.y = 1.05; t.add(cr); }
    }
    if (this.trailStones) this.trailStones.forEach(st => g.remove(st.group));
    const num = i => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI * 2); x.fill(); x.fillStyle = '#6E41F4'; x.font = '700 60px Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(i), 64, 68); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    this.trailStones = []; this.trailPts = [];
    const start = n === 10 ? 1 : 0;   // Grade 10 counts from 1; Grades 11 and 12 start with Destination 0
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1), x = -6 + t * 12, z = Math.sin(t * Math.PI * 1.6) * 2.0 + 0.8;
      const grp = new THREE.Group(); grp.position.set(x, 0, z); g.add(grp);
      const body = mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.14, 40), mat('#EEEAFF')); body.position.y = 0.07; grp.add(body);
      const top = new THREE.Mesh(new THREE.CircleGeometry(0.4, 40), new THREE.MeshBasicMaterial({map: num(i + start), transparent: true, toneMapped: false})); top.rotation.x = -Math.PI / 2; top.position.y = 0.145; grp.add(top);
      const pole = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8), mat('#FFFFFF')); pole.position.set(0.42, 0.62, -0.25); grp.add(pole);
      const flagM = mat('#CFC8F4', {side: THREE.DoubleSide});
      const flag = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.42, -0.13, 0), new THREE.Vector3(0, -0.26, 0)]), flagM);
      flag.geometry.computeVertexNormals(); flag.position.set(0.44, 1.16, -0.25); grp.add(flag);
      this.trailStones.push({group: grp, body, flagM}); this.trailPts.push([x, 0.14, z]);
    }
    return this.trailPts;
  }
  lightStones(k) { this.trailStones.forEach((st, i) => { const on = i < k; st.body.material.color.set(on ? '#D9CFFF' : '#EEEAFF'); st.flagM.color.set(on ? '#F2B640' : '#CFC8F4'); st.flagM.emissive = st.flagM.emissive || new THREE.Color(); st.flagM.emissive.set(on ? '#7A4F00' : '#000000'); }); }
  async buildIsland() {
    if (this.islandBuilt) return; this.islandBuilt = true;
    const g = this.sets.island;
    const top = mat('#EDEAFF', {roughness: 0.9}), side = mat(C.violet, {roughness: 0.6});
    const isl = new THREE.Mesh(new RoundedBoxGeometry(40, 2.4, 30, 6, 1.1), [side, side, top, side, side, side]); isl.position.y = -1.2; isl.receiveShadow = true; g.add(isl);
    const grass = mesh(new RoundedBoxGeometry(38.6, 0.3, 28.6, 4, 0.6), mat('#8FC456', {roughness: 1})); grass.position.y = 0.05; g.add(grass);
    const pathM = mat('#F7F5FF');
    const road = (x, z, w, d) => { const m = mesh(new THREE.BoxGeometry(w, 0.12, d), pathM); m.position.set(x, 0.26, z); g.add(m); };
    road(0, 1.2, 38.6, 3.2); road(1.5, 0, 3.2, 28.6);
    const put = async (n, x, z, size, rot = 0) => {
      const m = await this.model(n); const b = new THREE.Box3().setFromObject(m), sz = b.getSize(new THREE.Vector3()); m.scale.setScalar(size / Math.max(sz.x, sz.z));
      const b2 = new THREE.Box3().setFromObject(m), c = b2.getCenter(new THREE.Vector3()); m.position.set(x - c.x, 0.32 - b2.min.y, z - c.z); m.rotation.y = rot; g.add(m); return m;
    };
    await Promise.all([
      put('voxel-villa', -9, -7.5, 13), put('lau-sage', 10.5, -8, 12), put('question-hub', -12, 8.5, 9),
      put('news-headquarters', 11.5, 9, 9), put('train-station', -1.5, 10, 9), put('progress-vault', 3.5, -8.5, 7),
      put('circle-achievement', 1.5, 1.2, 3.2), put('neon-sky-terminal', 16, -1, 6),
    ]);
    for (let i = 0; i < 26; i++) { const x = -18 + ((i * 53) % 36), z = -13 + ((i * 29) % 26); if (Math.abs(z - 1.2) < 2.5 || Math.abs(x - 1.5) < 2.5) continue; const t = mesh(new THREE.ConeGeometry(0.7, 1.8, 10), mat('#5FA85A')); t.position.set(x, 1.2, z); g.add(t); }
    g.scale.setScalar(0.25);
  }
}
export const COLORS = C;

// Deck engine: scenes with click-to-reveal steps, chapters, branches and the Tower shortcut.
import {Stage} from './stage.js';
import {SCENES, CHAPTERS, BRANCHES} from './scenes.js';

const $ = s => document.querySelector(s);
const stage = new Stage($('#stage'));
const state = {priority: null, visitedTower: false, towerReturn: null};
let si = 0, step = 0, layer = null, busy = false, token = 0;

const ctx = {
  stage, state,
  get el() { return layer; },
  q: s => layer.querySelector(s), qa: s => [...layer.querySelectorAll(s)],
  alive: t => t === token,
  goto: (id, k = 0) => go(SCENES.findIndex(s => s.id === id), k),
  next: () => next(),
};

function setTags(scene) {
  const t = [];
  if (scene.maya) t.push('<span class="tag violet">Illustrative student journey</span>');
  if (scene.proposed) t.push('<span class="tag amber">Proposed experience</span>');
  if (scene.real) t.push('<span class="tag">Real WeGuide World footage</span>');
  $('#tags').innerHTML = t.join('');
}

function renderChapters() {
  const cur = SCENES[si].chapter;
  const order = CHAPTERS.map(c => c.id), ci = order.indexOf(cur);
  $('#chapters').innerHTML = CHAPTERS.map((c, i) => `<button data-ch="${c.id}" class="${i === ci ? 'on' : i < ci ? 'done' : ''}">${c.label}</button>`).join('');
}

// stage cues in brackets show in violet: "(Let her walk.)"
const cueHTML = t => t.replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c])).replace(/\(([^)]+)\)/g, '<span class="cue">$1</span>');
function applySteps() {
  // 'on' = revealed so far; 'cur' = revealed by this click (lets a click replace content instead of stacking it)
  for (const n of layer.querySelectorAll('[data-step]')) { n.classList.toggle('on', +n.dataset.step <= step); n.classList.toggle('cur', +n.dataset.step === step); }
  const scene = SCENES[si];
  // speaker notes: a string, or one line per step (the last line holds for later steps)
  const nt = scene.notes, line = Array.isArray(nt) ? (nt[Math.min(step, nt.length - 1)] || '') : (nt || '');
  const steps = scene.steps || 1;
  $('#notes .lbl').textContent = `Slide ${si + 1}` + (steps > 1 ? ` · click ${step + 1} of ${steps}` : '') + ' · press N to hide';
  $('#notes p').innerHTML = line ? cueHTML(line) : '<em>No notes for this slide.</em>';
  $('#count').textContent = `${si + 1} / ${SCENES.length}`;
  $('#progress').style.width = ((si + (step + 1) / (scene.steps || 1)) / SCENES.length * 100) + '%';
  location.replace('#' + scene.id + (step ? ':' + step : ''));
}

async function go(i, k = 0, dir = 1) {
  if (i < 0 || i >= SCENES.length) return;
  const prevScene = SCENES[si], scene = SCENES[i];
  const my = ++token;
  if (layer) { layer.querySelectorAll('video').forEach(v => v.pause()); prevScene.leave && prevScene.leave(ctx); }
  ctx.from = layer ? prevScene.id : null;
  si = i; step = Math.min(k, (scene.steps || 1) - 1);
  const setName = typeof scene.set === 'function' ? scene.set(ctx) : scene.set;
  const changeSet = setName && setName !== stage.current;
  if (changeSet && layer) { $('#veil').classList.add('on'); await new Promise(r => setTimeout(r, 300)); if (my !== token) return; }
  $('#backdrop').classList.remove('ready');
  // crossfade: the old layer fades out while the new one fades in
  const old = $('#slide').querySelector('.layer:not(.leaving)');
  $('#slide').querySelectorAll('.layer.leaving').forEach(n => n.remove());
  if (old) { old.classList.add('leaving'); setTimeout(() => old.remove(), 520); }
  stage.clearPins(); if (changeSet || !layer) stage.setOffset(scene.offset || 0); else stage.offsetTo(scene.offset || 0, 1100);
  if (scene.backdrop !== undefined || changeSet) { $('#backdrop').innerHTML = scene.backdrop || ''; $('#backdrop').dataset.scene = scene.id; }
  $('#hint').innerHTML = scene.hint || ''; document.body.classList.toggle('has-hint', !!scene.hint);   // the click hint only where a slide asks for it (slide 1)
  layer = document.createElement('div'); layer.className = 'layer fresh'; layer.dataset.scene = scene.id;
  layer.innerHTML = typeof scene.html === 'function' ? scene.html(ctx) : (scene.html || '');
  $('#slide').appendChild(layer);
  layer.querySelectorAll('video[data-src]').forEach(v => { v.src = v.dataset.src; v.muted = true; v.loop = true; v.playsInline = true; v.play().catch(() => {}); v.addEventListener('click', e => { e.stopPropagation(); v.paused ? v.play() : v.pause(); }); });
  setTags(scene); renderChapters();
  if (setName) stage.showSet(setName);
  try { if (scene.enter) await scene.enter(ctx, my); } catch (e) { console.error(e); }
  if (my !== token) return;
  $('#veil').classList.remove('on');
  const L = layer; requestAnimationFrame(() => { L.classList.remove('fresh'); L.classList.add('ready'); $('#backdrop').classList.add('ready'); });
  if (scene.tower) state.visitedTower = true;
  $('#toTower').hidden = !state.visitedTower || scene.tower || !scene.towerLevel;
  $('#back').hidden = !(scene.tower && state.towerReturn);
  applySteps();
  // replay step hooks up to the requested step so deep links land in the right state
  for (let s = 0; s <= step; s++) scene.at && scene.at[s] && scene.at[s](ctx, my, s < step);
}

function next() {
  const scene = SCENES[si];
  if (scene.gate && !scene.gate(ctx, step)) return;
  if (step < (scene.steps || 1) - 1) {
    step++; applySteps();
    scene.at && scene.at[step] && scene.at[step](ctx, token, false);
  } else go(si + 1);
}
function prev() {
  if (step > 0) { step--; go(si, step); }
  else go(si - 1, 99);
}

// Tower shortcut: jump to the Tower scene for the level the presenter is in, then come back.
// gentle parallax for backdrop art
addEventListener('pointermove', e => { const r = document.documentElement.style; r.setProperty('--px', (e.clientX / innerWidth - 0.5).toFixed(3)); r.setProperty('--py', (e.clientY / innerHeight - 0.5).toFixed(3)); });

$('#toTower').onclick = e => {
  e.stopPropagation();
  const lvl = SCENES[si].towerLevel || 1;
  state.towerReturn = {si, step};
  ctx.goto('tower', lvl);
};
$('#back').onclick = e => { e.stopPropagation(); const r = state.towerReturn; state.towerReturn = null; if (r) go(r.si, r.step); };

// Branches
const menu = $('#menu');
$('#details').onclick = e => { e.stopPropagation(); menu.classList.toggle('on'); };
menu.onclick = e => { e.stopPropagation(); const b = e.target.closest('[data-branch]'); if (!b) return; menu.classList.remove('on'); openBranch(b.dataset.branch); };
function openBranch(key) {
  const br = BRANCHES[key]; if (!br) return;
  $('#branch .panel').innerHTML = br + '<div style="margin-top:28px;display:flex;justify-content:flex-end"><button class="btn primary" data-close>Return to the story</button></div>';
  $('#branch').classList.add('on');
}
$('#branch').onclick = e => { if (e.target.id === 'branch' || e.target.closest('[data-close]')) $('#branch').classList.remove('on'); else e.stopPropagation(); };

$('#chapters').onclick = e => { e.stopPropagation(); const b = e.target.closest('[data-ch]'); if (b) go(SCENES.findIndex(s => s.chapter === b.dataset.ch)); };
$('#home').onclick = e => { e.stopPropagation(); go(0); };
$('#next').onclick = e => { e.stopPropagation(); next(); };
$('#prev').onclick = e => { e.stopPropagation(); prev(); };
document.addEventListener('click', e => {
  if (e.target.closest('button, a, input, video, .mods li, .level, .tool, [data-click], #top, #bottom')) return;
  menu.classList.remove('on');
  next();
});
document.addEventListener('keydown', e => {
  if (e.target.matches?.('input')) return;
  if ($('#branch').classList.contains('on')) { if (e.key === 'Escape') $('#branch').classList.remove('on'); return; }
  if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(e.key)) { e.preventDefault(); next(); }
  else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); prev(); }
  else if (e.key === 't' || e.key === 'T') { if (!$('#toTower').hidden) $('#toTower').click(); }
  else if (e.key === 'd' || e.key === 'D') menu.classList.toggle('on');
  else if (e.key === 'n' || e.key === 'N') { const n = $('#notes'); n.hidden = !n.hidden; try { localStorage.setItem('wg-notes', n.hidden ? '0' : '1'); } catch (_) {} }
  else if (e.key === 'Home') go(0);
});

try { $('#notes').hidden = localStorage.getItem('wg-notes') !== '1'; } catch (_) {}
await stage.build();
window.deck = {stage, state, go, ctx, SCENES};
const [hid, hk] = location.hash.slice(1).split(':');
const start = Math.max(0, SCENES.findIndex(s => s.id === hid));
go(start, +hk || 0);
// load and pre-compile the heavier worlds in the background while the first slide plays
setTimeout(async () => { try { await stage.buildHouse(); await stage.prewarm('house'); await stage.buildTown(); await stage.prewarm('town'); await stage.buildCounsel(); await stage.prewarm('counsel'); } catch (e) { console.warn('prewarm', e); } }, 2500);

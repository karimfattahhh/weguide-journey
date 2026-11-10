import * as THREE from 'three';
// Scene content. Copy follows Nizar's Sales Kit Playbook, Master Strategy Plan v1.0 and the
// curriculum overview (all approved). Maya is fictional and labelled on every scene she appears in.
export const CHAPTERS = [
  {id: 'story', label: 'Maya'}, {id: 'world', label: 'WeGuide World'}, {id: 'goal', label: 'The Tower'},
  {id: 'g10', label: 'Grade 10'}, {id: 'g11', label: 'Grade 11'}, {id: 'g12', label: 'Grade 12'},
  {id: 'counselor', label: 'Counselors'}, {id: 'offer', label: 'Next step'},
];

// ---------- helpers ----------
const CAST = {
  maya: ['maya-school', 1], mayaW: ['maya-world', 1], mayaD: ['maya-designer', 1], mayaE: ['maya-engineer', 1], mayaG: ['maya-graduate', 1],
  mum: ['login-5', 1.1], dad: ['login-6', 1.12], bro: ['login-3', 0.82], friend: ['login-1', 1], counselor: ['login-7', 1.08],
};
const actor = (ctx, k) => ctx.stage.actor(k, CAST[k][0], CAST[k][1]);
async function only(ctx, keys, keepScale = false) {
  const as = await Promise.all(keys.map(k => actor(ctx, k)));
  if (!keepScale) as.forEach((a, i) => a.group.scale.setScalar(CAST[keys[i]][1]));
  for (const [k, a] of Object.entries(ctx.stage.actors)) if (!keys.includes(k)) { a.group.visible = false; a.group.parent && a.group.parent.remove(a.group); }
  return as;
}
const S = (n, inner, cls = '', style = '') => `<div data-step="${n}" class="${cls}" style="${style}">${inner}</div>`;
const card = (lbl, body, cls = '') => `<div class="card ${cls}">${lbl ? `<div class="lbl">${lbl}</div>` : ''}${body}</div>`;
const device = (src, w, cap, style) => `<figure class="device" style="width:${w}px;aspect-ratio:${src.includes('studio') || src.includes('train') ? '0.566' : '0.70'};${style}"><video data-src="assets/video/${src}.mp4" poster="assets/video/${src}.jpg"></video><figcaption>${cap}</figcaption></figure>`;
const mods = (list, start = 1) => `<ol class="mods">${list.map(([t, ev], i) => `<li><span class="n">${String(i + start).padStart(2, '0')}</span><span>${t}</span><span class="ev">${ev}</span></li>`).join('')}</ol>`;
const wireMods = (ctx, key) => ctx.qa('.mods li').forEach((li, i) => li.onclick = e => { e.stopPropagation(); const on = li.classList.contains('sel'); ctx.qa('.mods li').forEach(x => x.classList.remove('sel')); if (!on) { li.classList.add('sel'); if (key) trailWalk(ctx, key, i); } });
// walk Maya stone by stone to Destination i and light the flags behind her
function trailWalk(ctx, key, i, instant) {
  const s = ctx.stage, m = s.actors[key], pts = s.trailPts; if (!m || !pts) return;
  const cur = m._stone ?? 0; m._stone = i; s.lightStones(i + 1);
  if (instant || cur === i) { m.group.position.set(...pts[i]); trailCam(ctx, i, 0); return; }
  const p = m.group.position, path = [[p.x, p.y, p.z]], dir = i > cur ? 1 : -1;
  for (let k = cur + dir; dir > 0 ? k <= i : k >= i; k += dir) path.push(pts[k]);
  let len = 0; for (let k = 1; k < path.length; k++) len += Math.hypot(...path[k].map((v, j) => v - path[k - 1][j]));
  trailCam(ctx, i, Math.max(900, len / 1.9 * 1000));
  s.walkPath(m, path, 1.9).then(() => s.turn(m, 0.4, 400));
}
// The trail camera follows Maya by half of her movement, so she stays between the copy and the module list
const TRAIL_C = [-2.6, 10.5, 12.5], TRAIL_L = [1.2, -0.4, 0.3];
function trailCam(ctx, i, dur) {
  const s = ctx.stage, pts = s.trailPts, r = pts[3], d = pts[i].map((v, j) => (v - r[j]) * 0.5);
  return s.shot(TRAIL_C.map((v, j) => v + d[j]), TRAIL_L.map((v, j) => v + d[j]), dur);
}
// Round each corner of a walking route with a short curve, so she turns as she walks instead of pivoting
function roundPath(pts, r = 1.6, n = 6) {
  const out = [pts[0]], L = (a, b) => Math.hypot(b[0] - a[0], b[2] - a[2]), mix = (a, b, t) => a.map((v, j) => v + (b[j] - v) * t);
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], p = pts[i], b = pts[i + 1], A = mix(p, a, Math.min(r, L(a, p) / 2) / L(a, p)), B = mix(p, b, Math.min(r, L(p, b) / 2) / L(p, b));
    for (let k = 0; k <= n; k++) { const t = k / n; out.push(mix(mix(A, p, t), mix(p, B, t), t)); }
  }
  out.push(pts[pts.length - 1]); return out;
}
const ctxOffsetStreet = 0.16;   // slide 3 begins in the house frame; the town frame (0.12) is set behind the veil

const LOGO_SVG = `<svg class="wg-logo" viewBox="0 0 479 92" aria-label="weguide."><g class="mark"><path d="M40.8862 0.121721C41.0336 9.94056 41.1728 19.7675 41.3201 29.5864C41.4184 30.2193 42.278 35.3235 47.0756 38.0014C50.768 40.0544 55.3855 39.884 59.0779 37.5794C64.162 32.459 69.238 27.3386 74.3222 22.2182L68.2556 16.2051L54.4767 29.4971C53.6253 30.2112 52.4382 30.2923 51.5867 29.7324C50.5388 29.0427 50.5551 27.7524 50.5633 27.6794V0L40.8862 0.121721Z" fill="#6E41F4"/><path d="M91.4247 40.5251C81.5184 40.6712 71.6039 40.8092 61.6976 40.9552C61.059 41.0526 55.9093 41.9047 53.2076 46.6599C51.1363 50.3196 51.3082 54.8964 53.6333 58.5561C58.7993 63.5954 63.9654 68.6265 69.1314 73.6658L75.198 67.6527L61.7876 53.9956C61.0672 53.1517 60.9853 51.975 61.5502 51.1311C62.2461 50.0924 63.5478 50.1087 63.6215 50.1168H91.5476L91.4247 40.5251Z" fill="#6E41F4"/><path d="M50.6615 90.9094C50.5141 81.0906 50.375 71.2636 50.2276 61.4448C50.1294 60.8118 49.2697 55.7077 44.4721 53.0298C40.7797 50.9768 36.1622 51.1472 32.4699 53.4518C27.3857 58.5722 22.3097 63.6926 17.2256 68.813L23.2922 74.826L37.071 61.534C37.9225 60.8199 39.1096 60.7388 39.961 61.2987C41.009 61.9885 40.9926 63.2787 40.9844 63.3517V91.0311L50.6615 90.9094Z" fill="#6E41F4"/><path d="M0.122806 50.0679C10.0291 49.9218 19.9437 49.7838 29.85 49.6378C30.4886 49.5404 35.6383 48.6884 38.34 43.9331C40.4113 40.2734 40.2394 35.6966 37.9143 32.0369C32.7482 26.9976 27.5822 21.9665 22.4162 16.9272L16.3495 22.9403L29.7599 36.5974C30.4804 37.4413 30.5623 38.618 29.9974 39.4619C29.3015 40.5006 27.9997 40.4843 27.926 40.4762H0L0.122806 50.0679Z" fill="#6E41F4"/></g><g class="word"><path d="M117.566 69.673L103.493 22.1855H110.239L121.553 62.7998L120.415 62.8972L132.68 22.1937H140.285L152.648 62.808H151.412L162.726 22.1937H169.472L155.497 69.6811H148.652L135.815 27.1842H137.141L124.304 69.6811H117.558L117.566 69.673Z" fill="#6E41F4"/><path d="M194.762 70.801C190.259 70.801 186.329 69.7623 182.972 67.6931C179.616 65.6238 176.971 62.7187 175.031 58.9778C173.099 55.245 172.133 50.8631 172.133 45.8319C172.133 40.8008 173.083 36.4432 174.982 32.7347C176.881 29.0263 179.558 26.1537 183.013 24.1169C186.468 22.0801 190.415 21.0576 194.852 21.0576C199.543 21.0576 203.489 22.0963 206.69 24.1656C209.892 26.2348 212.331 28.937 214.01 32.2722C215.688 35.5992 216.531 39.2428 216.531 43.2028V45.1341C216.531 45.7914 216.498 46.5623 216.433 47.4468H177.168V41.8882H210.153C209.965 37.0518 208.426 33.3109 205.544 30.6736C202.662 28.0363 199.035 26.7136 194.664 26.7136C191.814 26.7136 189.162 27.3547 186.722 28.6449C184.282 29.9351 182.318 31.834 180.827 34.3496C179.337 36.8651 178.592 39.9731 178.592 43.6815V46.1322C178.592 50.4086 179.354 53.9548 180.877 56.7787C182.399 59.6027 184.397 61.7125 186.87 63.092C189.342 64.4715 191.97 65.1613 194.762 65.1613C198.372 65.1613 201.352 64.3579 203.702 62.7593C206.044 61.1607 207.73 58.9454 208.737 56.1133H215.205C214.509 58.8804 213.24 61.3879 211.406 63.6519C209.564 65.9159 207.255 67.6768 204.463 68.9265C201.672 70.1843 198.438 70.8091 194.77 70.8091L194.762 70.801Z" fill="#6E41F4"/><path d="M244.572 91.5344C240.069 91.5344 236.123 90.9826 232.734 89.8871C229.344 88.7835 226.724 87.1199 224.89 84.8965C223.048 82.665 222.131 79.8897 222.131 76.5545C222.131 74.607 222.623 72.7082 223.605 70.8499C224.587 68.9997 226.061 67.2713 228.026 65.6646C229.991 64.066 232.529 62.6621 235.632 61.4692L240.765 66.8412C237.662 67.9123 235.501 69.2107 234.297 70.7525C233.094 72.2943 232.488 73.8442 232.488 75.4185C232.488 76.9927 233.012 78.4209 234.06 79.5164C235.108 80.6119 236.532 81.4477 238.342 82.0158C240.151 82.5838 242.19 82.8678 244.474 82.8678C246.758 82.8678 248.707 82.5838 250.319 82.0158C251.932 81.4477 253.201 80.62 254.118 79.5164C255.035 78.4209 255.494 77.1145 255.494 75.6051C255.494 73.7225 254.83 72.1807 253.496 70.9878C252.17 69.795 249.533 69.0728 245.604 68.8212C242.181 68.5696 239.218 68.2207 236.712 67.7825C234.207 67.3443 232.054 66.7925 230.245 66.1352C228.435 65.4779 226.921 64.7557 225.685 63.9686C224.448 63.1814 223.417 62.3862 222.598 61.5666V59.4L232.39 49.1267L240.847 51.8614L229.721 62.6053L232.668 57.2333C233.364 57.6715 234.027 58.0773 234.666 58.4587C235.296 58.8319 236.139 59.1809 237.187 59.4974C238.235 59.8138 239.611 60.0816 241.322 60.3007C243.033 60.5198 245.252 60.7551 247.978 61.0067C252.284 61.3232 255.756 62.0778 258.384 63.2707C261.012 64.4636 262.96 66.046 264.229 68.026C265.498 70.006 266.129 72.4404 266.129 75.3292C266.129 78.2181 265.351 80.7174 263.803 83.2005C262.248 85.6836 259.89 87.688 256.722 89.2298C253.553 90.7716 249.492 91.5344 244.556 91.5344H244.572ZM244.572 55.4481C240.577 55.4481 237.138 54.661 234.256 53.0948C231.375 51.5287 229.172 49.4513 227.649 46.8789C226.127 44.3066 225.365 41.4177 225.365 38.2124C225.365 35.0071 226.143 32.1344 227.69 29.5945C229.246 27.0546 231.448 24.9935 234.297 23.4192C237.146 21.853 240.569 21.0659 244.564 21.0659C248.559 21.0659 251.981 21.853 254.83 23.4192C257.68 24.9935 259.865 27.0465 261.388 29.5945C262.911 32.1425 263.672 35.0152 263.672 38.2124C263.672 41.4096 262.911 44.3066 261.388 46.8789C259.865 49.4513 257.68 51.5287 254.83 53.0948C251.981 54.6691 248.559 55.4481 244.564 55.4481H244.572ZM244.572 46.6842C247.298 46.6842 249.484 45.962 251.13 44.5175C252.775 43.0731 253.602 41.0038 253.602 38.3016C253.602 35.5994 252.775 33.5302 251.13 32.0857C249.484 30.6413 247.298 29.9191 244.572 29.9191C241.846 29.9191 239.627 30.6413 237.916 32.0857C236.205 33.5302 235.353 35.6075 235.353 38.3016C235.353 40.9957 236.205 43.0731 237.916 44.5175C239.627 45.962 241.846 46.6842 244.572 46.6842ZM252.464 30.479L250.278 22.1858H269.96V29.2537L252.464 30.479Z" fill="#6E41F4"/><path d="M295.152 70.801C291.345 70.801 288.07 70.0301 285.311 68.4964C282.552 66.9546 280.448 64.6338 278.991 61.5258C277.533 58.4179 276.805 54.5958 276.805 50.0759V22.1855H288.209V48.8506C288.209 52.9323 289.077 56.024 290.821 58.1339C292.565 60.2356 295.209 61.2905 298.762 61.2905C300.981 61.2905 302.995 60.7387 304.796 59.6432C306.606 58.5477 308.03 57.0059 309.078 55.0259C310.126 53.0459 310.65 50.579 310.65 47.6253V22.1855H322.055V69.673H311.976L311.125 61.7612C309.733 64.5283 307.654 66.7274 304.894 68.3584C302.135 69.9895 298.893 70.8091 295.152 70.8091V70.801Z" fill="#6E41F4"/><path d="M338.306 14.6471C336.218 14.6471 334.491 14.006 333.123 12.7158C331.756 11.4336 331.077 9.84313 331.077 7.96051C331.077 6.07789 331.756 4.4306 333.123 3.20527C334.482 1.97994 336.21 1.37134 338.306 1.37134C340.402 1.37134 342.121 1.97994 343.488 3.20527C344.847 4.4306 345.535 6.02109 345.535 7.96051C345.535 9.89993 344.855 11.4336 343.488 12.7158C342.121 14.006 340.402 14.6471 338.306 14.6471ZM332.608 69.6731V22.1857H344.012V69.6731H332.608Z" fill="#6E41F4"/><path d="M375.761 70.8012C371.324 70.8012 367.378 69.7138 363.923 67.5472C360.468 65.3806 357.774 62.4268 355.842 58.6859C353.91 54.945 352.944 50.6929 352.944 45.9214C352.944 41.1499 353.926 36.8004 355.891 33.0595C357.856 29.3186 360.599 26.3892 364.111 24.2469C367.631 22.1127 371.602 21.0416 376.04 21.0416C379.585 21.0416 382.712 21.7151 385.406 23.0703C388.099 24.4254 390.236 26.3243 391.824 28.7749V1.83398H403.229V69.6732H393.06L391.922 62.7027C390.907 64.212 389.671 65.5591 388.214 66.7519C386.756 67.9448 384.996 68.9186 382.933 69.6732C380.87 70.4279 378.479 70.8012 375.753 70.8012H375.761ZM378.234 61.0067C381.025 61.0067 383.449 60.3656 385.504 59.0754C387.559 57.7933 389.147 56.0161 390.26 53.7521C391.366 51.4881 391.922 48.8833 391.922 45.9295C391.922 42.9757 391.366 40.3709 390.26 38.1069C389.147 35.8429 387.567 34.0739 385.504 32.7836C383.441 31.4934 381.017 30.8523 378.234 30.8523C375.63 30.8523 373.289 31.4771 371.201 32.7349C369.113 33.9927 367.492 35.7699 366.354 38.0582C365.216 40.3547 364.643 42.9757 364.643 45.9295C364.643 48.8833 365.216 51.5693 366.354 53.8008C367.492 56.0324 369.113 57.7933 371.201 59.0754C373.289 60.3656 375.638 61.0067 378.234 61.0067Z" fill="#6E41F4"/><path d="M435.748 70.8011C430.991 70.8011 426.808 69.7624 423.197 67.6931C419.587 65.6239 416.762 62.735 414.74 59.0266C412.71 55.3181 411.694 51.0498 411.694 46.2134C411.694 41.377 412.693 36.8814 414.691 33.1162C416.688 29.3509 419.505 26.3972 423.148 24.2549C426.791 22.1207 431.024 21.0496 435.838 21.0496C440.652 21.0496 444.598 22.0882 448.053 24.1575C451.508 26.2268 454.202 28.9939 456.134 32.4508C458.066 35.9077 459.032 39.8352 459.032 44.2253V46.254C459.032 46.9762 458.966 47.7795 458.844 48.6559H419.865V41.4013H447.529C447.398 38.0094 446.227 35.3072 444.009 33.2947C441.79 31.2823 439.031 30.276 435.74 30.276C433.39 30.276 431.237 30.8116 429.272 31.8746C427.307 32.9458 425.752 34.5282 424.614 36.6299C423.476 38.7316 422.902 41.3851 422.902 44.5904V47.3251C422.902 50.2789 423.459 52.8026 424.564 54.9124C425.67 57.0141 427.176 58.6371 429.084 59.765C430.991 60.893 433.169 61.461 435.641 61.461C438.302 61.461 440.505 60.893 442.248 59.765C443.992 58.6371 445.245 57.1602 446.006 55.3344H457.607C456.846 58.2232 455.438 60.8443 453.375 63.2057C451.312 65.5589 448.798 67.4172 445.818 68.7643C442.838 70.1113 439.481 70.7929 435.74 70.7929L435.748 70.8011Z" fill="#6E41F4"/><path d="M471.878 70.1438C469.79 70.1438 468.054 69.4865 466.695 68.1638C465.328 66.8411 464.648 65.275 464.648 63.4492C464.648 61.5016 465.328 59.8706 466.695 58.5479C468.054 57.2333 469.782 56.5679 471.878 56.5679C473.974 56.5679 475.758 57.2252 477.06 58.5479C478.362 59.8706 479.009 61.5016 479.009 63.4492C479.009 65.275 478.362 66.8411 477.06 68.1638C475.758 69.4784 474.031 70.1438 471.878 70.1438Z" fill="#6E41F4"/><path d="M456 0.965331V-0.23291H464.366V0.965331H460.858V10.9216H459.508V0.965331H456Z" fill="#6E41F4"/><path d="M466.451 -0.23291H468.063L471.854 9.02622H471.984L475.775 -0.23291H477.387V10.9216H476.124V2.44679H476.015L472.529 10.9216H471.309L467.823 2.44679H467.714V10.9216H466.451V-0.23291Z" fill="#6E41F4"/></g></svg>`;

const ICON = {
  self: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4"/></svg>',
  world: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
  prep: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4.5h6M8.5 10.5l1.6 1.6 3-3M8.5 16h7"/></svg>',
};
const PICKS = [['self', '1', 'Self', 'Understanding themselves', ICON.self], ['world', '2', 'World', 'Exploring their options', ICON.world], ['prep', '3', 'Preparation', 'Preparing for applications', ICON.prep]];
const CN_CARDS = [['Family advice', 'Medicine? Engineering?', '#F48FB1'], ['Sketchbook', 'School yard redesign', '#A3A9FE'], ['Careers fair', 'A bag of leaflets', '#F2B640'], ['Assessment', 'Artistic, investigative', '#5FC7B5'], ['Meeting notes', 'Curious about architecture', '#6E41F4']];
const CN_SCATTER = [[-1.5, 3.95, -2.0, 0.2, -0.35], [3.2, 4.1, -2.2, -0.16, 0.3], [3.6, 2.45, -1.2, 0.22, 0.4], [-1.1, 2.35, -1.1, -0.2, -0.25], [1.0, 4.35, -1.9, 0.1, 0.15]];

// The City: tools mapped to the game's own buildings (anchor -> model, from the game's building config)
const UNI_FIELDS = ['Education', 'Arts and humanities', 'Social sciences', 'Business and law', 'Engineering and construction', 'Natural sciences and maths', 'ICT', 'Agriculture and veterinary', 'Health and welfare', 'Services'];
const TY = [
  {grade: 'Grade 10', name: 'Discover & Explore', col: '#C9C4FF', focus: 'Understanding herself and discovering possibilities', mods: '10', leaves: 'A developing profile and an exploration plan', counselor: 'Puts observations in context and agrees the next exploration'},
  {grade: 'Grade 11', name: 'Design & Investigate', col: '#A99CFB', focus: 'Exploring pathways and making informed decisions', mods: '10, plus a starting module', leaves: 'A reasoned, provisional shortlist and a Grade 12 plan', counselor: 'Challenges assumptions and reviews realistic alternatives'},
  {grade: 'Grade 12', name: 'Prepare & Transition', col: '#8A6CF7', focus: 'Turning decisions into action', mods: '8, plus a starting module', leaves: 'Application evidence, a next-step decision and a transition plan', counselor: 'Reviews the agreed preparation and grants ignition'},
];
// The pitch script: what to say on each click (press N in the deck, or open script.html to rehearse).
// One short line per click, close to the slide but in the presenter's own words; the visuals do the talking.
// A line may start with a stage cue in brackets, shown in violet: (Let her walk.)
const NOTES = {};
const FIT_QS = [
  'Which student need should the first cohort address?',
  'Who owns coordination and professional guidance?',
  'What timetable and review expectations are realistic?',
  'Which capabilities and services are ready for the proposed start date?',
  'What evidence will justify continuing or expanding?',
];
const OF_DEC = [['Rollout planning', 'Plan the agreed cohort\'s start'], ['Defined pilot', 'Test one specific uncertainty'], ['Management review', 'Take the proposal to decision-makers']];
const ME_STEPS = [
  ['Designed by people', 'WeGuide\'s educational framework and reporting criteria are designed by people.'],
  ['AI assists', 'AI helps organise student evidence and draft summaries within that framework.'],
  ['Counselors review', 'Counselors review interpretations that require professional judgment.'],
];
const ME_SUPPORT = [
  ['Easy workflow', 'Clear navigation, sensible defaults, reusable activity templates and short review steps.'],
  ['The Counselor Academy', 'Self-paced foundations, then live onboarding and case discussion with experienced professionals. A WeGuide training certificate after practical checks.'],
  ['Ongoing help', 'A searchable playbook and a named School Success Contact, with backup cover and specialist escalation.'],
];
const CW_CAM = [[0.2, 3.0, 1.8], [0.9, 3.2, 3.2]], CW_LOOK = [[-2.5, 2.0, -3.3], [-2.95, 1.9, -2.9]], CW_MAYA = [-3.05, 0.12, -1.85];
const CW_BEATS = [
  'Maya has explored an interest. Her counselor can see the experience behind it, and the question still open.',
  'The evidence starts a conversation. It does not decide Maya\'s future.',
  'The counselor helps Maya choose a useful next investigation.',
  'Maya\'s new experience adds context. Her counselor reviews what it means, with her.',
  'Guidance continues between meetings, supported by an organised record, training and a familiar support contact.',
];
const CITY = [
  {key: 'home', file: 'voxel-villa', name: 'Central House', purpose: 'Her avatar, her identity and her achievements.', g: 1},
  {key: 'library', file: 'crescent-courtyard', name: 'Academics', purpose: 'Subjects, grades, tests and goals, shelved in one place.', g: 1},
  {key: 'counseling', file: 'lumen-pavilion', name: 'Counseling Center', purpose: 'Time with her counselor for the big questions.', g: 1},
  {key: 'train', file: 'train-station', name: 'Train Station', purpose: 'The ride to each grade land and its Destinations.', g: 2},
  {key: 'planner', file: 'academy-gateway', name: 'University Planner', purpose: 'A shortlist built from real research, with every source kept.', g: 2},
  {key: 'mentor', file: 'lau-sage', name: 'Mentorship Hub', purpose: 'People who have done the work she is curious about.', soon: 'As mentors join', g: 2},
  {key: 'news', file: 'news-headquarters', name: 'News Station', purpose: 'Career headlines and openings from Beirut, the Gulf and the region.', g: 2},
  {key: 'help', file: 'question-hub', name: 'Help Desk', purpose: 'Lost or curious? Every question is a good one here.', g: 2},
  {key: 'mission', file: 'progress-vault', name: 'Mission Machine', purpose: 'Small real-world challenges that become evidence.', g: 3},
  {key: 'portfolio', file: 'circle-achievement', name: 'Portfolio', purpose: 'Every club, project and job: what happened, what she learned, the proof.', h: 9, g: 3},
  {key: 'market', file: 'market-stall', name: 'Marketplace', purpose: 'Stars traded for rewards.', soon: 'Opening date to be confirmed', g: 3},
];
const CITY_GROUPS = [
  {title: 'Who she is and who guides her', pos: [8, 46, 26], look: [7, 0, -24]},
  {title: 'Where she explores', pos: [-30, 58, 58], look: [-36, 0, -4]},
  {title: 'Where she acts and keeps the proof', pos: [48, 46, 26], look: [52, 0, -22]},
];
function cityShot(ctx, k, dur) {
  if (!k) return ctx.stage.shot([2, 84, 96], [2, 0, -16], dur);
  const g = CITY_GROUPS[k - 1]; return ctx.stage.shot(g.pos, g.look, dur);
}

// Maya's family at the breakfast table in Central House (room units: k = room height / 1.6)
function houseFamily(ctx, spot) {
  const s = ctx.stage, k = spot.h / 1.6, [tx, ty, tz] = s.houseTable;
  const seat = {mum: [-0.85, -1.45, 0.35], dad: [0.75, -1.5, -0.25], bro: [1.7, -0.15, -0.9]};
  for (const [key, [dx, dz, yaw]] of Object.entries(seat)) {
    const a = s.actors[key]; s.place(a, 'house', [tx + dx, ty, tz + dz], yaw); a.group.scale.setScalar(CAST[key][1] * k);
  }
}
const later = (ms, t, ctx, fn) => setTimeout(() => ctx.alive(t) && fn(), ms);

const G10 = [
  ['A World in Motion', 'One example of change and a skill question. News and career exploration.'],
  ['The Curiosity Trail', 'An interest with examples and an open question.'],
  ['Strengths Through Action', 'A contribution, a work sample and feedback where available.'],
  ['What Matters to Me', 'A value priority and one decision example.'],
  ['The World of Possibilities', 'Several possibilities and reasons for curiosity.'],
  ['Learning Through Experience', 'An experience record and what changed afterwards.'],
  ['Choosing Wisely', 'A simple comparison and the reasons for a choice.'],
  ['Making an Impact', 'Her actual role, contribution and reflection.'],
  ['Building My Future', 'Specific exploration actions and the support she needs.'],
  ['My Story Is Emerging', 'A linked summary of learning, gaps and questions. Hands over to Grade 11.'],
];
const G11 = [
  ['My Starting Point', 'Bridge for students who join in Grade 11: interests, values, experiences and gaps.'],
  ['The Next Chapter', 'What still holds, what changed and what to test.'],
  ['Pathways & Possibilities', 'Alternative routes linked to her interests.'],
  ['Behind the Career', 'Research or a conversation with a professional, with reflection.'],
  ['Majors Under the Microscope', 'Course content, demands and dated sources.'],
  ['Keeping My Doors Open', 'Requirements, tests, deadlines and missing preparation.'],
  ['Finding My University Fit', 'A comparison using personal and practical criteria.'],
  ['Building My Profile', 'An evidence inventory and development gaps.'],
  ['Put It to the Test', 'An experience that tests a pathway assumption.'],
  ['Making Possibilities Real', 'Trade-offs across options, costs and requirements.'],
  ['Ready for Launch', 'Grade 12 priorities, owners and preparation dates.'],
];
const G12 = [
  ['My Launch Starting Point', 'Bridge: current options, achievements, deadlines and gaps.'],
  ['Launch Control', 'Prioritised actions, owners and dates.'],
  ['Finalize My Application Strategy', 'A realistic set of options with requirements and sources.'],
  ['Build My Case', 'Selected experiences, actual contributions and proof.'],
  ['Tell My Story', 'An authentic draft narrative linked to experience.'],
  ['Application Command Center', 'Checklist, documents, deadlines and the state of each application.'],
  ['Submit with Confidence', 'A reviewed checklist and recorded submission status.'],
  ['Choose What Comes Next', 'Offer conditions, costs, preferences and trade-offs.'],
  ['Cross the Bridge', 'A transition plan, outstanding conditions and support.'],
];

// Tower level copy (Master Plan §9)
const LEVELS = [
  ['Level 1 · Grade 10', 'Developing interests, strengths and values, with examples, open questions and an exploration plan.', 'The counselor puts observations in context and agrees the next exploration.'],
  ['Level 2 · Grade 11', 'Tested assumptions, pathway comparisons, preparation gaps and a Grade 12 plan.', 'The counselor challenges assumptions and reviews realistic alternatives.'],
  ['Level 3 · Grade 12', 'Application evidence, requirements, a next-step decision and a transition plan.', 'The counselor reviews the agreed preparation. Family involvement follows the sharing rules.'],
];
const levelCards = (sel = -1) => `<div class="levels">${LEVELS.map(([h, see, role], i) => `<div class="card level ${i === sel ? 'sel' : ''}" data-level="${i}"><h3><span>${h}</span><span class="chip grey">${['Discover', 'Investigate', 'Launch'][i]}</span></h3><div class="small">${see}</div><div class="more"><b>Counselor:</b> ${role}</div></div>`).join('')}</div>`;
function wireLevels(ctx) {
  ctx.qa('.level').forEach(c => c.onclick = e => { e.stopPropagation(); const i = +c.dataset.level; ctx.qa('.level').forEach(x => x.classList.toggle('sel', x === c)); ctx.stage.litLevel(i); towerShot(ctx, i, 900); });
}
function towerShot(ctx, i, dur = 1200) {
  // the whole tower stays in view; the camera only drifts towards the level that lights up
  const y = [3.9, 3.1, 3.9, 4.7][i + 1] || 3.9;
  return ctx.stage.shot([-9.8, y + 1.9, 16.2], [2.9, y, 0], dur);
}

async function towerSetup(ctx, who = 'mayaW') {
  await ctx.stage.towerReady;
  const [m] = await only(ctx, [who]);
  ctx.stage.resetRocket();
  ctx.stage.place(m, 'tower', [-1.3, 0, 4.5], Math.PI + 0.28, 'idle');   // at the foot of the plinth, looking up at the tower
  return m;
}

// ---------- scenes ----------
export const SCENES = [
  // ===== STORY =====
  {
    id: 'meet', chapter: 'story', set: 'house', maya: true, steps: 2, offset: 0.17,
    hint: 'Click anywhere or press <kbd>→</kbd> to begin',
    backdrop: '<div class="bd-house"></div>',
    html: `<div class="hero-copy">
      <p class="kicker enter">Our story starts with one student</p>
      <h1 class="enter d1">This is <span class="violet">Maya.</span></h1>
      <p class="lead enter d2">She's in Grade 10. She fills the margins of every notebook with buildings.</p>
      <div class="facts enter d3">
        <span class="fact"><svg viewBox="0 0 24 24"><path d="M3 10l9-5 9 5-9 5-9-5z"/><path d="M7 12v4c0 1.5 2.5 3 5 3s5-1.5 5-3v-4"/></svg>Grade 10</span>
        <span class="fact"><svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/><path d="M14 6l3 3"/></svg>Loves drawing</span>
        <span class="fact"><svg viewBox="0 0 24 24"><path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/></svg>Curious about architecture</span>
      </div>
      ${S(1, '<p class="footnote"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>Maya is a fictional student. Her story shows how WeGuide works.</p>')}
    </div>
    <div class="nameplate" id="np"><b>Maya</b><span>Grade 10</span></div>`,
    async enter(ctx, t) {
      const s = ctx.stage, [spot, [m]] = await Promise.all([s.buildHouse(), only(ctx, ['maya', 'mum', 'dad', 'bro'])]);
      const [x, y, z] = spot.pos, h = spot.h, k = h / 1.6;
      houseFamily(ctx, spot); s.seatMarker.visible = false;
      s.place(m, 'house', [x, y, z], Math.PI - 0.3, 'idle'); m.group.scale.setScalar(k);   // Maya at the game's own scale
      const look = [x, y + h * 0.56, z];
      // near the game's own camera spot in Central House, with a wider lens to leave room for the copy
      s.shot([x - 1.1, y + h * 0.95, z + 6.0], look, 0);
      s.pin(ctx.q('#np'), m.group, h * 1.1);
      this._u = [];
      const run = async () => {
        // she is looking out of the window, then turns to the audience and waves
        await new Promise(r => setTimeout(r, 900)); if (!ctx.alive(t)) return;
        await s.turn(m, -0.12, 900); if (!ctx.alive(t)) return;
        ctx.q('#np')?.classList.add('on');
        m.setMode('wave'); s.shot([x - 0.95, y + h * 0.9, z + 5.5], look, 6000);
        later(2300, t, ctx, () => { m.setMode('idle'); const f = follow(ctx, m, -0.12); this._u.push(f); });
      };
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { m.group.rotation.y = -0.12; ctx.q('#np')?.classList.add('on'); } else run();
    },
    leave(ctx) { const u = ctx.stage.updaters; (this._u || []).forEach(f => { const i = u.indexOf(f); if (i > -1) u.splice(i, 1); }); this._u = []; },
  },
  {
    id: 'home', chapter: 'story', set: 'house', maya: true, steps: 4, offset: 0.16,
    html: `<div class="home-copy arrive"><p class="kicker">Breakfast at home</p><h2>Maya has plenty of advice.</h2></div>
      <div class="pinbub" id="b-mum"><div class="bubble left" data-step="1"><b>Mum</b>Medicine. It's a safe path.</div></div>
      <div class="pinbub" id="b-dad"><div class="bubble" data-step="2"><b>Dad</b>Engineering. You're great at maths.</div></div>
      <div class="pinbub" id="b-bro"><div class="bubble left" data-step="3"><b>Her brother</b>Just become famous!</div></div>
      ${S(3, '<p class="lead">Everyone wants the best for her.<br>The choice is still hers.</p>', 'home-close')}`,
    async enter(ctx, t) {
      const s = ctx.stage, fromMeet = ctx.from === 'meet';
      const [spot, [m, mum, dad, bro]] = await Promise.all([s.buildHouse(), only(ctx, ['maya', 'mum', 'dad', 'bro'], fromMeet)]);
      const k = spot.h / 1.6, [tx, , tz] = s.houseTable, seat = s.houseSeat, fy = s.houseFloor;
      if (!fromMeet || mum.group.parent !== s.sets.house) houseFamily(ctx, spot);
      s.stopActor(m);
      const faceTable = Math.atan2(tx - seat[0], tz - seat[2]);
      const end = {pos: [3.2, 3.5, 6.2], look: [4.3, 1.7, 0.45]};
      // speech bubbles ride above each speaker's head
      [['b-mum', mum], ['b-dad', dad], ['b-bro', bro]].forEach(([id, a]) => s.pin(ctx.q('#' + id), a.group, 1.66 * a.group.scale.x));
      const arrive = () => { ctx.q('.arrive')?.classList.add('on'); [mum, dad, bro].forEach(a => s.turn(a, Math.atan2(seat[0] - a.group.position.x, seat[2] - a.group.position.z) * 0.6 + a.group.rotation.y * 0.4, 600)); };
      const walk = async () => {
        // one continuous walk: off the platform, down the step, across the room to her place
        m.group.scale.setScalar(k);
        const [px, py, pz] = spot.pos, dx = seat[0] - px, dz = seat[2] - pz, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
        const edge = [px + ux * 2.05, py, pz + uz * 2.05], down = [px + ux * 2.55, fy, pz + uz * 2.55];
        s.seatMarker.visible = true; s.seatMarker.scale.setScalar(1);
        s.shot(end.pos, end.look, 3400);
        await s.walkPath(m, [[m.group.position.x, py, m.group.position.z], edge, down, seat], 1.75);
        if (!ctx.alive(t)) return;
        s.tween(400, e => s.seatMarker.scale.setScalar(1 - e)).then(() => { s.seatMarker.visible = false; });
        await s.turn(m, faceTable, 450);
        if (ctx.alive(t)) arrive();
      };
      if (ctx.from === 'meet' && !matchMedia('(prefers-reduced-motion: reduce)').matches) walk();
      else { s.place(m, 'house', seat, faceTable); m.group.scale.setScalar(k); s.seatMarker.visible = false; s.shot(end.pos, end.look, 0); arrive(); }
    },
    at: {
      1: ctx => { const a = ctx.stage.actors.mum; a.setMode('wave'); setTimeout(() => a.setMode('idle'), 1500); },
      2: ctx => { const a = ctx.stage.actors.dad; a.setMode('wave'); setTimeout(() => a.setMode('idle'), 1500); },
      3: ctx => { const s = ctx.stage; s.actors.bro.setMode('cheer'); s.actors.maya.setMode('think'); setTimeout(() => s.actors.bro?.setMode('idle'), 1600); },
    },
  },
  {
    // Slide 3: from the breakfast table out of the house, then a close follow-camera walk through WeGuide World
    id: 'street', chapter: 'story', maya: true, steps: 3, offset: ctxOffsetStreet,
    set: ctx => ctx.from === 'home' ? 'house' : 'town',
    backdrop: '<div class="bd-sky"></div>',
    html: `<div class="street-copy arrive"><p class="kicker">On her way to school</p><h2>She notices how places make people feel.</h2></div>
      ${S(1, `<div class="card street-sketch"><div class="lbl">Maya's sketchbook · school yard</div>
        <svg viewBox="0 0 420 240" class="sketch2" aria-label="Maya's sketch of a shaded school yard">
          <g class="ink">
            <path d="M14 204 H406"/><path d="M60 204 L118 168 M352 204 L300 168 M118 168 H300"/>
            <path d="M104 112 C146 84, 188 132, 228 104 S300 92, 334 112"/><path d="M104 121 C146 93, 188 141, 228 113 S300 101, 334 121"/>
            <path d="M104 112 V121 M334 112 V121"/>
            <path d="M128 117 V196 M208 121 V198 M304 111 V194"/>
            <path d="M150 184 h44 M154 184 v9 M190 184 v9 M240 186 h44 M244 186 v8 M280 186 v8"/>
            <path d="M58 204 V150"/><path d="M58 152 c-28 0 -33 -38 -7 -45 c4 -24 39 -24 43 -3 c24 4 20 48 -8 48 z"/>
            <path d="M378 204 V164"/><path d="M378 166 c-19 0 -22 -26 -4 -31 c3 -16 26 -16 29 -2 c16 3 13 33 -6 33 z"/>
            <circle cx="232" cy="164" r="5"/><path d="M232 169 v15 M232 174 l-7 6 M232 174 l7 5 M232 184 l-5 11 M232 184 l5 11"/>
            <circle cx="170" cy="168" r="4.5"/><path d="M170 173 v11"/>
          </g>
          <g class="accent">
            <path d="M118 196 L322 196 L338 204 L102 204 Z"/>
            <path d="M130 204 l10 -8 M156 204 l10 -8 M182 204 l10 -8 M208 204 l10 -8 M234 204 l10 -8 M260 204 l10 -8 M286 204 l10 -8 M312 204 l10 -8"/>
            <circle cx="386" cy="40" r="13"/><path d="M386 18 v-8 M386 62 v8 M364 40 h-8 M408 40 h8 M370 24 l-6 -6 M402 56 l6 6 M402 24 l6 -6 M370 56 l-6 6"/>
            <path d="M262 99 L296 66 H350"/><path d="M40 112 L24 80 H70"/><path d="M200 188 L214 226 H266"/>
          </g>
          <g class="notes"><text x="300" y="61">shade canopy</text><text x="24" y="75">trees</text><text x="218" y="222">benches</text></g>
        </svg>
        <p class="small" style="margin:6px 0 0">The school yard has no shade. She redesigns it: a canopy, trees and somewhere to sit.</p></div>`, 'street-sketch-wrap')}
      <div class="bldg-label" id="cc-label"><span class="dot"></span>Counseling Center</div>
      ${S(2, '<p class="lead">Drawing is how Maya thinks.<br>She hasn\'t yet connected it to a future.</p>', 'street-close')}`,
    async enter(ctx, t) {
      const s = ctx.stage, fromHome = ctx.from === 'home' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
      const townP = s.buildTown();
      // coming from breakfast, keep everyone exactly where slide 2 left them
      const [m] = fromHome ? [s.actors.maya] : (await Promise.all([townP, only(ctx, ['maya'])]))[1];
      const town = fromHome ? null : await townP;
      const hTof = tw => tw.spot.pos[1] + tw.spot.h - 0.1;
      let ground = 0.1, hT = town ? hTof(town) : 5.3, kT = hT / 1.6;
      // the route, on paved ground only (mapped from above): out of Central House and down its steps, round the
      // fountain plaza, east along the plaza path, north up the paved walkway, onto the road, west along its
      // road edge (clear of the tree by the corner) and up the path to the Counseling Center (lumen-pavilion, facing south)
      const corners = [[10, -2], [10, 1.2], [13.6, 3.4], [16.8, 7.3], [27, 7.3], [27, -23.9], [16, -23.9], [16, -27.6]];
      const route = roundPath(corners.map(([x, z]) => [x, ground, z]), 1.8);
      const door = route[route.length - 1];
      const toTown = async () => {
        const tw = town || await townP; hT = hTof(tw); kT = hT / 1.6;
        s.stopActor(m); s.showSet('town'); s.cancel('offset'); s.setOffset(0.12); s.place(m, 'town', route[0], 0); m.group.scale.setScalar(kT);
        const cam = {pos: new THREE.Vector3(), look: new THREE.Vector3()}, F = THREE.Vector3, ray = new THREE.Raycaster();
        // close over-the-shoulder follow camera
        const follow = (dt) => {
          const g = m.group, yaw = g.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw);
          const want = new F(g.position.x - fx * hT * 0.95 - fz * hT * 0.32, g.position.y + hT * 0.86, g.position.z - fz * hT * 0.95 + fx * hT * 0.32);
          const look = new F(g.position.x + fx * hT * 2.4, g.position.y + hT * 0.62, g.position.z + fz * hT * 2.4);
          // game-style camera collision: if a tree or wall sits between Maya and the camera, move in closer
          const head = new F(g.position.x, g.position.y + hT * 0.8, g.position.z), to = want.clone().sub(head), dist = to.length(); to.normalize();
          if ((cam.n = (cam.n || 0) + 1) % 2 === 0 || cam.hit === undefined) {
            ray.set(head, to); ray.far = dist; cam.hit = null;
            for (const h of ray.intersectObjects(s.townData.root.children, true)) {
              const o = h.object; if (o.__tiny === undefined) { o.geometry.computeBoundingSphere(); const sc = o.getWorldScale(new F()); o.__tiny = o.geometry.boundingSphere.radius * Math.max(sc.x, sc.y, sc.z) < 0.9; }
              if (!o.__tiny && o.visible) { cam.hit = h.distance; break; }
            }
          }
          if (cam.hit) want.copy(head).addScaledVector(to, Math.max(hT * 0.35, cam.hit * 0.85));
          if (!cam.init) { cam.pos.copy(want); cam.look.copy(look); cam.init = true; }
          const k = Math.min(1, dt * 2.6); cam.pos.lerp(want, k); cam.look.lerp(look, k);
          s.cam.position.copy(cam.pos); s.look.copy(cam.look);
        };
        this._f = follow; s.updaters.push(follow);
        ctx.q('.arrive')?.classList.add('on');
        m.speed = 1.2; s.walkPath(m, route, hT * 0.7).then(async () => {
          m.speed = 1; if (!ctx.alive(t)) return;
          // arrival: she stops at the door; the camera lifts to show the building and its name
          const u = s.updaters, i = u.indexOf(follow); if (i > -1) u.splice(i, 1);
          await s.turn(m, Math.PI, 500);
          // from the road in front of the building, so the whole facade and Maya at the door are in view
          s.shot([door[0] - 3.6, door[1] + 6.5, door[2] + 8.2], [door[0] + 0.4, door[1] + 5.3, door[2] - 6.4], 2600);
          const lbl = ctx.q('#cc-label'); if (lbl) {
            const anchor = s._ccAnchor || (s._ccAnchor = new THREE.Object3D()); const b = ((town || s.townData).buildings['lumen-pavilion'] || [[16, 0, -35]])[0];
            anchor.position.set(b[0], 9.6, b[2] + 5.5); s.sets.town.add(anchor); s.pin(lbl, anchor, 0); lbl.classList.add('on');
          }
        });
        follow(0.016); s.frame();   // first town frame (GPU uploads) happens here, behind the white veil
      };
      if (fromHome) {
        // leave the table from wherever she is: she walks past the camera and out of the room
        s.actors.mum?.setMode('wave'); s.actors.dad?.setMode('wave');
        const p = m.group.position;
        await s.walkPath(m, [[p.x, 0.1, p.z], [2.3, 0.1, 3.2], [2.0, 0.1, 5.4]], 1.9);
        if (!ctx.alive(t)) return;
        document.getElementById('veil').classList.add('on'); await new Promise(r => setTimeout(r, 380)); if (!ctx.alive(t)) return;
        await townP; if (!ctx.alive(t)) return;
        await only(ctx, ['maya'], true); await toTown(); document.getElementById('veil').classList.remove('on');
      } else await toTown();
    },
    leave(ctx) { const u = ctx.stage.updaters, i = u.indexOf(this._f); if (i > -1) u.splice(i, 1); if (ctx.stage.actors.maya) ctx.stage.actors.maya.speed = 1; },
  },
  {
    // Slide 4: through the Counseling Center's doors and into the room; she gets help, in pieces
    id: 'school', chapter: 'story', maya: true, steps: 4, offset: 0.16,
    set: ctx => ctx.from === 'street' ? 'town' : 'counsel',
    backdrop: '<div class="bd-counsel"></div>',
    html: `<div class="counsel-copy arrive"><p class="kicker">At the Counseling Center</p><h2>Her counselor is ready to guide her.</h2></div>
      <div class="counsel-cards">
        <div class="hcard" data-step="1"><span class="ic"><svg viewBox="0 0 24 24"><path d="M4 5h16v10H9l-5 4z"/></svg></span><div><div class="lbl">A good conversation</div><b>“What do you enjoy most about drawing buildings?”</b></div></div>
        <div class="hcard" data-step="2"><span class="ic"><svg viewBox="0 0 24 24"><path d="M5 19V9M12 19V5M19 19v-7"/></svg></span><div><div class="lbl">An interest assessment</div><b>Artistic, investigative</b></div></div>
        <div class="hcard" data-step="3"><span class="ic"><svg viewBox="0 0 24 24"><path d="M4 4h12l4 4v12H4z"/><path d="M8 11h8M8 15h6"/></svg></span><div><div class="lbl">A careers fair</div><b>Forty booths and a bag of leaflets</b></div></div>
      </div>
      <div class="counsel-close" data-step="3"><p class="lead">Every piece helps. A fuller picture of what Maya tries and learns gives her counselor a richer basis to guide her.</p></div>`,
    async enter(ctx, t) {
      const s = ctx.stage, fromStreet = ctx.from === 'street' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
      const roomP = s.buildCounsel(), houseP = s.buildHouse();
      const m = fromStreet ? s.actors.maya : (await only(ctx, ['maya']))[0];
      const intoRoom = async () => {
        const [spots, spot] = await Promise.all([roomP, houseP]), k = spot.h / 1.6;
        const [, c] = await only(ctx, ['maya', 'counselor'], true);
        s.stopActor(m); s.showSet('counsel'); s.cancel('offset'); s.setOffset(0.16);
        s.place(c, 'counsel', spots.counselor, Math.atan2(spots.maya[0] - spots.counselor[0], spots.maya[2] - spots.counselor[2])); c.group.scale.setScalar(CAST.counselor[1] * k);
        s.place(m, 'counsel', spots.door, Math.PI); m.group.scale.setScalar(k);
        const end = {pos: [-2.7, 3.45, 5.4], look: [2.1, 1.65, -0.5]};
        s.shot(end.pos, end.look, 0);
        s.frame();   // first frame of the room (GPU uploads) happens behind the veil
        return {spots, c, end};
      };
      const greet = (spots, c) => {
        s.turn(m, Math.atan2(spots.counselor[0] - spots.maya[0], spots.counselor[2] - spots.maya[2]), 450);
        c.setMode('wave'); setTimeout(() => c.setMode('idle'), 1600);
        ctx.q('.arrive')?.classList.add('on');
      };
      if (fromStreet) {
        // she walks through the golden doors; a soft white veil carries her inside
        s.cancel('cam'); const p = m.group.position;
        s.shot([p.x - 1.2, p.y + 4.4, p.z + 5.2], [p.x, p.y + 3.8, p.z - 6], 1500);
        await s.walkPath(m, [[p.x, p.y, p.z], [p.x, p.y, p.z - 3.4]], 2.4);
        if (!ctx.alive(t)) return;
        document.getElementById('veil').classList.add('on'); await new Promise(r => setTimeout(r, 380)); if (!ctx.alive(t)) return;
        const {spots, c} = await intoRoom(); if (!ctx.alive(t)) return;
        document.getElementById('veil').classList.remove('on');
        await s.walkPath(m, [spots.door, [0.4, 0.12, 3.2], [0.6, 0.12, 0.6], spots.maya], 1.9);
        if (ctx.alive(t)) greet(spots, c);
      } else {
        const {spots, c} = await intoRoom(); if (!ctx.alive(t)) return;
        s.place(m, 'counsel', spots.maya, 0); greet(spots, c);
      }
    },
    at: {
      1: ctx => { const c = ctx.stage.actors.counselor; if (c) { c.setMode('wave'); setTimeout(() => c.setMode('idle'), 1400); } },
      2: ctx => ctx.stage.actors.maya?.setMode('idle'),
      3: ctx => { const m = ctx.stage.actors.maya; if (m) { m.setMode('wave'); setTimeout(() => m.setMode('idle'), 1300); } },
    },
  },
  {
    // Slide 5: helpless at a crossroads with no signs; then close in, and three questions rise around her head
    id: 'problem', chapter: 'story', set: 'crossroads', maya: true, steps: 4, offset: 0.1,
    backdrop: '<div class="bd-fog"></div>',
    html: `<div class="problem-copy"><p class="kicker enter">The problem</p><h2 class="enter d1">Maya has choices to make.</h2><p class="lead enter d2">What can she base them on?</p></div>
      <div class="qarc" id="qarc">
        <svg class="qlines" width="1" height="1">
          <line data-step="1" x1="0" y1="-24" x2="-182" y2="-182"/><line data-step="2" x1="0" y1="-30" x2="0" y2="-250"/><line data-step="3" x1="0" y1="-24" x2="182" y2="-182"/>
        </svg>
        <div class="qbub" data-step="1" style="left:-237px;top:-237px"><span class="qn">1</span><span class="qmark">?</span><b>What do I know about myself?</b></div>
        <div class="qbub" data-step="2" style="left:0px;top:-335px"><span class="qn">2</span><span class="qmark">?</span><b>What does this path involve?</b></div>
        <div class="qbub" data-step="3" style="left:237px;top:-237px"><span class="qn">3</span><span class="qmark">?</span><b>What must I do to prepare?</b></div>
      </div>`,
    async enter(ctx, t) {
      const s = ctx.stage, [m] = await only(ctx, ['maya']);
      s.place(m, 'crossroads', [0, 0, 0], 0, 'shrug'); m.setExpression('worried');
      s.shot([0, 2.5, 7.8], [0, 1.15, -3], 0); s.shot([0, 2.3, 7.0], [0, 1.1, -3], 5000);
      s.pin(ctx.q('#qarc'), m.group, 1.62);
    },
    at: {
      // close in on her face; the questions rise one by one at 135, 90 and 45 degrees
      1: (ctx, t, instant) => { const s = ctx.stage; s.shot([0.12, 1.98, 2.65], [0, 1.82, 0], instant ? 0 : 1500); s.actors.maya.group.rotation.y = 0; },
      2: ctx => { const a = ctx.stage.actors.maya; ctx.stage.turn(a, 0.12, 600); },
      3: ctx => { const a = ctx.stage.actors.maya; ctx.stage.turn(a, -0.1, 600); },
    },
    leave(ctx) { const m = ctx.stage.actors.maya; if (m) { m.setExpression('neutral'); m.setMode('idle'); } },
  },
  {
    // Slide 6: the three questions become three paths; the school picks where its students need support most
    id: 'priority', chapter: 'story', set: 'crossroads', maya: true, steps: 2, offset: 0.21,
    backdrop: '<div class="bd-fog"></div>',
    html: ctx => `<div class="prio-copy"><p class="kicker enter">Important decisions need connected understanding</p><h2 class="enter d1">Where do your students need the most support?</h2><p class="small enter d2">Choose one path. It shapes the emphasis of what follows.</p></div>
      ${PICKS.map(([k, n, title, sub, icon], i) => `<button class="pick${ctx.state.priority === k ? ' sel' : ''}" data-pick="${k}" data-i="${i}"><span class="pk-ic">${icon}</span><span class="pk-t"><span class="pk-n">${n}</span><b>${title}</b><span class="pk-sub">${sub}</span></span></button>`).join('')}
      ${S(1, '<p class="lead">Noted. We will keep it in view as Maya\'s story continues.</p>', 'prio-close')}`,
    async enter(ctx, t) {
      const s = ctx.stage, [m] = await only(ctx, ['maya']);
      if (m.group.parent !== s.sets.crossroads) s.place(m, 'crossroads', [0, 0, 0], 0);
      m.setExpression('neutral'); m.setMode('idle'); s.turn(m, Math.PI, 800);    // she turns to face the paths
      s.shot([-0.7, 4.3, 5.6], [0.4, 0.75, -2.4], ctx.from === 'problem' ? 1700 : 0);
      const idx = PICKS.findIndex(p => p[0] === ctx.state.priority); s.pickPad(idx, 0);
      ctx.qa('.pick').forEach((b, i) => {
        s.pin(b, s.choicePads[i].pad, 1.7);
        b.onclick = e => {
          e.stopPropagation(); ctx.state.priority = b.dataset.pick;
          ctx.qa('.pick').forEach(x => x.classList.toggle('sel', x === b)); ctx.el.classList.add('chosen');
          s.pickPad(i); const p = s.choicePads[i].pad.position, g = m.group.position;
          s.walkPath(m, [[g.x, 0, g.z], [p.x * 0.42, 0, p.z * 0.42]], 1.4);
          if (ctx.el.querySelector('.prio-close:not(.on)')) ctx.next();
        };
      });
      if (idx > -1) ctx.el.classList.add('chosen');
    },
    leave(ctx) { ctx.stage.pickPad(-1, 0); },
  },
  {
    // Slide 7: Maya's pieces float around her counselor, then line up into one clear record
    id: 'counselor-need', chapter: 'story', set: 'counsel', steps: 3, offset: 0.14,
    backdrop: '<div class="bd-counsel"></div>',
    html: `<div class="cn-copy"><p class="kicker enter">The counselor's view</p><h2 class="enter d1">What would help her counselor guide the next conversation?</h2></div>
      ${S(1, '<p class="cn-caption"><span class="dot"></span>Everything Maya tries and learns, in one clear record</p>', 'cn-cap')}
      ${S(2, '<p class="lead">Her counselor brings judgment and context. What helps is a clearer account of what Maya has tried, what she learned and what is still uncertain, available between meetings and over time.</p>', 'cn-close')}`,
    async enter(ctx, t) {
      const s = ctx.stage, [spots, spot] = await Promise.all([s.buildCounsel(), s.buildHouse()]), k = spot.h / 1.6;
      const [c] = await only(ctx, ['counselor']);
      s.place(c, 'counsel', [1.0, 0.12, -3.3], 0.42); c.group.scale.setScalar(CAST.counselor[1] * k); c.setMode('think');
      const cam = [3.1, 3.5, 5.9], look = [0.6, 2.75, -2.6];
      s.shot([cam[0] + 0.6, cam[1] + 0.2, cam[2] + 0.8], look, 0); s.shot(cam, look, 5000);
      await document.fonts.load('650 74px Inter');
      const cards = s._cn || (s._cn = CN_CARDS.map(([lbl, title, col]) => { const cd = s.infoCard(lbl, title, col); cd.scale.setScalar(1.0); s.sets.counsel.add(cd); return cd; }));
      const line = s._cnLine || (s._cnLine = (() => { const l = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.035, 0.035), new THREE.MeshBasicMaterial({color: '#7B52FF', toneMapped: false})); l.position.set(1.0, 3.38, -3.45); l.scale.x = 0.001; s.sets.counsel.add(l); return l; })());
      line.visible = true; line.scale.x = 0.001;
      const camV = new THREE.Vector3(...cam);
      cards.forEach((cd, i) => {
        const [x, y, z, rz, ry] = CN_SCATTER[i]; cd.visible = true; cd.position.set(x, y, z); cd.lookAt(camV); cd.rotation.z += rz; cd.rotateY(ry);
        cd.userData.home = cd.position.clone(); cd.userData.q0 = cd.quaternion.clone(); cd.userData.seed = i * 1.7;
        const fin = new THREE.Vector3(-2.35 + i * 1.68, 4.0, -3.45), d = new THREE.Object3D(); d.position.copy(fin); d.lookAt(camV);
        cd.userData.fin = fin; cd.userData.q1 = d.quaternion.clone();
      });
      // gentle float while scattered
      this._f = (dt, tt) => { cards.forEach(cd => { if (cd.userData.aligned) return; cd.position.y = cd.userData.home.y + Math.sin(tt * 1.1 + cd.userData.seed) * 0.06; }); };
      s.updaters.push(this._f);
    },
    at: {
      1: (ctx, t, instant) => {
        const s = ctx.stage, cards = s._cn; if (!cards) return;
        cards.forEach((cd, i) => {
          const p0 = cd.position.clone(), q0 = cd.quaternion.clone(); cd.userData.aligned = true;
          const run = e => { cd.position.lerpVectors(p0, cd.userData.fin, e); cd.quaternion.slerpQuaternions(q0, cd.userData.q1, e); };
          if (instant) run(1); else setTimeout(() => s.tween(1300, run, 'cn' + i), i * 110);
        });
        const l = s._cnLine; if (instant) l.scale.x = 1; else s.tween(1500, e => { l.scale.x = Math.max(0.001, e); }, 'cnline');
        const c = s.actors.counselor; if (c) { c.setMode('idle'); s.turn(c, 0.2, 700); }
      },
    },
    leave(ctx) {
      const s = ctx.stage, u = s.updaters, i = u.indexOf(this._f); if (i > -1) u.splice(i, 1);
      (s._cn || []).forEach(cd => { cd.visible = false; cd.userData.aligned = false; }); if (s._cnLine) s._cnLine.visible = false;
    },
  },
  {
    // Slide 8: at the crossroads a violet WeGuide door rises; it opens onto light and Maya walks in
    id: 'door', chapter: 'world', set: 'crossroads', maya: true, steps: 2, offset: 0.12,
    backdrop: '<div class="bd-fog"></div>',
    html: `<div class="door-copy"><p class="kicker enter">Then</p><h2 class="enter d1">Maya finds a door that connects it all.</h2></div>
      ${S(1, '<p class="lead">What she tries, what she learns and what comes next, in one place.</p>', 'door-close')}`,
    async enter(ctx, t) {
      const s = ctx.stage, [m] = await only(ctx, ['maya']);
      if (m.group.parent !== s.sets.crossroads) s.place(m, 'crossroads', [0, 0, 0], Math.PI);
      m.setExpression('neutral'); m.setMode('idle'); s.pickPad(-1, 0); s.choicePads.forEach(c => { c.pad.visible = false; });
      await s.buildWeguideDoor(); if (!ctx.alive(t)) return; s.resetDoor();
      const p = m.group.position;
      s.turn(m, Math.atan2(0 - p.x, -5.2 - p.z), 800);
      if (ctx.from === 'counselor-need') s.shot([p.x - 1.4, 2.9, p.z + 6.8], [0.2, 1.55, -5.2], 0);
      s.shot([p.x - 1.1, 2.6, p.z + 5.9], [0.2, 1.55, -5.2], 2200);
      s.raiseDoor(2000).then(() => { if (ctx.alive(t)) { m.setMode('cheer'); setTimeout(() => m.setMode('idle'), 1200); } });
    },
    at: {
      1: async (ctx, t, instant) => {
        const s = ctx.stage, m = s.actors.maya; if (!s.wgDoor) return;
        if (instant) { s.raiseDoor(0); s.openDoor(0); return; }
        s.raiseDoor(0); await s.openDoor(1100); if (!ctx.alive(t)) return;
        const p = m.group.position;
        s.shot([p.x * 0.4 - 0.6, 2.2, -1.6], [0, 1.6, -5.4], 2200);
        await s.walkPath(m, [[p.x, 0, p.z], [0, 0, -3.2], [0, 0, -4.9]], 1.7); if (!ctx.alive(t)) return;
        document.getElementById('veil').classList.add('on');
        setTimeout(() => { if (ctx.alive(t)) ctx.next(); }, 420);
      },
    },
    leave(ctx) { ctx.stage.resetDoor(); ctx.stage.choicePads.forEach(c => { c.pad.visible = true; }); },
  },
  {
    // Brand reveal: through the door's light, high above the real WeGuide World town; the lockup assembles
    id: 'brand', chapter: 'world', set: 'town', steps: 2, offset: 0,
    backdrop: '<div class="bd-sky"></div>',
    html: `<div class="brand-wrap">
        <div class="brand-lock">${LOGO_SVG}
          <h1 class="brand-slogan">Your future. <span>With direction.</span></h1>
          <p class="brand-sub">Student development and future-planning platform<i></i>A House of Prep platform</p>
        </div>
        <div class="brand-promise" data-step="1"><p>WeGuide helps students turn exploration into a <em>clearer direction</em> and an <em>actionable next-step plan</em>, with <em>counselors</em> interpreting evidence gathered over time and guiding students as they make informed choices.</p></div>
      </div>`,
    async enter(ctx, t) {
      const s = ctx.stage; await only(ctx, []); await s.buildTown(); if (!ctx.alive(t)) return;
      s.showSet('town'); orbit(ctx, t, 108, 78, 0.3); s.frame();   // above the clouds, so they drift below like haze
    },
    leave(ctx) { stopOrbit(ctx); },
  },
  // ===== THE TOWER =====
  {
    id: 'tower', chapter: 'goal', set: 'tower', tower: true, maya: true, proposed: true, steps: 5,
    html: `<div class="abs" style="right:6vw;top:13vh;width:min(36vw,560px)">
      <p class="kicker">The destination</p><h2 style="font-size:clamp(30px,2.8vw,46px)">Before the tour, here is where Maya is heading.</h2>
      <p class="small" style="margin:14px 0 18px">It shows what she has gathered, and what is still missing.</p>
      ${S(1, levelCards(), '', '')}
      ${S(4, '<div class="card" style="margin-top:10px"><div class="lbl">Launch</div><div class="small">At the top sits the rocket. The counselor grants ignition after an agreed review; the student launches. It celebrates preparation and a plan for what comes next.</div></div>')}
    </div>`,
    async enter(ctx) {
      await towerSetup(ctx); ctx.stage.litLevel(-1); wireLevels(ctx);
      ctx.stage.shot([-11.5, 3.9, 19.5], [3.0, 3.6, 0], 0); ctx.stage.shot([-10.2, 3.8, 17.6], [2.8, 3.6, 0], 6000);
    },
    at: Object.fromEntries([1, 2, 3].map(k => [k, (ctx, t, instant) => { ctx.stage.litLevel(k - 1); ctx.qa('.level').forEach((x, i) => x.classList.toggle('sel', i === k - 1)); towerShot(ctx, k - 1, instant ? 0 : 1100); }]).concat([[4, (ctx, t, instant) => { ctx.stage.litLevel(2); ctx.qa('.level').forEach(x => x.classList.remove('sel')); ctx.stage.shot([-8.4, 8.6, 12.8], [2.4, 6.5, 0], instant ? 0 : 1300); }]])),
  },
  {
    // How it fits together: the trail (curriculum) lights up, the City's buildings rise, the Tower glows
    id: 'principle', chapter: 'goal', set: 'tower', steps: 4, offset: 0.08,
    html: `<div class="fit-copy"><p class="kicker enter">How it fits together</p><h2 class="enter d1">One journey, three parts.</h2></div>
      <div class="fit-label" id="fl-trail" data-step="0"><span class="fl-n">1</span><span><b>The curriculum</b> provides the sequence.</span><em>28 modules across Grades 10 to 12</em></div>
      <div class="fit-label" id="fl-city" data-step="1"><span class="fl-n">2</span><span><b>The City</b> provides the tools.</span><em>Each building has one clear purpose</em></div>
      <div class="fit-label" id="fl-tower" data-step="2"><span class="fl-n">3</span><span><b>The Tower</b> shows the purpose and progress.</span><em>Evidence, gaps, reports and the next move</em></div>
      <div class="roles" data-step="3">
        <div class="role"><span class="ri">${ICON.self}</span><div><b>Students</b><p>Explore, try things and add evidence of what they did and learned.</p></div></div>
        <div class="role"><span class="ri"><svg viewBox="0 0 24 24"><path d="M4 5h16v10H9l-5 4z"/></svg></span><div><b>Counselors</b><p>Interpret, add context and guide the next step.</p></div></div>
        <div class="role"><span class="ri"><svg viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="11" rx="3"/><path d="M12 7V4M9 12h.01M15 12h.01M9.5 15h5"/></svg></span><div><b>AI</b><p>Helps organise evidence and draft summaries, inside a framework people designed.</p></div></div>
      </div>`,
    async enter(ctx, t) {
      const s = ctx.stage; await s.towerReady; await only(ctx, []); s.resetRocket(); s.litLevel(-1);
      const d = await s.buildDiorama(); if (!ctx.alive(t)) return;
      d.g.visible = true; s.dioReset();
      s.shot([-17, 13.5, 33], [-2.2, 2.2, 8], ctx.from === 'tower' ? 1800 : 0);
      s.pin(ctx.q('#fl-trail'), d.anchors.trail, 0); s.pin(ctx.q('#fl-city'), d.anchors.city, 0); s.pin(ctx.q('#fl-tower'), d.anchors.tower, 0);
      later(400, t, ctx, () => s.dioStones(false));
    },
    at: {
      1: (ctx, t, instant) => ctx.stage.dioBuildings(instant),
      2: (ctx, t, instant) => { const s = ctx.stage; if (instant) { s.litLevel(2); return; } [0, 1, 2].forEach(i => setTimeout(() => ctx.alive(t) && s.litLevel(i), i * 260)); },
      3: (ctx, t, instant) => ctx.stage.shot([-17.5, 14.5, 34.5], [-2.2, 3.0, 8], instant ? 0 : 1400),
    },
    leave(ctx) { const d = ctx.stage.dio; if (d) d.g.visible = false; ctx.stage.litLevel(-1); },
  },
  {
    // The City: an aerial tour of the real town; every building is tagged, and each neighbourhood opens its cards
    id: 'city', chapter: 'goal', set: 'town', steps: 4, offset: 0.1,
    backdrop: '<div class="bd-sky"></div>',
    html: `<div class="city-copy"><p class="kicker enter">The City</p><h2 class="enter d1">Every building has a job.</h2>
        <div class="city-steps enter d2">${CITY_GROUPS.map((g, i) => `<span class="cstep" data-g="${i + 1}"><i>${i + 1}</i>${g.title}</span>`).join('')}</div></div>
      ${CITY.map(c => `<div class="cpin" data-g="${c.g}" id="cp-${c.key}"><b><i></i>${c.name}</b><span>${c.purpose}${c.soon ? ` <em>${c.soon}</em>` : ''}</span></div>`).join('')}
      <p class="city-foot enter d3">Also in town: the Universe of Majors, the WeGuide statue and the Playing Arena.</p>`,
    async enter(ctx, t) {
      const s = ctx.stage; await only(ctx, []); const town = await s.buildTown(); if (!ctx.alive(t)) return;
      s.showSet('town'); s.scene.fog = new THREE.Fog('#E4ECF7', 150, 420);   // lighter haze for the aerial view
      const anchors = s._cityAnchors || (s._cityAnchors = Object.fromEntries(CITY.map(c => { const b = (town.buildings[c.file] || [[0, 0, 0]])[0], o = new THREE.Object3D(); o.position.set(b[0], c.h || 11.5, b[2]); s.sets.town.add(o); return [c.key, o]; })));
      CITY.forEach(c => s.pin(ctx.q('#cp-' + c.key), anchors[c.key], 0));
      cityShot(ctx, 0, 0);
    },
    at: Object.fromEntries([1, 2, 3].map(k => [k, (ctx, t, instant) => {
      cityShot(ctx, k, instant ? 0 : 1800);
      ctx.qa('.cpin').forEach(p => p.classList.toggle('on', +p.dataset.g === k));
      ctx.qa('.cstep').forEach(p => p.classList.toggle('on', +p.dataset.g === k));
    }])),
  },

  // ===== GRADE 10 =====
  {
    id: 'g10', chapter: 'g10', set: 'trail', maya: true, towerLevel: 1, steps: 2,
    html: `<div class="copy" style="max-width:40vw"><p class="kicker">Grade 10 · Discover & Explore</p><h2>Understanding herself, and discovering what's possible.</h2>
      <p class="lead">By the end of Grade 10, Maya can describe her interests, strengths and values with real examples, name questions worth investigating and make a plan to keep exploring.</p></div>
      <div class="abs" style="right:6vw;top:13vh;width:min(30vw,440px)">${mods(G10)}<p class="note" style="margin-top:8px">Tap a module to see the evidence it keeps.</p></div>`,
    async enter(ctx) {
      const s = ctx.stage, [m] = await only(ctx, ['mayaW']); const pts = await s.buildTrail(10);
      s.place(m, 'trail', pts[0], 0.4); m._stone = 0; s.lightStones(1); wireMods(ctx, 'mayaW');
      trailCam(ctx, 0, 0);
    },
    at: { 1: (ctx, t, instant) => { trailWalk(ctx, 'mayaW', 3, instant); ctx.qa('.mods li').forEach((li, i) => li.classList.toggle('sel', i === 3)); } },
  },
  {
    id: 'g10-mission', chapter: 'g10', set: 'town', maya: true, real: true, towerLevel: 1, steps: 4, offset: 0.04,
    backdrop: '<div class="bd-sky"></div>',
    html: `<div class="abs" style="left:7vw;top:13vh;width:min(32vw,480px)"><p class="kicker">Module 6 · Learning Through Experience</p><h2 style="font-size:clamp(28px,2.6vw,42px)">She tries a small design task.</h2>
      <div class="card" style="margin-top:22px"><div class="lbl">Portfolio entry</div>
        <div class="report">
          <div class="row"><span class="k">Activity</span><span>Redesign a corner of the school yard</span></div>
          ${S(1, '<div class="row"><span class="k">Contribution</span><span>Sketched the layout. Chose shade, seating and planting.</span></div>')}
          ${S(2, '<div class="row"><span class="k">Reflection</span><span>“I loved coming up with the ideas. Measuring everything was harder than I expected.”</span></div>')}
        </div>
        ${S(3, '<div style="display:flex;gap:8px;margin-top:12px"><span class="chip green">Evidence captured</span><span class="chip">Available for counselor review</span></div>')}
      </div></div>
      ${device('missions', 260, 'Mission Machine in WeGuide World', 'right:6vw;top:13vh')}`,
    async enter(ctx, t) {
      const s = ctx.stage, town = await s.buildTown(), [m] = await only(ctx, ['mayaD']); if (!ctx.alive(t)) return;
      s.showSet('town'); const hT = town.spot.pos[1] + town.spot.h - 0.1, b = (town.buildings['progress-vault'] || [[42, 0, -34.5]])[0];
      s.place(m, 'town', [b[0] - 1.2, 0.1, b[2] + 9.5], 0.35, 'think'); m.group.scale.setScalar(hT / 1.6);   // in front of the real Mission Machine
      s.shot([b[0] - 4.2, 10.2, b[2] + 26.5], [b[0] + 0.6, 4.2, b[2] + 3], 0); s.shot([b[0] - 3.5, 9.5, b[2] + 24], [b[0] + 0.6, 4.2, b[2] + 3], 5000);
    },
    at: { 2: ctx => ctx.stage.actors.mayaD.setMode('idle'), 3: ctx => { const a = ctx.stage.actors.mayaD; a.setMode('cheer'); setTimeout(() => a.setMode('idle'), 1300); } },
  },
  {
    // Advised freedom, inside the Universe of Majors: a sky where every star is a career
    id: 'g10-free', chapter: 'g10', set: 'universe', maya: true, real: true, towerLevel: 1, steps: 3, offset: 0.06,
    backdrop: '<div class="bd-night"></div>',
    html: `<div class="free-copy"><p class="kicker enter">Advised freedom · Universe of Majors</p><h2 class="enter d1">She can explore whenever she's curious.</h2>
        <p class="lead enter d2">The City suggests the learning that would help. It never makes her wait for it.</p>
        ${S(1, `<div class="card free-tip"><div class="lbl">Tip in the Universe of Majors</div><p>Comparing programs? <b>Majors Under the Microscope</b> can help you choose useful criteria.</p><div class="row2"><button class="btn primary" data-go>Explore now</button><button class="btn" data-go>View related learning</button></div></div>`)}
        ${S(2, '<div class="card free-saved"><div class="lbl">Saved question</div><h3>What does an architect actually do all day?</h3><span class="chip grey">Kept for her Grade 11 investigation</span></div>')}
      </div>
      ${UNI_FIELDS.map((f, i) => `<div class="ulabel" id="ul-${i}"><i></i>${f}</div><button class="uhit" id="uh-${i}" data-click data-f="${i}" aria-label="${f}"></button>`).join('')}
      <button class="btn uback" id="uback" data-click hidden>← All fields</button>
      <div class="ulabel star" id="ul-arch" data-step="2">Architecture</div>
      <figure class="device free-device"><video data-src="assets/video/universe.mp4" poster="assets/video/universe.jpg"></video><figcaption>The real Universe of Majors: 408 careers, 114 majors</figcaption></figure>`,
    async enter(ctx) {
      const s = ctx.stage, [m] = await only(ctx, ['mayaW']), u = s.buildUniverse(); u.archBoost = 0;
      s.place(m, 'universe', [0, 0.12, 0], Math.PI - 0.15); m.setMode('idle');
      s.shot([-2.4, 1.5, 6.4], [0.8, 6.2, -12], 0); s.shot([-2.1, 1.35, 5.8], [0.8, 6.4, -12], 6000);
      u.anchors.forEach((a, i) => s.pin(ctx.q('#ul-' + i), a, 0)); s.pin(ctx.q('#ul-arch'), u.archAnchor, 0);
      u.clusters.forEach((c, i) => { s.pin(ctx.q('#uh-' + i), c.hit, 0); ctx.q('#ul-' + i + ' i').style.background = u.cols[i]; });
      ctx.qa('[data-go]').forEach(b => b.onclick = e => { e.stopPropagation(); ctx.next(); });
      // hover a field to light it up; click to fly to it; "All fields" (or the same field again) flies back
      const mark = () => { ctx.qa('.ulabel:not(.star)').forEach((l, i) => { const on = u.clusters[i].want > 0 || u.focused === i;
        l.classList.toggle('hi', on); l.classList.toggle('dim', !on && u.clusters.some(c => c.want > 0)); l.classList.toggle('off', !on && u.focused >= 0); });
        ctx.q('#uback').hidden = u.focused < 0; };
      u.focused = -1; u.clusters.forEach(c => { c.want = 0; });
      ctx.qa('.uhit').forEach(h => { const i = +h.dataset.f;
        h.onmouseenter = () => { u.hover(i, true); mark(); }; h.onmouseleave = () => { u.hover(i, false); mark(); };
        h.onclick = e => { e.stopPropagation(); u.focus(u.focused === i ? -1 : i); mark(); }; });
      ctx.q('#uback').onclick = e => { e.stopPropagation(); u.focus(-1); mark(); };
      this._mark = mark;
    },
    at: {
      1: (ctx, t, instant) => { const u = ctx.stage.uni; if (u && u.focused >= 0) { u.focus(-1, instant ? 0 : 1300); } SCENES.find(x => x.id === 'g10-free')._mark?.(); },
      // the saved question: the camera glides to Engineering, where the Architecture star brightens
      2: (ctx, t, instant) => { const s = ctx.stage, u = s.uni; if (!u) return; u.focus(4, instant ? 0 : 1800); SCENES.find(x => x.id === 'g10-free')._mark?.();
        if (instant) { u.archBoost = 1; return; } s.tween(900, e => { u.archBoost = e; }, 'arch'); s.actors.mayaW?.setMode('wave'); setTimeout(() => s.actors.mayaW?.setMode('idle'), 1300); },
    },
    leave(ctx) { const u = ctx.stage.uni; if (u) { u.focused = -1; u.clusters.forEach(c => { c.want = 0; }); } },
  },
  {
    id: 'g10-tower', chapter: 'g10', set: 'tower', maya: true, proposed: true, steps: 3,
    html: `<div class="abs" style="right:6vw;top:12vh;width:min(38vw,580px)"><p class="kicker">Back at the Tower · Level 1</p><h2 style="font-size:clamp(28px,2.6vw,42px)">What the evidence says so far.</h2>
      <div class="rp-pre"><div class="grid g3" style="margin-top:18px">${card('Interest expressed', '<h3>Designing spaces</h3>')}${card('Evidence', '<h3>One activity</h3>')}${card('Still to explore', '<h3>Technical demands</h3>')}</div>
      ${S(1, card('Counselor', '<p style="margin:0;font-size:15px;line-height:1.45">“Have you tried the technical side of design yet? Let\'s plan one more investigation.”</p>', '') , '', 'margin-top:12px')}</div>
      ${S(2, `<div class="card report" style="margin-top:18px"><div class="lbl">Grade 10 report · Checkpoint 1 of 3 · Example only</div>
        <div class="row"><span class="k">Her words</span><span>“I like drawing and I'm curious about architecture.” Self-reported interest.</span></div>
        <div class="row"><span class="k">Evidence</span><span>E01 design activity and reflection · E02 career interview notes · E03 values reflection</span></div>
        <div class="row"><span class="k">Finding</span><span>She enjoys visual design and helping people. Evidence is still limited.</span></div>
        <div class="row"><span class="k">Question</span><span>Does she enjoy the technical and measuring side as well?</span></div>
        <div class="row"><span class="k">Next actions</span><span>Maya: an agreed investigation. Counselor: discuss it at the next review.</span></div></div>`, 'rp-report')}
    </div>`,
    async enter(ctx) { await towerSetup(ctx); ctx.stage.litLevel(0); towerShot(ctx, 0, 0); },
  },

  // ===== GRADE 11 =====
  {
    id: 'g11', chapter: 'g11', set: 'trail', maya: true, real: true, towerLevel: 2, steps: 1,
    html: `<div class="copy" style="max-width:36vw"><p class="kicker">Grade 11 · Design & Investigate</p><h2>From discovering to investigating.</h2>
      <p class="lead">Maya revisits her Grade 10 portfolio, tests her assumptions and builds a reasoned shortlist that stays open to change.</p></div>
      ${device('destination', 118, 'Destination 0: My Starting Point', 'right:6vw;bottom:80px')}
      <div class="abs" style="right:6vw;top:12vh;width:min(30vw,440px)">${mods(G11, 0)}</div>`,
    async enter(ctx) { const s = ctx.stage, [m] = await only(ctx, ['mayaD']); const pts = await s.buildTrail(11); s.place(m, 'trail', pts[1], 0.4); m._stone = 1; s.lightStones(2); wireMods(ctx, 'mayaD'); trailCam(ctx, 1, 0); },
  },
  {
    // Grade 11: in her real Central House, Avatar Studio's career looks let her try a future on
    id: 'studio', chapter: 'g11', set: 'house', maya: true, real: true, towerLevel: 2, steps: 4, offset: 0.05,
    backdrop: '<div class="bd-house"></div>',
    html: `<div class="studio-copy"><p class="kicker enter">Grade 11 · Trying on futures</p><h2 class="enter d1">Before she researches a career, she can try it on.</h2>
        <p class="lead enter d2">Avatar Studio's career looks let her picture herself in a job she wants to explore.</p>
        <div class="looks enter d3">${S(1, '<span class="look"><i></i>Designer</span>', 'lk')}${S(2, '<span class="look"><i></i>Engineer</span>', 'lk')}${S(3, '<span class="look own"><i></i>Then, back to her own look</span>', 'lk')}</div></div>
      <figure class="device studio-device"><video data-src="assets/video/avatar-studio.mp4" poster="assets/video/avatar-studio.jpg"></video><figcaption>The real Avatar Studio</figcaption></figure>`,
    async enter(ctx, t) {
      const s = ctx.stage, keys = ['maya', 'mayaD', 'mayaE', 'mayaW'];
      const [spot, as] = await Promise.all([s.buildHouse(), only(ctx, keys)]); if (!ctx.alive(t)) return;
      const [x, y, z] = spot.pos, h = spot.h, k = h / 1.6;
      as.forEach((a, i) => { s.place(a, 'house', [x, y, z], -0.12); a.group.scale.setScalar(k); a.group.visible = i === 0; });
      const look = [x, y + h * 0.56, z];
      s.shot([x - 1.1, y + h * 0.95, z + 6.0], look, 0); s.shot([x - 0.95, y + h * 0.9, z + 5.5], look, 5000);
    },
    at: Object.fromEntries([1, 2, 3].map(k => [k, (ctx, t, instant) => {
      const s = ctx.stage, keys = ['maya', 'mayaD', 'mayaE', 'mayaW'];
      keys.forEach((key, i) => { const a = s.actors[key]; if (a) a.group.visible = i === k; });
      const a = s.actors[keys[k]]; if (!a || instant) return;
      const y0 = -0.12; a.group.rotation.y = y0 - Math.PI * 2; s.tween(750, e => { a.group.rotation.y = y0 - Math.PI * 2 * (1 - e); }, 'act:' + a.group.uuid);
      if (k === 3) { a.setMode('cheer'); later(1500, t, ctx, () => a.setMode('idle')); } else { a.setMode('wave'); later(1300, t, ctx, () => a.setMode('idle')); }
    }])),
  },
  {
    // Grade 11: she compares two paths at the real University Planner, then tests one
    id: 'g11-compare', chapter: 'g11', set: 'town', maya: true, towerLevel: 2, steps: 4, offset: 0.02,
    backdrop: '<div class="bd-sky"></div>',
    html: `<div class="cmp-copy"><p class="kicker enter">University Planner · Modules 3, 4 and 8</p><h2 class="enter d1">She compares two paths, then tests one.</h2></div>
      <div class="cmp-row">
        <div class="pcard" data-step="1"><div class="pc-h"><span class="pc-ic">A</span><div><div class="lbl">Fictional program record</div><h3>Architecture</h3></div></div>
          <dl><dt>Study</dt><dd>Design studios plus structures, maths and building technology</dd><dt>Requirements</dt><dd class="ph">[Placeholder requirements]</dd><dt>Source</dt><dd>Program page · checked [date]</dd></dl></div>
        <div class="pcard" data-step="1"><div class="pc-h"><span class="pc-ic b">B</span><div><div class="lbl">Fictional program record</div><h3>Product design</h3></div></div>
          <dl><dt>Study</dt><dd>Sketching, 3D modelling, materials and user research</dd><dt>Requirements</dt><dd class="ph">[Placeholder requirements]</dd><dt>Source</dt><dd>Program page · checked [date]</dd></dl></div>
      </div>
      <div class="cmp-side">
        <div class="card cmp-test" data-step="2"><div class="lbl">Put It to the Test · her reflection</div><p>“At the workshop, I enjoyed the 3D modelling more than I expected.”</p></div>
        <div class="cmp-gap" data-step="3"><span class="chip amber">Gap: study costs not researched yet</span></div>
      </div>
      <div class="bldg-label on" id="up-label"><span class="dot"></span>University Planner</div>`,
    async enter(ctx, t) {
      const s = ctx.stage, town = await s.buildTown(), [m] = await only(ctx, ['mayaE']); if (!ctx.alive(t)) return;
      s.showSet('town'); const hT = town.spot.pos[1] + town.spot.h - 0.1, b = (town.buildings['academy-gateway'] || [[-52, 0, -35]])[0];
      s.place(m, 'town', [b[0] + 9.5, 0.1, b[2] + 1.5], -Math.PI / 2 + 0.5, 'think'); m.group.scale.setScalar(hT / 1.6);
      const an = s._upAnchor || (s._upAnchor = new THREE.Object3D()); an.position.set(b[0] + 3, 10.5, b[2]); s.sets.town.add(an); s.pin(ctx.q('#up-label'), an, 0);
      s.shot([b[0] + 23.5, 10.2, b[2] + 23.5], [b[0] + 3.5, 3.8, b[2] + 0.5], 0); s.shot([b[0] + 21, 9.5, b[2] + 21], [b[0] + 3.5, 3.8, b[2] + 0.5], 5000);
    },
    at: { 2: ctx => { const m = ctx.stage.actors.mayaE; if (m) { m.setMode('cheer'); setTimeout(() => m.setMode('think'), 1300); } } },
  },
  {
    id: 'g11-tower', chapter: 'g11', set: 'tower', maya: true, proposed: true, steps: 2,
    html: `<div class="abs" style="right:6vw;top:13vh;width:min(36vw,560px)"><p class="kicker">Back at the Tower · Level 2</p><h2 style="font-size:clamp(28px,2.6vw,42px)">A provisional shortlist, with reasons.</h2>
      <div class="grid g2" style="margin-top:18px">${card('Shortlist', '<h3>Architecture</h3><h3>Product design</h3><span class="chip grey">Provisional</span>')}${card('Open question', '<h3>What will each cost?</h3>')}</div>
      ${S(1, card('Next move', '<p style="margin:0;font-size:15px;line-height:1.45">List the requirements and deadlines for both options and set Grade 12 priorities with her counselor.</p>'), '', 'margin-top:12px')}
    </div>`,
    async enter(ctx) { await towerSetup(ctx, 'mayaE'); ctx.stage.litLevel(1); towerShot(ctx, 1, 0); },
  },

  // ===== GRADE 12 =====
  {
    id: 'g12', chapter: 'g12', set: 'trail', maya: true, towerLevel: 3, steps: 1,
    html: `<div class="copy" style="max-width:36vw"><p class="kicker">Grade 12 · Prepare & Transition</p><h2>Turning decisions into action.</h2>
      <p class="lead">Maya builds an application strategy, prepares authentic materials from her own evidence and makes an informed decision about her next step.</p></div>
      <div class="abs" style="right:6vw;top:13vh;width:min(30vw,440px)">${mods(G12, 0)}</div>`,
    async enter(ctx) { const s = ctx.stage, [m] = await only(ctx, ['mayaW']); const pts = await s.buildTrail(9); s.place(m, 'trail', pts[2], 0.4); m._stone = 2; s.lightStones(3); wireMods(ctx, 'mayaW'); trailCam(ctx, 2, 0); },
  },
  {
    id: 'g12-apply', chapter: 'g12', set: 'town', maya: true, real: true, towerLevel: 3, steps: 4, offset: 0.03,
    backdrop: '<div class="bd-sky"></div>',
    html: `<div class="abs" style="left:7vw;top:13vh;width:min(34vw,520px)"><p class="kicker">Build My Case · Tell My Story</p><h2 style="font-size:clamp(28px,2.6vw,42px)">She doesn't start from a blank page.</h2>
      <div class="card" style="margin-top:20px"><div class="lbl">From her Grade 10 portfolio</div><h3>Redesign a corner of the school yard</h3>${S(1, '<span class="chip">Moved into an application draft</span>')}</div>
      ${S(2, `<div class="card" style="margin-top:10px"><div class="lbl">Application Command Center</div><div class="report">
        <div class="row"><span class="k">Statement</span><span class="chip green">Draft ready</span></div><div class="row"><span class="k">Portfolio</span><span class="chip green">Selected</span></div><div class="row"><span class="k">Deadlines</span><span class="chip green">Tracked</span></div><div class="row"><span class="k">Reference</span><span class="chip amber">Requested</span></div></div></div>`)}
      ${S(3, '<div class="card" style="margin-top:10px"><div class="lbl">Counselor feedback · kept separate</div><p style="margin:0;font-size:15px">“Strong example. Say what you measured and what you changed.”</p></div>')}
    </div>
    ${device('portfolio', 230, 'The Portfolio in WeGuide World', 'right:5vw;top:14vh')}
    <div class="bldg-label on" id="pf-label"><span class="dot"></span>Portfolio</div>`,
    async enter(ctx, t) {
      const s = ctx.stage, town = await s.buildTown(), [m] = await only(ctx, ['mayaW']); if (!ctx.alive(t)) return;
      s.showSet('town'); const hT = town.spot.pos[1] + town.spot.h - 0.1, b = (town.buildings['circle-achievement'] || [[42, 0, 0]])[0];
      s.place(m, 'town', [b[0] - 1.5, 0.1, b[2] + 9], 0.3, 'think'); m.group.scale.setScalar(hT / 1.6);   // in front of the real Portfolio building
      const an = s._pfAnchor || (s._pfAnchor = new THREE.Object3D()); an.position.set(b[0], 8.5, b[2] + 2); s.sets.town.add(an); s.pin(ctx.q('#pf-label'), an, 0);
      s.shot([b[0] - 4.5, 10.2, b[2] + 27], [b[0] + 0.5, 3.8, b[2] + 3], 0); s.shot([b[0] - 4, 9.5, b[2] + 24.5], [b[0] + 0.5, 3.8, b[2] + 3], 5000);
    },
  },
  {
    id: 'launch', chapter: 'g12', set: 'tower', maya: true, proposed: true, steps: 3,
    gate(ctx, step) { return step === 0 ? ctx.state.ignition : step === 1 ? ctx.state.launched : true; },
    html: `<div class="abs" style="right:6vw;top:13vh;width:min(34vw,520px)"><p class="kicker">Level 3 · Launch</p><h2 style="font-size:clamp(28px,2.6vw,42px)">Ready for the next step.</h2>
      <p class="lead">Maya can explain her options and actions with evidence. One offer condition is still open, and the Tower shows it.</p>
      <div style="display:flex;gap:8px;margin-top:22px"><button class="btn" id="ign">Counselor: grant ignition</button><button class="btn primary" id="lch" disabled>Maya: launch</button></div>
      ${S(2, '<p class="small" style="margin-top:20px">The launch marks the agreed preparation milestone and a plan for what comes next. Maya chooses her path; the launch is not an admission result.</p>')}
    </div>`,
    async enter(ctx, t) {
      ctx.state.ignition = false; ctx.state.launched = false;
      await towerSetup(ctx, 'mayaG'); ctx.stage.litLevel(2); ctx.stage.shot([-10.2, 5.4, 16.8], [2.9, 4.1, 0], 0);   // whole tower with Maya at its foot
      ctx.q('#ign').onclick = e => { e.stopPropagation(); ctx.state.ignition = true; e.target.classList.add('sel'); e.target.textContent = 'Ignition granted'; ctx.q('#lch').disabled = false; ctx.stage.flame.material.opacity = 0.5; ctx.next(); };
      ctx.q('#lch').onclick = async e => { e.stopPropagation(); e.target.disabled = true; ctx.state.launched = true; const m = ctx.stage.actors.mayaG; m.setMode('cheer');
        // the camera rides up with the rocket and stays with it, through the clouds, until the next slide
        const s = ctx.stage; s.cancel('cam'); const tl = new THREE.Vector3(), tp = new THREE.Vector3();
        const follow = ctx._follow = dt => { const ry = s.rocket.position.y; tl.set(0.6, ry + 0.9, 0); tp.set(-7.2, ry + 1.2, 12.4); s.look.lerp(tl, Math.min(1, dt * 5)); s.cam.position.lerp(tp, Math.min(1, dt * 3.5)); };
        s.updaters.push(follow); await s.launchRocket(); if (ctx.alive(t)) ctx.next(); };
    },
    leave(ctx) {
      // the camera lets go and the rocket climbs on out of view behind the veil; the Tower resets once it is hidden
      const s = ctx.stage, u = s.updaters, i = u.indexOf(ctx._follow); if (i > -1) u.splice(i, 1); ctx._follow = null;
      setTimeout(() => { if (s.current !== 'tower') s.resetRocket(); }, 700);
    },
  },
  {
    // Three years side by side: Maya in each grade on a lit pedestal, with what changes underneath
    id: 'three-years', chapter: 'g12', set: 'void', maya: true, steps: 1,
    backdrop: '<div class="bd-fog"></div>',
    html: `<div class="ty-head"><p class="kicker enter">Three years, three experiences</p><h2 class="enter d1">What changes from grade to grade.</h2><p class="small enter d2">Three counselor-issued reports in every full year: early findings, development, then consolidation and handover.</p></div>
      <div class="ty-cols">${TY.map((c, i) => `<div class="ty-card enter d${i + 1}" style="--c:${c.col}"><div class="ty-band"><span>Level ${i + 1}</span><b>${c.grade}</b><em>${c.name}</em></div>
        <dl><dt>Focus</dt><dd>${c.focus}</dd><dt>Modules</dt><dd>${c.mods}</dd><dt>She leaves with</dt><dd>${c.leaves}</dd><dt>Counselor</dt><dd>${c.counselor}</dd></dl></div>`).join('')}</div>`,
    async enter(ctx, t) {
      const s = ctx.stage, keys = ['maya', 'mayaD', 'mayaG'], as = await only(ctx, keys);
      const peds = s.pedestals(true);
      as.forEach((a, i) => { s.place(a, 'void', [peds[i].x, 0.16, 0], [0.25, 0, -0.25][i]); a.setMode('idle'); });
      const L = s.landing(true), lr = L.rocket, c1 = new THREE.Vector3(0, 1.1, 10.4), l1 = new THREE.Vector3(0, 0.62, 0);   // the three of them sit above their cards
      if (ctx.from !== 'launch') {
        lr.position.y = L.padY; lr.rotation.y = 0; L.flame.material.opacity = 0; s.landClouds(false);
        as[2].setMode('cheer'); setTimeout(() => as[2].setMode('idle'), 1600); s.shot(c1.toArray(), l1.toArray(), 0); return;
      }
      // straight on from the launch: we are still up with the rocket; it comes down through the clouds and lands
      // on the pad behind them, the camera descending with it; the cards wait until it has touched down
      const el = ctx.el; el.classList.add('ty-landing'); s.cancel('cam'); s.landClouds(true);
      const y0 = 14, cam = new THREE.Vector3(), look = new THREE.Vector3(), ease = e => e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;
      const P = L.root.position; lr.position.y = y0; L.flame.material.opacity = 1;
      const flick = (dt, tt) => { L.flame.scale.set(1, 1 + Math.sin(tt * 40) * 0.2, 1); }; s.updaters.push(flick);
      const fly = e => {
        const d = 1 - Math.pow(1 - e, 3), ry = y0 + (L.padY - y0) * d, c = ease(e);
        lr.position.y = ry; lr.rotation.y = (1 - d) * 2.4; L.flame.material.opacity = e > 0.86 ? (1 - e) / 0.14 : 1;
        // the camera starts as far back as the launch shot, so the rocket keeps its size across the cut
        cam.set(P.x, ry + 0.4, 21).lerp(c1, c); look.set(P.x, ry + 1.1, P.z).lerp(l1, c); s.cam.position.copy(cam); s.look.copy(look);
      };
      fly(0);
      s.tween(3600, fly, 'land').then(() => {
        const i = s.updaters.indexOf(flick); if (i > -1) s.updaters.splice(i, 1); L.flame.material.opacity = 0; if (!ctx.alive(t)) return; s.landClouds(false);
        s.tween(1000, e => { L.dust.scale.setScalar(1 + e * 1.8); L.dust.material.opacity = 0.75 * (1 - e); }, 'dust');
        as.forEach(a => a.setMode('cheer')); setTimeout(() => as.forEach(a => a.setMode('idle')), 1600);
        el.classList.remove('ty-landing');
      });
    },
    leave(ctx) { const s = ctx.stage; s.cancel('land'); s.pedestals(false); s.landing(false); s.landClouds(false); },
  },

  // ===== COUNSELORS =====
  {
    // See. Guide. Review. In the counseling room, a (fictional) counselor view builds up beat by beat
    id: 'counselor', chapter: 'counselor', set: 'counsel', proposed: true, maya: true, steps: 5, offset: 0.0,
    backdrop: '<div class="bd-counsel"></div>',
    html: `<div class="cw-copy"><p class="kicker enter">What changes for the counselor</p><h2 class="enter d1">See. Guide. Review.</h2>
        <div class="cw-dots">${CW_BEATS.map((_, i) => `<i data-step="${i}"></i>`).join('')}</div>
        <ol class="beats">${CW_BEATS.map((b, i) => `<li data-step="${i}"><i>${i + 1}</i><span>${b}</span></li>`).join('')}</ol></div>
      <div class="cview">
        <div class="cv-top"><span class="cv-av">M</span><div><b>Maya</b><em>Grade 10 · Illustrative student</em></div><span class="chip grey">Counselor view</span></div>
        <div class="cv-sec" data-step="0"><div class="lbl">See</div><div class="cv-row"><span>Interest expressed</span><b>Designing spaces</b></div><div class="cv-row"><span>Evidence</span><b>E01 · School yard redesign</b></div><div class="cv-row oq"><span>Open question</span><b>Does she enjoy the technical side?</b></div></div>
        <div class="cv-sec note" data-step="1"><div class="lbl">Counselor observation · kept separate</div><p>Enjoys visual ideas; measuring felt hard. A question to explore, not a conclusion.</p></div>
        <div class="cv-sec" data-step="2"><div class="lbl">Guide</div><div class="cv-assign"><span class="cv-ic">${ICON.prep}</span><div><b>Put It to the Test</b><em>Workshop visit with a product designer</em></div><span class="chip green">Assigned</span></div></div>
        <div class="cv-sec" data-step="3"><div class="lbl">Review</div><div class="cv-row"><span>New contribution</span><b>Workshop reflection</b></div><div class="cv-state"><span class="chip amber">Awaiting review</span><span class="arrow">→</span><span class="chip green">Reviewed with Maya</span></div></div>
        <div class="cv-sec" data-step="4"><div class="lbl">Between meetings</div><div class="cv-row"><span>Next action</span><b>Compare two programs · Maya · in two weeks</b></div><div class="cv-row"><span>Report</span><b>Checkpoint 1 draft ready</b></div><div class="cv-row"><span>Support</span><b>School Success Contact</b></div></div>
      </div>`,
    async enter(ctx) {
      const s = ctx.stage, [spots, spot] = await Promise.all([s.buildCounsel(), s.buildHouse()]), k = spot.h / 1.6;
      const [c, m] = await only(ctx, ['counselor', 'mayaW']);
      s.place(c, 'counsel', [-2.06, 0.12, -3.29], -0.15, 'idle'); c.group.scale.setScalar(CAST.counselor[1] * k);   // beside her desk, laptop open on WeGuide
      s.place(m, 'counsel', CW_MAYA, 1.6); m.group.scale.setScalar(k); m.group.visible = false;
      s.shot([0.9, 3.3, 3.4], CW_LOOK[0], 0); s.shot(CW_CAM[0], CW_LOOK[0], 3200);
    },
    at: {
      2: ctx => { const c = ctx.stage.actors.counselor; if (c) { c.setMode('think'); setTimeout(() => c.setMode('idle'), 1600); } },
      3: (ctx, t, instant) => {
        const s = ctx.stage, m = s.actors.mayaW, c = s.actors.counselor; if (!m) return;
        m.group.visible = true; s.shot(CW_CAM[1], CW_LOOK[1], instant ? 0 : 1600); s.turn(c, -0.3, instant ? 0 : 700);
        if (instant) { m.group.position.set(...CW_MAYA); m.group.rotation.y = 1.6; return; }
        m.group.position.set(-0.6, 0.12, 2.8);
        s.walkPath(m, [[-0.6, 0.12, 2.8], [-2.2, 0.12, 0.2], CW_MAYA], 1.7).then(() => { s.turn(m, 1.6, 400); c.setMode('wave'); setTimeout(() => c.setMode('idle'), 1400); });
      },
      4: ctx => { const m = ctx.stage.actors.mayaW; if (m) { m.setMode('cheer'); setTimeout(() => m.setMode('idle'), 1300); } },
    },
  },
  {
    // How the method works (three pedestals: the framework, the AI, the counselor), then how counselors are supported
    id: 'method', chapter: 'counselor', set: 'void', steps: 2,
    backdrop: '<div class="bd-fog"></div>',
    html: `<div class="me-a"><div class="me-head"><p class="kicker enter">How the method works</p><h2 class="enter d1">Designed by people. Assisted by AI.<br>Reviewed by counselors.</h2></div>
        <div class="me-cols">${ME_STEPS.map(([t, d], i) => `<div class="me-col enter d${i + 2}${i === 2 ? ' hi' : ''}"><span class="n">${i + 1}</span><b>${t}</b><p>${d}</p></div>`).join('')}</div></div>
      <div class="me-b" data-step="1"><p class="kicker">How counselors are supported</p><h2>Three kinds of support.</h2>
        <div class="sp-list">${ME_SUPPORT.map(([t, d], i) => `<div class="sp${i === 1 ? ' academy' : ''}"><span class="sp-n">${i + 1}</span><div><b>${t}</b><p>${d}</p></div></div>`).join('')}</div></div>`,
    async enter(ctx) {
      const s = ctx.stage, [c] = await only(ctx, ['counselor']);
      s._meTok = (s._meTok || 0) + 1; s.cancel('me-shrink'); s.cancel('me-cert');
      const peds = s.pedestals(true); s.methodProps(true); s._peds.forEach(p => p.scale.setScalar(1));
      s.place(c, 'void', [peds[2].x, 0.16, 0], -0.25, 'idle');
      s.shot([0, 1.25, 10.8], [0, 0.95, 0], 0); s.shot([0, 1.15, 10.2], [0, 0.9, 0], 4000);
    },
    at: {
      1: (ctx, t, instant) => {
        const s = ctx.stage, m = s.methodProps(true), c = s.actors.counselor, peds = s._peds, d = instant ? 0 : 1300;
        s.shot([0.95, 1.45, 5.7], [2.35, 1.12, 0], instant ? 0 : 1800);
        const shrink = [m.book, m.orb, m.tube, m.pulse, peds[0], peds[1]];
        const tok = s._meTok;
        s.tween(d || 1, e => shrink.forEach(o => o.scale.setScalar(Math.max(0.001, 1 - e))), 'me-shrink').then(() => { if (s._meTok === tok) shrink.forEach(o => { o.visible = false; }); });
        m.cert.visible = true; m.cert.scale.setScalar(0.001); s.tween(d || 1, e => m.cert.scale.setScalar(0.72 * Math.max(0.001, e)), 'me-cert');
        if (c && !instant) { s.turn(c, -0.6, 700); setTimeout(() => { c.setMode('wave'); setTimeout(() => c.setMode('idle'), 1400); }, 900); } else if (c) c.group.rotation.y = -0.6;
      },
    },
    leave(ctx) { const s = ctx.stage; s._meTok = (s._meTok || 0) + 1; s.methodProps(false); s.pedestals(false); s._peds.forEach(p => p.scale.setScalar(1)); },
  },

  // ===== NEXT STEP =====
  {
    // Questions and school fit: back at the crossroads, the school's chosen path stays lit
    id: 'fit', chapter: 'offer', set: 'crossroads', steps: 1, offset: 0,
    backdrop: '<div class="bd-fog"></div>',
    html: ctx => `<div class="fit-copy"><p class="kicker enter">Questions and school fit</p><h2 class="enter d1">What would need to be true for this to work here?</h2>
        <div class="fit-prio enter d2"><span class="lbl">Your priority</span><div class="fp-row">${PICKS.map(([k, n, title, sub, icon]) => `<button class="fp${ctx.state.priority === k ? ' sel' : ''}" data-prio="${k}"><span class="pk-ic">${icon}</span><span><b>${title}</b><em>${sub}</em></span></button>`).join('')}</div></div>
        <p class="fit-ask enter d3">Have we addressed the need you identified? What remains unresolved about the educational approach, counselor workload or implementation?</p></div>
      <div class="fit-qs enter d2"><div class="fq-head"><span class="lbl">Questions for this school</span><span class="fq-count"><b>0</b> of ${FIT_QS.length} discussed</span></div>
        <ol>${FIT_QS.map((q, i) => `<li><button class="fq" data-q="${i}"><i>${i + 1}</i><span>${q}</span><s class="tick"></s></button></li>`).join('')}</ol>
        <p class="fq-foot">Any open question gets an owner and a response date.</p></div>`,
    async enter(ctx) {
      const s = ctx.stage; await only(ctx, []);
      s.signpost.visible = false; s.choicePads.forEach(c => { c.pad.visible = true; });
      const light = () => s.pickPad(PICKS.findIndex(p => p[0] === ctx.state.priority), 900);
      s.pickPad(PICKS.findIndex(p => p[0] === ctx.state.priority), 0);
      s.shot([0, 3.3, 7.6], [0, 1.1, -4], 0); s.shot([0, 3.0, 6.6], [0, 1.1, -4], 5000);
      ctx.qa('[data-prio]').forEach(b => b.onclick = e => { e.stopPropagation(); ctx.state.priority = b.dataset.prio; ctx.qa('[data-prio]').forEach(x => x.classList.toggle('sel', x === b)); light(); });
      const count = () => { ctx.q('.fq-count b').textContent = ctx.qa('.fq.done').length; };
      ctx.qa('.fq').forEach(b => b.onclick = e => { e.stopPropagation(); b.classList.toggle('done'); count(); });
    },
    leave(ctx) { ctx.stage.signpost.visible = true; },
  },
  {
    // Offer and next step: a price staircase that a cohort of students fills band by band, then the decision
    id: 'offer', chapter: 'offer', set: 'void', steps: 2, offset: 0.235,
    backdrop: '<div class="bd-fog"></div>',
    html: `<div class="of-copy"><p class="kicker enter">Offer and next step</p><h2 class="enter d1">One annual commitment, priced by cohort.</h2>
        <div class="of-card enter d2">
          <div class="of-n"><span class="lbl">Contracted students</span><div><b id="n">200</b><span>students</span></div></div>
          <input type="range" id="r" min="20" max="900" step="10" value="200" aria-label="Contracted students">
          <div class="of-rows" id="rows"></div>
          <div class="of-tot"><div><span class="lbl">Standard annual fee</span><b id="tot">$17,000</b></div><span id="per"></span></div>
          <ul class="of-inc"><li>Standard hosting and maintenance</li><li>Hybrid onboarding and standard support</li><li>A named School Success Contact</li></ul>
          <p class="of-note">Each rate applies only to the students in its band. Any First-Year Partner Waiver is shown separately. External counseling, extra on-site work and bespoke academic work are quoted separately. Taxes and payment terms are confirmed in the quotation.</p>
        </div></div>
      <div class="of-dec" data-step="1"><span class="lbl">Decision requested</span>
        <div class="od-opts">${OF_DEC.map(([t, d]) => `<button class="od" data-dec><b>${t}</b><em>${d}</em></button>`).join('')}</div>
        <div class="od-form"><label>Next action<input id="dAct" placeholder="e.g. send the tailored brief"></label><label>Owner<input id="dOwn" placeholder="Name"></label><label>Date<input id="dDate" type="date"></label></div></div>`,
    async enter(ctx) {
      const s = ctx.stage; await only(ctx, []); s.stairs(true);
      const B = [[100, 90, 'First 100'], [100, 80, '101–200'], [200, 70, '201–400'], [300, 65, '401–700'], [Infinity, 60, '701 onward']];
      const usd = n => '$' + n.toLocaleString('en-US');
      const upd = instant => {
        const n = +ctx.q('#r').value; let left = n, tot = 0; const rows = [];
        B.forEach(([size, rate, name]) => { const k = Math.min(left, size); left -= k; tot += k * rate; if (k) rows.push(`<div><span>${name}${rate === 60 ? ' <em>subject to capacity review</em>' : ''}</span><span>${k} × $${rate}</span><b>${usd(k * rate)}</b></div>`); });
        ctx.q('#n').textContent = n; ctx.q('#tot').textContent = usd(tot); ctx.q('#per').textContent = 'Average $' + (tot / n).toFixed(2) + ' per student per year';
        ctx.q('#rows').innerHTML = rows.join(''); ctx.q('#r').style.setProperty('--p', ((n - 20) / 880 * 100) + '%');
        s.setCohort(n, instant);
      };
      ctx.q('#r').oninput = () => upd(false); ctx.q('#r').onclick = e => e.stopPropagation(); upd(true);
      ctx.qa('[data-dec]').forEach(b => b.onclick = e => { e.stopPropagation(); ctx.qa('[data-dec]').forEach(x => x.classList.toggle('sel', x === b)); ctx.q('.od-form').classList.add('on'); });
      ctx.qa('.od-form input').forEach(i => i.onclick = e => e.stopPropagation());
      s.shot([-4.2, 7.0, 21.8], [0.5, 0.9, 0], 0); s.shot([-3.6, 6.6, 20.4], [0.5, 0.9, 0], 4500);
    },
    at: { 1: (ctx, t, instant) => ctx.stage.shot([-3.6, 6.6, 20.4], [0.5, -0.6, 0], instant ? 0 : 1200) },
    leave(ctx) { ctx.stage.stairs(false); },
  },
  {
    // The end: Maya (graduate look) and her counselor at the real "weguide." gate of WeGuide World, the road
    // leading into town behind them; the gate carries the logo, the slogan sits above
    id: 'end', chapter: 'offer', set: 'town', maya: true, steps: 1,
    backdrop: '<div class="bd-sky"></div>',
    html: `<div class="end-lock"><h1 class="brand-slogan">Your future. <span>With direction.</span></h1>
        <p class="end-line">Explore with purpose. Decide with guidance.</p><p class="brand-sub">A House of Prep platform</p></div>`,
    async enter(ctx, t) {
      const s = ctx.stage, town = await s.buildTown(), [m, c] = await only(ctx, ['mayaG', 'counselor']); if (!ctx.alive(t)) return;
      s.showSet('town'); s.scene.fog = new THREE.Fog('#E4ECF7', 90, 300);
      const k = town.spot.h / 1.6, y = town.spot.pos[1];
      s.place(m, 'town', [8.2, y, 36.5], 0.2, 'wave'); m.group.scale.setScalar(k);                 // just outside the gate
      s.place(c, 'town', [11.8, y, 36.2], -0.2, 'idle'); c.group.scale.setScalar(CAST.counselor[1] * k);
      clearTimeout(s._endT1); clearTimeout(s._endT2);
      s._endT1 = setTimeout(() => c.setMode('wave'), 700); s._endT2 = setTimeout(() => { m.setMode('idle'); c.setMode('idle'); }, 3800);
      s.shot([10, 5.4, 66], [10, 8.3, 30], 0); s.shot([10, 4.6, 57], [10, 8.6, 30], 9000);   // a slow walk up the road towards them
    },
  },
];
for (const sc of SCENES) if (!sc.notes && NOTES[sc.id]) sc.notes = NOTES[sc.id];

// Maya turns gently towards the pointer: a small game-like touch.
function follow(ctx, a, base) {
  const s = ctx.stage, f = dt => { const target = base + s.pointer.x * 0.38; a.group.rotation.y += (target - a.group.rotation.y) * Math.min(1, dt * 2.5); };
  s.updaters.push(f); return f;
}

// slow orbit used by island scenes
function orbit(ctx, t, dist, h, speed = 0.8) {
  stopOrbit(ctx); const s = ctx.stage; let a = 0.7;
  ctx._orbit = (dt) => { a += dt * 0.05 * speed; s.cam.position.set(Math.sin(a) * dist, h, Math.cos(a) * dist); s.look.set(0, 0.6, 0); };
  s.updaters.push(ctx._orbit);
}
function stopOrbit(ctx) { const u = ctx.stage.updaters; if (ctx._orbit) { const i = u.indexOf(ctx._orbit); if (i > -1) u.splice(i, 1); ctx._orbit = null; } }

// ---------- branches (optional detail, from the Master Plan and School Appendix) ----------
export const BRANCHES = {
  counselor: `<p class="kicker">Counselor view</p><h2>A dashboard that shows who needs attention.</h2>
    <p class="lead">Students needing attention, missing preparation, upcoming reviews and overdue actions. A student summary linked to evidence, a simple task queue, report controls and permitted school content.</p>
    <table class="t" style="margin-top:22px"><thead><tr><th>Situation</th><th>Playbook response</th></tr></thead><tbody>
    <tr><td>Student is inactive</td><td>Check access, timing, relevance and confidence; agree one achievable action and follow up.</td></tr>
    <tr><td>Rejects a favoured major</td><td>Explore what changed and record the reasoning. This can show learning.</td></tr>
    <tr><td>Many activities, thin evidence</td><td>Ask for context and reflection. More activity does not automatically mean more readiness.</td></tr>
    <tr><td>Limited access to opportunities</td><td>Offer accessible alternative experiences. Privilege is never treated as readiness.</td></tr>
    <tr><td>AI summary seems unsupported</td><td>Return to the original evidence, correct the interpretation and flag it for review.</td></tr></tbody></table>`,
  academic: `<p class="kicker">Academic approach</p><h2>From experience to guidance.</h2>
    <p class="lead">Activity or experience → student reflection and supporting work → observation in context → comparison across evidence → counselor interpretation → agreed next action → later review.</p>
    <div class="grid g2" style="margin-top:22px">
      ${card('Portfolio', '<p class="small" style="margin:0">Stores experiences, work, reflections and supporting material.</p>')}
      ${card('Living Profile', '<p class="small" style="margin:0">Connects evidence to developing interests, strengths, values and questions.</p>')}
      ${card('Progress report', '<p class="small" style="margin:0">A dated, counselor-issued summary; later reports show change.</p>')}
      ${card('Decision Tower', '<p class="small" style="margin:0">Shows preparation, missing requirements, reports and next actions across three grade levels.</p>')}
    </div>
    <p class="small" style="margin-top:18px">A contribution is evidence to discuss: never a diagnosis, a fixed label or a prediction. Tower progress follows defined requirements and is never an admission probability. Stars reward participation and never change progress. Rama Sleiman leads the learning framework, report criteria and counselor training.</p>`,
  implementation: `<p class="kicker">Implementation</p><h2>Schools shape it. The framework stays consistent.</h2>
    <table class="t" style="margin-top:22px"><thead><tr><th>School can configure</th><th>WeGuide keeps</th></tr></thead><tbody>
    <tr><td>Announcements and school updates</td><td>The core academic framework and learning objectives</td></tr>
    <tr><td>School missions and limited extra modules</td><td>Evidence criteria, report meaning and progress rules</td></tr>
    <tr><td>Assigned counselors and timing</td><td>Permissions, review history and quality controls</td></tr></tbody></table>
    <p class="lead" style="margin-top:22px">Agree the scope → prepare access → train and orient (Counselor Academy, coordinator, student grade videos, parent explanation) → start the journey → review adoption → sustain and renew, with a named School Success Contact throughout.</p>`,
  commercial: `<p class="kicker">Commercial details</p><h2>School Program and Independent Program.</h2>
    <table class="t" style="margin-top:22px"><thead><tr><th>Students in the annual agreement</th><th>Annual price for those students</th></tr></thead><tbody>
    <tr><td>First 100</td><td>$90 each</td></tr><tr><td>101 to 200</td><td>$80 each</td></tr><tr><td>201 to 400</td><td>$70 each</td></tr><tr><td>401 to 700</td><td>$65 each</td></tr><tr><td>701 onward</td><td>$60 each, subject to capacity review</td></tr></tbody></table>
    <p class="small" style="margin-top:12px">Examples: 200 students = $17,000 · 500 = $37,500 · 800 = $56,500. Hosting and maintenance included. On-site extras, bespoke academic work, advanced customisation and external counseling are scoped separately.</p>
    <p class="lead" style="margin-top:18px"><b>WeGuide Independent Program:</b> $199 per student per year, a separate route for families with assigned professional guidance. Session allowances are confirmed before enrollment.</p>`,
};

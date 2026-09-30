'use strict';
/* ===================== DATA ===================== */
const KW = 'Kwang', YU = 'Yul', TT = 'Tti', PI = 'Pi';
const MN = ['', 'Pine', 'Plum', 'Cherry', 'Wisteria', 'Iris', 'Peony', 'Bush Clover', 'Moon', 'Chrysanthemum', 'Maple', 'Paulownia', 'Rain'];
const MC = ['', '#cde8c4', '#f6c9c9', '#fbd3e6', '#d9cdee', '#cbd8f5', '#f2b9c9', '#e8e3b0', '#dcdce8', '#f7e7a1', '#f2c9a5', '#cdb8dc', '#b9d7e6'];
const RN = {hong: 'HONG', cheong: 'CHEONG', cho: 'CHO', rain: 'RAIN'};
const SETS = [['hong', 'Hongdan (red, poetry)', '#e04040'], ['cheong', 'Cheongdan (blue)', '#3f78e8'], ['cho', 'Chodan (red, plain)', '#f08a3a']];
const DEFS = [[1,'K'],[1,'T','hong'],[1,'P'],[1,'P'], [2,'Y',{b:1}],[2,'T','hong'],[2,'P'],[2,'P'], [3,'K'],[3,'T','hong'],[3,'P'],[3,'P'],
  [4,'Y',{b:1}],[4,'T','cho'],[4,'P'],[4,'P'], [5,'Y'],[5,'T','cho'],[5,'P'],[5,'P'], [6,'Y'],[6,'T','cheong'],[6,'P'],[6,'P'],
  [7,'Y'],[7,'T','cho'],[7,'P'],[7,'P'], [8,'K'],[8,'Y',{b:1}],[8,'P'],[8,'P'], [9,'Y',{sp:1}],[9,'T','cheong'],[9,'P'],[9,'P'],
  [10,'Y'],[10,'T','cheong'],[10,'P'],[10,'P'], [11,'K'],[11,'P',{d:1}],[11,'P'],[11,'P'], [12,'K'],[12,'Y'],[12,'T','rain'],[12,'P',{d:1}]];
function makeDeck() {
  return DEFS.map(([m, t, x], i) => {
    const c = {id: 'c' + i, month: m, type: {K: KW, Y: YU, T: TT, P: PI}[t]};
    if (t === 'T') c.rib = x;
    if (x && x.b) c.bird = 1;
    if (x && x.d) c.dbl = 1;
    if (x && x.sp) { c.special = 1; c.dbl = 1; c.countAs = 'pi'; }
    return c;
  });
}
const eff = c => c.special ? (c.countAs === 'yul' ? YU : PI) : c.type;
const piVal = c => c.dbl ? 2 : 1;
const val = c => eff(c) === KW ? (c.month === 12 ? 6 : 8) : eff(c) === YU ? (c.bird ? 6 : 4) : eff(c) === TT ? 3 : piVal(c);
const CARD_INDEX = Object.fromEntries(makeDeck().map(c => [c.id, c]));
if (window.GSArt) GSArt.install(DEFS);
/* Fisher-Yates: unbiased (the old sort(() => Math.random() - .5) is not a fair shuffle) */
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ===================== SCORING ===================== */
function parts(cards) {
  const kw = cards.filter(c => eff(c) === KW), yl = cards.filter(c => eff(c) === YU), tt = cards.filter(c => eff(c) === TT);
  const pn = cards.reduce((n, c) => n + (eff(c) === PI ? piVal(c) : 0), 0);
  const r = {nK: kw.length, nY: yl.length, nT: tt.length, pn, birds: yl.filter(c => c.bird).length, sets: {}, setN: {}};
  r.kw = kw.length === 5 ? 15 : kw.length === 4 ? 4 : kw.length === 3 ? (kw.some(c => c.month === 12) ? 2 : 3) : 0;
  r.godori = r.birds === 3 ? 5 : 0;
  r.yl = yl.length >= 5 ? yl.length - 4 : 0;
  SETS.forEach(([k]) => { r.setN[k] = tt.filter(c => c.rib === k).length; r.sets[k] = r.setN[k] >= 3 ? 3 : 0; });
  r.tt = tt.length >= 5 ? tt.length - 4 : 0;
  r.pi = pn >= 10 ? pn - 9 : 0;
  r.g = {K: r.kw, Y: r.godori + r.yl, T: r.sets.hong + r.sets.cheong + r.sets.cho + r.tt, P: r.pi};
  r.total = r.g.K + r.g.Y + r.g.T + r.g.P;
  return r;
}
function autoSpecial(cards) {
  const sp = cards.find(c => c.special); if (!sp || sp.chosen) return;
  sp.countAs = 'pi'; const a = parts(cards).total;
  sp.countAs = 'yul'; const b = parts(cards).total;
  sp.countAs = b > a ? 'yul' : 'pi';
}

/* ===================== MONEY ===================== */
const POINT_VALUE = 1;
const LS_BANK = 'goStop.bankroll.v1';
function loadBank() { const v = parseFloat(localStorage.getItem(LS_BANK)); return Number.isFinite(v) ? v : 0; }
function saveBank(n) { try { localStorage.setItem(LS_BANK, String(n)); } catch(e){} }
function money(n) { const a = Math.abs(n); const s = Number.isInteger(a) ? a : a.toFixed(2); return (n < 0 ? '-$' : '$') + s; }

/* ===================== SOUND ===================== */
let audioCtx = null, soundOn = true;
function ac() { if (!audioCtx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; audioCtx = new C(); } if (audioCtx.state === 'suspended') audioCtx.resume(); return audioCtx; }
function tone(a, t, f, dur, g, type, to) { const o = a.createOscillator(), gn = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(gn); gn.connect(a.destination); o.start(t); o.stop(t + dur + 0.02); }
function noise(a, t, dur, f, g, type) { const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; const src = a.createBufferSource(), fl = a.createBiquadFilter(), gn = a.createGain(); src.buffer = buf; fl.type = type || 'bandpass'; fl.frequency.value = f; fl.Q.value = .9; gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(.001, t + dur); src.connect(fl); fl.connect(gn); gn.connect(a.destination); src.start(t); }
function sfx(name, skipRelay) {
  if (!skipRelay && window.MP && MP.active && MP.me === 'host') {
    try { MP.send({ t: 'sfx', n: name }); } catch (e) {}
  }
  if (!soundOn) return; const a = ac(); if (!a) return; const t = a.currentTime;
  switch (name) {
    case 'deal': noise(a, t, .06, 2600, .25); break;
    case 'flip': noise(a, t, .08, 1800, .22); break;
    case 'jjok': [880, 1320, 1760].forEach((f,i)=>tone(a, t+i*.07, f, .18, .14, 'triangle')); break;
    case 'ttadak': [660, 880, 990, 1320].forEach((f,i)=>tone(a, t+i*.06, f, .16, .13, 'square')); break;
    case 'ppeok': tone(a, t, 440, .25, .16, 'sawtooth', 880); break;
    case 'ppeokCleared': [220, 440, 660].forEach((f,i)=>tone(a, t+i*.08, f, .2, .15)); break;
    case 'sweep': [523, 659, 784, 1046].forEach((f,i)=>tone(a, t+i*.07, f, .22, .14)); break;
    case 'godori': [660, 880, 1100, 1320].forEach((f,i)=>tone(a, t+i*.09, f, .28, .15)); break;
    case 'set': [784, 1046].forEach((f,i)=>tone(a, t+i*.1, f, .25, .14)); break;
    case 'go': tone(a, t, 523, .22, .16, 'triangle', 784); break;
    case 'stahp': [880, 660].forEach((f,i)=>tone(a, t+i*.12, f, .2, .15)); break;
    case 'win': [660, 880, 1320].forEach((f,i)=>tone(a, t+i*.1, f, .35, .16)); break;
    case 'lose': tone(a, t, 240, .4, .18, 'triangle', 120); break;
    case 'bank': tone(a, t, 1400, .05, .12, 'triangle', 800); break;
    case 'steal': tone(a, t, 880, .12, .14, 'triangle', 1320); tone(a, t + .12, 1320, .2, .13); break;
    case 'four': [660, 880, 1100, 1320, 1760].forEach((f,i)=>tone(a, t+i*.07, f, .22, .14, 'triangle')); break;
    case 'sseop': [523, 659, 784, 1046, 1320].forEach((f,i)=>tone(a, t+i*.06, f, .24, .15, 'triangle')); break;
    case 'shake': [523, 523, 784, 784, 1046].forEach((f,i)=>tone(a, t+i*.09, f, .18, .16, 'square')); break;
  }
}
window.gsPlaySfx = function (name) { sfx(name, true); };

/* ===================== STATE ===================== */
let state = null, bankroll = loadBank();
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const other = w => w === 'p' ? 'c' : 'p';
const mySeat  = () => (window.MP && MP.active && MP.me === 'guest') ? 'c' : 'p';
const oppSeat = () => other(mySeat());
function nameOf(w) {
  const mp = window.MP && MP.active;
  if (!mp) return w === 'p' ? 'YOU' : 'CPU';
  const me = MP.me === 'guest' ? 'c' : 'p';
  if (w === me) return 'YOU';
  return MP.me === 'host' ? 'FRIEND' : 'HOST';
}
function recalc() { ['p', 'c'].forEach(w => { autoSpecial(state[w].cap); state[w].pt = parts(state[w].cap); state[w].score = state[w].pt.total; }); }
function updBank(delta) { bankroll += delta * POINT_VALUE; saveBank(bankroll); paintBank(); }
function paintBank() {
  const el = $('bank'); if (!el) return;
  const wrap = el.closest('.money');
  const isGuest = window.MP && MP.active && MP.me === 'guest';
  if (wrap) wrap.style.display = isGuest ? 'none' : '';
  if (isGuest) return;
  el.textContent = money(bankroll); el.classList.toggle('neg', bankroll < 0);
}

function newGame() {
  if (window.MP && MP.active && MP.me === 'guest') { MP.send({ t: 'new' }); return; }
  let deck, bad;
  do {
    deck = shuffle(makeDeck());
    const cnt = a => { const m = {}; a.forEach(c => m[c.month] = (m[c.month] || 0) + 1); return Object.values(m).some(n => n >= 4); };
    bad = cnt(deck.slice(0, 10)) || cnt(deck.slice(10, 20)) || cnt(deck.slice(20, 28));
  } while (bad);
  const sort = a => a.sort((x, y) => x.month - y.month || val(y) - val(x));
  const first = Math.random() < 0.5 ? 'p' : 'c';
  state = {
    p: {hand: sort(deck.slice(0, 10)), cap: [], go: 0, goScore: 0, score: 0, shakes: 0, shakeMonths: []},
    c: {hand: sort(deck.slice(10, 20)), cap: [], go: 0, goScore: 0, score: 0, shakes: 0, shakeMonths: []},
    table: deck.slice(20, 28), deck: deck.slice(28),
    turn: first, busy: true, over: false,
    msg: `${nameOf(first)} GOES FIRST`,
    picking: null, pickRes: null, pending: null, ppeok: new Set(), fourDone: new Set(),
    result: null, bankDelta: 0
  };
  recalc(); closeModal(); paintBank(); render(); broadcast();
  setTimeout(() => runShakePhase(() => beginPlay()), 500);
}

/* ===================== 흔들기 (SHAKE) ===================== */
function findShakes(who) {
  if (!state) return [];
  const byMonth = {};
  state[who].hand.forEach(c => { (byMonth[c.month] = byMonth[c.month] || []).push(c); });
  return Object.keys(byMonth).filter(m => byMonth[m].length === 3).map(m => +m);
}
function runShakePhase(done) {
  const pMonths = findShakes('p');
  const cMonths = findShakes('c');
  if (cMonths.length) {
    state.c.shakes = cMonths.length;
    state.c.shakeMonths = cMonths;
    sfx('shake');
    state.msg = `${nameOf('c')} SHAKES x${cMonths.length}! (${cMonths.map(m => MN[m]).join(', ')})`;
    render(); broadcast();
  }
  const shouldPromptHostP = (pMonths.length > 0) && (!window.MP || !MP.active || MP.me === 'host');
  if (shouldPromptHostP) {
    showShakeModal(pMonths, (accepted) => {
      if (accepted) {
        state.p.shakes = pMonths.length;
        state.p.shakeMonths = pMonths;
        sfx('shake');
        state.msg = `YOU SHAKE x${pMonths.length}! (${pMonths.map(m => MN[m]).join(', ')})`;
      }
      render(); broadcast();
      done();
    });
    return;
  }
  done();
}
function showShakeModal(months, callback) {
  const monthNames = months.map(m => MN[m]).join(' · ');
  const mult = Math.pow(2, months.length);
  showModal(
    `<h2>흔들기 (SHAKE)?</h2>
     <p>You were dealt <b>3 of ${monthNames}</b>.</p>
     <p>Shake to multiply your winnings by <b>×${mult}</b> if you win this round.</p>
     <p style="color:#8bd6a8">You still play those cards however and whenever you want.</p>
     <div class="row">
       <button class="btn go" id="shakeYes">SHAKE ×${mult}</button>
       <button class="btn" id="shakeNo">SKIP</button>
     </div>`, false);
  setTimeout(() => {
    const yes = $('shakeYes'), no =$('shakeNo');
    if (yes) yes.onclick = () => { closeModal(); callback(true); };
    if (no) no.onclick = () => { closeModal(); callback(false); };
  }, 0);
}

function beginPlay() {
  state.busy = false;
  state.msg = state.msg || (state.turn === mySeat() ? 'YOUR TURN' : '');
  render(); broadcast();
  if (state.turn === 'c') {
    if (window.MP && MP.active) {
      state.msg = 'FRIEND IS PLAYING...'; render(); broadcast();
    } else {
      setTimeout(cpuPlay, 750);
    }
  }
}

/* ===================== RENDER ===================== */
function cardHTML(c, extra = '') {
  const e = eff(c); let tg, rib = '';
  if (e === KW) tg = `<i class="tg kw"><svg class="ic"><use href="#sun"/></svg><b>${c.month === 12 ? 'RAIN KWANG' : 'KWANG'}</b></i>`;
  else if (e === YU) tg = `<i class="tg yl">${c.bird ? '<svg class="ic"><use href="#bird"/></svg>' : ''}<b>${c.bird ? 'BIRD' : 'YUL'}</b></i>`;
  else if (e === TT) { tg = `<i class="tg ${c.rib}"><b>${RN[c.rib]}</b></i>`; }
  else tg = `<i class="tg${c.dbl ? ' pi2' : ''}"><b>${c.dbl ? 'PI x2' : 'PI'}</b></i>`;
  return `<div class="card t-${e} ${extra}" title="${MN[c.month]}"><b class="mo">${c.month}</b><svg class="face"><use href="#card-${c.id}"/></svg>${tg}</div>`;
}
function sortGroup(t, cards) {
  const k = c => t === TT ? [SETS.findIndex(s => s[0] === c.rib) < 0 ? 9 : SETS.findIndex(s => s[0] === c.rib)] : t === YU ? [c.bird ? 0 : 1] : t === PI ? [c.dbl ? 0 : 1] : [c.month === 12 ? 1 : 0];
  return cards.slice().sort((a, b) => k(a)[0] - k(b)[0] || a.month - b.month);
}
function capturedHTML(w) {
  const cap = state[w].cap;
  if (!cap.length) return '';
  const order = [KW, YU, TT, PI];
  let out = '';
  order.forEach((t, gi) => {
    const g = cap.filter(c => eff(c) === t);
    if (!g.length) return;
    if (gi > 0) out += '<div class="grp-sep"></div>';
    sortGroup(t, g).forEach(c => {
      out += `<div class="wrap" data-w="${w}" data-t="${t}" title="Click to view ${t} group">${cardHTML(c)}</div>`;
    });
  });
  return out;
}
function render() {
  $('deckN').textContent = state.deck.length;
  const me = mySeat(), opp = oppSeat();
  const can = state.turn === me && !state.busy && !state.over && !state.pending;
  
  let msgText = state.msg || (state.turn === me ? 'YOUR TURN - PICK A CARD' 
      : (window.MP && MP.active ? 'FRIEND IS PLAYING...' : 'CPU IS PLAYING...'));

  const deckEl = $('deck');
  if (can && state[me].hand.length === 0 && state.deck.length > 0) {
    if (!state.msg) msgText = 'YOUR HAND IS EMPTY - TAP THE DECK TO FLIP';
    if (deckEl) {
      deckEl.style.outline = '3px solid #f5c542';
      deckEl.style.outlineOffset = '2px';
      deckEl.style.cursor = 'pointer';
      deckEl.style.transform = 'translateY(-8px)';
    }
  } else if (deckEl && state.over) {
    deckEl.style.outline = '2px dashed #f5c542'; deckEl.style.outlineOffset = '2px'; deckEl.style.cursor = 'pointer'; deckEl.style.transform = '';
    deckEl.title = 'Tap to see the cards left in the deck';
  } else if (deckEl) {
    deckEl.title = '';
    deckEl.style.outline = '';
    deckEl.style.outlineOffset = '';
    deckEl.style.cursor = '';
    deckEl.style.transform = '';
  }

  if (state.picking && !state.over) msgText = state.turn === me ? 'TWO MATCHES - TAP THE CARD YOU WANT' : 'FRIEND IS CHOOSING A MATCH...';
  $('msg').textContent = state.over
    ? `GAME OVER - YOU ${state[me].score} : ${state[opp].score} ${nameOf(opp)}`
    : msgText;

  $('myHand').innerHTML = state[me].hand.map((c, i) =>
    `<div class="wrap" id="mh-${c.id}" data-i="${i}">${cardHTML(c, can ? 'can' : '')}${can && state.table.some(t => t.month === c.month) ? '<span class="hit">&#10003;</span>' : ''}</div>`
  ).join('');

  $('cpuHand').innerHTML = state[opp].hand.map(c => `<div id="oh-${c.id}"><div class="card back"></div></div>`).join('');

  const months = [...new Set(state.table.map(c => c.month))].sort((a, b) => a - b);
  $('tableCards').innerHTML = months.map(m => {
    const g = state.table.filter(c => c.month === m), pk = state.picking && g.some(c => state.picking.includes(c.id));
    return `<div class="stack${g.length > 1 ? ' pair' : ''}${pk ? ' open' : ''}">${state.ppeok.has(m) && g.length === 3 ? '<span class="flag">PPEOK</span>' : ''}` +
      g.map(c => `<div id="tb-${c.id}" data-id="${c.id}">${cardHTML(c, state.picking && state.picking.includes(c.id) ? 'pick' : '')}</div>`).join('') + '</div>';
  }).join('');

  $('myCaptured').innerHTML = capturedHTML(me);
  $('cpuCaptured').innerHTML = capturedHTML(opp);$('pScore').textContent = state[me].score;
  $('cScore').textContent = state[opp].score;
  const oppLabel = $('oppLabel');
  if (oppLabel) {
    let label = nameOf(opp);
    if (state[opp].shakes) label += ' 🀄×' + state[opp].shakes;
    oppLabel.textContent = label;
  }
  paintBank();
  fitLayout();
}

/* ===================== RESPONSIVE FIT ===================== */
/* Keeps every card visible on any screen: rows of cards (hands, captured) are
   squeezed by overlapping, and the board cards are sized to the largest size
   that still fits the space left over. */
function fitRow(el, prefStep) {
  if (!el) return;
  el.style.removeProperty('--ov');
  const card = el.querySelector('.card'); if (!card) return;
  const cw = card.getBoundingClientRect().width; if (!cw) return;
  const wraps = [...el.children].filter(k => !k.classList.contains('grp-sep'));
  const seps = [...el.children].filter(k => k.classList.contains('grp-sep'));
  const n = wraps.length, gaps = n - 1 - seps.length;   // overlapping neighbours
  if (gaps < 1) return;
  const cs = getComputedStyle(el);
  const avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2;
  const sepW = seps.reduce((a, x) => { const c = getComputedStyle(x); return a + x.offsetWidth + parseFloat(c.marginLeft) + parseFloat(c.marginRight); }, 0);
  const pref = prefStep(cw);
  const need = n * cw + sepW - (cw - pref) * gaps;      // width at preferred spacing
  let step = pref;
  if (need > avail) step = cw - (n * cw + sepW - avail) / gaps;
  step = Math.max(step, Math.min(pref, 6));            // never collapse fully
  el.style.setProperty('--ov', (step - cw).toFixed(1) + 'px');
}
function fitTable() {
  const table = document.querySelector('.table'), t = $('tableCards');
  if (!table || !t) return;
  const fits = () => t.scrollHeight <= t.clientHeight + 1 && t.scrollWidth <= t.clientWidth + 1;
  let lo = 22, hi = 92, best = lo;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    table.style.setProperty('--tcw', mid + 'px');
    if (fits()) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  table.style.setProperty('--tcw', best + 'px');
}
let fitBusy = false;
function fitLayout() {
  if (fitBusy) return; fitBusy = true;
  try {
    fitRow($('myHand'), cw => cw + 6);
    fitRow($('cpuHand'), cw => cw * .45);
    fitRow($('myCaptured'), cw => cw * .65);
    fitRow($('cpuCaptured'), cw => cw * .65);
    fitTable();
  } finally { fitBusy = false; }
}
let fitRaf = 0;
const queueFit = () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitLayout); };
window.addEventListener('resize', queueFit);
window.addEventListener('orientationchange', () => setTimeout(queueFit, 250));
if (window.visualViewport) window.visualViewport.addEventListener('resize', queueFit);
if (window.ResizeObserver) new ResizeObserver(queueFit).observe(document.querySelector('.center'));

$('myHand').onclick = e => {   const w = e.target.closest('.wrap'); if (!w) return;   humanPlay(+w.dataset.i); };$('tableCards').onclick = e => {
  const d = e.target.closest('[data-id]');
  if (!d || !state.picking || !state.picking.includes(d.dataset.id)) return;
  if (state.turn !== mySeat()) return;
  if (window.MP && MP.active && MP.me === 'guest') {
    MP.send({ t: 'pick', id: d.dataset.id });
    state.picking = null; render();
    return;
  }
  const c = state.table.find(x => x.id === d.dataset.id), r = state.pickRes;
  state.picking = null; state.pickRes = null; state.msg = ''; render(); r(c);
  broadcast();
};
$('deck').onclick = () => {
  if (state && state.over) { openDeck(); return; }
  const me = mySeat();
  if (state && state.turn === me && !state.busy && !state.over && !state.pending && state[me].hand.length === 0) {
    humanPlay(null);
  }
};
$('myCaptured').onclick = e => {
  const w = e.target.closest('.wrap'); if (!w) return;
  openGroup(mySeat(), w.dataset.t);
};
$('cpuCaptured').onclick = e => {
  const w = e.target.closest('.wrap'); if (!w) return;
  openGroup(oppSeat(), w.dataset.t);
};
$('scMe').onclick = () => openPlayerCards(mySeat());
$('scOpp').onclick = () => openPlayerCards(oppSeat());$('btnNew').onclick = newGame;
$('btnMyCards').onclick = () => openMyCards();

/* ===================== ANIMATION ===================== */
const rect = id => { const e = $(id); return e && e.getBoundingClientRect(); };
async function fly(card, from, to) {
  if (!from || !to || !document.body.animate) return;
  const g = document.createElement('div'); g.className = 'ghost'; g.innerHTML = cardHTML(card);
  g.style.left = from.left + 'px'; g.style.top = from.top + 'px'; document.body.appendChild(g);
  await g.animate([{transform: 'translate(0,0)'}, {transform: `translate(${to.left - from.left}px,${to.top - from.top}px)`}], {duration: 320, easing: 'ease-out'}).finished;
  g.remove();
}
async function land(card, from) {
  const el = $('tb-' + card.id); if (!el) return;
  el.style.visibility = 'hidden'; await fly(card, from, el.getBoundingClientRect()); el.style.visibility = '';
}
function pick(options) {
  return new Promise(res => {
    state.picking = options.map(c => c.id);
    state.pickRes = res;
    state.msg = 'TWO MATCHES - TAP THE CARD YOU WANT';
    render(); broadcast();
  });
}
window.gsResolvePick = function (cardId) {
  if (!state || state.turn !== 'c' || !state.picking || !state.picking.includes(cardId) || !state.pickRes) return;
  const c = state.table.find(x => x.id === cardId);
  const r = state.pickRes;
  state.picking = null; state.pickRes = null; state.msg = '';
  render(); broadcast();
  r(c);
};

/* ===================== STEAL ANIMATION ===================== */
async function playStealAnim(who, card) {
  const isLocal = who === mySeat();
  const srcEl = isLocal ? $('cpuCaptured') :$('myCaptured');
  const dstEl = isLocal ? $('myCaptured') :$('cpuCaptured');
  if (!srcEl || !dstEl) return;
  srcEl.classList.remove('pi-steal-src'); void srcEl.offsetWidth; srcEl.classList.add('pi-steal-src');
  setTimeout(() => srcEl.classList.remove('pi-steal-src'), 900);
  if (document.body.animate) {
    const src = srcEl.getBoundingClientRect();
    const dst = dstEl.getBoundingClientRect();
    const g = document.createElement('div');
    g.className = 'ghost';
    g.innerHTML = cardHTML(card);
    g.style.left = (src.left + src.width / 2 - 30) + 'px';
    g.style.top = (src.top + src.height / 2 - 45) + 'px';
    document.body.appendChild(g);
    try {
      await g.animate([
        { transform: 'scale(0.6)', opacity: 0.3 },
        { transform: 'scale(1.15)', opacity: 1, offset: 0.25 },
        { transform: `translate(${dst.left - src.left + (dst.width - src.width) / 2}px,${dst.top - src.top + (dst.height - src.height) / 2}px) scale(0.9)`, opacity: 0.85 }
      ], { duration: 750, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }).finished;
    } catch (e) {}
    g.remove();
  }
  dstEl.classList.remove('pi-steal-dst'); void dstEl.offsetWidth; dstEl.classList.add('pi-steal-dst');
  setTimeout(() => dstEl.classList.remove('pi-steal-dst'), 900);
}
window.gsStealAnim = function (who, cardId) {
  const card = CARD_INDEX[cardId];
  if (card) playStealAnim(who, card);
};

async function stealWithAnim(who) {
  const me = state[who], foe = state[other(who)];
  let idx = foe.cap.findIndex(c => eff(c) === PI && !c.dbl);
  if (idx < 0) idx = foe.cap.findIndex(c => eff(c) === PI);
  if (idx < 0) return null;

  const card = foe.cap[idx];
  sfx('steal');
  if (window.MP && MP.active && MP.me === 'host') {
    try { MP.send({ t: 'stealAnim', w: who, c: card.id }); } catch (e) {}
  }
  await playStealAnim(who, card);

  foe.cap.splice(idx, 1);
  me.cap.push(card);
  recalc();
  render(); broadcast();
  await sleep(200);
  return card;
}

/* ===================== 폭탄 (BOMB) ===================== */
function findSseop(who) {
  if (!state) return null;
  const me = state[who];
  const byMonth = {};
  me.hand.forEach(c => { (byMonth[c.month] = byMonth[c.month] || []).push(c); });
  for (const m in byMonth) {
    if (byMonth[m].length === 3) {
      const t = state.table.find(tc => tc.month === +m);
      if (t) return { month: +m, handCards: byMonth[m].slice(0, 3), tableCard: t };
    }
  }
  return null;
}
function sseopForCard(who, card) {
  const s = findSseop(who);
  if (!s) return null;
  if (s.month !== card.month) return null;
  if (!s.handCards.some(c => c.id === card.id)) return null;
  return s;
}
window.gsHasSseop = function (who) { return !!findSseop(who); };

function showSseopModal(month, callback) {
  showModal(
    `<h2>폭탄 (BOMB)?</h2>
     <p>You can play all 3 <b>${MN[month]}</b> cards at once to complete the set and steal 1 pi from your opponent.</p>
     <p style="color:#8bd6a8">Or play just 1 card normally and keep the other 2 in hand.</p>
     <div class="row">
       <button class="btn go" id="sseopYes">폭탄 (PLAY 3)</button>
       <button class="btn" id="sseopNo">PLAY 1</button>
     </div>`, false);
  setTimeout(() => {
    const y = $('sseopYes'), n =$('sseopNo');
    if (y) y.onclick = () => { closeModal(); callback(true); };
    if (n) n.onclick = () => { closeModal(); callback(false); };
  }, 0);
}

async function playSseop(who, sseop, before) {
  const me = state[who];
  const tags = [`폭탄! 4-of-M${sseop.month}`];

  const srcRects = sseop.handCards.map(c => rect((who === mySeat() ? 'mh-' : 'oh-') + c.id));
  const tableRect = rect('tb-' + sseop.tableCard.id);

  sseop.handCards.forEach(c => {
    const i = me.hand.findIndex(h => h.id === c.id);
    if (i >= 0) me.hand.splice(i, 1);
  });
  render(); broadcast();

  sfx('sseop');
  if (window.MP && MP.active && MP.me === 'host') {
    sseop.handCards.forEach(c => {
      const idx = sseop.handCards.indexOf(c);
      const srcRect = srcRects[idx];
      if (srcRect) MP.send({ t: 'fly', c: c.id, dst: 'tb-' + sseop.tableCard.id, src: { left: srcRect.left, top: srcRect.top, width: srcRect.width, height: srcRect.height } });
    });
  }
  for (let i = 0; i < sseop.handCards.length; i++) {
    if (srcRects[i] && tableRect) await fly(sseop.handCards[i], srcRects[i], tableRect);
    sfx('deal');
  }

  me.cap.push(...sseop.handCards, sseop.tableCard);
  state.table = state.table.filter(c => c.id !== sseop.tableCard.id);
  state.fourDone.add(who + '-' + sseop.month);
  recalc();
  await chooseCup(who);
  render(); broadcast();
  await sleep(400);

  sfx('four');
  const stolen = await stealWithAnim(who);
  if (stolen) tags.push('+1 PI');

  state.msg = `${nameOf(who)}: ${tags.join(' · ')}`;
  render(); broadcast();
  await sleep(700);

  if (!state.p.hand.length && !state.c.hand.length && !state.deck.length) {
    if (me.score >= 7 && me.score > before) finish(who, `${nameOf(who)} REACHED ${me.score} ON THE LAST TURN.`);
    else exhaust();
    return;
  }
  if (me.score >= 7 && me.score > before) { offerGoStop(who); return; }
  pass(who);
}

/* ===================== TURN ===================== */
function humanPlay(i) {
  if (state.turn !== mySeat() || state.busy || state.over || state.pending) return;
  const me = mySeat();

  if (i === null) {
    if (window.MP && MP.active && MP.me === 'guest') {
      MP.send({ t: 'play', idx: null });
      return;
    }
    playTurn(me, null);
    return;
  }

  const clicked = state[me].hand[i];
  if (!clicked) return;

  const sseop = sseopForCard(me, clicked);
  if (sseop) {
    showSseopModal(clicked.month, (accepted) => {
      if (window.MP && MP.active && MP.me === 'guest') {
        if (accepted) MP.send({ t: 'sseop', month: clicked.month });
        else MP.send({ t: 'play', idx: i });
        return;
      }
      if (accepted) playTurn(me, i, { forceSseop: true });
      else playTurn(me, i);
    });
    return;
  }

  if (window.MP && MP.active && MP.me === 'guest') {
    MP.send({ t: 'play', idx: i });
    return;
  }
  playTurn(me, i);
}

function sfxForTags(tags) {
  const flat = tags.join(' ');
  if (/TTADAK/.test(flat)) sfx('ttadak');
  else if (/JJOK/.test(flat)) sfx('jjok');
  if (/PPEOK!/.test(flat)) sfx('ppeok');
  if (/PPEOK CLEARED/.test(flat)) sfx('ppeokCleared');
  if (/SWEEP/.test(flat)) sfx('sweep');
}

async function playTurn(who, idx, opts) {
  if (state.busy || state.over) return;
  const me = state[who], before = me.score;

  if (opts && opts.forceSseop) {
    const sseop = findSseop(who);
    if (sseop) {
      state.busy = true; state.msg = '';
      await playSseop(who, sseop, before);
      return;
    }
  }

  state.busy = true; state.msg = '';
  const tags = [], cap = [];
  let steals = 0;

  let H = null, from = null, chosen = null;
  if (idx !== null && idx !== undefined && me.hand.length > 0) {
    H = me.hand.splice(idx, 1)[0];
    from = rect((who === mySeat() ? 'mh-' : 'oh-') + H.id);
  }

  render(); broadcast();
  const same = m => state.table.filter(c => c.month === m);
  const take = cs => { cs.forEach(c => { state.table = state.table.filter(t => t.id !== c.id); }); cap.push(...cs); };
  const remoteC = who === 'c' && window.MP && MP.active && MP.me === 'host';
  const choose = async opts => (who === mySeat() || remoteC) ? await pick(opts) : opts.slice().sort((a, b) => val(b) - val(a))[0];

  if (H) {
    const k = same(H.month).length;
    state.table.push(H); render(); broadcast();
    netFly(from, 'tb-' + H.id, H);
    await land(H, from); sfx('deal');
    chosen = k === 2 ? await choose(same(H.month).filter(c => c.id !== H.id)) : null;
  }

  await sleep(220);
  const S = state.deck.pop();
  if (S) {
    render(); broadcast();
    const df = rect('deck');
    state.table.push(S); render(); broadcast();
    netFly(df, 'tb-' + S.id, S);
    await land(S, df); sfx('flip');
  }

  const settle = async (X, pre) => {
    if (!X) return;
    const g = same(X.month), n = g.length - 1;
    if (n === 1) { take(g); render(); broadcast(); }
    else if (n === 2) { take([X, pre || await choose(g.filter(c => c.id !== X.id))]); render(); broadcast(); }
    else if (n === 3) { take(g); if (state.ppeok.delete(X.month)) { tags.push('PPEOK CLEARED!'); } render(); broadcast(); }
  };

  if (H && S && S.month === H.month) {
    const g = same(H.month);
    if (g.length === 2) { take(g); steals++; tags.push('JJOK!'); }
    else if (g.length === 3) { state.ppeok.add(H.month); tags.push('PPEOK!'); }
    else if (g.length === 4) { take(g); tags.push('TTADAK!'); }
  } else {
    if (H) await settle(H, chosen);
    if (S) await settle(S);
  }
  
  if (cap.length && !state.table.length && (state.p.hand.length || state.c.hand.length || state.deck.length)) { steals++; tags.push('SWEEP!'); }

  const beforePt = me.pt;
  me.cap.push(...cap);
  recalc();
  await chooseCup(who);
  const afterPt = me.pt;

  const fourMonths = [];
  for (let m = 1; m <= 12; m++) {
    const key = who + '-' + m;
    if (state.fourDone.has(key)) continue;
    if (me.cap.filter(c => c.month === m).length === 4) {
      state.fourDone.add(key);
      fourMonths.push(m);
    }
  }

  if (who === mySeat()) {
    if (beforePt.birds < 3 && afterPt.birds === 3) sfx('godori');
    ['hong','cheong','cho'].forEach(k2 => { if (beforePt.setN[k2] < 3 && afterPt.setN[k2] === 3) sfx('set'); });
    if (beforePt.nK < 3 && afterPt.nK >= 3) sfx('set');
  }
  sfxForTags(tags);

  for (let i = 0; i < steals; i++) {
    const stolen = await stealWithAnim(who);
    if (stolen) tags.push('+1 PI');
  }
  if (fourMonths.length) sfx('four');
  for (const m of fourMonths) {
    const stolen = await stealWithAnim(who);
    if (stolen) tags.push(`+1 PI (4-of-M${m})`);
  }

  state.msg = tags.length ? `${nameOf(who)}: ${tags.join(' · ')}` : '';
  render(); broadcast();
  const flashEl = who === mySeat() ? $('myCaptured') :$('cpuCaptured');
  if (cap.length && flashEl) { flashEl.classList.add('flash'); setTimeout(() => flashEl.classList.remove('flash'), 950); }
  await sleep(cap.length ? 600 : 250);

  if (!state.p.hand.length && !state.c.hand.length && !state.deck.length) {
    if (me.score >= 7 && me.score > before) finish(who, `${nameOf(who)} REACHED ${me.score} ON THE LAST TURN.`);
    else exhaust();
    return;
  }
  const goFloor = me.go > 0 ? me.goScore : 0;
  if (me.score >= 7 && me.score > goFloor) { offerGoStop(who); return; }
  pass(who);
}

function pass(w) {
  state.turn = other(w); state.busy = false; state.pending = null; render(); broadcast();
  if (state.turn === 'c') {
    if (window.MP && MP.active) {
      state.msg = 'FRIEND IS PLAYING...'; render(); broadcast();
    } else {
      setTimeout(() => {
        if (!state || state.over || state.busy || state.turn !== 'c') return;
        cpuPlay();
      }, 750);
    }
  }
}

function cpuPlay() {
  if (state.over || state.turn !== 'c') return;
  if (window.MP && MP.active) return;
  
  const sseop = findSseop('c');
  if (sseop) { playTurn('c', 0, { forceSseop: true }); return; }
  
  if (state.c.hand.length === 0) {
    playTurn('c', null);
    return;
  }

  let best = 0, bv = -1e9;
  state.c.hand.forEach((c, i) => {
    const g = state.table.filter(t => t.month === c.month);
    const v = g.length === 3 ? 100 : g.length ? 10 + Math.max(...g.map(val)) + val(c) : -val(c);
    if (v > bv) { bv = v; best = i; }
  });
  playTurn('c', best);
}
window.gsPlayRemote = function (idx) {
  if (!state || state.busy || state.over || state.pending) return;
  if (state.turn !== 'c') return;
  if (idx === null ? state.c.hand.length > 0 : (!Number.isInteger(idx) || idx < 0 || idx >= state.c.hand.length)) return;
  playTurn('c', idx);
};
window.gsSseopRemote = function (month) {
  if (!state || state.busy || state.over || state.pending) return;
  if (state.turn !== 'c') return;
  const sseop = findSseop('c');
  if (!sseop || sseop.month !== month) return;
  playTurn('c', 0, { forceSseop: true });
};
window.gsIsBusy = function () { return !state || state.busy || state.over || state.pending; };
window.gsTakeSnapshot = function () {
  if (!state) return null;
  return {
    p: {hand: state.p.hand.map(cid), cap: state.p.cap.map(cid), go: state.p.go, goScore: state.p.goScore, score: state.p.score, shakes: state.p.shakes || 0, shakeMonths: state.p.shakeMonths || []},
    c: {hand: state.c.hand.map(cid), cap: state.c.cap.map(cid), go: state.c.go, goScore: state.c.goScore, score: state.c.score, shakes: state.c.shakes || 0, shakeMonths: state.c.shakeMonths || []},
    table: state.table.map(cid), deck: state.deck.map(cid),
    turn: state.turn, over: state.over, busy: !!state.busy, msg: state.msg,
    picking: state.picking ? state.picking.slice() : null,
    fourDone: Array.from(state.fourDone),
    cup: (c => c ? {as: c.countAs, chosen: !!c.chosen} : null)(findCup()),
    result: state.result ? {w: state.result.w, why: state.result.why, res: state.result.res} : null,
    bankDelta: state.bankDelta || 0
  };
};
function cid(c) { return c.id; }
function findCup() {
  if (!state) return null;
  return [].concat(state.p.hand, state.p.cap, state.c.hand, state.c.cap, state.table, state.deck).find(c => c.special) || null;
}
/* ===== September cup: pick Double Pi or Yul once, then it is locked ===== */
let cupRes = null;
function cupScores(w) {
  const cup = state[w].cap.find(c => c.special), keep = cup.countAs;
  cup.countAs = 'pi'; const a = parts(state[w].cap).total;
  cup.countAs = 'yul'; const b = parts(state[w].cap).total;
  cup.countAs = keep; return [a, b];
}
function showCupModal(done) {
  const [a, b] = cupScores(mySeat());
  showModal(`<h2>SEPTEMBER CUP</h2>
    <p>Count this card as a <b>Double Pi</b> or as a <b>Yul</b>?</p>
    <p style="color:#8bd6a8">Your score would be <b>${a}</b> as Double Pi, or <b>${b}</b> as Yul.</p>
    <p style="color:#ff8b8b">This choice is final - you can't change it later.</p>
    <div class="row"><button class="btn go" id="cupPi">DOUBLE PI (${a})</button><button class="btn go" id="cupYul">YUL (${b})</button></div>`, false);
  setTimeout(() => {
    $('cupPi').onclick = () => { closeModal(); done('pi'); };
    $('cupYul').onclick = () => { closeModal(); done('yul'); };
  }, 0);
}
async function chooseCup(who) {
  const cup = state[who].cap.find(c => c.special && !c.chosen);
  if (!cup) return;
  let pick;
  if (who === mySeat()) pick = await new Promise(res => showCupModal(res));
  else if (window.MP && MP.active && MP.me === 'host') {
    state.msg = 'FRIEND IS CHOOSING HOW TO COUNT THE CUP...'; render(); broadcast();
    MP.send({ t: 'cup' });
    pick = await new Promise(res => { cupRes = res; });
  } else {
    const [a, b] = cupScores(who); pick = b > a ? 'yul' : 'pi';
  }
  cup.countAs = pick; cup.chosen = true;
  state.msg = ''; recalc(); render(); broadcast();
}
window.gsCupRemote = v => { if (cupRes && (v === 'pi' || v === 'yul')) { const r = cupRes; cupRes = null; r(v); } };
window.gsAskCup = () => showCupModal(v => MP.send({ t: 'cupPick', v }));
let resultShown = false;
function fromSnap(snap) {
  const all = {}; makeDeck().forEach(c => all[c.id] = c);
  const get = id => all[id];
  state = {
    p: {hand: snap.p.hand.map(get), cap: snap.p.cap.map(get), go: snap.p.go, goScore: snap.p.goScore || 0, score: snap.p.score, shakes: snap.p.shakes || 0, shakeMonths: snap.p.shakeMonths || []},
    c: {hand: snap.c.hand.map(get), cap: snap.c.cap.map(get), go: snap.c.go, goScore: snap.c.goScore || 0, score: snap.c.score, shakes: snap.c.shakes || 0, shakeMonths: snap.c.shakeMonths || []},
    table: snap.table.map(get), deck: snap.deck.map(get),
    turn: snap.turn, busy: !!snap.busy, over: snap.over, msg: snap.msg,
    picking: snap.picking ? snap.picking.slice() : null,
    pickRes: null, pending: null, ppeok: new Set(),
    fourDone: new Set(snap.fourDone || []),
    result: snap.result || null,
    bankDelta: snap.bankDelta || 0
  };
  const cupC = findCup(); if (cupC && snap.cup) { cupC.countAs = snap.cup.as; cupC.chosen = snap.cup.chosen; }
  recalc(); render();
  if (window.MP && MP.active && MP.me === 'guest') {
    if (snap.over && snap.result) { if (!resultShown) { resultShown = true; showResult(); } }
    else { if (resultShown) closeModal(); resultShown = false; }
  }
}
window.gsApplySnapshot = fromSnap;
function broadcast() {
  if (!window.MP || !MP.active || MP.me !== 'host') return;
  const snap = window.gsTakeSnapshot(); if (snap) MP.send({t:'state', s:snap});
}
function netFly(srcRect, dstId, card) {
  if (!window.MP || !MP.active || MP.me !== 'host') return;
  if (!srcRect) return;
  MP.send({ t: 'fly', c: card.id, dst: dstId, src: { left: srcRect.left, top: srcRect.top, width: srcRect.width, height: srcRect.height } });
}
window.gsFly = function (cardId, srcRect, dstId) {
  const card = CARD_INDEX[cardId];
  const el = document.getElementById(dstId);
  if (!card || !el) return;
  el.style.visibility = 'hidden';
  fly(card, srcRect, el.getBoundingClientRect()).then(() => { el.style.visibility = ''; });
};

/* ===================== GO / STahp ===================== */
function offerGoStop(w) {
  state.pending = w; state.busy = true;
  if (w === mySeat()) {
    sfx('go');
    const g = state[mySeat()].go + 1;
    showModal(`<h2>${state[mySeat()].score} POINTS!</h2><p>GO: keep playing for a bigger win. Each Go adds a bonus (${g === 1 ? '+1' : g === 2 ? '+2' : 'x' + 2 ** (g - 2) + ' total'}).</p><p>STahp: end the game now and win.</p>
      <div class="row"><button class="btn go" onclick="goCall('${mySeat()}')">GO</button><button class="btn" onclick="stahpCall('${mySeat()}')">STahp</button></div>`, false);
  } else {
    state.msg = `${nameOf(w)} REACHED ${state[w].score} POINTS...`; render();
    if (window.MP && MP.active) {
      if (MP.me === 'host') MP.send({t:'goStop'});
      return;
    }
    setTimeout(() => (state.c.hand.length >= 4 && state.p.score <= 1 && state.c.go < 2) ? goCall('c') : stahpCall('c'), 1300);
  }
}
function goCall(w) {
  closeModal();
  state[w].go++;
  state[w].goScore = state[w].score;
  sfx('go');
  state.msg = `${nameOf(w)} CALLED GO x${state[w].go}!`;
  pass(w);
}
function stahpCall(w) { closeModal(); sfx('stahp'); finish(w, `${nameOf(w)} CALLED STahp.`); }
window.goCall = goCall; window.stahpCall = stahpCall;

function exhaust() {
  const p = state.p, c = state.c;
  let w = null;
  if (p.go && !c.go) w = 'p'; else if (c.go && !p.go) w = 'c'; else if (p.go && c.go) w = p.score >= c.score ? 'p' : 'c';
  finish(w, w ? 'NO CARDS LEFT - THE PLAYER WHO CALLED GO WINS.' : 'NO CARDS LEFT AND NOBODY REACHED 7 - DRAW (NAGARI).');
}

/* ===================== PAYOUT ===================== */
function payout(w) {
  const W = state[w], L = state[other(w)], lines = [['Score', W.score]];
  const add = Math.min(W.go, 2), mult = W.go >= 3 ? 2 ** (W.go - 2) : 1;
  if (add) lines.push([`Go x${W.go} bonus`, '+' + add]);
  if (mult > 1) lines.push([`Go x${W.go} doubling`, 'x' + mult]);
  let m = 1; const bak = (t) => { m *= 2; lines.push([t, 'x2']); };
  const wp = parts(W.cap), lp = parts(L.cap);
  if (wp.pn >= 10 && lp.pn >= 1 && lp.pn <= 5) bak('Pi-bak (loser has 1–5 pi)');
  if (wp.nK >= 3 && lp.nK === 0) bak('Kwang-bak (loser has no kwang)');
  if (wp.nY >= 7) bak('Meong-bak (7+ yul)');
  let shakeMult = 1;
  const shakes = W.shakes || 0;
  if (shakes > 0) {
    shakeMult = Math.pow(2, shakes);
    lines.push([`흔들기 x${shakes}`, 'x' + shakeMult]);
  }
  return {lines, total: (W.score + add) * mult * m * shakeMult};
}
function finish(w, why) {
  state.over = true; state.busy = true; state.pending = null;
  state.result = {w, why, res: w ? payout(w) : null};
  let bankDelta = 0;
  if (w === 'p' && state.result.res) bankDelta = state.result.res.total;
  else if (w === 'c' && state.result.res) bankDelta = -state.result.res.total;
  if (bankDelta !== 0 && (!window.MP || !MP.active || MP.me === 'host')) { updBank(bankDelta); sfx('bank'); }
  state.bankDelta = bankDelta;
  if (w === 'p') sfx('win'); else if (w === 'c') sfx('lose');
  render(); showResult(); broadcast();
}
function showResult() {
  const r = state.result; if (!r) return;
  const me = mySeat(), opp = oppSeat();
  const title = r.w === me ? 'YOU WIN!' : r.w ? `${nameOf(r.w)} WINS` : 'DRAW';
  const lines = r.res ? `<div class="lines">${r.res.lines.map(l => `<div><span>${l[0]}</span><b>${l[1]}</b></div>`).join('')}<div class="total"><span>POINTS</span><b>${r.res.total}</b></div></div>` : '';
  const isGuest = window.MP && MP.active && MP.me === 'guest';
  const bd = state.bankDelta || 0;
  const bankLine = isGuest ? '' : `<p class="bankline">This round: <b class="${bd < 0 ? 'neg' : ''}">${bd >= 0 ? '+' : ''}${money(bd)}</b> · Bankroll: <b class="${bankroll < 0 ? 'neg' : ''}">${money(bankroll)}</b></p>`;
  showModal(`<h2>${title}</h2><p>${r.why}</p><p>You ${state[me].score} : ${state[opp].score} ${nameOf(opp)}</p>${lines}${bankLine}
    <div class="row"><button class="btn" onclick="closeModal()">VIEW BOARD</button><button class="btn go" onclick="newGame()">PLAY AGAIN</button></div>`, true);
}

/* ===================== MODAL + GROUP POPUP ===================== */
let closable = true;
function showModal(html, canClose = true) { closable = canClose; $('modalBox').innerHTML = html; $('modal').hidden = false; }
function closeModal() { $('modal').hidden = true; }
$('modal').onclick = e => { if (e.target ===$('modal') && closable) closeModal(); };

const RULE = {
  [KW]: '3 Kwang = 3 pts (2 if it includes the Rain kwang) · 4 = 4 · 5 = 15',
  [YU]: '5+ Yul = 1 pt, +1 for each more · Godori (the 3 birds) = +5',
  [TT]: 'Each full ribbon set (3) = +3 · 5+ ribbons = 1 pt, +1 for each more',
  [PI]: '10+ Pi value = 1 pt, +1 for each more · 쌍피 (double pi) counts as 2'};
function sections(t, cs) {
  const S = [], pt = parts(cs);
  if (t === KW) S.push({title: 'Kwang', cards: cs.filter(c => c.month !== 12)}, {title: 'Rain Kwang', cards: cs.filter(c => c.month === 12)});
  if (t === YU) S.push({title: 'Godori birds', badge: pt.birds === 3 ? '+5' : `${pt.birds}/3`, done: pt.birds === 3, cards: cs.filter(c => c.bird)}, {title: 'Other Yul', cards: cs.filter(c => !c.bird)});
  if (t === TT) {
    SETS.map(([k, n]) => ({title: n, badge: pt.setN[k] >= 3 ? '+3' : `${pt.setN[k]}/3`, done: pt.setN[k] >= 3, n: pt.setN[k], cards: cs.filter(c => c.rib === k)}))
      .sort((a, b) => (b.done - a.done) || (b.n - a.n)).forEach(s => S.push(s));
    S.push({title: 'Other ribbons (Rain)', cards: cs.filter(c => !SETS.some(s => s[0] === c.rib))});
  }
  if (t === PI) S.push(
    {title: 'Double Pi (each counts 2)', cards: cs.filter(c => c.dbl)},
    {title: 'Pi (each counts 1)', cards: cs.filter(c => !c.dbl)}
  );
  return S.filter(s => s.cards.length);
}
function openGroup(w, t) {
  const cs = state[w].cap.filter(c => eff(c) === t); if (!cs.length) return;
  const key = {[KW]: 'K', [YU]: 'Y', [TT]: 'T', [PI]: 'P'}[t], pt = state[w].pt;
  const cup = t === PI && cs.some(c => c.special) ? '<p>Month-9 cup is counted as Double Pi here (your choice, locked in).</p>' : (t === YU && cs.some(c => c.special) ? '<p>Month-9 cup is counted as a Yul here (your choice, locked in).</p>' : '');
  showModal(`<h2>${nameOf(w) === 'YOU' ? 'YOUR' : nameOf(w)} ${t.toUpperCase()} - ${cs.length} cards</h2><div class="total">Group worth: ${pt.g[key]} pt${pt.g[key] === 1 ? '' : 's'}</div><p>${RULE[t]}</p>${cup}` +
    sections(t, sortGroup(t, cs)).map(s => `<div class="sec"><h4>${s.title} (${s.cards.length})${s.badge ? `<em class="${s.done ? 'done' : ''}">${s.badge}</em>` : ''}</h4><div class="cards">${s.cards.map(c => cardHTML(c, 'lg')).join('')}</div></div>`).join('') +
    '<div class="row"><button class="btn" onclick="closeModal()">CLOSE</button></div>', true);
}
function openPlayerCards(w) {
  const P = state[w], pt = P.pt;
  const order = [KW, YU, TT, PI];
  const hasAny = order.some(t => P.cap.some(c => eff(c) === t));
  const body = hasAny ? order.map(t => {
    const cs = P.cap.filter(c => eff(c) === t);
    if (!cs.length) return '';
    const key = {[KW]: 'K', [YU]: 'Y', [TT]: 'T', [PI]: 'P'}[t];
    const grouped = sortGroup(t, cs);
    return `<div class="sec"><h4>${t.toUpperCase()} (${cs.length}) <em>${pt.g[key]} pt</em></h4><div class="cards">${grouped.map(c => cardHTML(c, 'lg')).join('')}</div></div>`;
  }).join('') : '<p>No captured cards yet.</p>';
  const title = nameOf(w) === 'YOU' ? 'YOUR CARDS' : `${nameOf(w)}'S CARDS`;
  showModal(`<h2>${title}</h2><div class="total">Total: ${pt.total} pt</div>${body}
    <div class="row"><button class="btn" onclick="closeModal()">CLOSE</button></div>`, true);
}
function openDeck() {
  const d = state.deck.slice().sort((a, b) => a.month - b.month || val(b) - val(a));
  showModal(`<h2>DECK - ${d.length} card${d.length === 1 ? '' : 's'} left</h2>` +
    (d.length ? `<p>These cards were never flipped.</p><div class="sec"><div class="cards">${d.map(c => cardHTML(c, 'lg')).join('')}</div></div>` : '<p>The deck was played all the way through - nothing left.</p>') +
    '<div class="row"><button class="btn" onclick="closeModal()">CLOSE</button></div>', true);
}
function openMyCards() { openPlayerCards(mySeat()); }

newGame();


/* ===================== LABELS TOGGLE ===================== */
(function () {
  const LS = 'goStop.labels';
  const apply = on => { document.body.classList.toggle('labels', on); const b = $('btnLabels'); if (b) b.textContent = on ? 'LABELS: ON' : 'LABELS: OFF'; };
  let on = false; try { on = localStorage.getItem(LS) === '1'; } catch (e) {}
  apply(on);
  const b = $('btnLabels');
  if (b) b.onclick = () => { on = !on; try { localStorage.setItem(LS, on ? '1' : '0'); } catch (e) {} apply(on); };
})();

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
  [10,'Y'],[10,'T','cheong'],[10,'P'],[10,'P'], [11,'K'],[11,'P',{bonus:2}],[11,'P'],[11,'P'], [12,'K'],[12,'Y'],[12,'T','rain'],[12,'P',{bonus:4}]];
function makeDeck() {
  return DEFS.map(([m, t, x], i) => {
    const c = {id: 'c' + i, month: m, type: {K: KW, Y: YU, T: TT, P: PI}[t]};
    if (t === 'T') c.rib = x;
    if (x && x.b) c.bird = 1;
    if (x && x.d) c.dbl = 1;
    if (x && x.sp) { c.special = 1; c.dbl = 1; c.countAs = 'pi'; }
    if (x && x.bonus) { c.bonus = x.bonus; }
    return c;
  });
}
const eff = c => c.special ? (c.countAs === 'yul' ? YU : PI) : c.type;
const piVal = c => c.bonus ? c.bonus : (c.dbl ? 2 : 1);
const val = c => eff(c) === KW ? (c.month === 12 ? 6 : 8) : eff(c) === YU ? (c.bird ? 6 : 4) : eff(c) === TT ? 3 : piVal(c);
const CARD_INDEX = Object.fromEntries(makeDeck().map(c => [c.id, c]));

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
  const sp = cards.find(c => c.special); if (!sp) return;
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
    case 'bonus': [1046, 1320, 1568].forEach((f,i)=>tone(a, t+i*.08, f, .22, .16, 'triangle')); break;
    case 'steal': tone(a, t, 880, .12, .14, 'triangle', 1320); tone(a, t + .12, 1320, .2, .13); break;
    case 'four': [660, 880, 1100, 1320, 1760].forEach((f,i)=>tone(a, t+i*.07, f, .22, .14, 'triangle')); break;
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
  let deck, bad;
  do {
    deck = makeDeck().sort(() => Math.random() - .5);
    const cnt = a => { const m = {}; a.forEach(c => m[c.month] = (m[c.month] || 0) + 1); return Object.values(m).some(n => n >= 4); };
    bad = cnt(deck.slice(0, 10)) || cnt(deck.slice(10, 20)) || cnt(deck.slice(20, 28));
  } while (bad);
  const sort = a => a.sort((x, y) => x.month - y.month || val(y) - val(x));
  state = {p: {hand: sort(deck.slice(0, 10)), cap: [], go: 0, score: 0}, c: {hand: sort(deck.slice(10, 20)), cap: [], go: 0, score: 0},
    table: deck.slice(20, 28), deck: deck.slice(28), turn: 'p', busy: false, over: false, msg: 'GAME STARTED - YOUR TURN', picking: null, pickRes: null,
    pending: null, ppeok: new Set(), fourDone: new Set(), result: null, bankDelta: 0};
  recalc(); closeModal(); paintBank(); render(); broadcast();
}

/* ===================== RENDER ===================== */
function cardHTML(c, extra = '') {
  const e = eff(c); let tg, rib = '';
  if (e === KW) tg = `<i class="tg kw"><svg class="ic"><use href="#sun"/></svg><b>${c.month === 12 ? 'RAIN KWANG' : 'KWANG'}</b></i>`;
  else if (e === YU) tg = `<i class="tg yl">${c.bird ? '<svg class="ic"><use href="#bird"/></svg>' : ''}<b>${c.bird ? 'BIRD' : 'YUL'}</b></i>`;
  else if (e === TT) { rib = `<i class="rib ${c.rib}"></i>`; tg = `<i class="tg ${c.rib}"><b>${RN[c.rib]}</b></i>`; }
  else if (c.bonus) tg = `<i class="tg pi-bonus"><b>BONUS x${c.bonus}</b></i>`;
  else tg = `<i class="tg${c.dbl ? ' pi2' : ''}"><b>${c.dbl ? 'PI x2' : 'PI'}</b></i>`;
  return `<div class="card t-${e}${c.bonus ? ' bonus' : ''} ${extra}" style="--c:${MC[c.month]}" title="${MN[c.month]}"><b class="mo">${c.month}</b><svg class="art"><use href="#m${c.month}"/></svg>${rib}${tg}</div>`;
}
function sortGroup(t, cards) {
  const k = c => t === TT ? [SETS.findIndex(s => s[0] === c.rib) < 0 ? 9 : SETS.findIndex(s => s[0] === c.rib)] : t === YU ? [c.bird ? 0 : 1] : t === PI ? [c.bonus ? -1 : (c.dbl ? 0 : 1)] : [c.month === 12 ? 1 : 0];
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
  $('msg').textContent = state.over
    ? `GAME OVER - YOU ${state[me].score} : ${state[opp].score} ${nameOf(opp)}`
    : (state.msg || (state.turn === me ? 'YOUR TURN - PICK A CARD'
        : (window.MP && MP.active ? 'FRIEND IS PLAYING...' : 'CPU IS PLAYING...')));

  const can = state.turn === me && !state.busy && !state.over && !state.pending;

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
  $('cpuCaptured').innerHTML = capturedHTML(opp);
  $('pScore').textContent = state[me].score;
  $('cScore').textContent = state[opp].score;
  const oppLabel = $('oppLabel');
  if (oppLabel) oppLabel.textContent = nameOf(opp);
  paintBank();
}
$('myHand').onclick = e => {
  const w = e.target.closest('.wrap'); if (!w) return;
  const i = +w.dataset.i;
  if (window.MP && MP.active && MP.me === 'guest' && state.turn === 'c' && !state.busy && !state.over && !state.pending) {
    MP.send({ t: 'play', idx: i });
    return;
  }
  humanPlay(i);
};
$('tableCards').onclick = e => {
  const d = e.target.closest('[data-id]');
  if (!d || !state.picking || !state.picking.includes(d.dataset.id)) return;
  if (window.MP && MP.active && MP.me === 'guest') {
    MP.send({ t: 'pick', id: d.dataset.id });
    state.picking = null; render();
    return;
  }
  const c = state.table.find(x => x.id === d.dataset.id), r = state.pickRes;
  state.picking = null; state.pickRes = null; state.msg = ''; render(); r(c);
  broadcast();
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
$('scOpp').onclick = () => openPlayerCards(oppSeat());
$('btnNew').onclick = newGame;
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
  if (!state || !state.picking || !state.picking.includes(cardId) || !state.pickRes) return;
  const c = state.table.find(x => x.id === cardId);
  const r = state.pickRes;
  state.picking = null; state.pickRes = null; state.msg = '';
  render(); broadcast();
  r(c);
};

/* ===================== STEAL ANIMATION ===================== */
async function playStealAnim(who, card) {
  const isLocal = who === mySeat();
  const srcEl = isLocal ? $('cpuCaptured') : $('myCaptured');
  const dstEl = isLocal ? $('myCaptured') : $('cpuCaptured');
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
  /* Prefer a plain single pi, then any non-bonus pi, then any pi */
  let idx = foe.cap.findIndex(c => eff(c) === PI && !c.bonus && !c.dbl);
  if (idx < 0) idx = foe.cap.findIndex(c => eff(c) === PI && !c.bonus);
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

/* ===================== TURN ===================== */
function humanPlay(i) {
  if (state.turn === mySeat() && !state.busy && !state.over && !state.pending) playTurn(mySeat(), i);
}
function sfxForTags(tags) {
  const flat = tags.join(' ');
  if (/TTADAK/.test(flat)) sfx('ttadak');
  else if (/JJOK/.test(flat)) sfx('jjok');
  if (/PPEOK!/.test(flat)) sfx('ppeok');
  if (/PPEOK CLEARED/.test(flat)) sfx('ppeokCleared');
  if (/SWEEP/.test(flat)) sfx('sweep');
}

async function playTurn(who, idx) {
  if (state.busy || state.over) return;
  state.busy = true; state.msg = '';
  const me = state[who], before = me.score, tags = [], cap = [];
  let steals = 0;
  const H = me.hand.splice(idx, 1)[0];
  const from = rect((who === mySeat() ? 'mh-' : 'oh-') + H.id);
  render(); broadcast();
  const same = m => state.table.filter(c => c.month === m);
  const take = cs => { cs.forEach(c => { state.table = state.table.filter(t => t.id !== c.id); }); cap.push(...cs); };
  const choose = async opts => who === mySeat() ? await pick(opts) : opts.slice().sort((a, b) => val(b) - val(a))[0];

  /* 1. hand card -> table */
  const k = same(H.month).length;
  state.table.push(H); render(); broadcast();
  netFly(from, 'tb-' + H.id, H);
  await land(H, from); sfx('deal');
  if (H.bonus) {
    sfx('bonus');
    tags.push(`BONUS x${H.bonus}`);
    const stolen = await stealWithAnim(who);
    if (stolen) tags.push('+1 PI (BONUS)');
  }
  const chosen = k === 2 ? await choose(same(H.month).filter(c => c.id !== H.id)) : null;

  /* 2. flip stock card */
  await sleep(220);
  const S = state.deck.pop();
  if (S) {
    render(); broadcast();
    const df = rect('deck');
    state.table.push(S); render(); broadcast();
    netFly(df, 'tb-' + S.id, S);
    await land(S, df); sfx('flip');
    if (S.bonus) {
      sfx('bonus');
      tags.push(`BONUS FLIP x${S.bonus}`);
      const stolen = await stealWithAnim(who);
      if (stolen) tags.push('+1 PI (BONUS)');
    }
  }

  /* 3. resolve captures */
  const settle = async (X, pre) => {
    const g = same(X.month), n = g.length - 1;
    if (n === 1) { take(g); render(); broadcast(); }
    else if (n === 2) { take([X, pre || await choose(g.filter(c => c.id !== X.id))]); render(); broadcast(); }
    else if (n === 3) { take(g); if (state.ppeok.delete(X.month)) { tags.push('PPEOK CLEARED!'); } render(); broadcast(); }
  };
  if (S && S.month === H.month) {
    const g = same(H.month);
    if (g.length === 2) { take(g); steals++; tags.push('JJOK!'); }
    else if (g.length === 3) { state.ppeok.add(H.month); tags.push('PPEOK!'); }
    else if (g.length === 4) { take(g); tags.push('TTADAK!'); }
  } else {
    await settle(H, chosen);
    if (S) await settle(S);
  }
  if (cap.length && !state.table.length && (state.p.hand.length || state.c.hand.length || state.deck.length)) { steals++; tags.push('SWEEP!'); }

  const beforePt = me.pt;
  me.cap.push(...cap);
  recalc();
  const afterPt = me.pt;

  /* 4-of-a-kind check: any month with all 4 cards now in your captures gives +1 pi.
     This covers ppeok-clear, ttadak, and the "played 3 from hand + 1 from field" case. */
  const fourMonths = [];
  for (let m = 1; m <= 12; m++) {
    const key = who + '-' + m;
    if (state.fourDone.has(key)) continue;
    if (me.cap.filter(c => c.month === m).length === 4) {
      state.fourDone.add(key);
      fourMonths.push(m);
    }
  }

  /* group-complete SFX */
  if (who === mySeat()) {
    if (beforePt.birds < 3 && afterPt.birds === 3) sfx('godori');
    ['hong','cheong','cho'].forEach(k2 => { if (beforePt.setN[k2] < 3 && afterPt.setN[k2] === 3) sfx('set'); });
    if (beforePt.nK < 3 && afterPt.nK >= 3) sfx('set');
  }
  sfxForTags(tags);

  /* award steals (JJOK/SWEEP base + 4-of-a-kind) */
  for (let i = 0; i < steals; i++) {
    const stolen = await stealWithAnim(who);
    if (stolen) tags.push('+1 PI');
  }
  if (fourMonths.length) sfx('four');
  for (const m of fourMonths) {
    const stolen = await stealWithAnim(who);
    if (stolen) tags.push(`+1 PI (4-M${m})`);
  }

  state.msg = tags.length ? `${nameOf(who)}: ${tags.join(' · ')}` : '';
  render(); broadcast();
  const flashEl = who === mySeat() ? $('myCaptured') : $('cpuCaptured');
  if (cap.length && flashEl) { flashEl.classList.add('flash'); setTimeout(() => flashEl.classList.remove('flash'), 950); }
  await sleep(cap.length ? 600 : 250);

  if (!state.p.hand.length && !state.c.hand.length) {
    if (me.score >= 7 && me.score > before) finish(who, `${nameOf(who)} REACHED ${me.score} ON THE LAST TURN.`);
    else exhaust();
    return;
  }
  if (me.score >= 7 && me.score > before) { offerGoStop(who); return; }
  pass(who);
}
function pass(w) {
  state.turn = other(w); state.busy = false; state.pending = null; render(); broadcast();
  if (state.turn === 'c') {
    if (window.MP && MP.active) {
      state.msg = 'FRIEND IS PLAYING...'; render(); broadcast();
    } else setTimeout(cpuPlay, 750);
  }
}
function cpuPlay() {
  if (state.over || state.turn !== 'c') return;
  if (window.MP && MP.active) return;
  let best = 0, bv = -1e9;
  state.c.hand.forEach((c, i) => {
    const g = state.table.filter(t => t.month === c.month);
    const v = g.length === 3 ? 100 : g.length ? 10 + Math.max(...g.map(val)) + val(c) : -val(c);
    if (v > bv) { bv = v; best = i; }
  });
  playTurn('c', best);
}
window.gsPlayRemote = function (idx) { if (state && state.turn === 'c' && !state.busy && !state.over && !state.pending) playTurn('c', idx); };
window.gsIsBusy = function () { return !state || state.busy || state.over || state.pending; };
window.gsTakeSnapshot = function () {
  if (!state) return null;
  return {
    p: {hand: state.p.hand.map(cid), cap: state.p.cap.map(cid), go: state.p.go, score: state.p.score},
    c: {hand: state.c.hand.map(cid), cap: state.c.cap.map(cid), go: state.c.go, score: state.c.score},
    table: state.table.map(cid), deck: state.deck.map(cid),
    turn: state.turn, over: state.over, msg: state.msg,
    picking: state.picking ? state.picking.slice() : null,
    fourDone: Array.from(state.fourDone),
    result: state.result ? {w: state.result.w, why: state.result.why, res: state.result.res} : null,
    bankDelta: state.bankDelta || 0
  };
};
function cid(c) { return c.id; }
function fromSnap(snap) {
  const all = {}; makeDeck().forEach(c => all[c.id] = c);
  const get = id => all[id];
  state = {
    p: {hand: snap.p.hand.map(get), cap: snap.p.cap.map(get), go: snap.p.go, score: snap.p.score},
    c: {hand: snap.c.hand.map(get), cap: snap.c.cap.map(get), go: snap.c.go, score: snap.c.score},
    table: snap.table.map(get), deck: snap.deck.map(get),
    turn: snap.turn, busy: false, over: snap.over, msg: snap.msg,
    picking: snap.picking ? snap.picking.slice() : null,
    pickRes: null, pending: null, ppeok: new Set(),
    fourDone: new Set(snap.fourDone || []),
    result: snap.result || null,
    bankDelta: snap.bankDelta || 0
  };
  recalc(); render();
  if (snap.over && snap.result && window.MP && MP.active && MP.me === 'guest' && $('modal').hidden) {
    showResult();
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
    showModal(`<h2>${state[mySeat()].score} POINTS!</h2><p>GO: keep playing for a bigger win. Each Go adds a bonus (${g === 1 ? '+1' : g === 2 ? '+2' : 'x' + 2 ** (g - 2) + ' total'}), but if the opponent then scores more than you, you lose double (Go-bak).</p><p>STahp: end the game now and win.</p>
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
function goCall(w) { closeModal(); state[w].go++; sfx('go'); state.msg = `${nameOf(w)} CALLED GO x${state[w].go}!`; pass(w); }
function stahpCall(w) { closeModal(); sfx('stahp'); finish(w, `${nameOf(w)} CALLED STahp.`); }
window.goCall = goCall; window.stahpCall = stahpCall;

function exhaust() {
  const p = state.p, c = state.c;
  let w = null;
  if (p.go && !c.go) w = 'p'; else if (c.go && !p.go) w = 'c'; else if (p.go && c.go) w = p.score >= c.score ? 'p' : 'c';
  finish(w, w ? 'NO CARDS LEFT - THE PLAYER WHO CALLED GO WINS.' : 'NO CARDS LEFT AND NOBODY REACHED 7 - DRAW (NAGARI).');
}
function payout(w) {
  const W = state[w], L = state[other(w)], lines = [['Score', W.score]];
  const add = Math.min(W.go, 2), mult = W.go >= 3 ? 2 ** (W.go - 2) : 1;
  if (add) lines.push([`Go x${W.go} bonus`, '+' + add]);
  if (mult > 1) lines.push([`Go x${W.go} doubling`, 'x' + mult]);
  let m = 1; const bak = (t) => { m *= 2; lines.push([t, 'x2']); };
  const wp = parts(W.cap), lp = parts(L.cap);
  if (wp.pn >= 10 && lp.pn <= 5) bak('Pi-bak (loser has 5 or fewer pi)');
  if (wp.nK >= 3 && lp.nK === 0) bak('Kwang-bak (loser has no kwang)');
  if (wp.nY >= 7) bak('Meong-bak (7+ yul)');
  if (L.go > 0) bak('Go-bak (loser had called Go)');
  return {lines, total: (W.score + add) * mult * m};
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
  const title = r.w === 'p' ? 'YOU WIN!' : r.w === 'c' ? `${nameOf('c')} WINS` : 'DRAW';
  const lines = r.res ? `<div class="lines">${r.res.lines.map(l => `<div><span>${l[0]}</span><b>${l[1]}</b></div>`).join('')}<div class="total"><span>POINTS</span><b>${r.res.total}</b></div></div>` : '';
  const isGuest = window.MP && MP.active && MP.me === 'guest';
  const bd = state.bankDelta || 0;
  const bankLine = isGuest ? '' : `<p class="bankline">This round: <b class="${bd < 0 ? 'neg' : ''}">${bd >= 0 ? '+' : ''}${money(bd)}</b> · Bankroll: <b class="${bankroll < 0 ? 'neg' : ''}">${money(bankroll)}</b></p>`;
  showModal(`<h2>${title}</h2><p>${r.why}</p><p>You ${state.p.score} : ${state.c.score} ${nameOf('c')}</p>${lines}${bankLine}
    <div class="row"><button class="btn" onclick="closeModal()">VIEW BOARD</button><button class="btn go" onclick="newGame()">PLAY AGAIN</button></div>`, true);
}

/* ===================== MODAL + GROUP POPUP ===================== */
let closable = true;
function showModal(html, canClose = true) { closable = canClose; $('modalBox').innerHTML = html; $('modal').hidden = false; }
function closeModal() { $('modal').hidden = true; }
$('modal').onclick = e => { if (e.target === $('modal') && closable) closeModal(); };

const RULE = {
  [KW]: '3 Kwang = 3 pts (2 if it includes the Rain kwang) · 4 = 4 · 5 = 15',
  [YU]: '5+ Yul = 1 pt, +1 for each more · Godori (the 3 birds) = +5',
  [TT]: 'Each full ribbon set (3) = +3 · 5+ ribbons = 1 pt, +1 for each more',
  [PI]: '10+ Pi value = 1 pt, +1 for each more · Bonus x2 = 2 pi, Bonus x4 = 4 pi'};
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
    {title: 'Bonus Pi (x4 / x2 — triggers steal)', cards: cs.filter(c => c.bonus)},
    {title: 'Double Pi (each counts 2)', cards: cs.filter(c => !c.bonus && c.dbl)},
    {title: 'Pi (each counts 1)', cards: cs.filter(c => !c.bonus && !c.dbl)}
  );
  return S.filter(s => s.cards.length);
}
function openGroup(w, t) {
  const cs = state[w].cap.filter(c => eff(c) === t); if (!cs.length) return;
  const key = {[KW]: 'K', [YU]: 'Y', [TT]: 'T', [PI]: 'P'}[t], pt = state[w].pt;
  const cup = t === PI && cs.some(c => c.special) ? '<p>Month-9 cup is counted as Double Pi here (auto-picks whichever scores more).</p>' : (t === YU && cs.some(c => c.special) ? '<p>Month-9 cup is counted as a Yul here.</p>' : '');
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
function openMyCards() { openPlayerCards(mySeat()); }

newGame();
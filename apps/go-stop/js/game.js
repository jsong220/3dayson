'use strict';
/* ===================== DATA ===================== */
const KW = 'Kwang', YU = 'Yul', TT = 'Tti', PI = 'Pi';
const MN = ['', 'Pine', 'Plum', 'Cherry', 'Wisteria', 'Iris', 'Peony', 'Bush Clover', 'Moon', 'Chrysanthemum', 'Maple', 'Paulownia', 'Rain'];
const MC = ['', '#cde8c4', '#f6c9c9', '#fbd3e6', '#d9cdee', '#cbd8f5', '#f2b9c9', '#e8e3b0', '#dcdce8', '#f7e7a1', '#f2c9a5', '#cdb8dc', '#b9d7e6'];
const RN = {hong: 'HONG', cheong: 'CHEONG', cho: 'CHO', rain: 'RAIN'};
const SETS = [['hong', 'Hongdan (red, poetry)', '#e04040'], ['cheong', 'Cheongdan (blue)', '#3f78e8'], ['cho', 'Chodan (red, plain)', '#f08a3a']];
const RIB_ORDER = new Map(SETS.map((s, i) => [s[0], i])); // ribbon name -> fixed display order
const sortByMonthVal = a => a.sort((x, y) => x.month - y.month || val(y) - val(x)); // shared sort comparator
function groupByMonth(hand) {
  const byMonth = {};
  hand.forEach(c => { (byMonth[c.month] = byMonth[c.month] || []).push(c); });
  return byMonth;
}
const DEFS = [[1,'K'],[1,'T','hong'],[1,'P'],[1,'P'], [2,'Y',{b:1}],[2,'T','hong'],[2,'P'],[2,'P'], [3,'K'],[3,'T','hong'],[3,'P'],[3,'P'],
  [4,'Y',{b:1}],[4,'T','cho'],[4,'P'],[4,'P'], [5,'Y'],[5,'T','cho'],[5,'P'],[5,'P'], [6,'Y'],[6,'T','cheong'],[6,'P'],[6,'P'],
  [7,'Y'],[7,'T','cho'],[7,'P'],[7,'P'], [8,'K'],[8,'Y',{b:1}],[8,'P'],[8,'P'], [9,'Y',{sp:1}],[9,'T','cheong'],[9,'P'],[9,'P'],
  [10,'Y'],[10,'T','cheong'],[10,'P'],[10,'P'], [11,'K'],[11,'P',{d:1}],[11,'P'],[11,'P'], [12,'K'],[12,'Y'],[12,'T','rain'],[12,'P',{d:1}]];
function makeDeck() {
  const base = DEFS.map(([m, t, x], i) => {
    const c = {id: 'c' + i, month: m, type: {K: KW, Y: YU, T: TT, P: PI}[t]};
    if (t === 'T') c.rib = x;
    if (x && x.b) c.bird = 1;
    if (x && x.d) c.dbl = 1;
    if (x && x.sp) { c.special = 1; c.dbl = 1; c.countAs = 'pi'; }
    return c;
  });
  // Bonus cards: worth 2 pi and 4 pi, steal 1 pi when played/flipped
  base.push(
    {id: 'bx1', month: 0, type: PI, isBonus: true, bonusPi: 2},
    {id: 'bx2', month: 0, type: PI, isBonus: true, bonusPi: 4}
  );
  return base;
}
const eff = c => c.special ? (c.countAs === 'yul' ? YU : PI) : c.type;
const piVal = c => c.bonusPi ? c.bonusPi : (c.dbl ? 2 : 1);
const val = c => { const e = eff(c); return e === KW ? (c.month === 12 ? 6 : 8) : e === YU ? (c.bird ? 6 : 4) : e === TT ? 3 : piVal(c); };
const CARD_INDEX = Object.fromEntries(makeDeck().map(c => [c.id, c]));
if (window.GSArt) GSArt.install(DEFS);
// Bonus card art (simple gold cards)
(function(){
  const s = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>`
    + `<symbol id="card-bx1" viewBox="0 0 60 90"><rect x="0" y="0" width="60" height="90" fill="#f6edd6"/><rect x="0" y="0" width="60" height="90" fill="#f5c542" opacity="0.25"/><text x="30" y="38" font-size="13" font-weight="900" text-anchor="middle" fill="#7a5a00">BONUS</text><text x="30" y="58" font-size="16" font-weight="900" text-anchor="middle" fill="#7a5a00">2 PI</text></symbol>`
    + `<symbol id="card-bx2" viewBox="0 0 60 90"><rect x="0" y="0" width="60" height="90" fill="#f6edd6"/><rect x="0" y="0" width="60" height="90" fill="#f5c542" opacity="0.45"/><text x="30" y="38" font-size="13" font-weight="900" text-anchor="middle" fill="#7a1a00">BONUS</text><text x="30" y="58" font-size="16" font-weight="900" text-anchor="middle" fill="#7a1a00">4 PI</text></symbol>`
    + `</defs></svg>`;
  document.body.insertAdjacentHTML('afterbegin', s);
})();
/* Fisher-Yates: unbiased (the old sort(() => Math.random() - .5) is not a fair shuffle) */
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ===================== SCORING ===================== */
function parts(cards) {
  // Single pass: partition by effective type and total pi value in one walk.
  const kw = [], yl = [], tt = [];
  let pn = 0, birds = 0;
  for (const c of cards) {
    const e = eff(c);
    if (e === KW) kw.push(c);
    else if (e === YU) { yl.push(c); if (c.bird) birds++; }
    else if (e === TT) tt.push(c);
    else if (e === PI) pn += piVal(c);
  }
  const r = {nK: kw.length, nY: yl.length, nT: tt.length, pn, birds, sets: {}, setN: {}};
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

/* ===================== MONEY / POTS ===================== */
const POINT_VALUE = 1;
const LS_BANK = 'goStop.bankroll.v1';
const LS_POT_HISTORY = 'goStop.potHistory.v1';
const LS_POT_DECKS = 'goStop.potDecks.v1';
function loadBank() { const v = parseFloat(localStorage.getItem(LS_BANK)); return Number.isFinite(v) ? v : 0; }
function saveBank(n) { try { localStorage.setItem(LS_BANK, String(n)); } catch(e){} }
function loadPotHistory() { try { const v = JSON.parse(localStorage.getItem(LS_POT_HISTORY)); return Array.isArray(v) ? v : []; } catch(e){ return []; } }
function savePotHistory(h) { try { localStorage.setItem(LS_POT_HISTORY, JSON.stringify(h)); } catch(e){} }
function loadPotDecks() { const v = parseInt(localStorage.getItem(LS_POT_DECKS), 10); return Number.isFinite(v) && v >= 0 ? v : 0; }
function savePotDecks(n) { try { localStorage.setItem(LS_POT_DECKS, String(n)); } catch(e){} }
function money(n) { const a = Math.abs(n); const s = Number.isInteger(a) ? a : a.toFixed(2); return (n < 0 ? '-$' : '$') + s; }

/* ===================== SOUND ===================== */
let audioCtx = null, soundOn = true;
try { soundOn = localStorage.getItem('goStop.sound') !== '0'; } catch(e) {}
function ac() { if (!audioCtx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; audioCtx = new C(); } if (audioCtx.state === 'suspended') audioCtx.resume(); return audioCtx; }
function tone(a, t, f, dur, g, type, to) { const o = a.createOscillator(), gn = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(gn); gn.connect(a.destination); o.start(t); o.stop(t + dur + 0.02); }
const noiseBufs = {};
function noiseBuf(a, dur) {
  // Cache the white-noise buffer per length: generating it costs a full
  // fill loop, and replaying the same noise through the bandpass filter
  // is perceptually identical.
  const n = Math.floor(a.sampleRate * dur);
  let buf = noiseBufs[n];
  if (!buf) {
    buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noiseBufs[n] = buf;
  }
  return buf;
}
function noise(a, t, dur, f, g, type) { const buf = noiseBuf(a, dur); const src = a.createBufferSource(), fl = a.createBiquadFilter(), gn = a.createGain(); src.buffer = buf; fl.type = type || 'bandpass'; fl.frequency.value = f; fl.Q.value = .9; gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(.001, t + dur); src.connect(fl); fl.connect(gn); gn.connect(a.destination); src.start(t); }
function sfx(name, skipRelay) {
  if (!skipRelay && window.MP && MP.active && MP.me === 'host') {
    try { MP.send({ t: 'sfx', n: name }); } catch (e) {}
  }
  if (!soundOn) return; const a = ac(); if (!a) return; const t = a.currentTime;
  const sparkle = (base, n=3) => { for(let i=0;i<n;i++) tone(a, t+i*.05, base*(1+i*.25), .15, .08, 'sine', base*2); };
  switch (name) {
    case 'deal':
      noise(a, t, .05, 3000 + Math.random()*800, .22);
      tone(a, t, 1200 + Math.random()*300, .06, .08, 'triangle', 800);
      break;
    case 'dealDone':
      [523,659,784,1046].forEach((f,i)=>tone(a, t+i*.08, f, .25, .12, 'triangle'));
      noise(a, t+.3, .15, 4000, .1, 'highpass');
      break;
    case 'flip':
      noise(a, t, .07, 2000, .2);
      tone(a, t+.02, 900, .08, .1, 'triangle', 1400);
      sparkle(1800, 2);
      break;
    case 'capture':
      noise(a, t, .06, 2500, .2);
      tone(a, t, 700, .12, .14, 'triangle', 1050);
      tone(a, t+.08, 1050, .15, .12, 'triangle', 1400);
      break;
    case 'jjok':
      [880,1174,1568,2093].forEach((f,i)=>tone(a, t+i*.06, f, .2, .13, 'triangle'));
      noise(a, t, .12, 5000, .08, 'highpass');
      tone(a, t+.25, 2637, .3, .1, 'sine');
      break;
    case 'ttadak':
      [587,740,880,1174,1568].forEach((f,i)=>tone(a, t+i*.05, f, .18, .13, 'square'));
      noise(a, t, .1, 3500, .12);
      break;
    case 'ppeok':
      tone(a, t, 196, .3, .2, 'sawtooth', 392);
      tone(a, t, 98, .35, .15, 'sine', 196);
      noise(a, t+.05, .15, 800, .15, 'lowpass');
      break;
    case 'ppeokCleared':
      [330,415,494,659].forEach((f,i)=>tone(a, t+i*.07, f, .22, .14, 'triangle'));
      break;
    case 'sweep':
      [523,659,784,1046,1318,1568].forEach((f,i)=>tone(a, t+i*.06, f, .25, .13, 'triangle'));
      noise(a, t+.3, .2, 6000, .08, 'highpass');
      break;
    case 'godori':
      // playful bird chirps
      [2093,2637,2093,3136].forEach((f,i)=>tone(a, t+i*.09, f, .12, .1, 'sine', f*1.2));
      tone(a, t+.4, 1568, .3, .12, 'triangle');
      break;
    case 'set':
      [784,988,1175].forEach((f,i)=>tone(a, t+i*.08, f, .28, .13, 'triangle'));
      sparkle(2000, 2);
      break;
    case 'go':
      tone(a, t, 392, .15, .18, 'sawtooth', 784);
      tone(a, t+.12, 523, .15, .18, 'sawtooth', 1046);
      [1046,1318,1568].forEach((f,i)=>tone(a, t+.22+i*.07, f, .25, .14, 'triangle'));
      noise(a, t+.2, .2, 4000, .08, 'highpass');
      break;
    case 'stahp':
      tone(a, t, 880, .18, .16, 'square', 440);
      tone(a, t+.15, 660, .25, .16, 'square', 220);
      noise(a, t+.3, .15, 1000, .12, 'lowpass');
      break;
    case 'win':
      [523,659,784,1046,784,1046,1318,1568].forEach((f,i)=>tone(a, t+i*.11, f, .32, .14, 'triangle'));
      noise(a, t+.8, .3, 7000, .06, 'highpass');
      [2093,2637].forEach((f,i)=>tone(a, t+.9+i*.12, f, .4, .1, 'sine'));
      break;
    case 'lose':
      [392,370,349,311].forEach((f,i)=>tone(a, t+i*.18, f, .3, .14, 'sawtooth', f*.9));
      tone(a, t+.7, 155, .6, .12, 'triangle', 110);
      break;
    case 'bank':
      tone(a, t, 1568, .07, .12, 'square', 2093);
      tone(a, t+.07, 2093, .1, .1, 'square', 2637);
      break;
    case 'steal':
      tone(a, t, 1200, .08, .14, 'sine', 2400);
      tone(a, t+.08, 2400, .12, .12, 'sine', 1200);
      sparkle(3000, 3);
      break;
    case 'bonus':
      [1568,2093,2637,3136,4192].forEach((f,i)=>tone(a, t+i*.06, f, .2, .11, 'sine'));
      noise(a, t, .25, 8000, .05, 'highpass');
      break;
    case 'four':
      [659,830,988,1318,1568,2093].forEach((f,i)=>tone(a, t+i*.06, f, .24, .13, 'triangle'));
      break;
    case 'sseop':
      [523,659,784,1046,1318,1568,2093].forEach((f,i)=>tone(a, t+i*.05, f, .26, .13, 'triangle'));
      noise(a, t+.3, .2, 5000, .07, 'highpass');
      break;
    case 'shake':
      [262,392,523,659,880].forEach((f,i)=>{ tone(a, t+i*.08, f, .16, .16, 'square'); noise(a, t+i*.08, .05, 1500, .08); });
      tone(a, t+.45, 1046, .3, .14, 'triangle');
      break;
    case 'click':
      tone(a, t, 800, .05, .1, 'triangle', 1000);
      break;
  }
}
window.gsPlaySfx = function (name) { sfx(name, true); };
function toggleSound() {
  soundOn = !soundOn;
  try { localStorage.setItem('goStop.sound', soundOn ? '1' : '0'); } catch(e) {}
  const btn = document.getElementById('btnSound');
  if (btn) btn.textContent = soundOn ? '🔊' : '🔇';
  if (soundOn) sfx('click', true);
}
function funAnim(selector, cls, dur=800) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.classList.add(cls);
  setTimeout(()=>el.classList.remove(cls), dur);
}
function showBanner(cls, text, ms = 1700) {
  document.querySelectorAll('.' + cls).forEach(e => e.remove());
  const el = document.createElement('div');
  el.className = 'banner ' + cls;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
const showGoBanner = n => showBanner('go-banner', `${n} GO!`);
const showPoopBanner = () => showBanner('poop-banner', '💩');
const showBonusBanner = pi => showBanner('bonus-banner', `BONUS +${pi} PI`);

/* ===================== STATE ===================== */
let state = null, bankroll = loadBank(), potDecks = loadPotDecks();
// Settings
let stopPoints = 7;
try { const sp = localStorage.getItem('goStop.stopPoints'); if (sp === '5' || sp === '7') stopPoints = parseInt(sp, 10); } catch(e) {}
let threePlayerMode = false;
try { threePlayerMode = localStorage.getItem('goStop.threePlayer') === '1'; } catch(e) {}
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Increments every newGame(); deal animations check it so a rapid restart
// can't have two deal loops pushing cards into the same state.
let gameSeq = 0;
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

/* Cards dealt most recently, for the deal-in animation (hoisted: reused every deal step). */
const DEAL_SEL = '#myHand .wrap:last-child .card, #cpuHand div:last-child .card, #tableCards .stack:last-child .card';
function newGame() {
  if (window.MP && MP.active && MP.me === 'guest') { MP.send({ t: 'new' }); return; }
  const mySeq = ++gameSeq; // supersede any in-flight deal animation from a previous newGame
  let deck, bad;
  do {
    const shuffled = shuffle(makeDeck());
    // Bonus cards are dealt normally now: they may land in starting hands
    // (player keeps them in hand) or on the starting table (first player
    // auto-captures them after the deal). Skip them in the 4-of-a-month check.
    const cnt = a => { const m = {}; a.forEach(c => { if (!c.isBonus) m[c.month] = (m[c.month] || 0) + 1; }); return Object.values(m).some(n => n >= 4); };
    bad = cnt(shuffled.slice(0, 10)) || cnt(shuffled.slice(10, 20)) || cnt(shuffled.slice(20, 28));
    if (!bad) deck = shuffled;
  } while (bad);
  const first = Math.random() < 0.5 ? 'p' : 'c';
  const pHand = sortByMonthVal(deck.slice(0, 10));
  const cHand = sortByMonthVal(deck.slice(10, 20));
  const tableCards = deck.slice(20, 28);
  const remaining = deck.slice(28);
  // Start with empty hands/table for dealing animation
  state = {
    p: {hand: [], cap: [], go: 0, goScore: 0, score: 0, shakes: 0, shakeMonths: []},
    c: {hand: [], cap: [], go: 0, goScore: 0, score: 0, shakes: 0, shakeMonths: []},
    table: [], deck: deck.slice(),
    turn: first, busy: true, over: false,
    msg: `DEALING...`,
    picking: null, pickRes: null, pending: null, ppeok: new Set(), ppeokBonus: {}, fourDone: new Set(),
    result: null, bankDelta: 0
  };
  recalc(); closeModal(); paintBank(); sync();
  // Dealing animation: cards fly in one by one
  (async () => {
    // deal 5 rounds: p, c, table pattern for visual fun
    for (let i = 0; i < 10; i++) {
      if (mySeq !== gameSeq) return; // a newer game started; stop touching state
      if (i < pHand.length) {
        state.p.hand.push(pHand[i]);
        state.deck.shift();
      }
      if (i < cHand.length) {
        state.c.hand.push(cHand[i]);
        state.deck.shift();
      }
      if (i < tableCards.length) {
        state.table.push(tableCards[i]);
        state.deck.shift();
      }
      // keep sorted for final look, but animate
      state.msg = `DEALING... ${Math.min(i+1,10)}/10`;
      render();
      // add deal animation class to latest cards (one query + one timer per step)
      const fresh = document.querySelectorAll(DEAL_SEL);
      fresh.forEach(el => el.classList.add('deal-anim'));
      setTimeout(() => fresh.forEach(el => el.classList.remove('deal-anim')), 450);
      sfx('deal', true);
      await sleep(110);
    }
    if (mySeq !== gameSeq) return;
    // Fix deck to remaining (we shifted 28 times, should match)
    state.deck = remaining;
    // sort hands nicely
    state.p.hand = sortByMonthVal(state.p.hand);
    state.c.hand = sortByMonthVal(state.c.hand);
    state.msg = `${nameOf(first)} GOES FIRST`;
    recalc(); sync();
    sfx('dealDone', true);
    // Bonus cards dealt onto the starting table are auto-captured ("played")
    // by the first player only. Bonus cards dealt into hands just stay in hand.
    const tableBonus = state.table.filter(c => c.isBonus);
    if (tableBonus.length) {
      state.table = state.table.filter(c => !c.isBonus);
      state[first].cap.push(...tableBonus);
      recalc(); sync();
      showBonusBanner(tableBonus.reduce((a, c) => a + c.bonusPi, 0));
      sfx('bonus', true);
      state.msg = `${nameOf(first)} TAKES ${tableBonus.length} BONUS CARD${tableBonus.length > 1 ? 'S' : ''} FROM THE TABLE!`;
      sync();
      await sleep(1100);
      if (mySeq !== gameSeq) return;
      for (let i = 0; i < tableBonus.length; i++) await stealWithAnim(first);
      if (mySeq !== gameSeq) return;
      state.msg = `${nameOf(first)} GOES FIRST`;
      sync();
      await sleep(400);
    }
    if (mySeq !== gameSeq) return;
    setTimeout(() => { if (mySeq !== gameSeq) return; runShakePhase(() => beginPlay()); }, 700);
  })();
}

/* ===================== RESTART / POTS ===================== */
function showRestartModal() {
  if (window.MP && MP.active && MP.me === 'guest') { newGame(); return; }
  const cur = money(bankroll);
  const decks = potDecks;
  showModal(
    `<h2>RESTART?</h2>
     <p>Current pot: <b>${cur}</b> &middot; ${decks} deck${decks === 1 ? '' : 's'} played</p>
     <p style="color:#8bd6a8">Keep your pot winnings and just reshuffle, or cash out this pot and start fresh at $0?</p>
     <div class="row">
       <button class="btn go" id="restartKeep">KEEP POT (${cur})</button>
       <button class="btn" id="restartNew">NEW POT ($0)</button>
     </div>
     <p style="opacity:.7;font-size:12px;margin-top:8px">New Pot saves this pot (${cur} after ${decks} deck${decks === 1 ? '' : 's'}) to your pot history.</p>
     <div class="row"><button class="btn ghost" id="restartCancel">CANCEL</button></div>`, true);
  wireModalButtons({
    restartKeep: () => { closeModal(); newGame(); },
    restartNew: () => { closeModal(); startNewPot(); },
    restartCancel: () => closeModal()
  });
}

function startNewPot() {
  const isHost = !window.MP || !MP.active || MP.me === 'host';
  if (isHost) {
    const hist = loadPotHistory();
    if (bankroll !== 0 || potDecks > 0) {
      hist.unshift({ amount: bankroll, decks: potDecks, date: Date.now() });
      if (hist.length > 30) hist.length = 30;
      savePotHistory(hist);
    }
    bankroll = 0; saveBank(bankroll);
    potDecks = 0; savePotDecks(potDecks);
    paintBank();
  }
  newGame();
}
window.startNewPot = startNewPot;

function openPotHistory() {
  const hist = loadPotHistory();
  const curAmt = money(bankroll);
  const curDecks = potDecks;
  let histHtml;
  if (!hist.length) {
    histHtml = '<p style="opacity:.7">No finished pots yet.<br>Choose NEW POT on restart to save this pot here.</p>';
  } else {
    histHtml = '<div class="pot-list">' + hist.map((h, i) => {
      const d = new Date(h.date);
      const dateStr = isNaN(d.getTime()) ? '' : d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      const amtStr = money(h.amount);
      return `<div class="pot-row"><div><b>Pot ${hist.length - i}</b> <span class="pot-date">${dateStr}</span></div><div><b class="${h.amount < 0 ? 'neg' : ''}">${amtStr}</b> &middot; ${h.decks} deck${h.decks === 1 ? '' : 's'}</div></div>`;
    }).join('') + '</div>';
  }
  showModal(
    `<h2>POT HISTORY</h2>
     <p>Current pot: <b>${curAmt}</b> &middot; ${curDecks} deck${curDecks === 1 ? '' : 's'} played</p>
     ${histHtml}
     <div class="row"><button class="btn" onclick="closeModal()">CLOSE</button></div>`, true);
}
window.openPotHistory = openPotHistory;

/* ===================== 흔들기 (SHAKE) ===================== */
function findShakes(who) {
  if (!state) return [];
  const byMonth = groupByMonth(state[who].hand);
  return Object.keys(byMonth).filter(m => byMonth[m].length === 3).map(m => +m);
}
function runShakePhase(done) {
  const pMonths = findShakes('p');
  const cMonths = findShakes('c');
  if (cMonths.length) {
    state.c.shakes = cMonths.length;
    state.c.shakeMonths = cMonths;
    sfx('shake');
    funAnim('#cpuHand', 'shake-wobble', 1000);
    state.msg = `${nameOf('c')} SHAKES x${cMonths.length}! (${cMonths.map(m => MN[m]).join(', ')})`;
    sync();
  }
  const shouldPromptHostP = (pMonths.length > 0) && (!window.MP || !MP.active || MP.me === 'host');
  if (shouldPromptHostP) {
    showShakeModal(pMonths, (accepted) => {
      if (accepted) {
        state.p.shakes = pMonths.length;
        state.p.shakeMonths = pMonths;
        sfx('shake');
        funAnim('#myHand', 'shake-wobble', 1000);
        state.msg = `YOU SHAKE x${pMonths.length}! (${pMonths.map(m => MN[m]).join(', ')})`;
      }
      sync();
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
  wireModalButtons({
    shakeYes: () => { closeModal(); callback(true); },
    shakeNo: () => { closeModal(); callback(false); }
  });
}

function beginPlay() {
  state.busy = false;
  state.msg = state.msg || (state.turn === mySeat() ? 'YOUR TURN' : '');
  sync();
  if (state.turn === 'c') {
    if (window.MP && MP.active) {
      state.msg = 'FRIEND IS PLAYING...'; sync();
    } else {
      setTimeout(cpuPlay, 750);
    }
  }
}

/* ===================== RENDER ===================== */
/* Screen-reader text for a card, e.g. "Pine, month 1, Kwang". */
function cardLabel(c) {
  if (c.isBonus) return `Bonus card, ${c.bonusPi} pi`;
  const e = eff(c), m = MN[c.month] || ('Month ' + c.month);
  const t = e === KW ? (c.month === 12 ? 'Rain Kwang' : 'Kwang')
    : e === YU ? (c.bird ? 'Bird' : 'Yul')
    : e === TT ? (RN[c.rib] || 'Ribbon')
    : (c.dbl ? 'Pi, double' : 'Pi');
  return `${m}, month ${c.month}, ${t}`;
}
function cardHTML(c, extra = '') {
  const e = eff(c); let tg;
  if (c.isBonus) {
    tg = `<i class="tg pi2"><b>BONUS ${c.bonusPi} PI</b></i>`;
    return `<div class="card t-${e} ${extra}" title="Bonus ${c.bonusPi} Pi"><b class="mo">B</b><svg class="face"><use href="#card-${c.id}"/></svg>${tg}</div>`;
  }
  if (e === KW) tg = `<i class="tg kw"><svg class="ic"><use href="#sun"/></svg><b>${c.month === 12 ? 'RAIN KWANG' : 'KWANG'}</b></i>`;
  else if (e === YU) tg = `<i class="tg yl">${c.bird ? '<svg class="ic"><use href="#bird"/></svg>' : ''}<b>${c.bird ? 'BIRD' : 'YUL'}</b></i>`;
  else if (e === TT) { tg = `<i class="tg ${c.rib}"><b>${RN[c.rib]}</b></i>`; }
  else tg = `<i class="tg${c.dbl ? ' pi2' : ''}"><b>${c.dbl ? 'PI x2' : 'PI'}</b></i>`;
  return `<div class="card t-${e} ${extra}" title="${MN[c.month] || ''}"><b class="mo">${c.month}</b><svg class="face"><use href="#card-${c.id}"/></svg>${tg}</div>`;
}
function sortGroup(t, cards) {
  const k = c => t === TT ? (RIB_ORDER.has(c.rib) ? RIB_ORDER.get(c.rib) : 9) : t === YU ? (c.bird ? 0 : 1) : t === PI ? (c.dbl ? 0 : 1) : (c.month === 12 ? 1 : 0);
  return cards.slice().sort((a, b) => k(a) - k(b) || a.month - b.month);
}
function capturedHTML(w) {
  const cap = state[w].cap;
  const pt = state[w].pt || {total: 0};
  const totalBadge = `<span class="cap-total" title="Total points">${pt.total}pt</span>`;
  const emptyMsg = w === mySeat() ? 'YOUR CAPTURED CARDS - CLICK TO VIEW' : 'OPPONENT CAPTURED - CLICK TO VIEW';
  if (!cap.length) return totalBadge + `<span class="cap-empty-msg">${emptyMsg}</span>`;
  const order = [KW, YU, TT, PI];
  // Partition once instead of filtering per type (insertion order preserved).
  const buckets = { [KW]: [], [YU]: [], [TT]: [], [PI]: [] };
  cap.forEach(c => { const b = buckets[eff(c)]; if (b) b.push(c); });
  let out = totalBadge;
  order.forEach((t, gi) => {
    const g = buckets[t];
    if (!g.length) return;
    if (gi > 0) out += '<div class="grp-sep"></div>';
    sortGroup(t, g).forEach(c => {
      out += `<div class="wrap" data-w="${w}" data-t="${t}" title="Click to see collected cards">${cardHTML(c)}</div>`;
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

  // Keep keyboard focus on the same card across re-renders (innerHTML replaces the nodes).
  const fid = document.activeElement && document.activeElement.id;
  const refocus = fid && /^(mh|tb)-/.test(fid) ? fid : null;

  $('myHand').innerHTML = state[me].hand.map((c, i) => {
    const hit = can && !c.isBonus && state.table.some(t => t.month === c.month && !t.isBonus);
    const label = cardLabel(c) + (hit ? ', matches a card on the table' : '');
    return `<div class="wrap" id="mh-${c.id}" data-i="${i}" role="button" tabindex="${can ? 0 : -1}" aria-disabled="${can ? 'false' : 'true'}" aria-label="${label}">${cardHTML(c, can ? 'can' : '')}${hit ? '<span class="hit" aria-hidden="true">&#10003;</span>' : ''}</div>`;
  }).join('');

  $('cpuHand').innerHTML = state[opp].hand.map(c => `<div id="oh-${c.id}"><div class="card back"></div></div>`).join('');
  $('cpuHand').setAttribute('aria-label', `Opponent hand, ${state[opp].hand.length} cards`);

  // Group the table by month in a single pass (insertion order preserved).
  const tableByMonth = new Map();
  for (const c of state.table) {
    const g = tableByMonth.get(c.month);
    if (g) g.push(c); else tableByMonth.set(c.month, [c]);
  }
  const months = [...tableByMonth.keys()].sort((a, b) => a - b);
  $('tableCards').innerHTML = months.map(m => {
    const g = tableByMonth.get(m), pk = state.picking && g.some(c => state.picking.includes(c.id));
    return `<div class="stack${g.length > 1 ? ' pair' : ''}${pk ? ' open' : ''}">${state.ppeok.has(m) && g.length === 3 ? '<span class="flag">PPEOK</span>' : ''}` +
      g.map(c => { const pick = state.picking && state.picking.includes(c.id); return `<div id="tb-${c.id}" data-id="${c.id}" ${pick ? 'role="button" tabindex="0"' : 'role="img"'} aria-label="${pick ? 'Pick ' : ''}${cardLabel(c)}">${cardHTML(c, pick ? 'pick' : '')}</div>`; }).join('') + '</div>';
  }).join('');

  $('myCaptured').innerHTML = capturedHTML(me);
  $('cpuCaptured').innerHTML = capturedHTML(opp);
  $('myCaptured').setAttribute('aria-label', `Your captured cards, ${state[me].pt.total} points. Open list`);
  $('cpuCaptured').setAttribute('aria-label', `Opponent captured cards, ${state[opp].pt.total} points. Open list`);
  $('deck').setAttribute('aria-label', `Deck, ${state.deck.length} cards left` + (state.over ? '. Open to view' : ''));
  if (refocus) { const el = $(refocus); if (el && el.tabIndex >= 0) el.focus({ preventScroll: true }); }
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
  const wraps = [...el.children].filter(k => !k.classList.contains('grp-sep') && !k.classList.contains('cap-total') && !k.classList.contains('cap-empty-msg'));
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
let fitTableCache = null; // {key, tcw}: the fit is a pure function of table content + container size
function fitTable() {
  const table = document.querySelector('.table'), t = $('tableCards');
  if (!table || !t) return;
  // Cache key captures everything that can change the fitted width: the exact
  // table contents (grouping + PPEOK flags derive from these), container size.
  const key = t.clientWidth + 'x' + t.clientHeight + '|' + state.table.map(c => c.id).join(',') + '|' + [...state.ppeok].sort((a, b) => a - b).join(',');
  if (fitTableCache && fitTableCache.key === key) {
    table.style.setProperty('--tcw', fitTableCache.tcw);
    return;
  }
  const fits = () => t.scrollHeight <= t.clientHeight + 1 && t.scrollWidth <= t.clientWidth + 1;
  let lo = 22, hi = 92, best = lo;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    table.style.setProperty('--tcw', mid + 'px');
    if (fits()) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  table.style.setProperty('--tcw', best + 'px');
  fitTableCache = { key, tcw: best + 'px' };
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
$('myCaptured').onclick = () => openPlayerCards(mySeat());
$('cpuCaptured').onclick = () => openPlayerCards(oppSeat());
const _btnRules = $('btnRules'); if (_btnRules) _btnRules.onclick = () => openRules();
const _btnSound = $('btnSound'); if (_btnSound) { _btnSound.textContent = soundOn ? '🔊' : '🔇'; _btnSound.onclick = () => toggleSound(); }
const _btnSettings = $('btnSettings'); if (_btnSettings) _btnSettings.onclick = () => openSettings();
$('btnNew').onclick = showRestartModal;
const _bankBtn = $('bankBtn'); if (_bankBtn) _bankBtn.onclick = () => openPotHistory();

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
    sync();
  });
}
window.gsResolvePick = function (cardId) {
  if (!state || state.turn !== 'c' || !state.picking || !state.picking.includes(cardId) || !state.pickRes) return;
  const c = state.table.find(x => x.id === cardId);
  const r = state.pickRes;
  state.picking = null; state.pickRes = null; state.msg = '';
  sync();
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
  // Steal the lowest-value Pi first: single pi (1) before double pi (2)
  // before bonus pi (2 / 4). Bonus cards have no `dbl` flag, so order by
  // actual pi value instead of just checking `dbl`.
  let idx = -1, bestVal = Infinity;
  foe.cap.forEach((c, i) => {
    if (eff(c) !== PI) return;
    const v = piVal(c);
    if (v < bestVal) { bestVal = v; idx = i; }
  });
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
  sync();
  await sleep(200);
  return card;
}

/* ===================== 폭탄 (BOMB) ===================== */
function findSseop(who) {
  if (!state) return null;
  const me = state[who];
  const byMonth = groupByMonth(me.hand);
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

function showSseopModal(month, callback) {
  showModal(
    `<h2>폭탄 (BOMB)?</h2>
     <p>You can play all 3 <b>${MN[month]}</b> cards at once to complete the set and steal 1 pi from your opponent.</p>
     <p style="color:#8bd6a8">Or play just 1 card normally and keep the other 2 in hand.</p>
     <div class="row">
       <button class="btn go" id="sseopYes">폭탄 (PLAY 3)</button>
       <button class="btn" id="sseopNo">PLAY 1</button>
     </div>`, false);
  wireModalButtons({
    sseopYes: () => { closeModal(); callback(true); },
    sseopNo: () => { closeModal(); callback(false); }
  });
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
  sync();

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
  sync();
  await sleep(400);

  sfx('four');
  const stolen = await stealWithAnim(who);
  if (stolen) tags.push('+1 PI');

  state.msg = `${nameOf(who)}: ${tags.join(' · ')}`;
  sync();
  await sleep(700);

  if (!state.p.hand.length && !state.c.hand.length && !state.deck.length) {
    if (me.score >= stopPoints && me.score > before) finish(who, `${nameOf(who)} REACHED ${me.score} ON THE LAST TURN.`);
    else exhaust();
    return;
  }
  if (me.score >= stopPoints && me.score > before) { offerGoStop(who); return; }
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
  if (/TTADAK/.test(flat)) { sfx('ttadak'); }
  else if (/JJOK/.test(flat)) { sfx('jjok'); }
  if (/PPEOK!/.test(flat)) { sfx('ppeok'); funAnim('.table', 'shake-wobble', 800); showPoopBanner(); }
  if (/PPEOK CLEARED/.test(flat)) sfx('ppeokCleared');
  if (/SWEEP/.test(flat)) { sfx('sweep'); }
  // bomb-related: keep shake only for PPEOK (bomb) and shake at start
  // generic capture pop
  if (flat.trim()) {
    const who = state.turn;
    const sel = who === mySeat() ? '#myCaptured' : '#cpuCaptured';
    // add capture animation to newly added cards via CSS class
    setTimeout(() => {
      document.querySelectorAll(sel + ' .wrap:last-child .card').forEach(el => {
        el.classList.add('flip-anim');
        setTimeout(()=>el.classList.remove('flip-anim'), 400);
      });
    }, 50);
  }
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

  sync();
  const same = m => state.table.filter(c => c.month === m);
  const take = cs => { cs.forEach(c => { state.table = state.table.filter(t => t.id !== c.id); }); cap.push(...cs); };
  const remoteC = who === 'c' && window.MP && MP.active && MP.me === 'host';
  const choose = async opts => (who === mySeat() || remoteC) ? await pick(opts) : opts.slice().sort((a, b) => val(b) - val(a))[0];

  // Bonus cards: played from hand -> captured + steal 1 pi, then flip continues normally
  const bonusCaps = [];
  if (H && H.isBonus) {
    bonusCaps.push(H);
    tags.push(`BONUS +${H.bonusPi} PI`);
    steals++;
    showBonusBanner(H.bonusPi);
    sfx('bonus');
    H = null; chosen = null;
    sync();
  } else if (H) {
    const k = same(H.month).length;
    state.table.push(H); sync();
    netFly(from, 'tb-' + H.id, H);
    await land(H, from); sfx('deal');
    chosen = k === 2 ? await choose(same(H.month).filter(c => c.id !== H.id)) : null;
  }

  await sleep(220);
  let S = state.deck.pop();
  // Flipped bonus card: show a clear BONUS banner, then the player flips a
  // replacement card and play continues normally. The bonus is held aside
  // until the replacement resolves -- if the replacement forms a PPEOK, the
  // bonus joins the PPEOK pile on the table instead of being captured now.
  const flippedBonus = [];
  while (S && S.isBonus) {
    flippedBonus.push(S);
    tags.push(`BONUS +${S.bonusPi} PI (flip)`);
    showBonusBanner(S.bonusPi);
    sfx('bonus');
    sync();
    await sleep(1000);
    S = state.deck.pop();
  }
  if (S) {
    sync();
    const df = rect('deck');
    state.table.push(S); sync();
    netFly(df, 'tb-' + S.id, S);
    await land(S, df); sfx('flip');
  }

  const settle = async (X, pre) => {
    if (!X) return;
    const g = same(X.month), n = g.length - 1;
    if (n === 1) { take(g); sync(); }
    else if (n === 2) { take([X, pre || await choose(g.filter(c => c.id !== X.id))]); sync(); }
    else if (n === 3) {
      take(g);
      // Bonus cards parked on this PPEOK pile go to whoever clears it
      const parked = state.table.filter(c => c.isBonus && state.ppeokBonus && state.ppeokBonus[c.id] === X.month);
      parked.forEach(c => {
        state.table = state.table.filter(t => t.id !== c.id);
        bonusCaps.push(c); steals++;
        delete state.ppeokBonus[c.id];
      });
      if (parked.length) tags.push(`BONUS +${parked.reduce((a, c) => a + c.bonusPi, 0)} PI (PPEOK)`);
      if (state.ppeok.delete(X.month)) { tags.push('PPEOK CLEARED!'); }
      sync();
    }
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

  // Route flipped bonus cards: if this turn formed a PPEOK, park them on the
  // table with that PPEOK pile (whoever later eats the PPEOK takes them too).
  // Otherwise the current player captures them + steals 1 pi each.
  if (flippedBonus.length) {
    if (tags.includes('PPEOK!') && H) {
      flippedBonus.forEach(b => {
        state.table.push(b);
        state.ppeokBonus[b.id] = H.month;
      });
      tags.push('BONUS TO PPEOK!');
      sync();
    } else {
      flippedBonus.forEach(b => { bonusCaps.push(b); steals++; });
    }
  }
  
  if (cap.length && !state.table.length && (state.p.hand.length || state.c.hand.length || state.deck.length)) { steals++; tags.push('SWEEP!'); }

  // Add bonus cards to captured (they don't count for sweep)
  if (bonusCaps.length) cap.push(...bonusCaps);

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
  sync();
  const flashEl = who === mySeat() ? $('myCaptured') :$('cpuCaptured');
  if (cap.length && flashEl) { flashEl.classList.add('flash'); setTimeout(() => flashEl.classList.remove('flash'), 950); }
  await sleep(cap.length ? 600 : 250);

  if (!state.p.hand.length && !state.c.hand.length && !state.deck.length) {
    if (me.score >= stopPoints && me.score > before) finish(who, `${nameOf(who)} REACHED ${me.score} ON THE LAST TURN.`);
    else exhaust();
    return;
  }
  const goFloor = me.go > 0 ? me.goScore : 0;
  if (me.score >= stopPoints && me.score > goFloor) { offerGoStop(who); return; }
  pass(who);
}

function pass(w) {
  state.turn = other(w); state.busy = false; state.pending = null; sync();
  if (state.turn === 'c') {
    if (window.MP && MP.active) {
      state.msg = 'FRIEND IS PLAYING...'; sync();
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
    let v;
    if (c.isBonus) {
      v = 60 + c.bonusPi; // prioritize bonus cards to get the steal
    } else {
      const g = state.table.filter(t => t.month === c.month);
      v = g.length === 3 ? 100 : g.length ? 10 + Math.max(...g.map(val)) + val(c) : -val(c);
    }
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
// Exposed so the 2P layer can hand the 'c' seat back to the CPU if the guest disconnects.
window.cpuPlay = cpuPlay;
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
    ppeokBonus: state.ppeokBonus ? Object.assign({}, state.ppeokBonus) : {},
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
  wireModalButtons({
    cupPi: () => { closeModal(); done('pi'); },
    cupYul: () => { closeModal(); done('yul'); }
  });
}
async function chooseCup(who) {
  const cup = state[who].cap.find(c => c.special && !c.chosen);
  if (!cup) return;
  let pick;
  if (who === mySeat()) pick = await new Promise(res => showCupModal(res));
  else if (window.MP && MP.active && MP.me === 'host') {
    state.msg = 'FRIEND IS CHOOSING HOW TO COUNT THE CUP...'; sync();
    MP.send({ t: 'cup' });
    pick = await new Promise(res => { cupRes = res; });
  } else {
    const [a, b] = cupScores(who); pick = b > a ? 'yul' : 'pi';
  }
  cup.countAs = pick; cup.chosen = true;
  state.msg = ''; recalc(); sync();
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
    pickRes: null, pending: null, ppeok: new Set(), ppeokBonus: snap.ppeokBonus ? Object.assign({}, snap.ppeokBonus) : {},
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
// Re-render locally and push the snapshot to the guest; the common tail of game events.
const sync = () => { render(); broadcast(); };
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
  showGoBanner(state[w].go);
  state.msg = `${nameOf(w)} CALLED GO x${state[w].go}!`;
  pass(w);
}
function stahpCall(w) { closeModal(); sfx('stahp'); finish(w, `${nameOf(w)} CALLED STahp.`); }
window.goCall = goCall; window.stahpCall = stahpCall;

function exhaust() {
  const p = state.p, c = state.c;
  let w = null;
  if (p.go && !c.go) w = 'p'; else if (c.go && !p.go) w = 'c'; else if (p.go && c.go) w = p.score >= c.score ? 'p' : 'c';
  finish(w, w ? 'NO CARDS LEFT - THE PLAYER WHO CALLED GO WINS.' : `NO CARDS LEFT AND NOBODY REACHED ${stopPoints} - DRAW (NAGARI).`);
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
  // Loser penalties: Go-bak and Shake-bak
  // If loser called Go and then lost: go 1 -> x2, go 2 -> x3, etc.
  let loserMult = 1;
  const loserGo = L.go || 0;
  if (loserGo > 0) {
    const gm = loserGo + 1;
    loserMult *= gm;
    lines.push([`Go-bak (loser went ${loserGo}x)`, 'x' + gm]);
  }
  const loserShakes = L.shakes || 0;
  if (loserShakes > 0) {
    const sm = Math.pow(2, loserShakes);
    loserMult *= sm;
    lines.push([`Shake-bak (loser shook x${loserShakes})`, 'x' + sm]);
  }
  return {lines, total: (W.score + add) * mult * m * shakeMult * loserMult};
}
function finish(w, why) {
  state.over = true; state.busy = true; state.pending = null;
  state.result = {w, why, res: w ? payout(w) : null};
  let bankDelta = 0;
  if (w === 'p' && state.result.res) bankDelta = state.result.res.total;
  else if (w === 'c' && state.result.res) bankDelta = -state.result.res.total;
  const isHost = !window.MP || !MP.active || MP.me === 'host';
  if (bankDelta !== 0 && isHost) { updBank(bankDelta); sfx('bank'); }
  if (isHost) { potDecks += 1; savePotDecks(potDecks); }
  state.bankDelta = bankDelta;
  if (w === 'p') { sfx('win'); funAnim('#myCaptured', 'win-pulse', 3000); }
  else if (w === 'c') { sfx('lose'); funAnim('#cpuCaptured', 'win-pulse', 3000); }
  else { sfx('stahp'); }
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
let closable = true, modalOpener = null;
function showModal(html, canClose = true) {
  const modal = $('modal'), box = $('modalBox');
  if (modal.hidden) modalOpener = document.activeElement;   // remember where focus was
  closable = canClose; box.innerHTML = html; modal.hidden = false;
  const h = box.querySelector('h2');
  if (h) { h.id = 'modalTitle'; box.setAttribute('aria-labelledby', 'modalTitle'); } else box.removeAttribute('aria-labelledby');
  (box.querySelector('button') || box).focus({ preventScroll: true });
}
function closeModal() {
  $('modal').hidden = true;
  const o = modalOpener; modalOpener = null;
  if (o && o !== document.body && document.contains(o) && o.focus) o.focus({ preventScroll: true });
}
// Wire modal buttons by id once the modal HTML is in the DOM.
function wireModalButtons(map, delay = 0) {
  setTimeout(() => { for (const id in map) { const el = $(id); if (el) el.onclick = map[id]; } }, delay);
}
$('modal').onclick = e => { if (e.target ===$('modal') && closable) closeModal(); };

/* Keyboard: Enter/Space activate role="button" cards, arrows move along the hand,
   Esc closes dialogs, Tab stays inside an open dialog. */
['myHand', 'tableCards', 'deck', 'myCaptured', 'cpuCaptured'].forEach(id => {
  $(id).addEventListener('keydown', e => {
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.getAttribute('role') === 'button') { e.preventDefault(); t.click(); }
    else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && (id === 'myHand' || id === 'tableCards')) {
      const items = [...$(id).querySelectorAll('[role="button"][tabindex="0"]')], i = items.indexOf(t);
      if (i < 0) return;
      e.preventDefault();
      items[(i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length].focus();
    }
  });
});
document.addEventListener('keydown', e => {
  if ($('modal').hidden) return;
  if (e.key === 'Escape' && closable) { e.preventDefault(); closeModal(); }
  else if (e.key === 'Tab') {
    const f = [...$('modalBox').querySelectorAll('button,[href],input,select,[tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null);
    if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1];
    if (!$('modalBox').contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

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
  const d = sortByMonthVal(state.deck.slice());
  showModal(`<h2>DECK - ${d.length} card${d.length === 1 ? '' : 's'} left</h2>` +
    (d.length ? `<p>These cards were never flipped.</p><div class="sec"><div class="cards">${d.map(c => cardHTML(c, 'lg')).join('')}</div></div>` : '<p>The deck was played all the way through - nothing left.</p>') +
    '<div class="row"><button class="btn" onclick="closeModal()">CLOSE</button></div>', true);
}
function openRules() {
  showModal(`<h2>HOW TO PLAY</h2>
  <div class="sec" style="text-align:left;max-width:520px">
  <h4>Goal</h4>
  <p>First to ${stopPoints}+ points can call GO or STop. GO keeps playing for a bigger win, STop ends it and you collect.</p>
  <h4>Points</h4>
  <p>• Kwang: 3 cards = 3pt, 4 = 4pt, 5 = 15pt<br>
  • Yul: 5 cards = 1pt, +1 per extra. Godori (3 birds) = +5<br>
  • Tti: 5 cards = 1pt, +1 per extra. 3 of a set = 3pt<br>
  • Pi: 10 cards = 1pt, +1 per extra. Double Pi counts x2</p>
  <h4>GO bonus (winner)</h4>
  <p>1 GO = +1 pt, 2 GO = +2 pt, 3+ GO = x2, x4, x8...</p>
  <h4>Shake (at start)</h4>
  <p>Each shake doubles your win. x2 per shake.</p>
  <h4>Penalties - Go-bak / Shake-bak</h4>
  <p>If you GO and lose, you pay extra:<br>
  • Went 1x and lose = pay x2<br>
  • Went 2x and lose = pay x3<br>
  • Shake and lose = pay x2 per shake<br>
  They multiply together.</p>
  <h4>Bonus cards</h4>
  <p>Gold 2-pi and 4-pi cards. They can be dealt into hands (play one any turn: you take it + steal 1 opponent Pi, then flip as normal) or onto the table (first player takes them).<br>
  Flipped from the deck: you take it + steal 1 Pi, then flip again. If that next flip makes a PPEOK, the bonus stays on the table with the PPEOK pile — whoever eats the PPEOK takes it all.</p>
  <h4>Tip</h4>
  <p>Tap your captured area or opponent's to see all collected cards and points per group.</p>
  </div>
  <div class="row"><button class="btn" onclick="closeModal()">CLOSE</button></div>`, true);
}
function openSettings() {
  const sp5 = stopPoints === 5 ? 'checked' : '';
  const sp7 = stopPoints === 7 ? 'checked' : '';
  const tp = threePlayerMode ? 'checked' : '';
  showModal(`<h2>SETTINGS</h2>
  <div class="sec" style="text-align:left;max-width:480px">
    <h4>First Stop</h4>
    <p>Points needed to call GO / STOP:</p>
    <label style="display:block;margin:8px 0;cursor:pointer">
      <input type="radio" name="stopPts" value="5" ${sp5} style="margin-right:8px"> 5 points (faster games)
    </label>
    <label style="display:block;margin:8px 0;cursor:pointer">
      <input type="radio" name="stopPts" value="7" ${sp7} style="margin-right:8px"> 7 points (classic)
    </label>
    <h4 style="margin-top:18px">Players</h4>
    <label style="display:block;margin:8px 0;cursor:pointer;opacity:.8">
      <input type="checkbox" id="threePlayerToggle" ${tp} style="margin-right:8px"> 3-player game (coming soon)
    </label>
    <p style="font-size:12px;opacity:.7">3-player mode is a placeholder for now — turning it on won't change gameplay yet.</p>
  </div>
  <div class="row">
    <button class="btn go" id="settingsSave">SAVE</button>
    <button class="btn ghost" id="settingsClose">CLOSE</button>
  </div>`, true);
  wireModalButtons({
    settingsClose: () => { sfx('click', true); closeModal(); },
    settingsSave: () => {
      const sel = document.querySelector('input[name="stopPts"]:checked');
      if (sel) {
        stopPoints = parseInt(sel.value, 10);
        try { localStorage.setItem('goStop.stopPoints', String(stopPoints)); } catch(e) {}
      }
      const tpToggle = document.getElementById('threePlayerToggle');
      if (tpToggle) {
        threePlayerMode = tpToggle.checked;
        try { localStorage.setItem('goStop.threePlayer', threePlayerMode ? '1' : '0'); } catch(e) {}
      }
      sfx('click', true);
      closeModal();
    }
  }, 50);
}

newGame();


/* ===================== LABELS TOGGLE ===================== */
(function () {
  const LS = 'goStop.labels';
  const apply = on => { document.body.classList.toggle('labels', on); const b = $('btnLabels'); if (b) { b.textContent = on ? 'LABELS: ON' : 'LABELS: OFF'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); } };
  let on = false; try { on = localStorage.getItem(LS) === '1'; } catch (e) {}
  apply(on);
  const b = $('btnLabels');
  if (b) b.onclick = () => { on = !on; try { localStorage.setItem(LS, on ? '1' : '0'); } catch (e) {} apply(on); };
})();

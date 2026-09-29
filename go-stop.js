'use strict';
/* ===================== DATA ===================== */
const KW = 'Kwang', YU = 'Yul', TT = 'Tti', PI = 'Pi';
const MN = ['', 'Pine', 'Plum', 'Cherry', 'Wisteria', 'Iris', 'Peony', 'Bush Clover', 'Moon', 'Chrysanthemum', 'Maple', 'Paulownia', 'Rain'];
const MC = ['', '#cde8c4', '#f6c9c9', '#fbd3e6', '#d9cdee', '#cbd8f5', '#f2b9c9', '#e8e3b0', '#dcdce8', '#f7e7a1', '#f2c9a5', '#cdb8dc', '#b9d7e6'];
const RN = {hong: 'HONG', cheong: 'CHEONG', cho: 'CHO', rain: 'RAIN'};
const SETS = [['hong', 'Hongdan (red, poetry)', '#e04040'], ['cheong', 'Cheongdan (blue)', '#3f78e8'], ['cho', 'Chodan (red, plain)', '#f08a3a']];
/* [month, K=kwang Y=yul T=tti P=pi, extra]  extra: {b:1} bird, {sp:1} month-9 cup, {d:1} double pi, string = ribbon kind */
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
const val = c => eff(c) === KW ? (c.month === 12 ? 6 : 8) : eff(c) === YU ? (c.bird ? 6 : 4) : eff(c) === TT ? 3 : (c.dbl ? 2 : 1);

/* ===================== SCORING (single source of truth) ===================== */
function parts(cards) {
  const kw = cards.filter(c => eff(c) === KW), yl = cards.filter(c => eff(c) === YU), tt = cards.filter(c => eff(c) === TT);
  const pn = cards.reduce((n, c) => n + (eff(c) === PI ? (c.dbl ? 2 : 1) : 0), 0);
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
function autoSpecial(cards) {           /* the month-9 cup is counted whichever way scores more */
  const sp = cards.find(c => c.special); if (!sp) return;
  sp.countAs = 'pi'; const a = parts(cards).total;
  sp.countAs = 'yul'; const b = parts(cards).total;
  sp.countAs = b > a ? 'yul' : 'pi';
}

/* ===================== STATE ===================== */
let state = null;
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const other = w => w === 'p' ? 'c' : 'p';
const nameOf = w => w === 'p' ? 'YOU' : 'CPU';
function recalc() { ['p', 'c'].forEach(w => { autoSpecial(state[w].cap); state[w].pt = parts(state[w].cap); state[w].score = state[w].pt.total; }); }

function newGame() {
  let deck, bad;
  do {                                   /* re-deal the (rare) four-of-a-month hands: chongtong isn't implemented */
    deck = makeDeck().sort(() => Math.random() - .5);
    const cnt = a => { const m = {}; a.forEach(c => m[c.month] = (m[c.month] || 0) + 1); return Object.values(m).some(n => n >= 4); };
    bad = cnt(deck.slice(0, 10)) || cnt(deck.slice(10, 20)) || cnt(deck.slice(20, 28));
  } while (bad);
  const sort = a => a.sort((x, y) => x.month - y.month || val(y) - val(x));
  state = {p: {hand: sort(deck.slice(0, 10)), cap: [], go: 0, score: 0}, c: {hand: sort(deck.slice(10, 20)), cap: [], go: 0, score: 0},
    table: deck.slice(20, 28), deck: deck.slice(28), turn: 'p', busy: false, over: false, msg: 'GAME STARTED - YOUR TURN', picking: null, pickRes: null,
    pending: null, ppeok: new Set(), result: null};
  recalc(); closeModal(); $('btnResults').hidden = true; render();
}

/* ===================== RENDER ===================== */
function cardHTML(c, extra = '') {
  const e = eff(c); let tg, rib = '';
  if (e === KW) tg = `<i class="tg kw"><svg class="ic"><use href="#sun"/></svg><b>${c.month === 12 ? 'RAIN KWANG' : 'KWANG'}</b></i>`;
  else if (e === YU) tg = `<i class="tg yl">${c.bird ? '<svg class="ic"><use href="#bird"/></svg>' : ''}<b>${c.bird ? 'BIRD' : 'YUL'}</b></i>`;
  else if (e === TT) { rib = `<i class="rib ${c.rib}"></i>`; tg = `<i class="tg ${c.rib}"><b>${RN[c.rib]}</b></i>`; }
  else tg = `<i class="tg${c.dbl ? ' pi2' : ''}"><b>${c.dbl ? 'PI x2' : 'PI'}</b></i>`;
  return `<div class="card t-${e} ${extra}" style="--c:${MC[c.month]}" title="${MN[c.month]}"><b class="mo">${c.month}</b><svg class="art"><use href="#m${c.month}"/></svg>${rib}${tg}</div>`;
}
const ic = (id, on, col) => `<svg class="ic${on ? '' : ' off'}" style="color:${col}"><use href="#${id}"/></svg>`;
function sortGroup(t, cards) {           /* highest-value sets first, same kinds side by side */
  const k = c => t === TT ? [SETS.findIndex(s => s[0] === c.rib) < 0 ? 9 : SETS.findIndex(s => s[0] === c.rib)] : t === YU ? [c.bird ? 0 : 1] : t === PI ? [c.dbl ? 0 : 1] : [c.month === 12 ? 1 : 0];
  return cards.slice().sort((a, b) => k(a)[0] - k(b)[0] || a.month - b.month);
}
function sideHTML(w, title) {
  const P = state[w], pt = P.pt, by = t => P.cap.filter(c => eff(c) === t);
  const turn = !state.over && state.turn === w ? (w === 'p' ? 'YOUR TURN' : 'THINKING...') : '';
  let h = `<div class="pcard"><h3><span>${title}</span><span>${turn}</span></h3><div class="score">${P.score}<span class="sub"> pts${P.go ? ' · GO x' + P.go : ''}</span></div></div>`;
  const G = [
    ['K', KW, 'KWANG', `<div class="ind">${[0,1,2,3,4].map(i => ic('sun', i < pt.nK, '#f5c542')).join('')}</div>`],
    ['Y', YU, 'YUL', `<div class="ind">${[0,1,2].map(i => ic('bird', i < pt.birds, '#7ee0a0')).join('')}<small>GODORI</small></div><span>${pt.nY} yul</span>`],
    ['T', TT, 'TTI', SETS.map(([k, , col]) => `<div class="ind">${[0,1,2].map(i => ic('rib', i < pt.setN[k], col)).join('')}</div>`).join('') + `<span>${pt.nT} tti</span>`],
    ['P', PI, 'PI', `<span>${pt.pn}/10 value</span>`]];
  G.forEach(([key, t, label, inds]) => {
    const cards = sortGroup(t, by(t)), shown = cards.slice(0, 12);
    h += `<div class="grp g${key}" data-w="${w}" data-t="${t}" title="Click to enlarge"><div class="gh"><b>${label}</b><em>${pt.g[key]} pt</em></div><div class="inds">${inds}</div>` +
      `<div class="strip">${shown.map(c => cardHTML(c, 'sm')).join('') || '<span class="more" style="margin:0">-</span>'}${cards.length > 12 ? `<span class="more">+${cards.length - 12}</span>` : ''}</div></div>`;
  });
  return h;
}
function render() {
  $('deckN').textContent = state.deck.length;
  $('msg').textContent = state.over ? `GAME OVER - YOU ${state.p.score} : ${state.c.score} CPU` : (state.msg || (state.turn === 'p' ? 'YOUR TURN - PICK A CARD' : 'CPU IS PLAYING...'));
  const can = state.turn === 'p' && !state.busy && !state.over && !state.pending;
  $('myHand').innerHTML = state.p.hand.map((c, i) => `<div class="wrap" id="ph-${c.id}" data-i="${i}">${cardHTML(c, can ? 'can' : '')}${can && state.table.some(t => t.month === c.month) ? '<span class="hit">&#10003;</span>' : ''}</div>`).join('');
  $('cpuHand').innerHTML = state.c.hand.map(c => `<div id="ch-${c.id}"><div class="card back"></div></div>`).join('');
  const months = [...new Set(state.table.map(c => c.month))].sort((a, b) => a - b);
  $('tableCards').innerHTML = months.map(m => {
    const g = state.table.filter(c => c.month === m), pk = state.picking && g.some(c => state.picking.includes(c.id));
    return `<div class="stack${g.length > 1 ? ' pair' : ''}${pk ? ' open' : ''}">${state.ppeok.has(m) && g.length === 3 ? '<span class="flag">PPEOK</span>' : ''}` +
      g.map(c => `<div id="tb-${c.id}" data-id="${c.id}">${cardHTML(c, state.picking && state.picking.includes(c.id) ? 'pick' : '')}</div>`).join('') + '</div>';
  }).join('');
  $('cpuSide').innerHTML = sideHTML('c', 'COMPUTER');
  $('mySide').innerHTML = sideHTML('p', 'PLAYER');
}
$('myHand').onclick = e => { const w = e.target.closest('.wrap'); if (w) humanPlay(+w.dataset.i); };
$('tableCards').onclick = e => {
  const d = e.target.closest('[data-id]');
  if (!d || !state.picking || !state.picking.includes(d.dataset.id)) return;
  const c = state.table.find(x => x.id === d.dataset.id), r = state.pickRes;
  state.picking = null; state.pickRes = null; state.msg = ''; render(); r(c);
};
['cpuSide', 'mySide'].forEach(id => $(id).onclick = e => { const g = e.target.closest('.grp'); if (g) openGroup(g.dataset.w, g.dataset.t); });
$('btnNew').onclick = newGame;
$('btnResults').onclick = () => showResult();

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
  return new Promise(res => { state.picking = options.map(c => c.id); state.pickRes = res; state.msg = 'TWO MATCHES - TAP THE CARD YOU WANT'; render(); });
}

/* ===================== TURN ===================== */
function humanPlay(i) { if (state.turn === 'p' && !state.busy && !state.over && !state.pending) playTurn('p', i); }

function steal(w) {                      /* take one pi from the opponent (single pi first) */
  const me = state[w], foe = state[other(w)];
  let i = foe.cap.findIndex(c => eff(c) === PI && !c.dbl); if (i < 0) i = foe.cap.findIndex(c => eff(c) === PI);
  if (i < 0) return false; me.cap.push(foe.cap.splice(i, 1)[0]); return true;
}

async function playTurn(who, idx) {
  if (state.busy || state.over) return;
  state.busy = true; state.msg = '';
  const me = state[who], before = me.score, tags = [], cap = [];
  let steals = 0;
  const H = me.hand.splice(idx, 1)[0];
  const from = rect((who === 'p' ? 'ph-' : 'ch-') + H.id);
  render();
  const same = m => state.table.filter(c => c.month === m);
  const take = cs => { cs.forEach(c => { state.table = state.table.filter(t => t.id !== c.id); }); cap.push(...cs); };
  const choose = async opts => who === 'p' ? await pick(opts) : opts.slice().sort((a, b) => val(b) - val(a))[0];

  /* 1. hand card goes onto the table */
  const k = same(H.month).length;        /* matching cards already there */
  state.table.push(H); render(); await land(H, from);
  const chosen = k === 2 ? await choose(same(H.month).filter(c => c.id !== H.id)) : null;

  /* 2. flip the stock card */
  await sleep(220);
  const S = state.deck.pop();
  if (S) { render(); const df = rect('deck'); state.table.push(S); render(); await land(S, df); }

  /* 3. resolve */
  const settle = async (X, pre) => {
    const g = same(X.month), n = g.length - 1;
    if (n === 1) take(g);
    else if (n === 2) take([X, pre || await choose(g.filter(c => c.id !== X.id))]);
    else if (n === 3) { take(g); if (state.ppeok.delete(X.month)) { steals++; tags.push('PPEOK CLEARED'); } }
  };
  if (S && S.month === H.month) {
    const g = same(H.month);
    if (g.length === 2) { take(g); steals++; tags.push('JJOK!'); }                           /* hand card then stock card match each other */
    else if (g.length === 3) { state.ppeok.add(H.month); tags.push('PPEOK! (3 stay on the table)'); }
    else if (g.length === 4) { take(g); steals++; tags.push('TTADAK!'); }                     /* two pairs of one month */
  } else {
    await settle(H, chosen);
    if (S) await settle(S);
  }
  if (cap.length && !state.table.length && (state.p.hand.length || state.c.hand.length || state.deck.length)) { steals++; tags.push('SWEEP!'); }

  me.cap.push(...cap);
  for (let i = 0; i < steals; i++) if (steal(who)) tags.push('+1 PI TAKEN');
  recalc();
  state.msg = tags.length ? `${nameOf(who)}: ${tags.join(' · ')}` : '';
  render();
  const sd = $(who === 'p' ? 'mySide' : 'cpuSide'); if (cap.length && sd) { sd.classList.add('flash'); setTimeout(() => sd.classList.remove('flash'), 950); }
  await sleep(cap.length ? 600 : 250);

  /* 4. end checks */
  if (!state.p.hand.length && !state.c.hand.length) {
    if (me.score >= 7 && me.score > before) finish(who, `${nameOf(who)} REACHED ${me.score} ON THE LAST TURN.`);
    else exhaust();
    return;
  }
  if (me.score >= 7 && me.score > before) { offerGoStop(who); return; }
  pass(who);
}
function pass(w) {
  state.turn = other(w); state.busy = false; state.pending = null; render();
  if (state.turn === 'c') setTimeout(cpuPlay, 750);
}
function cpuPlay() {
  if (state.over || state.turn !== 'c') return;
  let best = 0, bv = -1e9;
  state.c.hand.forEach((c, i) => {
    const g = state.table.filter(t => t.month === c.month);
    const v = g.length === 3 ? 100 : g.length ? 10 + Math.max(...g.map(val)) + val(c) : -val(c);
    if (v > bv) { bv = v; best = i; }
  });
  playTurn('c', best);
}

/* ===================== GO / STOP ===================== */
function offerGoStop(w) {
  state.pending = w; state.busy = true;
  if (w === 'p') {
    const g = state.p.go + 1;
    showModal(`<h2>${state.p.score} POINTS!</h2><p>GO: keep playing for a bigger win. Each Go adds a bonus (${g === 1 ? '+1' : g === 2 ? '+2' : 'x' + 2 ** (g - 2) + ' total'}), but if the CPU then scores more than you, you lose double (Go-bak).</p><p>STOP: end the game now and win.</p>
      <div class="row"><button class="btn go" onclick="goCall('p')">GO</button><button class="btn" onclick="stopCall('p')">STOP</button></div>`, false);
  } else {
    state.msg = `CPU REACHED ${state.c.score} POINTS...`; render();
    setTimeout(() => (state.c.hand.length >= 4 && state.p.score <= 1 && state.c.go < 2) ? goCall('c') : stopCall('c'), 1300);
  }
}
function goCall(w) { closeModal(); state[w].go++; state.msg = `${nameOf(w)} CALLED GO x${state[w].go}!`; pass(w); }
function stopCall(w) { closeModal(); finish(w, `${nameOf(w)} CALLED STOP.`); }
function exhaust() {
  const p = state.p, c = state.c;
  let w = null;
  if (p.go && !c.go) w = 'p'; else if (c.go && !p.go) w = 'c'; else if (p.go && c.go) w = p.score >= c.score ? 'p' : 'c';
  finish(w, w ? 'NO CARDS LEFT - THE PLAYER WHO CALLED GO WINS.' : 'NO CARDS LEFT AND NOBODY REACHED 7 - DRAW (NAGARI).');
}
function payout(w) {                     /* 1 Go +1, 2 Go +2, 3+ Go doubles each time; then bak multipliers */
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
  render(); showResult(); $('btnResults').hidden = false;
}
function showResult() {
  const r = state.result; if (!r) return;
  const title = r.w === 'p' ? 'YOU WIN!' : r.w === 'c' ? 'CPU WINS' : 'DRAW';
  const lines = r.res ? `<div class="lines">${r.res.lines.map(l => `<div><span>${l[0]}</span><b>${l[1]}</b></div>`).join('')}<div class="total"><span>FINAL</span><b>${r.res.total} pts</b></div></div>` : '';
  showModal(`<h2>${title}</h2><p>${r.why}</p><p>You ${state.p.score} : ${state.c.score} CPU</p>${lines}
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
  [PI]: '10+ Pi value = 1 pt, +1 for each more (double pi count 2)'};
function sections(t, cs) {
  const S = [], pt = parts(cs);
  if (t === KW) S.push({title: 'Kwang', cards: cs.filter(c => c.month !== 12)}, {title: 'Rain Kwang', cards: cs.filter(c => c.month === 12)});
  if (t === YU) S.push({title: 'Godori birds', badge: pt.birds === 3 ? '+5' : `${pt.birds}/3`, done: pt.birds === 3, cards: cs.filter(c => c.bird)}, {title: 'Other Yul', cards: cs.filter(c => !c.bird)});
  if (t === TT) {
    SETS.map(([k, n]) => ({title: n, badge: pt.setN[k] >= 3 ? '+3' : `${pt.setN[k]}/3`, done: pt.setN[k] >= 3, n: pt.setN[k], cards: cs.filter(c => c.rib === k)}))
      .sort((a, b) => (b.done - a.done) || (b.n - a.n)).forEach(s => S.push(s));
    S.push({title: 'Other ribbons (Rain)', cards: cs.filter(c => !SETS.some(s => s[0] === c.rib))});
  }
  if (t === PI) S.push({title: 'Double Pi (each counts 2)', cards: cs.filter(c => c.dbl)}, {title: 'Pi (each counts 1)', cards: cs.filter(c => !c.dbl)});
  return S.filter(s => s.cards.length);
}
function openGroup(w, t) {
  const cs = state[w].cap.filter(c => eff(c) === t); if (!cs.length) return;
  const key = {[KW]: 'K', [YU]: 'Y', [TT]: 'T', [PI]: 'P'}[t], pt = state[w].pt;
  const cup = t === PI && cs.some(c => c.special) ? '<p>Month-9 cup is counted as Double Pi here (auto-picks whichever scores more).</p>' : (t === YU && cs.some(c => c.special) ? '<p>Month-9 cup is counted as a Yul here.</p>' : '');
  showModal(`<h2>${nameOf(w) === 'YOU' ? 'YOUR' : 'CPU'} ${t.toUpperCase()} - ${cs.length} cards</h2><div class="total">Group worth: ${pt.g[key]} pt${pt.g[key] === 1 ? '' : 's'}</div><p>${RULE[t]}</p>${cup}` +
    sections(t, sortGroup(t, cs)).map(s => `<div class="sec"><h4>${s.title} (${s.cards.length})${s.badge ? `<em class="${s.done ? 'done' : ''}">${s.badge}</em>` : ''}</h4><div class="cards">${s.cards.map(c => cardHTML(c, 'lg')).join('')}</div></div>`).join('') +
    '<div class="row"><button class="btn" onclick="closeModal()">CLOSE</button></div>', true);
}

newGame();

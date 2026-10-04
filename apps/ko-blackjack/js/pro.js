/* Pro tools for KO Blackjack. Loaded after trainer.js. Wraps the engine from outside (like trainer.js):
   sound pass, bet-ramp grading, spaced repetition, table-distraction bots, drill levels,
   bankroll/risk view, accuracy heatmap, backup/restore. Data: koTrainer.*.v1 in localStorage. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), DAY = 864e5;
  const inMP = () => !!(window.MP && window.MP.active);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const fmtN = n => (n > 0 ? '+' : n < 0 ? '\u2212' : '') + Math.abs(n);
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const K = {pro: 'koTrainer.pro.v1', bets: 'koTrainer.bets.v1', rounds: 'koTrainer.rounds.v1', srs: 'koTrainer.srs.v1', spots: 'koTrainer.spots.v1', level: 'koTrainer.drilllevel.v1'};
  const P = Object.assign({vol: 0.8, bots: false, seats: 2, noise: false, skill: 'perfect', pace: 'normal'}, rd(K.pro, {}));
  const SKILLS = ['perfect', 'mixed', 'casual'], PACE = {slow: [1000, 600, 300], normal: [600, 350, 230], fast: [220, 120, 130], instant: [0, 0, 60]};   /* [between bot actions, before the first, deal step] in ms */
  if (!Array.isArray(P.skills)) P.skills = [P.skill, P.skill, P.skill, P.skill];
  P.skills = [0, 1, 2, 3].map(i => SKILLS.includes(P.skills[i]) ? P.skills[i] : 'perfect'); if (!PACE[P.pace]) P.pace = 'normal';
  const pace = () => PACE[P.pace];
  const saveP = () => wr(K.pro, P);
  let bets = rd(K.bets, []), rounds = rd(K.rounds, []), srs = rd(K.srs, {}), lvl = rd(K.level, {});

  /* ================= 1. SOUND: master volume + compressor, per-sound jitter, new cues ================= */
  let master = null;
  function out(a) {
    if (!master || master.ctx !== a) {
      const g = a.createGain(), c = a.createDynamicsCompressor();
      g.connect(c); c.connect(a.destination); master = g; g.ctx = a;
    }
    master.gain.value = P.vol; return master;
  }
  window.tone = function (a, t, f, dur, g, type = 'sine', to = null) {
    const j = 1 + (Math.random() - .5) * .06, o = a.createOscillator(), gn = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f * j, t); if (to) o.frequency.exponentialRampToValueAtTime(to * j, t + dur);
    g *= 1 + (Math.random() - .5) * .16;
    gn.gain.setValueAtTime(.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + .01); gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(gn); gn.connect(out(a)); o.start(t); o.stop(t + dur + .02);
  };
  window.noise = function (a, t, dur, f, g, type = 'bandpass') {
    const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(), fl = a.createBiquadFilter(), gn = a.createGain();
    s.buffer = buf; fl.type = type; fl.frequency.value = f * (1 + (Math.random() - .5) * .2); fl.Q.value = .9;
    gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(fl); fl.connect(gn); gn.connect(out(a)); s.start(t);
  };
  function cue(n) {
    if (!soundOn) return; const a = ac(); if (!a) return; const t = a.currentTime;
    if (n === 'bj') [523, 659, 784, 1046, 1318].forEach((f, i) => tone(a, t + i * .07, f, .3, .15, 'triangle'));
    else if (n === 'bust') { tone(a, t, 220, .35, .18, 'sawtooth', 90); noise(a, t, .2, 500, .2, 'lowpass'); }
    else if (n === 'split') { noise(a, t, .05, 3000, .25); tone(a, t, 600, .08, .1, 'triangle', 900); tone(a, t + .09, 800, .08, .1, 'triangle', 1100); }
    else if (n === 'dbl') { noise(a, t, .04, 4500, .3, 'highpass'); tone(a, t, 1000, .07, .12, 'triangle'); tone(a, t + .06, 1000, .07, .12, 'triangle'); }
    else if (n === 'ok') tone(a, t, 1175, .12, .1, 'sine', 1568);
    else if (n === 'streak') [784, 988, 1175, 1568].forEach((f, i) => tone(a, t + i * .06, f, .2, .12, 'sine'));
  }
  const toast = (m, cls) => {
    const e = document.createElement('div'); e.className = 'pro-toast ' + (cls || ''); e.textContent = m;
    document.body.appendChild(e); setTimeout(() => e.remove(), 2200);
  };
  document.addEventListener('pointerdown', () => { if (soundOn) { const a = ac(); if (a) out(a); } }, {passive: true});

  /* ================= 2. Strategy streak/cues + spaced repetition (Leitner 1/3/7 days) ================= */
  const BOX = [1, 3, 7].map(d => d * DAY);
  let prev = rd(K.spots, {}), streak = 0;
  function afterPlay() {
    const cur = rd(K.spots, {}), now = Date.now();
    for (const k in cur) {
      const c = cur[k], p = prev[k] || {n: 0, m: 0};
      if (c.n <= p.n) continue;
      if (c.m > p.m) { srs[k] = {box: 0, due: now + BOX[0]}; streak = 0; }
      else {
        streak++; if (streak > 0 && streak % 10 === 0) { cue('streak'); toast(streak + ' correct in a row'); } else cue('ok');
        const s = srs[k];
        if (s && now >= s.due) { s.box++; if (s.box >= BOX.length) delete srs[k]; else s.due = now + BOX[s.box]; }
      }
    }
    prev = cur; wr(K.srs, srs); badge();
  }
  const dueKeys = () => Object.keys(srs).filter(k => srs[k].due <= Date.now() && prev[k] && prev[k].m > 0);
  const oPM = window.processMove;
  window.processMove = function (action) {
    const ok = oPM.apply(this, arguments);
    if (ok && action === 'Split') cue('split'); else if (ok && action === 'Double') cue('dbl');
    afterPlay(); return ok;
  };
  const oHI = window.handleInsurance;
  window.handleInsurance = function () { const r = oHI.apply(this, arguments); afterPlay(); return r; };

  /* review dealing: replaces trainer's weakDeal. forced = Weak Spots mode; otherwise only due spots, ~30% of hands */
  const eq = v => c => c.numVal === v, pickOne = a => a[Math.floor(Math.random() * a.length)];
  const mappable = sp => sp.kind === 'I' || (sp.kind === 'P' ? sp.tot >= 2 && sp.tot <= 11 : sp.kind === 'S' ? sp.tot >= 13 && sp.tot <= 20 : sp.tot >= 5 && sp.tot <= 19);
  function canDeal(preds) {
    const used = new Set();
    for (const p of preds) { const i = STATE.deck.findIndex((c, x) => !used.has(x) && p(c)); if (i < 0) return false; used.add(i); }
    return true;
  }
  window.weakDeal = function (forced) {
    if (inMP()) return null;
    if (!forced && (STATE.practiceMode !== 'all' || Math.random() > .3)) return null;
    const sp0 = rd(K.spots, {}), due = new Set(dueKeys());
    let c = Object.keys(sp0).map(k => Object.assign({key: k}, sp0[k])).filter(s => s.m > 0 && s.n > 0 && mappable(s));
    if (!forced) c = c.filter(s => due.has(s.key));
    if (!c.length || (forced && Math.random() < .2)) return null;
    const w = s => Math.max(s.m * (s.m / s.n), .05) * (due.has(s.key) ? 3 : 1), tot = c.reduce((x, s) => x + w(s), 0);
    let r = Math.random() * tot, sp = c[0]; for (const s of c) { r -= w(s); if (r <= 0) { sp = s; break; } }
    let a, b;
    if (sp.kind === 'I') { a = x => x.numVal <= 9; b = a; }
    else if (sp.kind === 'P') { a = eq(sp.tot); b = a; }
    else if (sp.kind === 'S') { a = eq(11); b = eq(sp.tot - 11); }
    else { const o = []; for (let x = Math.max(2, sp.tot - 10); x <= Math.min(10, sp.tot - 2); x++) if (x !== sp.tot - x) o.push(x); if (!o.length) return null; const x = pickOne(o); a = eq(x); b = eq(sp.tot - x); }
    const up = eq(sp.kind === 'I' ? 11 : sp.up);
    if (!canDeal([a, b, up])) return null;
    if (Math.random() < .5) [a, b] = [b, a];
    return {p1: pullCard(a), p2: pullCard(b), d1: pullCard(up)};
  };

  /* ================= 3. Bet-ramp grading + round log (for risk view) ================= */
  let pend = null;
  const oDeal = window.dealHand;
  window.dealHand = function () {
    if (STATE.currentBet > 0 && !STATE.shuffling && !inMP()) {
      const ideal = betForRC(STATE.numDecks, STATE.koCount), bet = STATE.currentBet, rows = rampFor(STATE.numDecks).map(r => r[1]);
      const ui = rows.indexOf(ideal), near = [rows[ui - 1], rows[ui], rows[ui + 1]].includes(bet) || bet === ideal;
      pend = {bet, rc: STATE.koCount, net0: STATE.stats.netEarnings};
      if (STATE.practiceMode === 'all' && STATE.showHints) {
        const g = bet === ideal ? 'exact' : near ? 'close' : 'off';
        bets.unshift({t: Date.now(), rc: STATE.koCount, ideal, bet, g}); bets.length = Math.min(bets.length, 300); wr(K.bets, bets);
        toast(g === 'exact' ? 'Bet on the ramp' : 'Ramp says $' + ideal + ' at ' + fmtN(STATE.koCount) + ' (you bet $' + bet + ')', g === 'exact' ? '' : g === 'close' ? 'mid' : 'bad');
      }
    }
    return oDeal.apply(this, arguments);
  };
  const oRes = window.resolveGame;
  window.resolveGame = async function () {
    const r = await oRes.apply(this, arguments);
    const txt = STATE.playerHands.map(h => (h.result && h.result.label) || '').join(' ');
    if (/blackjack/i.test(txt) && !/dealer/i.test(txt)) cue('bj'); else if (/bust/i.test(txt)) cue('bust');
    if (pend) {
      rounds.unshift({t: Date.now(), bet: pend.bet, net: STATE.stats.netEarnings - pend.net0}); rounds.length = Math.min(rounds.length, 1000);
      wr(K.rounds, rounds); pend = null;
    }
    return r;
  };

  /* ================= 4. Table distraction: simulated players whose cards you must count too ================= */
  const botBox = document.createElement('div'); botBox.id = 'botSeats';
const mainEl = document.querySelector('main'); if (mainEl) mainEl.appendChild(botBox);
  let botHands = [], botSeq = 0;
  const faceHtml = (c, anim) => '<div class="playing-card ' + (c.isRed ? 'red' : 'black') + ' card-overlap' + (anim ? ' card-deal-anim' : '') + '"><div class="leading-none text-left">' + c.value +
    '</div><div class="card-pip flex-grow flex items-center justify-center">' + c.suit + '</div><div class="leading-none text-left rotate-180">' + c.value + '</div></div>';
  /* Seats sit on both sides of you along the near edge of the table (dealer stays across); outer seats curve toward the dealer.
     The seat shells are built once per round, then cards are appended one by one so each new card plays the real deal animation. */
  const seatNo = i => i < Math.ceil(botHands.length / 2) ? i + 1 : i + 1 + (inMP() ? 2 : 1); /* seats numbered left to right; human seat(s) in the middle */
  function botBuild() {
    const n = botHands.length, L = Math.ceil(n / 2), seat = (h, i, rank) => { const d = document.createElement('div'); d.className = 'bot-seat'; d.style.setProperty('--lift', rank * 28 + 'px');
      d.innerHTML = '<b>Player ' + seatNo(i) + '</b><div class="bot-hands"></div><div class="bot-results"></div>'; h.el = d; return d; };
    botBox.innerHTML = '<div class="bot-side l"></div><div class="bot-gap"></div><div class="bot-side r"></div>';
    botHands.forEach((h, i) => botBox.children[i < L ? 0 : 2].appendChild(seat(h, i, i < L ? L - 1 - i : i - L)));
  }
  const RANKN = {A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack'}, SUITN = {'\u2660': 'spades', '\u2665': 'hearts', '\u2666': 'diamonds', '\u2663': 'clubs'};
  const cardName = c => (RANKN[c.value] || c.value) + ' of ' + (SUITN[c.suit] || '');
  const live = document.createElement('div'); live.id = 'botLive'; live.setAttribute('role', 'log'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-relevant', 'additions');
  live.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap'; document.body.appendChild(live);
  function say(t) { const d = document.createElement('div'); d.textContent = t; live.appendChild(d); while (live.children.length > 8) live.removeChild(live.firstChild); }
  const who = h => 'Player ' + seatNo(botHands.indexOf(h));
  const botHs = h => h.hs || (h.hs = [{cards: h.cards}]);          /* a seat can hold several hands after a split; hand 0 shares h.cards */
  const seatDone = h => botHs(h).every(x => x.done);
  function botHtml() {
    if (botHands.length && !botHands[0].el) botBuild();
    botHands.forEach((h, i) => {
      if (!h.el) return;
      const hs = botHs(h), wrap = h.el.querySelector('.bot-hands');
      hs.forEach((x, k) => {
        let box = wrap.children[k]; if (!box) { box = document.createElement('div'); box.className = 'bot-cards'; wrap.appendChild(box); }
        /* draw only what changed: append new cards, but if a card was swapped out (a split moves one away) rebuild this hand */
        const keys = x.cards.map(c => c.value + c.suit), old = (box.dataset.k || '').split('|').filter(Boolean);
        let m = 0; while (m < old.length && m < keys.length && old[m] === keys[m]) m++;
        if (m < old.length) { box.innerHTML = ''; box.insertAdjacentHTML('beforeend', x.cards.slice(0, m).map(c => faceHtml(c, false)).join('')); }
        if (keys.length > (m < old.length ? m : old.length)) box.insertAdjacentHTML('beforeend', x.cards.slice(m < old.length ? m : old.length).map(c => faceHtml(c, true)).join(''));
        box.dataset.k = keys.join('|');
        box.classList.toggle('hand-bust', !!x.bust);
      });
      h.el.setAttribute('role', 'img');                      /* screen readers get one sentence per seat instead of loose cards */
      h.el.setAttribute('aria-label', 'Player ' + seatNo(i) + '. ' + hs.map((x, k) => { const t = botTotal(x.cards);
        return (hs.length > 1 ? 'Hand ' + (k + 1) + ': ' : '') + x.cards.map(cardName).join(', ') + ', total ' + (t.soft && t.s <= 21 ? 'soft ' : '') + t.s + (x.bust ? ', bust' : x.surr ? ', surrendered' : x.doubled ? ', doubled' : ''); }).join('. ')
        + (h.ins ? '. Took insurance' + (h.insRes ? (h.insRes === 'win' ? ', insurance won' : ', insurance lost') : '') : '') + (h.res ? '. Result: ' + h.res.map(r => r.w.toLowerCase()).join(', ') : ''));
      const allBust = hs.every(x => x.bust), tag = allBust ? 'bust' : hs.length > 1 ? 'split' : hs[0].surr ? 'surrender' : hs[0].doubled ? 'double' : '';
      h.bust = allBust; h.el.firstChild.textContent = 'Player ' + seatNo(i) + (tag ? ' \u00b7 ' + tag : '');
      h.el.classList.toggle('bot-bust', allBust); h.el.classList.toggle('bot-active', !!h.active);
      const rb = h.el.querySelector('.bot-results'), chips = (h.ins ? ['<span class="bot-res ' + (h.insRes || 'push') + '">' + (h.insRes === 'win' ? 'INS +' : h.insRes === 'lose' ? 'INS \u2212' : 'INSURED') + '</span>'] : [])
        .concat((h.res || []).map(r => '<span class="bot-res ' + r.k + '">' + r.w + '</span>')).join('');
      if (rb && rb.dataset.s !== chips) { rb.innerHTML = chips; rb.dataset.s = chips; }
      h.el.classList.toggle('bot-won', !!(h.res && h.res.some(r => r.k === 'win') && !h.res.some(r => r.k === 'lose')));
    });
    fitBots();
    if (inMP() && window.MP.me === 'host' && window.MP.send) window.MP.send({t: 'b', b: botSnap()});   /* the friend's screen mirrors the bots */
  }
  const botSnap = () => botHands.map(h => ({hs: botHs(h).map(x => ({cards: x.cards, bust: !!x.bust, doubled: !!x.doubled, surr: !!x.surr})), ins: h.ins || 0, insRes: h.insRes || '', res: h.res || null, active: !!h.active}));
  function botClear() { botSeq++; botHands = []; leftGo = false; botBox.innerHTML = ''; botBox.classList.remove('sweeping'); botBox.style.bottom = ''; }
  /* public hooks used by the 2-player table (multiplayer.js) */
  window.ProBots = {
    start: () => { botClear(); if (!P.bots || STATE.deck.length <= 30 + P.seats * 8) return null; botHands = Array.from({length: P.seats}, (_, i) => ({cards: [], bust: false, skill: P.skills[i]})); return {n: P.seats, L: Math.ceil(P.seats / 2), step: pace()[2]}; },
    deal: i => { if (botHands[i]) { botDraw(botHands[i]); botHtml(); } },
    results: () => { if (botHands.length) botResults(); },
    clear: botClear,
    step: () => pace()[2],
    apply: snap => {
      if (!snap || !snap.length) return botClear();
      if (botHands.length !== snap.length) { botHands = snap.map(() => ({cards: []})); botBox.innerHTML = ''; }
      snap.forEach((sn, i) => { const h = botHands[i]; h.hs = sn.hs.map(x => Object.assign({}, x)); h.cards = h.hs[0].cards; h.ins = sn.ins; h.insRes = sn.insRes; h.res = sn.res; h.active = sn.active; });
      botHtml();
    }
  };
  function botTotal(cs) { let s = 0, a = 0; cs.forEach(c => { s += c.numVal; if (c.value === 'A') a++; }); while (s > 21 && a) { s -= 10; a--; } return {s, soft: a > 0}; }
  function botDraw(h) { const c = STATE.deck.pop(); if (!c) return; h.cards.push(c); updateCount(c.countVal); sfx('deal'); }
  /* Deal order like a real table: one card to every seat left to right (your seat sits in the middle, the dealer is last), then a second lap. */
  let plan = null;
  window.dealTimes = () => { const p = plan; plan = null; return p && p.t; };
  const oInner = window.dealHandInner;
  window.dealHandInner = function () {
    botHands = []; leftGo = false; botBox.innerHTML = ''; botBox.classList.remove('sweeping'); botSeq++;
    if (P.bots && !inMP() && STATE.deck.length > 30 + P.seats * 8) {
      const n = P.seats, L = Math.ceil(n / 2), STEP = pace()[2], t = {p1: 0, d1: 0, p2: 0, d2: 0}, bt = Array.from({length: n}, () => []);
      let k = 0;
      for (let lap = 0; lap < 2; lap++) {
        const at = () => 120 + (k++) * STEP;
        for (let i = 0; i < L; i++) bt[i][lap] = at();
        t[lap ? 'p2' : 'p1'] = at();
        for (let i = L; i < n; i++) bt[i][lap] = at();
        t[lap ? 'd2' : 'd1'] = at();
      }
      botHands = Array.from({length: n}, (_, i) => ({cards: [], bust: false, skill: P.skills[i]})); plan = {t, bt};
    }
    const mine = plan, r = oInner.apply(this, arguments); plan = null;
    if (mine) {
      const seq = botSeq;
      botHands.forEach((h, i) => mine.bt[i].forEach(ms => setTimeout(() => { if (seq === botSeq) { botDraw(h); botHtml(); } }, ms)));
    }
    return r;
  };
  /* Play order follows the deal: seats left of you play first, then you, then seats right of you, then the dealer. */
  let leftGo = false;
  /* Bots play perfect basic strategy for the table's current rules (decks, H17/S17, DAS, surrender, resplit aces),
     using the same chart the trainer grades you against. They don't count, so no count deviations. */
  function botAction(seat, x, up) {
    const tt = botTotal(x.cards);
    if (tt.s >= 21) return 'Stand';
    const sk = seat.skill || P.skill;
    if (sk === 'casual') return (tt.s >= 17 || (tt.s >= 12 && up <= 6 && !tt.soft) || x.cards.length > 5) ? 'Stand' : 'Hit';   /* casual: stand on 17+, or 12+ vs a dealer 2-6 */
    const a = botPerfect(seat, x, up);
    if (sk !== 'mixed' || Math.random() >= .18) return a;                     /* mixed: about 1 in 5 decisions is a human-style slip */
    if (a === 'Stand') return tt.s >= 12 && tt.s <= 16 ? 'Hit' : a;
    if (a === 'Hit') return tt.s >= 12 ? 'Stand' : a;
    if (a === 'Double' || a === 'Surrender') return 'Hit';
    if (a === 'Split') return tt.s >= 17 ? 'Stand' : 'Hit';
    return a;
  }
  function botPerfect(seat, x, up) {
    const keep = {dev: STATE.enableDeviations, ph: STATE.playerHands, note: STATE.devNote};
    try { STATE.enableDeviations = false; STATE.playerHands = new Array(botHs(seat).length); return getCorrectAction(x, {numVal: up}); }
    finally { STATE.enableDeviations = keep.dev; STATE.playerHands = keep.ph; STATE.devNote = keep.note; }
  }
  function botStep(seat, up) {
    const hs = botHs(seat), x = hs.find(y => !y.done), act = botAction(seat, x, up);
    const nm = who(seat), had = x.cards.length;
    if (act === 'Hit') botDraw1(x);
    else if (act === 'Double') { x.doubled = true; botDraw1(x); x.done = true; }
    else if (act === 'Split') {
      const wasAces = x.cards[0].value === 'A', nh = {cards: [x.cards.pop()], fromSplit: true, aceSplit: wasAces};
      x.fromSplit = true; if (wasAces) x.aceSplit = true;
      hs.splice(hs.indexOf(x) + 1, 0, nh); botDraw1(x); botDraw1(nh);
      for (const y of [x, nh]) if (botTotal(y.cards).s >= 21 || (wasAces && !(y.cards[1].value === 'A' && STATE.allowResplitAces && hs.length < 4))) y.done = true;
    }
    else if (act === 'Surrender') { x.surr = true; x.done = true; }
    else x.done = true;                                            /* Stand */
    for (const y of hs) if (botTotal(y.cards).s > 21) { y.bust = true; y.done = true; }
    const last = x.cards[x.cards.length - 1], tot = botTotal(x.cards).s;
    say(act === 'Stand' ? nm + ' stands on ' + tot : act === 'Surrender' ? nm + ' surrenders'
      : act === 'Split' ? nm + ' splits ' + (RANKN[x.cards[0].value] || x.cards[0].value) + 's'
      : nm + (act === 'Double' ? ' doubles and draws ' : ' hits and draws ') + cardName(last) + ', total ' + tot + (x.bust ? ', bust' : ''));
  }
  function botDraw1(x) { const c = STATE.deck.pop(); if (!c) return; x.cards.push(c); updateCount(c.countVal); sfx('deal'); }
  /* Play order follows the deal: seats left of you play first, then you, then seats right of you, then the dealer. */
  function botRun(from, to, seq, then) {
    const up = (STATE.dealerCards.find(c => !c.hidden) || {numVal: 10}).numVal, mark = h => { botHands.forEach(x => { x.active = x === h; }); botHtml(); };
    const go = () => {
      if (seq !== botSeq) return;
      const h = botHands.slice(from, to).find(x => !seatDone(x));
      mark(h);
      if (!h) return then();
      botStep(h, up); h.done = seatDone(h);
      botHtml(); setTimeout(go, pace()[0]);
    };
    setTimeout(go, pace()[1]);
  }
  const oUC = window.updateControls;
  window.updateControls = function () {
    oUC.apply(this, arguments);
    if (leftGo || !botHands.length || STATE.isGameOver || STATE.isAnimating) return;
    const h0 = STATE.playerHands[0];
    if (!h0 || !STATE.playerHands.every(h => h.cards.length >= 2) || STATE.dealerCards.length < 2 || !botHands.every(h => h.cards.length >= 2)) return;
    if (!$('insuranceModal').classList.contains('hidden')) return;
    leftGo = true; STATE.isAnimating = true; updateControls();   /* lock your buttons while the seats to your left play */
    botRun(0, Math.ceil(botHands.length / 2), botSeq, () => { STATE.isAnimating = false; updateControls(); if (inMP()) renderTable(); });
  };
  const oDT = window.dealerTurn;
  window.dealerTurn = function () {
    const dc = STATE.dealerCards;
    if (dc.length === 2 && dc[0].numVal + dc[1].numVal === 21) botHands.forEach(h => botHs(h).forEach(x => { x.done = true; }));   /* dealer blackjack ends the round, nobody draws */
    if (!botHands.length || botHands.every(seatDone)) return oDT.apply(this, arguments);
    const args = arguments, self = this;
    STATE.isAnimating = true; updateControls();
    botRun(0, botHands.length, botSeq, () => { STATE.isAnimating = false; oDT.apply(self, args); });   /* whoever hasn't played yet (the seats to your right) */
  };

  /* ---- keep the bot seats clear of your hands (e.g. after you split): widen the gap, and if they still collide,
     lift the whole bot row just above your hands (same side of the table as you, nothing overlapping) ---- */
  function fitBots() {
    const pc = $('playerHandsContainer'), main = botBox.parentElement, gap = botBox.querySelector('.bot-gap');
    botBox.style.bottom = ''; botBox.classList.remove('lifted');
    if (!botHands.length || !pc || !main) return;
    const used = [...pc.children].map(c => c.getBoundingClientRect()).filter(r => r.width);
    if (!used.length) return;
    const l = Math.min(...used.map(r => r.left)), r = Math.max(...used.map(r => r.right)), t = Math.min(pc.parentElement.getBoundingClientRect().top, ...used.map(r => r.top));   /* include the PLAYER heading */
    if (gap && getComputedStyle(gap).display !== 'none') gap.style.flexBasis = Math.max(150, r - l + 28) + 'px';
    const hit = () => [...botBox.querySelectorAll('.bot-seat')].some(e => { const b = e.getBoundingClientRect(); return b.width && b.right > l - 6 && b.left < r + 6 && b.bottom > t - 6; });
    if (hit()) { botBox.classList.add('lifted'); botBox.style.bottom = Math.max(0, main.getBoundingClientRect().bottom - t + 10) + 'px'; }
  }
  addEventListener('resize', () => fitBots());
  const oRT = window.renderTable;
  window.renderTable = function () { const x = oRT.apply(this, arguments); fitBots(); return x; };

  /* ---- results: tag each bot hand WIN / LOSE / PUSH once the dealer is done ---- */
  function botResults() {
    const d = STATE.dealerCards, dS = botTotal(d).s, dBJ = d.length === 2 && dS === 21;
    botHands.forEach(h => {
      h.active = false;
      h.res = botHs(h).map(x => {
        const t = botTotal(x.cards).s, nat = x.cards.length === 2 && !x.fromSplit && t === 21;
        let k, w;
        if (x.surr) [k, w] = ['push', 'SURRENDER'];
        else if (x.bust) [k, w] = ['lose', 'BUST'];
        else if (nat && dBJ) [k, w] = ['push', 'PUSH'];
        else if (nat) [k, w] = ['win', 'BLACKJACK'];
        else if (dBJ) [k, w] = ['lose', 'LOSE'];
        else if (dS > 21 || t > dS) [k, w] = ['win', 'WIN'];
        else if (t < dS) [k, w] = ['lose', 'LOSE'];
        else [k, w] = ['push', 'PUSH'];
        return {k, w: w + (x.doubled ? ' 2x' : '')};
      });
      if (h.ins) h.insRes = dBJ ? 'win' : 'lose';
    });
    botHtml();
    say('Table results. ' + botHands.map(h => who(h) + ': ' + (h.res || []).map(r => r.w.toLowerCase()).join(', ')).join('. '));
  }
  /* Insurance: perfect bots always decline (it's a losing bet without the count); casual and mixed bots sometimes take it. */
  function botInsure() {
    botHands.forEach(h => { const sk = h.skill || P.skill; h.ins = Math.random() < (sk === 'casual' ? .35 : sk === 'mixed' ? .12 : 0) ? 1 : 0; });
    if (botHands.some(h => h.ins)) botHtml();
  }
  const oCI = window.checkInsurance;
  window.checkInsurance = function () { const r = oCI.apply(this, arguments); if (r && botHands.length) botInsure(); return r; };
  const oRG2 = window.resolveGame;
  window.resolveGame = function () { const x = oRG2.apply(this, arguments); if (botHands.length) botResults(); return x; };
  const oReset = window.resetBoard;
  window.resetBoard = function () {
    botSeq++; botHands = []; leftGo = false;
    if (botBox.querySelector('.playing-card')) { const keep = botSeq; botBox.classList.add('sweeping'); setTimeout(() => { if (keep === botSeq) { botBox.innerHTML = ''; botBox.classList.remove('sweeping'); } }, 480); }
    else botBox.innerHTML = '';
    return oReset.apply(this, arguments);
  };
  let nz = null;
  function noiseLoop() {
    clearTimeout(nz); if (!P.noise || !soundOn) return;
    const a = ac(); if (a) { const t = a.currentTime; noise(a, t, .6, 400 + Math.random() * 500, .05, 'lowpass'); if (Math.random() < .35) { noise(a, t + Math.random() * .4, .05, 4200, .12, 'highpass'); tone(a, t, 2000 + Math.random() * 800, .04, .03, 'triangle'); } }
    nz = setTimeout(noiseLoop, 500 + Math.random() * 900);
  }

  /* ================= 5. Count Drill levels: pass (80%+ and final count right) => 3 sec/deck faster ================= */
  const sm = $('drillSummary'); let dStart = 0;
  const bs = $('btnStartDrill'), ba = $('btnDrillAgain');
  [bs, ba].forEach(b => b && b.addEventListener('click', () => { dStart = Date.now(); }, true));
  if (sm && window.CountDrill) new MutationObserver(() => {
    if (sm.classList.contains('hidden') || sm.dataset.done === String(dStart)) return;
    sm.dataset.done = String(dStart);
    const D = CountDrill.D, ok = D.asked >= 3 && D.correct / D.asked >= .8, key = D.decks + 'd';
    const best = lvl[key] || 99; let note;
    if (ok) {
      lvl[key] = Math.min(best, D.pace);
      if (D.pace > 20) { const np = Math.max(20, D.pace - 3); $('drillPace').value = np; $('drillPace').dispatchEvent(new Event('input', {bubbles: true})); note = 'Level up: next run is ' + np + ' sec / deck.'; }
      else note = 'Top level (20 sec / deck) cleared.';
      cue('streak');
    } else note = 'Need 80% on checks to level up. Same pace next time.';
    wr(K.level, lvl);
    const e = document.createElement('p'); e.className = 'text-sm text-emerald-300 mt-2';
    e.textContent = note + (lvl[key] ? ' Best cleared: ' + lvl[key] + ' sec / deck (' + D.decks + (D.decks === 1 ? ' deck' : ' decks') + ').' : '');
    const old = sm.querySelector('.lvl-note'); if (old) old.remove(); e.classList.add('lvl-note'); sm.appendChild(e);
  }).observe(sm, {attributes: true, attributeFilter: ['class']});

  /* ================= 6. Tools window: Review / Bets / Heatmap / Bankroll / Table / Backup ================= */
  const modal = document.createElement('div'); modal.className = 'pro-modal hidden'; modal.id = 'proModal';
  modal.innerHTML = '<div class="pro-box" role="dialog" aria-modal="true" aria-label="Trainer tools"><div class="pro-row"><b style="font-size:16px">Trainer Tools</b><button class="pro-btn" id="proClose">Close</button></div><div class="pro-tabs" id="proTabs"></div><div id="proBody"></div></div>';
  document.body.appendChild(modal);
  const TABS = ['Review', 'Bets', 'Heatmap', 'Bankroll', 'Table', 'Sound', 'Backup']; let tab = 'Review';
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  function view() {
    $('proTabs').innerHTML = TABS.map(t => '<button data-t="' + t + '" class="' + (t === tab ? 'on' : '') + '">' + t + '</button>').join('');
    const B = $('proBody'), spots = rd(K.spots, {});
    if (tab === 'Review') {
      const d = dueKeys(), all = Object.keys(srs).length;
      B.innerHTML = '<p><b>' + d.length + '</b> spot' + (d.length === 1 ? '' : 's') + ' due for review, ' + all + ' in rotation. Missed spots come back after 1, 3, then 7 days. While any are due, about 3 in 10 hands are dealt from them (Hand Focus: All hands).</p>' +
        '<ul style="margin:8px 0">' + d.slice(0, 10).map(k => '<li>' + esc(k.replace(/^([IPSH])(\d+)v(\d+)$/, (m, a, b, c) => ({I: 'Insurance', P: 'Pair ' + b, S: 'Soft ' + b, H: 'Hard ' + b})[a] + ' vs ' + (c == 11 ? 'A' : c))) + '</li>').join('') + '</ul>';
    } else if (tab === 'Bets') {
      const n = bets.length, ex = bets.filter(b => b.g === 'exact').length, cl = bets.filter(b => b.g === 'close').length;
      B.innerHTML = n ? '<p>Last ' + n + ' graded bets: on the ramp <b>' + ex + '</b> (' + pct(ex, n) + '%), one step off <b>' + cl + '</b>, further off <b>' + (n - ex - cl) + '</b>.</p><ul style="margin:8px 0">' +
        bets.slice(0, 12).map(b => '<li>RC ' + fmtN(b.rc) + ': ramp $' + b.ideal + ', you $' + b.bet + ' (' + b.g + ')</li>').join('') + '</ul>' : '<p>No graded bets yet. They are graded with Hand Focus on All hands and Strategy Enforcement on.</p>';
    } else if (tab === 'Heatmap') {
      const ups = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], cell = (k) => { const s = spots[k]; if (!s || !s.n) return '<i title="no data">\u00b7</i>'; const a = 1 - s.m / s.n; return '<i title="' + (s.n - s.m) + '/' + s.n + ' right" style="background:hsl(' + Math.round(a * 120) + ',55%,' + (22 + 0) + '%);color:#fff">' + pct(s.n - s.m, s.n) + '</i>'; };
      const grid = (title, kind, tots, lab) => '<b>' + title + '</b><div class="pro-hm" style="grid-template-columns:34px repeat(10,1fr)"><i></i>' + ups.map(u => '<i>' + (u === 11 ? 'A' : u) + '</i>').join('') +
        tots.map(t => '<i>' + lab(t) + '</i>' + ups.map(u => cell(kind + t + 'v' + u)).join('')).join('') + '</div>';
      const rng = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
      B.innerHTML = '<p style="color:#9ca3af;font-size:12px">Accuracy by situation (rows) and dealer card (columns). Red = often wrong, green = reliable, dot = not played yet.</p>' +
        grid('Hard', 'H', rng(5, 19), t => t) + grid('Soft', 'S', rng(13, 20), t => 'A' + (t - 11)) + grid('Pairs', 'P', rng(2, 11), t => t === 11 ? 'AA' : t + ',' + t);
    } else if (tab === 'Bankroll') {
      const r = rounds.slice(0, 500), n = r.length;
      if (n < 100) B.innerHTML = '<p>Need at least 100 logged hands (you have ' + n + '). Hands are logged as you play.</p>';
      else {
        const mean = r.reduce((s, x) => s + x.net, 0) / n, sd = Math.sqrt(r.reduce((s, x) => s + (x.net - mean) ** 2, 0) / (n - 1)), avgBet = r.reduce((s, x) => s + x.bet, 0) / n;
        B.innerHTML = '<div class="pro-row"><label for="proBR">Bankroll $</label><input id="proBR" type="number" value="' + (P.br || 5000) + '" style="width:100px;background:#1f2937;color:#fff;border:1px solid #374151;border-radius:4px;padding:2px 6px"></div><div id="proRoR"></div>' +
          '<p style="color:#9ca3af;font-size:12px">From your last ' + n + ' hands. Small samples are very noisy: a +EV result here can easily be luck.</p>';
        const calc = () => {
          const br = Math.max(1, +$('proBR').value || 1); P.br = br; saveP();
          const ror = mean > 0 ? Math.min(1, Math.exp(-2 * mean * br / (sd * sd))) : 1;
          $('proRoR').innerHTML = '<p>Average bet <b>$' + avgBet.toFixed(0) + '</b>, per hand <b>' + (mean >= 0 ? '+' : '\u2212') + '$' + Math.abs(mean).toFixed(2) + '</b> (std dev $' + sd.toFixed(0) + ')</p><p>At 80 hands/hr: <b>' + (mean * 80 >= 0 ? '+' : '\u2212') + '$' + Math.abs(mean * 80).toFixed(0) + '/hr</b></p><p>Risk of ruin: <b>' + (mean > 0 ? (ror * 100).toFixed(1) + '%' : 'not positive yet') + '</b></p>';
        };
        $('proBR').oninput = calc; calc();
      }
    } else if (tab === 'Table') {
      const nB = P.seats, mid = inMP() ? 2 : 1, seatLbl = i => 'Player ' + (i < Math.ceil(nB / 2) ? i + 1 : i + 1 + mid), cap = x => x[0].toUpperCase() + x.slice(1);
      const btns = (list, cur, attr) => list.map(k => '<button class="pro-btn ' + (cur === k ? 'on' : '') + '" ' + attr + '="' + k + '">' + cap(k) + '</button>').join(' ');
      const allSame = P.skills.slice(0, nB).every(k => k === P.skills[0]);
      B.innerHTML = '<div class="pro-row"><span>Simulated players at your table (their cards count too)</span><button class="pro-btn ' + (P.bots ? 'on' : '') + '" id="pBots">' + (P.bots ? 'On' : 'Off') + '</button></div>' +
        '<div class="pro-row"><span>Seats (1-4)</span><input id="pSeats" type="range" min="1" max="4" value="' + P.seats + '"><b>' + P.seats + '</b></div>' +
        '<div class="pro-row"><span>Bot speed</span><span>' + btns(Object.keys(PACE), P.pace, 'data-pace') + '</span></div>' +
        '<div class="pro-row"><span>Bot skill (all seats)</span><span>' + btns(SKILLS, allSame ? P.skills[0] : '', 'data-skill') + '</span></div>' +
        Array.from({length: nB}, (_, i) => '<div class="pro-row"><span>' + seatLbl(i) + (i === 0 ? ' (leftmost)' : '') + '</span><select data-seat="' + i + '" style="background:#0f172a;color:#e5e7eb;border:1px solid #334155;border-radius:8px;padding:4px 8px">' + SKILLS.map(k => '<option value="' + k + '"' + (P.skills[i] === k ? ' selected' : '') + '>' + cap(k) + '</option>').join('') + '</select></div>').join('') +
        '<div class="pro-row"><span>Table noise and chip clinks</span><button class="pro-btn ' + (P.noise ? 'on' : '') + '" id="pNoise">' + (P.noise ? 'On' : 'Off') + '</button></div>' +
        '<p style="color:#9ca3af;font-size:12px"><b>Perfect</b>: basic strategy every time (double, split, surrender, declines insurance). <b>Mixed</b>: perfect, but about 1 in 5 decisions is a slip, and some take insurance. <b>Casual</b>: stands on 17+ or 12+ vs a dealer 2-6, never doubles or splits, often insures. Mix skills by seat to make the table less predictable. In 2P the bots sit on both sides of the two of you and your friend sees them too.</p>';
      $('pBots').onclick = () => { P.bots = !P.bots; saveP(); view(); };
      $('pSeats').oninput = e => { P.seats = +e.target.value; saveP(); e.target.nextSibling.textContent = P.seats; }; $('pSeats').onchange = view;
      $('pNoise').onclick = () => { P.noise = !P.noise; saveP(); noiseLoop(); view(); };
      B.querySelectorAll('[data-pace]').forEach(b => { b.onclick = () => { P.pace = b.dataset.pace; saveP(); view(); }; });
      B.querySelectorAll('[data-skill]').forEach(b => { b.onclick = () => { P.skill = b.dataset.skill; P.skills = [P.skill, P.skill, P.skill, P.skill]; saveP(); view(); }; });
      B.querySelectorAll('[data-seat]').forEach(sel => { sel.onchange = () => { P.skills[+sel.dataset.seat] = sel.value; saveP(); view(); }; });
    } else if (tab === 'Sound') {
      B.innerHTML = '<div class="pro-row"><span>Master volume</span><input id="pVol" type="range" min="0" max="1" step=".05" value="' + P.vol + '"></div>';
      $('pVol').oninput = e => { P.vol = +e.target.value; saveP(); if (master) master.gain.value = P.vol; }; $('pVol').onchange = () => cue('ok');
    } else {
      B.innerHTML = '<p>Everything (stats, mistakes, review schedule, drill levels, settings) lives in this browser only. Save a backup file before clearing site data or switching devices.</p><div class="pro-row"><button class="pro-btn" id="pExp">Download backup</button><button class="pro-btn" id="pImp">Restore from file</button></div><input type="file" id="pFile" accept="application/json" hidden><p id="pMsg" style="color:#6ee7b7"></p>';
      $('pExp').onclick = () => {
        const o = {app: 'ko-blackjack', v: 1, t: Date.now(), data: {}};
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^(koTrainer\.|drillDecks)/.test(k)) o.data[k] = localStorage.getItem(k); }
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(o)], {type: 'application/json'}));
        a.download = 'ko-trainer-backup-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      };
      $('pImp').onclick = () => $('pFile').click();
      $('pFile').onchange = e => {
        const f = e.target.files[0]; if (!f) return;
        f.text().then(txt => {
          const o = JSON.parse(txt); if (o.app !== 'ko-blackjack' || !o.data) throw 0;
          Object.keys(o.data).forEach(k => { if (/^koTrainer\./.test(k) && typeof o.data[k] === 'string') localStorage.setItem(k, o.data[k]); });
          $('pMsg').textContent = 'Restored. Reloading...'; setTimeout(() => location.reload(), 700);
        }).catch(() => { $('pMsg').style.color = '#fca5a5'; $('pMsg').textContent = 'That is not a valid backup file.'; });
      };
    }
  }
  $('proTabs').addEventListener('click', e => { if (e.target.dataset.t) { tab = e.target.dataset.t; view(); } });
  $('proClose').onclick = () => modal.classList.add('hidden');
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.add('hidden'); });
  const src = $('btnOpenDrill'), btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'btnOpenPro'; btn.className = src.className; btn.innerHTML = 'Tools <span id="proBadge"></span>';
  src.parentNode.insertBefore(btn, src.nextSibling);
  btn.onclick = () => { view(); modal.classList.remove('hidden'); };
  function badge() { const n = dueKeys().length; $('proBadge').textContent = n ? '(' + n + ')' : ''; }
  badge(); noiseLoop();
})();

/* Trainer extras for KO Blackjack. Loaded after game.js and before multiplayer.js.
   - count checks: now and then asks for the Running Count between hands
   - mistake log: remembers every graded slip and how often each situation is missed
   - weak spots: a "Hand Focus" mode that deals the situations you miss most
   Everything hooks the engine from outside (wrapping window.* functions), so the core
   game logic stays as it was. Data lives in localStorage under koTrainer.*.v1. */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const LS_MISTAKES = 'koTrainer.mistakes.v1', LS_SPOTS = 'koTrainer.spots.v1', LS_COUNT = 'koTrainer.countchecks.v1', LS_DRILLS = 'koTrainer.drills.v1';
  const MAX_LOG = 200, MAX_CHECKS = 100;
  const inMP = () => !!(window.MP && window.MP.active);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const fmtN = n => (n > 0 ? '+' : n < 0 ? '\u2212' : '') + Math.abs(n);
  const plain = o => o && typeof o === 'object' && !Array.isArray(o);

  /* ---------- stored data ---------- */
  let mistakes = lsGet(LS_MISTAKES, []);
  if (!Array.isArray(mistakes)) mistakes = [];
  let spots = lsGet(LS_SPOTS, {});
  if (!plain(spots)) spots = {};
  let cc = lsGet(LS_COUNT, null);
  if (!plain(cc)) cc = {};
  cc = {asked: cc.asked | 0, exact: cc.exact | 0, close: cc.close | 0, log: Array.isArray(cc.log) ? cc.log : []};

  /* =====================================================================
     1. Situations: what kind of decision was it?
     ===================================================================== */
  const cardTxt = c => c.value + c.suit;

  function situationOf(hand, up) {
    const c = hand.cards, v = calculateHand(c), u = up.numVal;   /* numVal 11 = Ace */
    if (c.length === 2 && c[0].numVal === c[1].numVal) return {kind: 'P', tot: c[0].numVal, up: u};
    return {kind: v.isSoft ? 'S' : 'H', tot: v.sum, up: u};
  }
  const keyOf = s => s.kind + s.tot + 'v' + s.up;
  function nameOf(s) {
    const u = s.up === 11 ? 'A' : s.up;
    if (s.kind === 'I') return 'Insurance (dealer shows Ace)';
    if (s.kind === 'P') return 'Pair of ' + (s.tot === 11 ? 'Aces' : s.tot + 's') + ' vs ' + u;
    if (s.kind === 'S') return 'Soft ' + s.tot + ' vs ' + u;
    return 'Hard ' + s.tot + ' vs ' + u;
  }

  /* =====================================================================
     2. Mistake log
     ===================================================================== */
  let lastSig = '';
  function record(s, cards, dealer, played, correct, note) {
    const k = keyOf(s);
    const sp = spots[k] || (spots[k] = {kind: s.kind, tot: s.tot, up: s.up, n: 0, m: 0});
    sp.n++;
    if (played !== correct) {
      /* a blocked wrong move can be clicked again; log the same slip once */
      const sig = [dealSeq, k, cards.join(','), played].join('|');
      if (sig !== lastSig) {
        lastSig = sig;
        sp.m++; sp.last = Date.now();
        mistakes.unshift({t: Date.now(), k, kind: s.kind, tot: s.tot, up: s.up, h: cards, d: dealer, played, correct,
          ko: STATE.koCount, decks: STATE.numDecks, note: note || ''});
        if (mistakes.length > MAX_LOG) mistakes.length = MAX_LOG;
        lsSet(LS_MISTAKES, mistakes);
      }
    }
    lsSet(LS_SPOTS, spots);
  }

  /* Hit / Stand / Double / Split / Surrender. The engine blocks wrong moves while Strategy
     Enforcement is on, so a false result here means the player slipped. */
  const oProcess = window.processMove;
  window.processMove = function (action) {
    const graded = !STATE.isGameOver && STATE.showHints;
    const hand = STATE.playerHands[STATE.currentHandIndex];
    const up = STATE.dealerCards.find(c => !c.hidden);
    const ok = oProcess.apply(this, arguments);
    if (graded && hand && up) {
      const correct = ok ? action : getCorrectAction(hand, up);
      record(situationOf(hand, up), hand.cards.map(cardTxt), cardTxt(up), action, correct, ok ? '' : String(STATE.devNote || '').trim());
    }
    return ok;
  };

  const oInsurance = window.handleInsurance;
  window.handleInsurance = function (takes) {
    const up = STATE.dealerCards[0], hand = STATE.playerHands[0];
    if (STATE.showHints && up && hand) {
      const correct = getCorrectAction({}, up, true);
      record({kind: 'I', tot: 0, up: 11}, hand.cards.map(cardTxt), cardTxt(up), takes ? 'Insurance' : 'No Insurance', correct,
        'Take insurance at ' + fmtN(RC_INDEX) + ' or higher');
    }
    return oInsurance.apply(this, arguments);
  };

  /* =====================================================================
     3. Weak spots: rank misses and deal them back
     ===================================================================== */
  function mappable(sp) {
    if (sp.kind === 'I') return true;
    if (sp.kind === 'P') return sp.tot >= 2 && sp.tot <= 11;
    if (sp.kind === 'S') return sp.tot >= 13 && sp.tot <= 20;
    return sp.tot >= 5 && sp.tot <= 19;
  }
  function weakList() {
    return Object.keys(spots).map(k => Object.assign({key: k}, spots[k]))
      .filter(sp => sp.m > 0 && sp.n > 0)
      .map(sp => Object.assign(sp, {rate: sp.m / sp.n, w: sp.m * (sp.m / sp.n)}))
      .sort((a, b) => b.w - a.w);
  }
  function canDeal(preds) {
    const used = new Set();
    for (const p of preds) {
      const i = STATE.deck.findIndex((c, idx) => !used.has(idx) && p(c));
      if (i < 0) return false;
      used.add(i);
    }
    return true;
  }
  const eq = v => c => c.numVal === v;
  const pick = a => a[Math.floor(Math.random() * a.length)];

  /* Called from dealHandInner when Hand Focus is "Weak Spots". Returns the first three
     cards (player, player, dealer up) or null to let the normal deal happen. */
  window.weakDeal = function () {
    if (inMP()) return null;
    const cands = weakList().filter(mappable);
    if (!cands.length || Math.random() < 0.2) return null;       /* ~1 in 5 hands stay random */
    const wt = c => Math.max(c.w, 0.05), total = cands.reduce((a, c) => a + wt(c), 0);
    let r = Math.random() * total, sp = cands[0];
    for (const c of cands) { r -= wt(c); if (r <= 0) { sp = c; break; } }

    let a, b;
    if (sp.kind === 'I') { a = c => c.numVal <= 9; b = c => c.numVal <= 9; }          /* can never make 21 */
    else if (sp.kind === 'P') { a = eq(sp.tot); b = eq(sp.tot); }
    else if (sp.kind === 'S') { a = eq(11); b = eq(sp.tot - 11); }
    else {
      const opts = [];
      for (let x = Math.max(2, sp.tot - 10); x <= Math.min(10, sp.tot - 2); x++) if (x !== sp.tot - x) opts.push(x);
      if (!opts.length) return null;
      const x = pick(opts); a = eq(x); b = eq(sp.tot - x);
    }
    const up = eq(sp.kind === 'I' ? 11 : sp.up);
    if (!canDeal([a, b, up])) return null;
    if (Math.random() < 0.5) { const t = a; a = b; b = t; }
    return {p1: pullCard(a), p2: pullCard(b), d1: pullCard(up)};
  };

  /* =====================================================================
     4. Count checks
     ===================================================================== */
  const FREQ = {rare: 0.1, some: 0.25, often: 0.5, every: 1};
  const dlg = $('countCheckModal');
  let target = 0, answered = false;

  function ccDue() {
    if (inMP()) return false;
    const tgl = $('tglCountCheck');
    if (!tgl || !tgl.checked) return false;
    if (STATE.deck.length >= 52 * STATE.numDecks) return false;       /* fresh shoe: nothing dealt, nothing to count */
    return Math.random() < (FREQ[$('selCheckFreq').value] || FREQ.some);
  }
  function openCheck() {
    target = STATE.koCount; answered = false;
    $('ccIRC').textContent = fmtN(initialRC(STATE.numDecks));
    $('ccQuestion').classList.remove('hidden');
    $('ccResult').classList.add('hidden');
    $('ccError').textContent = '';
    $('ccInput').value = '';
    $('btnCountSubmit').classList.remove('hidden');
    $('btnCloseCountCheck').textContent = 'Skip';
    dlg.classList.remove('hidden');
    setTimeout(() => $('ccInput').focus(), 0);
  }
  const oOpenBetting = window.openBetting;
  window.openBetting = function () {
    const r = oOpenBetting.apply(this, arguments);
    if (ccDue()) openCheck();
    return r;
  };

  const parseGuess = s => {
    s = String(s).trim().replace(/[\u2212\u2013]/g, '-');
    return /^[+-]?\d{1,3}$/.test(s) ? parseInt(s, 10) : null;
  };
  function submitCheck() {
    if (answered) return;
    const g = parseGuess($('ccInput').value);
    if (g === null) { $('ccError').textContent = 'Enter a whole number, like -3 or 5.'; $('ccInput').focus(); return; }
    answered = true;
    const err = g - target;
    cc.asked++; if (err === 0) cc.exact++; if (Math.abs(err) <= 1) cc.close++;
    cc.log.unshift({t: Date.now(), g, a: target, d: STATE.numDecks});
    if (cc.log.length > MAX_CHECKS) cc.log.length = MAX_CHECKS;
    lsSet(LS_COUNT, cc);

    const v = $('ccVerdict');
    if (err === 0) { v.textContent = 'Exactly right'; v.className = 'text-lg font-bold mb-1 text-green-400'; sfx('win'); }
    else if (Math.abs(err) === 1) { v.textContent = 'Off by 1'; v.className = 'text-lg font-bold mb-1 text-yellow-300'; }
    else { v.textContent = 'Off by ' + Math.abs(err); v.className = 'text-lg font-bold mb-1 text-red-400'; }
    $('ccDetail').textContent = err === 0
      ? 'The Running Count is ' + fmtN(target) + '.'
      : 'The Running Count is ' + fmtN(target) + '. You said ' + fmtN(g) + ' (' + (err > 0 ? 'too high' : 'too low') + ').';
    $('ccQuestion').classList.add('hidden');
    $('ccResult').classList.remove('hidden');
    $('btnCountSubmit').classList.add('hidden');
    $('btnCloseCountCheck').textContent = 'Continue';
    $('btnCloseCountCheck').focus();
  }
  $('btnCountSubmit').addEventListener('click', submitCheck);
  $('ccInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitCheck(); } });
  $('btnCountSign').addEventListener('click', () => {
    const i = $('ccInput'), v = i.value.trim().replace(/\u2212/g, '-');
    i.value = v.startsWith('-') ? v.slice(1) : '-' + v.replace(/^\+/, '');
    i.focus();
  });
  $('btnCloseCountCheck').addEventListener('click', () => dlg.classList.add('hidden'));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.classList.add('hidden'); });

  /* =====================================================================
     5. Mistakes window
     ===================================================================== */
  const modal = $('mistakesModal');
  const cardHtml = t => '<span class="' + (/[\u2665\u2666]/.test(t) ? 'text-red-400' : 'text-gray-100') + ' font-semibold">' + esc(t) + '</span>';
  const when = t => new Date(t).toLocaleString([], {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const H3 = 'text-sm font-bold text-gray-400 uppercase tracking-wide mb-2';

  function renderMistakes() {
    const weak = weakList();
    let h = '<section><h3 class="' + H3 + '">Weak spots</h3>';
    if (!weak.length) h += '<p class="text-gray-400">Nothing logged yet. Play with Strategy Enforcement on and every slip lands here.</p>';
    else h += '<ul class="space-y-3">' + weak.slice(0, 6).map(sp => {
      const r = Math.round(sp.rate * 100);
      return '<li><div class="flex justify-between gap-3"><span class="text-white font-semibold">' + esc(nameOf(sp)) + '</span>' +
        '<span class="text-gray-400 shrink-0">' + sp.m + ' of ' + sp.n + ' missed (' + r + '%)</span></div>' +
        '<div class="tr-bar mt-1" aria-hidden="true"><i style="width:' + Math.max(4, r) + '%"></i></div></li>';
    }).join('') + '</ul>';
    h += '</section>';

    h += '<section><h3 class="' + H3 + '">Recent mistakes</h3>';
    if (!mistakes.length) h += '<p class="text-gray-400">No mistakes yet.</p>';
    else {
      h += '<ul class="space-y-2">' + mistakes.slice(0, 25).map(m => {
        const note = m.note ? '<div class="text-xs text-gray-500 mt-0.5">' + esc(m.note) + '</div>' : '';
        return '<li class="bg-gray-800 rounded p-2.5"><div class="flex justify-between gap-3"><span class="text-white font-semibold">' +
          esc(nameOf(m)) + '</span><span class="text-xs text-gray-500 shrink-0">' + esc(when(m.t)) + '</span></div>' +
          '<div class="text-gray-300 mt-0.5">' + (m.h || []).map(cardHtml).join(' ') + ' vs ' + cardHtml(m.d || '?') + '</div>' +
          '<div class="text-xs mt-0.5"><span class="text-red-300">You: ' + esc(m.played) + '</span> <span class="text-gray-500">/</span> ' +
          '<span class="text-green-300">Correct: ' + esc(m.correct) + '</span> <span class="text-gray-500">/ KO ' + esc(fmtN(m.ko)) +
          ', ' + esc(m.decks) + (m.decks === 1 ? ' deck' : ' decks') + '</span></div>' + note + '</li>';
      }).join('') + '</ul>' +
        '<button id="btnClearMistakes" type="button" class="mt-3 text-xs text-gray-400 hover:text-white underline">Clear mistake log and weak spots</button>';
    }
    h += '</section>';

    h += '<section><h3 class="' + H3 + '">Count checks</h3>';
    if (!cc.asked) h += '<p class="text-gray-400">No checks yet. Turn on Count Checks in Settings.</p>';
    else {
      const last = cc.log.slice(0, 50), avg = last.length ? last.reduce((a, x) => a + Math.abs(x.g - x.a), 0) / last.length : 0;
      h += '<p class="text-gray-300">Exact <b class="text-white">' + cc.exact + '/' + cc.asked + '</b> (' + pct(cc.exact, cc.asked) + '%) &middot; ' +
        'within 1 <b class="text-white">' + cc.close + '/' + cc.asked + '</b> (' + pct(cc.close, cc.asked) + '%) &middot; ' +
        'average miss <b class="text-white">' + avg.toFixed(1) + '</b></p>' +
        '<div class="flex flex-wrap gap-1.5 mt-2" aria-label="Latest count checks">' + cc.log.slice(0, 14).map(x => {
          const e = x.g - x.a, cls = e === 0 ? 'ok' : Math.abs(e) === 1 ? 'near' : 'bad';
          return '<span class="tr-chip ' + cls + '" title="You said ' + esc(fmtN(x.g)) + ', count was ' + esc(fmtN(x.a)) + '">' +
            (e === 0 ? '\u2713' : fmtN(e)) + '</span>';
        }).join('') + '</div>' +
        '<button id="btnClearChecks" type="button" class="mt-3 text-xs text-gray-400 hover:text-white underline">Reset count checks</button>';
    }
    h += '</section>';

    /* Count Drill runs (drill.js writes these) */
    let runs = lsGet(LS_DRILLS, []); if (!Array.isArray(runs)) runs = [];
    h += '<section><h3 class="' + H3 + '">Count drill</h3>';
    if (!runs.length) h += '<p class="text-gray-400">No drill runs yet. Open Count Drill from the header.</p>';
    else {
      const asked = runs.reduce((a, r) => a + (r.asked | 0), 0), right = runs.reduce((a, r) => a + (r.correct | 0), 0);
      h += '<p class="text-gray-300">' + runs.length + (runs.length === 1 ? ' run' : ' runs') + ', <b class="text-white">' + right + '/' + asked + '</b> checks right (' + pct(right, asked) + '%)</p>' +
        '<ul class="mt-2 space-y-1">' + runs.slice(0, 6).map(r => '<li class="flex justify-between gap-3 text-xs text-gray-400"><span>' + esc(when(r.t)) + ' &middot; ' + esc(r.decks) + (r.decks === 1 ? ' deck' : ' decks') +
          (r.irc ? ', real start' : '') + (r.finished ? '' : ', stopped early') + '</span><span class="text-gray-200 font-semibold">' + (r.correct | 0) + '/' + (r.asked | 0) + '</span></li>').join('') + '</ul>' +
        '<button id="btnClearDrills" type="button" class="mt-3 text-xs text-gray-400 hover:text-white underline">Reset drill history</button>';
    }
    h += '</section>';
    $('mistakesBody').innerHTML = h;
    syncDrill();
  }

  /* two-step confirm without a blocking dialog */
  function armed(btn, label, action) {
    if (btn.dataset.armed) { action(); return; }
    const old = btn.textContent;
    btn.dataset.armed = '1'; btn.textContent = label;
    setTimeout(() => { delete btn.dataset.armed; if (btn.isConnected) btn.textContent = old; }, 3000);
  }
  $('mistakesBody').addEventListener('click', e => {
    const t = e.target;
    if (t.id === 'btnClearMistakes') armed(t, 'Click again to clear', () => { mistakes = []; spots = {}; lsSet(LS_MISTAKES, mistakes); lsSet(LS_SPOTS, spots); renderMistakes(); });
    else if (t.id === 'btnClearDrills') armed(t, 'Click again to reset', () => { lsSet(LS_DRILLS, []); renderMistakes(); });
    else if (t.id === 'btnClearChecks') armed(t, 'Click again to reset', () => { cc = {asked: 0, exact: 0, close: 0, log: []}; lsSet(LS_COUNT, cc); renderMistakes(); });
  });

  function syncDrill() {
    const b = $('btnDrillWeak'), on = $('selPracticeMode').value === 'weak';
    b.disabled = !on && !weakList().some(mappable);
    b.textContent = on ? 'Stop drilling and deal all hands' : 'Practice weak spots';
  }
  $('btnDrillWeak').addEventListener('click', () => {
    const sel = $('selPracticeMode');
    sel.value = sel.value === 'weak' ? 'all' : 'weak';
    applySettings();
    syncDrill();
  });

  $('btnOpenMistakes').addEventListener('click', () => { renderMistakes(); modal.classList.remove('hidden'); });
  $('btnCloseMistakes').addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

  /* shortcuts window (opened from Settings here, and with "?" by shortcuts.js) */
  const sc = $('shortcutsModal');
  $('btnOpenShortcuts').addEventListener('click', () => sc.classList.remove('hidden'));
  $('btnCloseShortcuts').addEventListener('click', () => sc.classList.add('hidden'));
  sc.addEventListener('click', e => { if (e.target === sc) sc.classList.add('hidden'); });
})();

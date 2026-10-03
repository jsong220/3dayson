/* Count Drill — pure REKO counting practice for the KO Blackjack trainer.
   Deals a fresh shoe face-up, one card at a time, onto a pile (each new card
   lands on top of the last with a deal animation) at an adjustable pace
   (20–40 seconds per deck) and pauses at random moments to quiz the count.
   The drill has its own shoe-size picker. The count starts at 0, or at the shoe's
   starting count (reKO: 1 deck -1, 2 decks -5, 4 decks -12, 6 decks -20, 8 decks -27)
   when "Start at the shoe's starting count" is on.
   REKO tags: 2-7 = +1, 8-9 = 0, tens and aces = -1. */
(function () {
  'use strict';
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const SUIT_NAMES = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
  const RANK_NAMES = { A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack' };
  const DECK_CHOICES = [1, 2, 4, 6, 8];
  const MAX_PILE = 14;        // cards kept visible in the pile
  const PILE_RISE = 4;        // px each newer card sits above the one below
  const MIN_QUIZ_GAP = 4;     // cards between checks, minimum
  const FIRST_QUIZ_MIN = 3;   // first check comes after at least this many cards...
  const FIRST_QUIZ_MEAN = 8;  // ...plus a random wait averaging this many more (capped below)
  const FIRST_QUIZ_CAP = 20;  // ...and never later than this
  const QUIZ_GAP_MEAN = 14;   // random wait between later checks, on top of the minimum
  const QUIZ_HOLD_MS = 900;   // the card that triggers a check stays on screen this long before the question appears
  const NEAR_END_MIN = 3, NEAR_END_MAX = 5;   // one extra check when this many cards (3-5, random) are left in the shoe
  const LS_DRILL = 'koTrainer.drill.v1', LS_RUNS = 'koTrainer.drills.v1', MAX_RUNS = 100;
  const $ = id => document.getElementById(id);

  const D = {
    active: false, paused: false, seq: 0,
    shoe: [], count: 0, dealt: 0, total: 0,
    decks: 6, pace: 30, timer: 0,
    asked: 0, correct: 0, sinceQuiz: 0, answered: false,
    endCheck: false, nearEnd: 4, pendingQuiz: null, checkAt: new Set(), startAtIRC: false, start: 0, quizOpen: false, resumeLocked: false,
  };

  function buildShoe(decks) {
    D.shoe = [];
    for (let d = 0; d < decks; d++) for (const suit of SUITS) for (const value of RANKS) {
      const numVal = value === 'A' ? 11 : (isNaN(parseInt(value, 10)) ? 10 : parseInt(value, 10));
      D.shoe.push({
        suit, value, numVal,
        isRed: suit === '♥' || suit === '♦',
        tag: (numVal >= 2 && numVal <= 7) ? 1 : ((numVal === 10 || value === 'A') ? -1 : 0),
        hidden: false,
      });
    }
    for (let i = D.shoe.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [D.shoe[i], D.shoe[j]] = [D.shoe[j], D.shoe[i]];
    }
    D.start = D.startAtIRC && typeof initialRC === 'function' ? initialRC(decks) : 0;
    D.count = D.start; D.dealt = 0; D.total = D.shoe.length;
    D.asked = 0; D.correct = 0; D.sinceQuiz = 0;
    D.endCheck = false; D.pendingQuiz = null;
    D.nearEnd = NEAR_END_MIN + Math.floor(Math.random() * (NEAR_END_MAX - NEAR_END_MIN + 1));
    /* Plan the checks up front. Every wait is random (exponential, so a check can come
       right after the last one or a good while later) — no fixed quarter/half pattern. */
    D.checkAt = new Set();
    const wait = mean => Math.floor(-Math.log(1 - Math.random()) * mean), lastAt = D.total - NEAR_END_MAX - MIN_QUIZ_GAP;   // the near-end and end-of-shoe checks own the last few cards
    let at = Math.min(FIRST_QUIZ_CAP, FIRST_QUIZ_MIN + wait(FIRST_QUIZ_MEAN));
    while (at <= lastAt) { D.checkAt.add(at); at += MIN_QUIZ_GAP + wait(QUIZ_GAP_MEAN); }
  }

  const msPerCard = () => D.pace * 1000 / 52;
  const fmtC = n => (n > 0 ? '+' + n : String(n));

  /* Full card face matching the trainer's .playing-card structure (renderCard
     in game.js is closure-private, so the drill renders its own). */
  function cardHtml(card) {
    const cls = card.isRed ? 'red' : 'black';
    const label = (RANK_NAMES[card.value] || card.value) + ' of ' + SUIT_NAMES[card.suit];
    return `<div class="playing-card ${cls}" role="img" aria-label="${label}">` +
      `<div class="leading-none text-left">${card.value}</div>` +
      `<div class="card-pip flex-grow flex items-center justify-center">${card.suit}</div>` +
      `<div class="leading-none text-left rotate-180">${card.value}</div></div>`;
  }

  function showSetup() {
    $('drillSetup').classList.remove('hidden');
    $('drillLive').classList.add('hidden'); $('drillLive').classList.remove('flex');
    $('drillSummary').classList.add('hidden');
  }
  function showLive() {
    $('drillSetup').classList.add('hidden');
    $('drillSummary').classList.add('hidden');
    $('drillLive').classList.remove('hidden'); $('drillLive').classList.add('flex');
  }
  function setPauseLabel() { $('btnPauseDrill').textContent = D.paused ? 'Resume' : 'Pause'; }

  function updateProgress() {
    $('drillDealt').textContent = D.dealt;
    $('drillTotal').textContent = D.total;
    const pct = D.total ? Math.round(D.dealt / D.total * 100) : 0;
    $('drillProgress').textContent = pct + '%';
    $('drillBar').style.width = pct + '%';
    $('drillShoeCount').textContent = D.shoe.length;
    $('drillChecks').textContent = D.asked ? `Checks: ${D.correct}/${D.asked}` : 'Checks: —';
  }

  function schedule() {
    const s = D.seq;
    D.timer = setTimeout(() => { if (s === D.seq) tick(); }, msPerCard());
  }

  /* Deal one card onto the pile: the new card lands on top of the last one,
     nudged slightly upward with a small rotation, sliding in from the shoe. */
  function dealToPile(card) {
    const pile = $('drillPile');
    const wrap = document.createElement('div');
    wrap.className = 'drill-card-wrap';
    wrap.style.marginLeft = (((D.dealt * 91) % 13) - 6) + 'px';
    const holder = document.createElement('div');
    holder.innerHTML = cardHtml(card);
    const node = holder.firstChild;
    const rot = ((D.dealt * 137) % 9) - 4;
    node.style.transform = `rotate(${rot}deg)`;
    node.classList.add('drill-deal');
    wrap.appendChild(node);
    pile.appendChild(wrap);
    while (pile.children.length > MAX_PILE) pile.removeChild(pile.firstChild);
    const kids = pile.children, n = kids.length;
    for (let i = 0; i < n; i++) kids[i].style.bottom = (i * PILE_RISE) + 'px';
  }

  function tick() {
    if (!D.active || D.paused || D.quizOpen || D.pendingQuiz) return;
    if (!D.shoe.length) { showSummary(); return; }
    const card = D.shoe.pop();
    D.count += card.tag; D.dealt++; D.sinceQuiz++;
    dealToPile(card);
    updateProgress();
    /* A check is asked about the cards you have SEEN. The card that triggers it is already counted, so it must be
       on screen first: hold for a moment, then ask. */
    if (!D.shoe.length) { holdForQuiz(true); return; }               // last card out: always ask for the final count
    if (D.shoe.length === D.nearEnd) { holdForQuiz(false); return; } // one more a few cards before the end
    if (D.checkAt.has(D.dealt)) { holdForQuiz(false); return; }
    schedule();
  }

  function holdForQuiz(final) {
    D.pendingQuiz = {final: !!final};
    const s = D.seq;
    D.timer = setTimeout(() => {
      if (s !== D.seq || !D.active || D.paused) return;
      const p = D.pendingQuiz; D.pendingQuiz = null;
      if (p) askQuiz(p.final);
    }, QUIZ_HOLD_MS);
  }

  function askQuiz(final) {
    D.paused = true; D.quizOpen = true; D.resumeLocked = false; D.seq++; clearTimeout(D.timer);
    D.asked++; D.sinceQuiz = 0; D.answered = false; D.endCheck = !!final;
    setPauseLabel();
    $('drillQuizTitle').textContent = final ? 'Shoe finished — final count?' : 'Count check!';
    $('drillQuizInput').value = '';
    $('drillQuizAsk').classList.remove('hidden');
    $('drillQuizFeedback').classList.add('hidden');
    $('drillQuizModal').classList.remove('hidden');
    setTimeout(() => $('drillQuizInput').focus(), 60);
  }

  function submitQuiz() {
    if (D.answered) return;
    const raw = String($('drillQuizInput').value).trim().replace(/[\u2212\u2013]/g, '-');
    if (!/^[+-]?\d{1,4}$/.test(raw)) { $('drillQuizInput').focus(); return; }
    const val = parseInt(raw, 10);
    D.answered = true;
    D.resumeLocked = true; setTimeout(() => { D.resumeLocked = false; }, 600);   // the same Enter press or a double tap must not skip the feedback
    const right = val === D.count;
    if (right) D.correct++;
    const res = $('drillQuizResult');
    res.textContent = right ? 'Correct!' : 'Not quite.';
    res.className = 'text-lg font-bold mb-1 ' + (right ? 'text-green-400' : 'text-red-400');
    const endNote = D.endCheck ? ' A full ' + D.decks + '-deck' + ' shoe ends at ' + fmtC(D.start + 4 * D.decks) + '.' : '';
    $('drillQuizRight').textContent = (right ? 'The running count is ' + fmtC(D.count) + '.' : 'The running count was ' + fmtC(D.count) + '. You said ' + fmtC(val) + ' (' + (val > D.count ? 'too high' : 'too low') + ' by ' + Math.abs(val - D.count) + ').') + endNote;
    $('drillQuizAsk').classList.add('hidden');
    $('drillQuizFeedback').classList.remove('hidden');
    updateProgress();
    if (right) {
      /* correct: say so, then move on by itself */
      const s = D.seq;
      setTimeout(() => { if (s === D.seq) resumeFromQuiz(); }, 1200);
    } else {
      /* wrong: stay put until the player presses Resume */
      $('btnDrillQuizResume').focus();
    }
  }

  function resumeFromQuiz() {
    if (!D.quizOpen || !D.answered || D.resumeLocked) return;   // nothing to resume, not answered yet, or too soon after the answer
    D.quizOpen = false;
    D.seq++; /* invalidate any pending auto-resume */
    $('drillQuizModal').classList.add('hidden');
    if (D.endCheck) { D.paused = false; setPauseLabel(); showSummary(); return; }
    /* after the end-of-shoe check the drill goes straight to the summary (handled above) */
    D.paused = false; setPauseLabel(); schedule();
  }

  /* one line per drill run, shown in Stats > Mistakes & count checks */
  function recordRun(finished) {
    if (!D.asked) return;
    let runs = []; try { runs = lsGet(LS_RUNS, []); } catch (e) { /* ignore */ }
    if (!Array.isArray(runs)) runs = [];
    runs.unshift({t: Date.now(), decks: D.decks, pace: D.pace, irc: D.startAtIRC, asked: D.asked, correct: D.correct, finished: !!finished});
    if (runs.length > MAX_RUNS) runs.length = MAX_RUNS;
    try { lsSet(LS_RUNS, runs); } catch (e) { /* ignore */ }
  }
  function showSummary() {
    recordRun(true);
    D.active = false;
    $('drillLive').classList.add('hidden'); $('drillLive').classList.remove('flex');
    $('drillSummary').classList.remove('hidden');
    $('drillScore').innerHTML = `You nailed <b class="text-white">${D.correct}</b> of <b class="text-white">${D.asked}</b> count checks.`;
    $('drillFinal').textContent = `Shoe complete — final count ${fmtC(D.count)} over ${D.dealt} cards` + (D.startAtIRC ? ` (started at ${fmtC(D.start)}).` : '.');
  }

  function loadPrefs() {
    let o = null;
    try { o = lsGet(LS_DRILL, null); } catch (e) { /* ignore */ }
    if (!o || typeof o !== 'object') o = {};
    let decks = parseInt(o.decks, 10);
    if (!DECK_CHOICES.includes(decks)) {            // older builds saved just the deck count under "drillDecks"
      try { decks = parseInt(localStorage.getItem('drillDecks') || '0', 10); } catch (e) { decks = 0; }
    }
    if (!DECK_CHOICES.includes(decks)) { const s = (typeof STATE !== 'undefined' && STATE.numDecks) || 6; decks = DECK_CHOICES.includes(s) ? s : 6; }
    D.decks = decks;
    const pace = parseInt(o.pace, 10); D.pace = pace >= 20 && pace <= 40 ? pace : 30;
    D.startAtIRC = !!o.irc;
    $('drillPace').value = D.pace; $('drillPaceLabel').textContent = D.pace + ' sec / deck';
    $('drillStartIRC').checked = D.startAtIRC;
  }
  function savePrefs() { try { lsSet(LS_DRILL, {decks: D.decks, pace: D.pace, irc: D.startAtIRC}); } catch (e) { /* ignore */ } }
  function paintStartNote() {
    const v = typeof initialRC === 'function' ? initialRC(D.decks) : 0;
    $('drillStartVal').textContent = '(' + fmtC(v) + ')';
  }

  function paintDeckPills() {
    document.querySelectorAll('#drillDeckPills .drill-pill').forEach(b => {
      const on = parseInt(b.dataset.decks, 10) === D.decks;
      b.classList.toggle('drill-pill-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    $('drillDeckCards').textContent = D.decks + (D.decks === 1 ? ' deck' : ' decks') + ' · ' + (D.decks * 52) + ' cards';
    paintStartNote();
  }

  function startDrill() {
    savePrefs();
    D.seq++;
    buildShoe(D.decks);
    D.active = true; D.paused = false; D.quizOpen = false; D.resumeLocked = false; D.pendingQuiz = null;
    $('drillQuizModal').classList.add('hidden');
    $('drillPile').innerHTML = '';
    updateProgress();
    setPauseLabel();
    showLive();
    const s = D.seq;
    D.timer = setTimeout(() => { if (s === D.seq && D.active) tick(); }, 700);
  }

  function togglePause() {
    if (!D.active || D.quizOpen) return;
    if (D.paused) { D.paused = false; setPauseLabel(); if (D.pendingQuiz) holdForQuiz(D.pendingQuiz.final); else schedule(); }
    else { D.paused = true; D.seq++; clearTimeout(D.timer); setPauseLabel(); }
  }

  function openDrill() {
    if (typeof MP !== 'undefined' && MP.active) {
      if (typeof window.showHintToast === 'function') window.showHintToast('Count drill is solo practice — leave the 2P table first.');
      return;
    }
    if (typeof STATE !== 'undefined' && !STATE.isGameOver) {
      if (typeof window.showHintToast === 'function') window.showHintToast('Finish the current hand before starting a count drill.');
      return;
    }
    loadPrefs();
    paintDeckPills();
    showSetup();
    $('drillModal').classList.remove('hidden');
  }

  function closeDrill() {
    if (D.active) recordRun(false);
    D.seq++; clearTimeout(D.timer);
    D.active = false; D.paused = false; D.quizOpen = false; D.pendingQuiz = null;
    $('drillQuizModal').classList.add('hidden');
    $('drillModal').classList.add('hidden');
    showSetup();
  }

  /* Back to the setup screen without closing the window: the current run is
     discarded, but the deck-size and pace picks are kept. */
  function backToSetup() {
    if (D.active) recordRun(false);
    D.seq++; clearTimeout(D.timer);
    D.active = false; D.paused = false; D.quizOpen = false; D.pendingQuiz = null;
    $('drillQuizModal').classList.add('hidden');
    setPauseLabel();
    paintDeckPills();
    showSetup();
  }

  $('btnOpenDrill').addEventListener('click', openDrill);
  $('btnCloseDrill').addEventListener('click', closeDrill);
  $('btnStartDrill').addEventListener('click', startDrill);
  $('btnDrillAgain').addEventListener('click', startDrill);
  $('btnDrillClose2').addEventListener('click', closeDrill);
  $('btnStopDrill').addEventListener('click', closeDrill);
  $('btnBackDrill').addEventListener('click', backToSetup);
  $('btnPauseDrill').addEventListener('click', togglePause);
  $('btnDrillQuizSubmit').addEventListener('click', submitQuiz);
  $('btnDrillQuizResume').addEventListener('click', resumeFromQuiz);
  $('drillQuizInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitQuiz(); } });
  $('drillPace').addEventListener('input', e => {
    D.pace = parseInt(e.target.value, 10) || 30;
    $('drillPaceLabel').textContent = D.pace + ' sec / deck';
    savePrefs();
  });
  $('drillStartIRC').addEventListener('change', e => { D.startAtIRC = e.target.checked; savePrefs(); paintStartNote(); });
  $('btnDrillSign').addEventListener('click', () => {
    const i = $('drillQuizInput'), v = i.value.trim().replace(/\u2212/g, '-');
    i.value = v.startsWith('-') ? v.slice(1) : '-' + v.replace(/^\+/, '');
    i.focus();
  });
  document.querySelectorAll('#drillDeckPills .drill-pill').forEach(b => {
    b.addEventListener('click', () => {
      D.decks = parseInt(b.dataset.decks, 10) || 6;
      savePrefs();
      paintDeckPills();
    });
  });

  window.CountDrill = { D, buildShoe, msPerCard, startDrill, closeDrill, openDrill, backToSetup, dealToPile, cardHtml, tick, askQuiz, submitQuiz, resumeFromQuiz, DECK_CHOICES };
})();

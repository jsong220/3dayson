/* 2-player table over PeerJS (free, browser-to-browser). The HOST's browser runs the real game engine
   (ko-blackjack.js); the GUEST's browser mirrors the table and sends its bets/actions. Loaded after the engine. */
(function () {
  'use strict';
  var MP = window.MP = {active: false, me: 'host', actor: 'host', conn: null, guestBet: 0, hostReady: false};
  var $ = function (id) { return document.getElementById(id); };
  var isHost = function () { return MP.active && MP.me === 'host'; };
  var isGuest = function () { return MP.active && MP.me === 'guest'; };
  var send = function (m) { if (MP.conn && MP.conn.open) MP.conn.send(m); };
  var hide = function (id) { $(id).classList.add('hidden'); }, show = function (id) { $(id).classList.remove('hidden'); };
  var ORIG = {Hit: window.hit, Stand: window.stand, Double: window.double, Split: window.split, Surrender: window.surrender};
  var BTN = {btnHit: 'Hit', btnStand: 'Stand', btnDouble: 'Double', btnSplit: 'Split', btnSurrender: 'Surrender'};

  /* ---------- status pill ---------- */
  var pill = document.createElement('div');
  pill.style.cssText = 'position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:60;font:10px monospace;background:rgba(0,0,0,.8);color:#4ade80;padding:4px 10px;border:1px solid #4ade80;border-radius:999px;display:none;pointer-events:none;white-space:nowrap';
  document.body.appendChild(pill);
  pill.setAttribute('role', 'status');
  function status(t) { pill.textContent = t; pill.style.display = t ? 'block' : 'none'; }

  /* ---------- wrap engine functions ---------- */
  var oRender = window.renderTable;
  window.renderTable = function (tgt) {
    oRender(tgt || null);
    if (!MP.active) return;
    document.querySelectorAll('#playerHandsContainer .hand-label').forEach(function (el, i) {   /* YOU / FRIEND tags */
      var h = STATE.playerHands[i]; if (!h || !h.owner) return;
      var me = h.owner === MP.me;
      el.insertAdjacentHTML('afterbegin', '<span class="font-bold" style="color:' + (me ? '#5eead4' : '#f9a8d4') + '">' + (me ? 'YOU' : 'FRIEND') + '</span>');
    });
    if (isHost()) send({t: 's', d: STATE.dealerCards, p: STATE.playerHands, i: STATE.currentHandIndex, over: STATE.isGameOver,
      anim: STATE.isAnimating, ko: STATE.koCount, dl: STATE.deck.length, tgt: tgt || null});
  };
  var oUC = window.updateControls;
  window.updateControls = function () {                       /* lock buttons when it's the other player's hand */
    oUC();
    if (!MP.active || STATE.isGameOver) return;
    var h = STATE.playerHands[STATE.currentHandIndex];
    if (h && h.owner && h.owner !== MP.me) $('actionControls').classList.add('opacity-50', 'pointer-events-none');
  };
  var oAL = window.actionLocked;
  window.actionLocked = function () {
    if (oAL()) return true;
    if (!MP.active) return false;
    var h = STATE.playerHands[STATE.currentHandIndex];
    return !h || h.owner !== MP.actor;
  };
  var oPM = window.processMove;                               /* no trainer hints/grading for the friend's hands */
  window.processMove = function (a) { return MP.actor === 'guest' ? true : oPM(a); };
  var oOB = window.openBetting;                               /* betting opens only AFTER any shuffle (see beginBetting) */
  window.openBetting = function () {
    oOB();
    if (isHost()) { MP.guestBet = 0; MP.hostReady = false; send({t: 'bet'}); }
  };
  var oShuf = window.playShuffleAnim;
  window.playShuffleAnim = function (cb, label) { if (isHost()) send({t: 'shuf', l: label}); return oShuf(cb, label); };
  var oRG = window.resolveGame;
  window.resolveGame = function () { return MP.active ? resolveMP() : oRG(); };
  var oDH = window.dealHand;
  window.dealHand = function () { if (MP.active) $('btnDeal').click(); else oDH(); };
  Object.keys(ORIG).forEach(function (a) {                    /* guest actions go over the wire instead */
    window[a.toLowerCase()] = function () { return isGuest() ? guestSend(a) : ORIG[a].apply(this, arguments); };
  });

  /* ---------- buttons (capture phase so we run before the engine's own listeners) ---------- */
  Object.keys(BTN).forEach(function (id) {
    $(id).addEventListener('click', function (e) { if (isGuest()) { e.stopImmediatePropagation(); guestSend(BTN[id]); } }, true);
  });
  $('btnDeal').addEventListener('click', function (e) {
    if (!MP.active) return;
    e.stopImmediatePropagation();
    if (STATE.currentBet <= 0 || STATE.shuffling) return;
    hide('betControls');
    if (isGuest()) { send({t: 'bet', v: STATE.currentBet}); showMessage('Waiting for host...', 'text-white'); return; }
    MP.hostReady = true;
    if (MP.guestBet > 0) dealMP(); else showMessage('Waiting for friend to bet...', 'text-white');
  }, true);

  function guestSend(a) {
    var h = STATE.playerHands[STATE.currentHandIndex];
    if (STATE.isGameOver || STATE.isAnimating || !h || h.owner !== 'guest') return;
    send({t: 'a', a: a});
  }
  function guestAct(a) {                                      /* host runs the friend's move through the real engine */
    var h = STATE.playerHands[STATE.currentHandIndex];
    if (!ORIG[a] || !h || h.owner !== 'guest' || STATE.isGameOver || STATE.isAnimating) return;
    MP.actor = 'guest';
    try { ORIG[a](); } finally { MP.actor = 'host'; }
  }
  function say(hm, hc, gm, gc) { if (hm) showMessage(hm, hc); if (gm) send({t: 'msg', m: gm, c: gc}); }

  /* ---------- host: deal one round to both seats ---------- */
  function dealMP() {
    dealSeq++; var seq = dealSeq;
    MP.hostReady = false;
    var gb = MP.guestBet; MP.guestBet = 0;
    send({t: 'dealt'}); hideMessage(); hide('betControls'); hide('postGameControls'); show('actionControls');
    var mk = function (o, b, c) { return {cards: [], bet: b, carry: c, owner: o, isBust: false, isStand: false, doubled: false, isSurrendered: false, fromSplit: false}; };
    STATE.playerHands = [mk('host', STATE.currentBet, STATE.carryPushes ? STATE.pushPot : 0), mk('guest', gb, 0)];
    STATE.pushPot = 0; updatePotUI(); STATE.dealerCards = []; STATE.currentHandIndex = 0;
    STATE.isGameOver = false; STATE.isAnimating = true; STATE.insuranceNet = 0; updateControls(); renderTable();
    var H = STATE.playerHands;
    [function () { H[0].cards.push(drawCard()); renderTable('player-0'); },
     function () { H[1].cards.push(drawCard()); renderTable('player-1'); },
     function () { STATE.dealerCards.push(drawCard()); renderTable('dealer'); },
     function () { H[0].cards.push(drawCard()); renderTable('player-0'); },
     function () { H[1].cards.push(drawCard()); renderTable('player-1'); },
     function () { STATE.dealerCards.push(drawCard(true)); renderTable(); },
     afterDeal].forEach(function (f, k) { setTimeout(function () { if (seq === dealSeq) f(); }, 150 + k * 220); });
  }
  function afterDeal() {
    var seq = dealSeq;
    var d = STATE.dealerCards, H = STATE.playerHands, up = d[0], dBJ = up.numVal + d[1].numVal === 21;
    var nat = H.map(function (h) { return calculateHand(h.cards).sum === 21; });
    nat.forEach(function (n, i) { if (n) H[i].isStand = true; });
    if (dBJ && (up.value === 'A' || up.numVal === 10)) { say('Dealer has Blackjack', 'text-red-400', 'Dealer has Blackjack', 'text-red-400'); setTimeout(function () { if (seq === dealSeq) dealerTurn(); }, 900); return; }
    say(nat[0] ? 'Blackjack!' : null, 'text-yellow-400', nat[1] ? 'Blackjack!' : null, 'text-yellow-400');
    var first = H.findIndex(function (h) { return !h.isStand; });
    if (first < 0) { setTimeout(function () { if (seq === dealSeq) dealerTurn(); }, 1000); return; }
    STATE.currentHandIndex = first; STATE.isAnimating = false; renderTable(); updateControls();
  }
  function resolveMP() {                                      /* each seat scored separately; trainer stats/pot = host only */
    var seq = dealSeq;
    var R = STATE.playerHands.map(function (h) { return evaluateHand(h, STATE.dealerCards); }), net = {host: 0, guest: 0}, pot = 0;
    R.forEach(function (r, i) {
      var h = STATE.playerHands[i]; h.result = r; net[h.owner] += r.net;
      if (h.owner !== 'host') return;
      if (r.net > 0) STATE.stats.wins++; else if (r.net < 0) STATE.stats.losses++; else STATE.stats.pushes++;
      if (STATE.carryPushes && r.key === 'push') pot += h.bet + (h.carry || 0);
    });
    STATE.stats.netEarnings += net.host; STATE.stats.handsPlayed++; STATE.pushPot = pot; updatePotUI();
    if (net.host > 0) setTimeout(function () { if (seq === dealSeq) chipBurst(); }, 150);
    setTimeout(function () { if (seq === dealSeq) sfx(net.host > 0 ? 'win' : net.host < 0 ? 'lose' : 'push'); }, 150);
    say('Round net ' + fmtMoney(net.host), netColor(net.host), 'Round net ' + fmtMoney(net.guest), netColor(net.guest));
    updateStatsUI();
    renderTable();
    setTimeout(function () {
      if (seq !== dealSeq) return;
      hide('actionControls'); send({t: 'end'});
      if (!MP.active) return;
      if (STATE.autoNext) startAutoNext(); else show('postGameControls');
    }, 1000);
  }

  /* ---------- messages ---------- */
  function onHostData(m) {
    if (m.t === 'bet' && typeof m.v === 'number' && m.v > 0) { MP.guestBet = m.v; if (MP.hostReady) dealMP(); }
    else if (m.t === 'a') guestAct(m.a);
  }
  function onGuestData(m) {
    if (m.t === 's') {
      STATE.dealerCards = m.d; STATE.playerHands = m.p; STATE.currentHandIndex = m.i; STATE.isGameOver = m.over;
      STATE.isAnimating = m.anim; STATE.koCount = m.ko; STATE.deck = new Array(m.dl).fill(null);
      updateTrackerUI(); renderTable(m.tgt); updateControls();
    } else if (m.t === 'bet') {
      STATE.playerHands = []; STATE.dealerCards = []; STATE.isGameOver = true; STATE.isAnimating = false;
      $('dealerValue').classList.add('hidden'); $('playerHandsContainer').innerHTML = ''; $('dealerHand').innerHTML = '';
      hide('actionControls'); hide('postGameControls'); show('betControls');
      $('btnDeal').disabled = STATE.currentBet <= 0; showMessage('Place your bet', 'text-white');
    } else if (m.t === 'dealt') { hide('betControls'); hideMessage(); show('actionControls'); }
    else if (m.t === 'msg') showMessage(m.m, m.c);
    else if (m.t === 'end') hide('actionControls');
    else if (m.t === 'shuf') oShuf(null, m.l);
    else if (m.t === 'wait') { hide('betControls'); showMessage('Round in progress - you join next hand', 'text-white'); }
  }
  function onClose() {
    var was = MP.active; MP.active = false; MP.conn = null;
    if (!was) return;
    status('FRIEND LEFT - SOLO MODE');
    if (MP.me === 'guest') { showMessage('Host disconnected', 'text-red-400'); return; }
    STATE.playerHands.forEach(function (h) { if (h.owner === 'guest') h.isStand = true; });
    var h = STATE.playerHands[STATE.currentHandIndex];
    if (!STATE.isGameOver && h && h.owner === 'guest') nextHandOrDealer();
    else if (MP.hostReady) { MP.hostReady = false; show('betControls'); showMessage('Place your bet', 'text-white'); }
  }

  /* ---------- connecting (PeerJS free public broker) ---------- */
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:100;background:rgba(6,4,22,.93);display:none;align-items:center;justify-content:center;font:12px/2 monospace;color:#fff;text-align:center';
  ov.innerHTML = '<div style="width:min(340px,90vw);border:3px solid #fff;padding:18px;background:#0b0620;box-shadow:6px 6px 0 #ff4fd8"><div style="font-size:18px;color:#ffdd2d;margin-bottom:8px">2 PLAYER</div><div id="mpBody"></div></div>';
  document.body.appendChild(ov);
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', '2 player lobby');
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.style.display === 'flex') ov.style.display = 'none'; });
  var B = 'display:block;width:100%;margin:8px 0;padding:10px;font:inherit;font-weight:bold;color:#06210f;background:#4ade80;border:3px solid #fff;cursor:pointer';
  function view(html) { $('mpBody').innerHTML = html; }
  function menu() {
    view('<button data-a="host" style="' + B + '">HOST A TABLE</button><button data-a="join" style="' + B + '">JOIN A TABLE</button>' +
         '<button data-a="solo" style="' + B + ';background:#2a1a5e;color:#fff">CLOSE</button>');
  }
  function rc() { var s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', o = ''; for (var i = 0; i < 4; i++) o += s[Math.floor(Math.random() * s.length)]; return o; }
  function startHost() {
    if (!window.Peer) { view('Could not load PeerJS (offline?)<br><button data-a="menu" style="' + B + '">BACK</button><button data-a="solo" style="' + B + ';background:#2a1a5e;color:#fff">CLOSE</button>'); return; }
    if (MP.peer) { try { MP.peer.destroy(); } catch (e) {} }
    var code = rc(), p = MP.peer = new Peer('kotrainer-' + code); MP.me = 'host'; view('Creating table...<br><button data-a="menu" style="' + B + '">BACK</button><button data-a="solo" style="' + B + ';background:#2a1a5e;color:#fff">CLOSE</button>');
    p.on('open', function () {
      var link = location.origin + location.pathname + '?join=' + code;
      view('Room code<div style="font-size:32px;letter-spacing:.2em;color:#4ade80">' + code + '</div>Send your friend this link or code:' +
           '<button data-a="copy" style="' + B + '">COPY INVITE LINK</button><div>Waiting for friend...</div>' +
           '<button data-a="menu" style="' + B + '">BACK</button><button data-a="solo" style="' + B + ';background:#2a1a5e;color:#fff">CLOSE</button>');
      ACT.copy = function () {
        if (navigator.clipboard) navigator.clipboard.writeText(link);
        view('Link copied! Waiting for friend...<br><button data-a="menu" style="' + B + '">BACK</button><button data-a="solo" style="' + B + ';background:#2a1a5e;color:#fff">CLOSE</button>');
      };
    });
    p.on('connection', function (c) {
      if (MP.conn) { c.close(); return; }
      c.on('open', function () {
        MP.conn = c; MP.active = true; MP.actor = 'host'; ov.style.display = 'none'; status('2P TABLE ' + code + ' - FRIEND JOINED');
        if (STATE.isGameOver && !$('betControls').classList.contains('hidden')) { MP.guestBet = 0; send({t: 'bet'}); } else send({t: 'wait'});
      });
      c.on('data', onHostData); c.on('close', onClose); c.on('error', onClose);
    });
    p.on('error', function (e) { if (e.type === 'unavailable-id') { p.destroy(); startHost(); } else view('Error: ' + e.type + '<br><button data-a="menu" style="' + B + '">BACK</button><button data-a="solo" style="' + B + ';background:#2a1a5e;color:#fff">CLOSE</button>'); });
  }
  function join(code) {
    code = (code || '').trim().toUpperCase(); if (!code) return;
    if (!window.Peer) { view('Could not load PeerJS (offline?)<br><button data-a="menu" style="' + B + '">BACK</button><button data-a="solo" style="' + B + ';background:#2a1a5e;color:#fff">CLOSE</button>'); return; }
    view('Joining ' + code + '...<br><button data-a="menu" style="' + B + '">BACK</button><button data-a="solo" style="' + B + ';background:#2a1a5e;color:#fff">CLOSE</button>');
    if (MP.peer) { try { MP.peer.destroy(); } catch (e) {} }
    var p = MP.peer = new Peer(); MP.me = 'guest';
    p.on('open', function () {
      var c = p.connect('kotrainer-' + code, {reliable: true});
      c.on('open', function () {
        MP.conn = c; MP.active = true; ov.style.display = 'none'; status('2P TABLE ' + code + ' - YOU ARE PLAYER 2');
        hide('betControls'); hide('postGameControls'); hide('actionControls'); $('btnShuffle').style.display = 'none';
        showMessage('Connected! Waiting for host...', 'text-white');
      });
      c.on('data', onGuestData); c.on('close', onClose); c.on('error', onClose);
    });
    p.on('error', function (e) { view((e.type === 'peer-unavailable' ? 'No table with that code' : 'Error: ' + e.type) + '<br><button data-a="join" style="' + B + '">TRY AGAIN</button><button data-a="menu" style="' + B + '">BACK</button><button data-a="solo" style="' + B + ';background:#2a1a5e;color:#fff">CLOSE</button>'); });
  }
  var ACT = {
    host: startHost, menu: menu,
    join: function () { view('Enter room code<input id="mpCode" maxlength="4" autocapitalize="characters" style="display:block;width:100%;margin:8px 0;padding:10px;font:inherit;font-size:20px;text-align:center;letter-spacing:.3em;text-transform:uppercase"><button data-a="go" style="' + B + '">JOIN</button><button data-a="menu" style="' + B + '">BACK</button><button data-a="solo" style="' + B + ';background:#2a1a5e;color:#fff">CLOSE</button>'); },
    go: function () { join($('mpCode').value); },
    solo: function () { ov.style.display = 'none'; },
    leave: function () { if (MP.conn) MP.conn.close(); if (MP.peer) { try { MP.peer.destroy(); } catch (e) {} } onClose(); ov.style.display = 'none'; }
  };
  ov.addEventListener('click', function (e) { var a = e.target.getAttribute && e.target.getAttribute('data-a'); if (a && ACT[a]) ACT[a](); });

  /* the small 2P button in the header opens the lobby */
  $('btnHome').addEventListener('click', function () {
    ov.style.display = 'flex';
    if (MP.active) view('Table is live!<button data-a="leave" style="' + B + ';background:#ff4fd8">LEAVE TABLE</button><button data-a="solo" style="' + B + ';background:#2a1a5e;color:#fff">CLOSE</button>');
    else menu();
  });
  /* an invite link (?join=CODE) joins straight away */
  var q = /[?&]join=([A-Za-z0-9]{4})/.exec(location.search);
  if (q) { ov.style.display = 'flex'; join(q[1]); }
})();

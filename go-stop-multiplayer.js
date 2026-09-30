/* Go Stop 2P (host-authoritative). Host runs the engine; guest mirrors state
   and drives the "c" seat over PeerJS. Loaded after go-stop.js. */
(function () {
  'use strict';
  var MP = window.MP = {active: false, me: 'host', conn: null, peer: null};
  var $ = function (id) { return document.getElementById(id); };
  MP.send = function (m) { if (MP.conn && MP.conn.open) MP.conn.send(m); };

  var pill = document.createElement('div');
  pill.style.cssText = 'position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:60;font:10px monospace;background:rgba(0,0,0,.8);color:#4ade80;padding:4px 10px;border:1px solid #4ade80;border-radius:999px;display:none;pointer-events:none;white-space:nowrap';
  document.body.appendChild(pill);
  function status(t) { pill.textContent = t; pill.style.display = t ? 'block' : 'none'; }

  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:100;background:rgba(6,10,8,.93);display:none;align-items:center;justify-content:center;font:12px/2 monospace;color:#eef5ee;text-align:center';
  ov.innerHTML = '<div style="width:min(340px,90vw);border:3px solid #fff;padding:18px;background:#0b1a12;box-shadow:6px 6px 0 #f5c542"><div style="font-size:18px;color:#f5c542;margin-bottom:8px">GO STahp · 2P</div><div id="mpBody"></div></div>';
  document.body.appendChild(ov);
  var B = 'display:block;width:100%;margin:8px 0;padding:10px;font:inherit;font-weight:bold;color:#0b1a12;background:#8bd6a8;border:3px solid #fff;cursor:pointer';
  function view(html) { $('mpBody').innerHTML = html; }
  function menu() { view('<button data-a="host" style="' + B + '">HOST A TABLE</button><button data-a="join" style="' + B + '">JOIN A TABLE</button><button data-a="solo" style="' + B + ';background:#24493a;color:#fff">CLOSE</button>'); }
  function rc() { var s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', o = ''; for (var i = 0; i < 4; i++) o += s[Math.floor(Math.random() * s.length)]; return o; }

  function startHost() {
    if (!window.Peer) { view('Could not load PeerJS (offline?)'); return; }
    if (MP.peer) { try { MP.peer.destroy(); } catch (e) {} }
    var code = rc(), p = MP.peer = new Peer('gostop-' + code); MP.me = 'host'; view('Creating table...');
    p.on('open', function () {
      var link = location.origin + location.pathname + '?join=' + code;
      view('Room code<div style="font-size:32px;letter-spacing:.2em;color:#8bd6a8">' + code + '</div>Send your friend this link or code:' +
        '<button data-a="copy" style="' + B + '">COPY INVITE LINK</button><div>Waiting for friend...</div>');
      ACT.copy = function () { if (navigator.clipboard) navigator.clipboard.writeText(link); view('Link copied! Waiting for friend...'); };
    });
    p.on('connection', function (c) {
      if (MP.conn) { c.close(); return; }
      c.on('open', function () {
        MP.conn = c; MP.active = true; ov.style.display = 'none';
        status('2P TABLE ' + code + ' - FRIEND JOINED');
        if (window.gsTakeSnapshot) MP.send({t:'state', s:window.gsTakeSnapshot()});
      });
      c.on('data', onHostData); c.on('close', onClose); c.on('error', onClose);
    });
    p.on('error', function (e) { if (e.type === 'unavailable-id') { p.destroy(); startHost(); } else view('Error: ' + e.type + '<br><button data-a="menu" style="' + B + '">BACK</button>'); });
  }
  function join(code) {
    code = (code || '').trim().toUpperCase(); if (!code) return;
    if (!window.Peer) { view('Could not load PeerJS (offline?)'); return; }
    view('Joining ' + code + '...');
    if (MP.peer) { try { MP.peer.destroy(); } catch (e) {} }
    var p = MP.peer = new Peer(); MP.me = 'guest';
    p.on('open', function () {
      var c = p.connect('gostop-' + code, {reliable: true});
      c.on('open', function () {
        MP.conn = c; MP.active = true; ov.style.display = 'none';
        status('2P TABLE ' + code + ' - YOU ARE PLAYER 2');
      });
      c.on('data', onGuestData); c.on('close', onClose); c.on('error', onClose);
    });
    p.on('error', function (e) { view((e.type === 'peer-unavailable' ? 'No table with that code' : 'Error: ' + e.type) + '<br><button data-a="join" style="' + B + '">TRY AGAIN</button>'); });
  }
  var ACT = {
    host: startHost, menu: menu,
    join: function () { view('Enter room code<input id="mpCode" maxlength="4" autocapitalize="characters" style="display:block;width:100%;margin:8px 0;padding:10px;font:inherit;font-size:20px;text-align:center;letter-spacing:.3em;text-transform:uppercase"><button data-a="go" style="' + B + '">JOIN</button>'); },
    go: function () { join($('mpCode').value); },
    solo: function () { ov.style.display = 'none'; },
    leave: function () { if (MP.conn) MP.conn.close(); if (MP.peer) { try { MP.peer.destroy(); } catch (e) {} } onClose(); ov.style.display = 'none'; }
  };
  ov.addEventListener('click', function (e) { var a = e.target.getAttribute && e.target.getAttribute('data-a'); if (a && ACT[a]) ACT[a](); });

  function onHostData(m) {
    if (m.t === 'play' && typeof m.idx === 'number') window.gsPlayRemote && window.gsPlayRemote(m.idx);
    else if (m.t === 'pick' && typeof m.id === 'string') window.gsResolvePick && window.gsResolvePick(m.id);
    else if (m.t === 'go') { window.goCall && window.goCall('c'); MP.send({t:'state', s:window.gsTakeSnapshot()}); }
    else if (m.t === 'stahp') { window.stahpCall && window.stahpCall('c'); }
  }
  function onGuestData(m) {
    if (m.t === 'state' && window.gsApplySnapshot) window.gsApplySnapshot(m.s);
    else if (m.t === 'fly' && window.gsFly) window.gsFly(m.c, m.src, m.dst);
    else if (m.t === 'sfx' && window.gsPlaySfx) window.gsPlaySfx(m.n);
    else if (m.t === 'stealAnim' && window.gsStealAnim) window.gsStealAnim(m.w, m.c);
    else if (m.t === 'goStop') {
      var go = confirm('You reached 7+. GO (keep playing) or Cancel to STahp?');
      MP.send({t: go ? 'go' : 'stahp'});
    }
  }
  function onClose() {
    var was = MP.active; MP.active = false; MP.conn = null;
    if (!was) return;
    status('FRIEND LEFT - SOLO MODE');
  }

  $('btn2P').addEventListener('click', function () {
    ov.style.display = 'flex';
    if (MP.active) view('Table is live!<button data-a="leave" style="' + B + ';background:#ffb3ef">LEAVE TABLE</button><button data-a="solo" style="' + B + ';background:#24493a;color:#fff">CLOSE</button>');
    else menu();
  });

  var q = /[?&]join=([A-Za-z0-9]{4})/.exec(location.search);
  if (q) { ov.style.display = 'flex'; join(q[1]); }
})();
(function () {
  'use strict';

  /* ================= HERO SPRITE — SWAP YOUR OWN IMAGE HERE =================
     src    : image URL (e.g. 'hero.png') or a data URI
     frames : total frames laid out horizontally in the image (1 = static image)
     walkFrames : how many of those (from the left) are the walk cycle
     idleFrame  : index of the 'stopped, looking at the stars' frame
     frameW/frameH : size of ONE frame in image pixels
     scale  : on-screen zoom (integer keeps pixels crisp)
     speed  : walking speed in px/second
     cycle  : seconds for one full walk-cycle animation                                      */
  var N = '#f2f5f3', F = '#8fa39a', G = '#4ade80'; /* near limbs, far limbs, headband */
  /* One entry per pose: f = far-side rects, n = near-side rects, each [x, y, w, h] in a 16x24 frame */
  var POSES = [
    {f: [[9,9,2,2],[10,11,2,2],[5,15,2,4],[3,19,2,4]], n: [[5,9,2,2],[4,11,2,2],[9,15,2,4],[11,19,2,4]]},   /* contact */
    {f: [[7,9,2,4],[7,15,2,8]],                        n: [[8,9,2,4],[8,15,2,3],[7,18,2,2],[5,20,2,2]]},   /* passing */
    {f: [[5,9,2,2],[4,11,2,2],[9,15,2,4],[11,19,2,4]], n: [[9,9,2,2],[10,11,2,2],[5,15,2,4],[3,19,2,4]]},   /* contact (swapped) */
    {f: [[8,9,2,4],[8,15,2,3],[7,18,2,2],[5,20,2,2]],  n: [[7,9,2,4],[7,15,2,8]]},                         /* passing (swapped) */
    {f: [[7,9,2,4],[6,15,2,8]], n: [[9,8,2,2],[10,6,2,2],[11,4,2,2],[8,15,2,8]], h: [[6,2,4,4]], b: [[6,3,5,1]]}   /* idle: looking up at the stars */
  ];
  function rects(list, c) { return list.map(function (r) { return '<rect x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '" fill="' + c + '"/>'; }).join(''); }
  var STICK = '<svg xmlns="http://www.w3.org/2000/svg" width="' + 16 * POSES.length + '" height="24" shape-rendering="crispEdges">' +
    POSES.map(function (p, i) {
      return '<g transform="translate(' + 16 * i + ')">' + rects(p.f, F) + rects(p.h || [[6,3,4,4]], N) + rects([[7,7,2,8]], N) + rects(p.n, N) + rects(p.b || [[6,4,5,1]], G) + '</g>';
    }).join('') + '</svg>';
  var HERO = {
    src: 'data:image/svg+xml,' + encodeURIComponent(STICK),
    frames: POSES.length, walkFrames: POSES.length - 1, idleFrame: POSES.length - 1, frameW: 16, frameH: 24, scale: 3, speed: 70, cycle: 0.7
  };

  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- hero setup + walk loop ---- */
  var hero = $('hero'), stage = $('stage');
  var fw = HERO.frameW * HERO.scale, fh = HERO.frameH * HERO.scale;
  hero.style.setProperty('--src', 'url("' + HERO.src + '")');
  hero.style.setProperty('--frames', HERO.frames);
  hero.style.setProperty('--walk', HERO.walkFrames);
  hero.style.setProperty('--idle', HERO.idleFrame);
  hero.style.setProperty('--dur', HERO.cycle + 's');
  hero.style.setProperty('--fw', fw + 'px');
  hero.style.setProperty('--fh', fh + 'px');

  var x = 0, dir = 1, last = performance.now(), looking = false;
  function rand(a, b) { return a + Math.random() * (b - a); }
  var timer = rand(3, 6);
  function place() { hero.style.transform = 'translateX(' + x + 'px) scaleX(' + dir + ')'; }
  function tick(t) {
    var dt = Math.min((t - last) / 1000, 0.1); last = t; timer -= dt;
    if (timer <= 0) {            /* alternate: walk a while, stop and stargaze a while */
      looking = !looking;
      timer = looking ? rand(2.5, 4.5) : rand(4, 9);
      hero.classList.toggle('idle', looking);
    }
    if (!looking) {
      x += dir * HERO.speed * dt;
      var max = stage.clientWidth - fw;
      if (x > max) { x = max; dir = -1; } else if (x < 0) { x = 0; dir = 1; }
    }
    place(); requestAnimationFrame(tick);
  }
  if (reduce) { x = stage.clientWidth * 0.3; place(); } else requestAnimationFrame(tick);

  /* ---- shooting stars: streak across the sky now and then, then vanish ---- */
  function shoot() {
    var s = document.createElement('div');
    s.className = 'shoot' + (Math.random() < 0.25 ? ' pink' : '');
    s.style.left = rand(0, 60) + 'vw';
    s.style.top = rand(2, 28) + 'vh';
    s.style.setProperty('--t', rand(0.7, 1.2) + 's');
    s.addEventListener('animationend', function () { s.remove(); });
    stage.insertBefore(s, stage.querySelector('.hill'));   /* behind the hills */
    setTimeout(shoot, rand(3500, 10000));
  }
  if (!reduce) setTimeout(shoot, 2000);

  /* ---- menu ---- */
  var items = Array.prototype.slice.call(document.querySelectorAll('#menu a'));
  var hint = $('hint'), cur = 0;
  function select(n, silent) {
    cur = (n + items.length) % items.length;
    items.forEach(function (a, k) { a.parentNode.classList.toggle('sel', k === cur); });
    hint.textContent = items[cur].getAttribute('data-hint') || '\u00a0';
  }
  items.forEach(function (a, k) {
    a.addEventListener('mouseenter', function () { if (k !== cur) select(k); });
    a.addEventListener('focus', function () { if (k !== cur) select(k); });
    /* click/tap: the native link handles navigation */
  });
  document.addEventListener('keydown', function (e) {
    var key = e.key;
    if (key === 'ArrowDown' || key === 's' || key === 'S') { e.preventDefault(); select(cur + 1); }
    else if (key === 'ArrowUp' || key === 'w' || key === 'W') { e.preventDefault(); select(cur - 1); }
    else if (key === 'Enter' || key === ' ') { e.preventDefault(); items[cur].click(); }
  });
  select(0, true);

  /* ---- "HELLO YOU..." title ---- */
  var logo = $('hello'), text = 'HELLO YOU', n = 0, d = 1, dots = 1;
  function draw(t, k) { logo.innerHTML = t + '<i>' + '.'.repeat(k) + '</i>'; }
  function blink() { draw(text, dots); dots += d; if (dots >= 3 || dots <= 1) d = -d; setTimeout(blink, 400); }
  function type() { if (n < text.length) { draw(text.slice(0, ++n), 0); setTimeout(type, 90); } else blink(); }
  if (reduce) draw(text, 3); else { draw('', 0); setTimeout(type, 300); }

  /* ---- weather HUD (South Pole, Open-Meteo) ---- */
  var wx = $('weather');
  var WMO = function (c) { return c === 0 ? 'CLEAR' : c <= 3 ? 'CLOUDY' : c <= 48 ? 'FOG' : c <= 57 ? 'DRIZZLE' : c <= 67 ? 'RAIN' :
    c <= 77 ? 'SNOW' : c <= 82 ? 'SHOWERS' : c <= 86 ? 'SNOW' : 'STORM'; };
  function weather() {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=-90&longitude=0&current=temperature_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=UTC')
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var c = j.current;
        wx.textContent = Math.round(c.temperature_2m) + '\u00B0F ' + WMO(c.weather_code) + ' ' + Math.round(c.wind_speed_10m) + 'MPH';
      })
      .catch(function () { wx.textContent = 'UNAVAILABLE'; });
  }
  weather(); setInterval(weather, 15 * 60 * 1000);
})();

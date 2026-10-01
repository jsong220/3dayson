/* Hwatu card art. Draws all 48 faces as SVG symbols (#card-c0 .. #card-c47).
   GSArt.install(DEFS) is called from go-stop.js. Canvas per card: 60 x 90. */
(function () {
  'use strict';
  var INK = '#3a2a1c';
  var P = function (d, f, s, w) { return '<path d="' + d + '" fill="' + (f || 'none') + '"' + (s ? ' stroke="' + s + '" stroke-width="' + (w || 1) + '" stroke-linecap="round" stroke-linejoin="round"' : '') + '/>'; };
  var C = function (x, y, r, f) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + f + '"/>'; };
  var E = function (x, y, rx, ry, f, a) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + f + '"' + (a ? ' transform="rotate(' + a + ' ' + x + ' ' + y + ')"' : '') + '/>'; };
  var G = function (t, s) { return '<g transform="' + t + '">' + s + '</g>'; };
  var R = function (x, y, w, h, f, rx) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx || 0) + '" fill="' + f + '"/>'; };
  var rad = function (a) { return a * Math.PI / 180; };

  /* five-petal blossom */
  function blossom(x, y, r, c1, c2) {
    var o = '';
    for (var i = 0; i < 5; i++) o += C((x + Math.cos(rad(i * 72 - 90)) * r * .62).toFixed(1), (y + Math.sin(rad(i * 72 - 90)) * r * .62).toFixed(1), r * .48, c1);
    return o + C(x, y, r * .28, c2);
  }
  /* radial flower: n long petals */
  function radial(x, y, r, n, c1, c2, cc) {
    var o = '';
    for (var i = 0; i < n; i++) o += E(x, y - r * .55, r * .17, r * .55, c1, i * 360 / n).replace('rotate(' + (i * 360 / n) + ' ' + x + ' ' + (y - r * .55) + ')', 'rotate(' + (i * 360 / n) + ' ' + x + ' ' + y + ')');
    return o + C(x, y, r * .3, cc || c2);
  }
  function leaf(x, y, l, a, f, w) { var k = (w || .3) * l; return G('translate(' + x + ' ' + y + ') rotate(' + a + ')', P('M0 0C' + l * .3 + ' -' + k + ' ' + l * .8 + ' -' + k * .83 + ' ' + l + ' 0C' + l * .8 + ' ' + k * .83 + ' ' + l * .3 + ' ' + k + ' 0 0Z', f, '#1c4a22', .5)); }
  /* hanging cluster of round seeds, alternating colours (wisteria / bush clover) */
  function raceme(x, y, len, c1, c2) {
    var o = '';
    for (var i = 0; i < 12; i++) o += C((x + Math.sin(i * .9) * 1.6).toFixed(1), y + i * (len / 12), (3.6 - i * .22).toFixed(2), i % 2 ? c1 : c2);
    return o;
  }
  /* simple bird facing right */
  function bird(x, y, s, body, wing, belly, beak, tail) {
    return G('translate(' + x + ' ' + y + ') scale(' + s + ')',
      P('M-6 0L-16 -3L-15 3Z', tail || wing, INK, .5) + E(0, 0, 8, 5, body) + E(1, 2, 6, 2.6, belly) +
      E(-2, -1, 6, 3, wing, -15) + C(7, -4, 3.6, body) + P('M10 -4.5L14 -3.2L10 -2.5Z', beak || '#e8a31c') + C(8, -4.7, .8, INK));
  }
  function stem(d, c) { return P(d, null, c || '#3f7a3a', 1.2); }
  function mirror(s) { return G('translate(60 0) scale(-1 1)', s); }

  /* ---------- flora, one per month (v = variant so the pi cards differ) ---------- */
  var FLORA = {
    1: function () {
      return P('M0 90V40Q9 22 19 40Q30 16 42 40Q51 26 60 38V90Z', '#2e2e2e') +
        P('M0 90V64Q12 46 24 64Q35 42 47 64Q54 54 60 62V90Z', '#141414') +
        P('M0 90V78Q8 70 16 78Q28 66 40 78Q50 72 60 78V90Z', '#000');
    },
    2: function () {
      var o = P('M0 76Q22 64 34 48T60 16', null, '#5a3b22', 3) + P('M22 62Q26 46 20 34M40 38Q44 26 52 30', null, '#5a3b22', 1.6);
      [[12, 68, 6], [22, 36, 6], [50, 26, 6.5], [40, 62, 5], [54, 46, 5]].forEach(function (b) { o += blossom(b[0], b[1], b[2], '#e0456f', '#f5d34b'); });
      return o + C(30, 20, 2.5, '#c9385f') + C(8, 50, 2.5, '#c9385f');
    },
    3: function () {
      var o = P('M0 80Q20 66 36 52T60 40', null, '#4a3222', 3);
      [[14, 70, 9], [30, 56, 10], [46, 46, 9], [20, 42, 8], [38, 74, 8], [50, 66, 7]].forEach(function (b) { o += blossom(b[0], b[1], b[2], '#f9c1d3', '#e8486f'); });
      return o;
    },
    4: function () {
      var o = P('M0 8Q26 14 60 6', null, '#4a3222', 3);
      [[8, 12, 0], [24, 14, 20], [42, 10, 160], [54, 8, 10]].forEach(function (l) { o += leaf(l[0], l[1], 12, l[2] + 40, '#3f8a45'); });
      [[10, 12, 46], [26, 15, 58], [42, 12, 50], [54, 9, 40]].forEach(function (r) { o += raceme(r[0], r[1], r[2], '#141414', '#2a2a2a'); });
      return o;
    },
    5: function () {
      var o = R(0, 76, 60, 14, '#9cc7e6') + P('M0 80Q8 77 15 80T30 80T45 80T60 80', null, '#5c93c2', .8);
      o += leaf(8, 82, 46, -80, '#3f8f4a', .07) + leaf(24, 82, 52, -95, '#2f7a3f', .07) + leaf(38, 82, 50, -102, '#3f8f4a', .07) + leaf(52, 82, 42, -112, '#2f7a3f', .07) + leaf(16, 82, 40, -88, '#2f7a3f', .07);
      [[16, 34], [40, 26]].forEach(function (f) {
        o += E(f[0] - 4, f[1] + 4, 3.4, 7, '#4a3fb5', -30) + E(f[0] + 4, f[1] + 4, 3.4, 7, '#4a3fb5', 30) + E(f[0], f[1] - 1, 3.4, 8, '#6a5ad8') + E(f[0], f[1] + 8, 5, 3, '#7d6ee0') + E(f[0], f[1] + 6, 1.2, 3, '#f5d34b');
        o += stem('M' + f[0] + ' ' + (f[1] + 10) + 'L' + (f[0] + 1) + ' 78');
      });
      return o;
    },
    6: function () {
      var o = leaf(30, 70, 26, -160, '#2f7a3f') + leaf(30, 70, 26, -20, '#3f8f4a') + leaf(30, 70, 24, -90, '#2a6a38');
      var c = [['#a80f24', 17], ['#cc1f2e', 13.5], ['#e2403c', 10], ['#f0705c', 6.5]];
      c.forEach(function (k) { for (var i = 0; i < 8; i++) o += C((30 + Math.cos(rad(i * 45)) * k[1] * .55).toFixed(1), (40 + Math.sin(rad(i * 45)) * k[1] * .55).toFixed(1), k[1] * .5, k[0]); });
      return o + C(30, 40, 3.6, '#f5d34b') + C(30, 40, 1.6, '#c98a00');
    },
    7: function () {
      var o = P('M0 8Q26 14 60 6', null, '#4a3222', 3);
      [[8, 12, 0], [24, 14, 20], [42, 10, 160], [54, 8, 10]].forEach(function (l) { o += leaf(l[0], l[1], 12, l[2] + 40, '#3f8a45'); });
      [[10, 12, 38], [26, 15, 44], [42, 12, 40], [54, 9, 32]].forEach(function (r) { o += raceme(r[0], r[1], r[2], '#141414', '#f07f1a'); });
      return o;
    },
    8: function () {
      var o = R(0, 0, 60, 90, '#f2d9c4') + R(0, 0, 60, 26, '#e8623a');
      o += P('M0 90V62Q20 46 42 60T60 54V90Z', '#2d2a3a');
      for (var i = 0; i < 6; i++) o += P('M' + (6 + i * 9) + ' 88Q' + (10 + i * 9) + ' 66 ' + (8 + i * 9 + (i % 2 ? 6 : -4)) + ' 50', null, '#cbb98a', 1.2) + E(8 + i * 9 + (i % 2 ? 6 : -4), 50, 1.8, 6, '#efe3bd', i % 2 ? 12 : -12);
      return o;
    },
    9: function () {
      var o = leaf(30, 84, 28, -150, '#3f8a45') + leaf(30, 84, 28, -30, '#2f7a3f') + leaf(30, 84, 24, -90, '#3f8a45');
      [[30, 46, 16], [12, 62, 9], [50, 62, 9]].forEach(function (m) { o += radial(m[0], m[1], m[2], 14, '#f6c72a', '#e0a800', '#e08a00') + C(m[0], m[1], m[2] * .22, '#e08a00'); });
      return o;
    },
    10: function () {
      function maple(x, y, s, c, a) {
        var pts = '0,-10 2,-5 7,-8 5,-2 10,0 5,2 6,7 1,5 0,10 -1,5 -6,7 -5,2 -10,0 -5,-2 -7,-8 -2,-5';
        return G('translate(' + x + ' ' + y + ') rotate(' + a + ') scale(' + s + ')', '<polygon points="' + pts + '" fill="' + c + '" stroke="#7a2413" stroke-width=".5"/>');
      }
      return P('M0 12Q24 20 60 8', null, '#4a3222', 2.6) + P('M30 16Q34 40 30 60', null, '#4a3222', 1.6) +
        maple(10, 24, 1.5, '#d8452b', 10) + maple(28, 36, 1.7, '#ef8a2b', -15) + maple(48, 22, 1.5, '#c8321f', 20) + maple(44, 52, 1.5, '#e05a24', 0) + maple(14, 52, 1.3, '#f0a030', 30) + maple(30, 70, 1.4, '#d8452b', -20);
    },
    11: function () {
      var o = '';
      [[16, 62, 15], [44, 60, 15], [30, 76, 13]].forEach(function (l) { o += E(l[0], l[1], l[2], l[2] * .8, '#141414') + P('M' + (l[0] - l[2] + 3) + ' ' + l[1] + 'H' + (l[0] + l[2] - 3) + 'M' + l[0] + ' ' + (l[1] - 6) + 'V' + (l[1] + 8), null, '#4a4a4a', .6); });
      for (var k = 0; k < 2; k++) for (var i = 0; i < 12; i++) o += C(12 + k * 34 + ((i * 7) % 9) - 3, 8 + i * 2.6, 3.2 - i * .12, i % 2 ? '#8a5cc7' : '#b48ae0');
      return o;
    },
    12: function () {
      var o = P('M0 4H60', null, '#4a3222', 2);
      for (var i = 0; i < 9; i++) o += P('M' + (4 + i * 7) + ' 4Q' + (2 + i * 7) + ' 40 ' + (5 + i * 7) + ' ' + (58 + (i % 3) * 8), null, '#6f9a6c', 1.1);
      for (var j = 0; j < 14; j++) o += '<line x1="' + (j * 5 + 2) + '" y1="' + (12 + (j * 13) % 40) + '" x2="' + (j * 5 - 2) + '" y2="' + (22 + (j * 13) % 40) + '" stroke="#5b86b8" stroke-width=".8"/>';
      return o;
    }
  };

  /* ---------- Kwang / Yul subjects ---------- */
  var SUBJ = {
    '1K': function () {
      return C(42, 22, 10, '#d8322c') +
        P('M20 52Q34 48 40 44', '#f7f4ea', INK, .6) + P('M38 46C48 42 46 32 42 28', null, INK, 4.2) + P('M38 46C48 42 46 32 42 28', null, '#fff', 2.8) +
        E(28, 50, 12, 6, '#fbfaf3', -8) + P('M14 48L28 52L20 56Z', '#2b2b2b') + C(42, 27, 2.6, '#fff') + C(42.5, 24.5, 1.4, '#d8322c') + P('M44 27L50 29L44 29.5Z', '#e8a31c') +
        P('M26 55L24 70M31 56L32 70', null, INK, 1);
    },
    '3K': function () {
      var o = P('M0 6H60V40Q55 34 50 40T40 40T30 40T20 40T10 40T0 40Z', '#d83a3a', INK, .6);
      for (var i = 0; i < 6; i++) o += R(i * 10 + 5, 6, 5, 34, '#fbf5e6');
      return R(0, 2, 60, 5, '#3a2a1c') + o + blossom(14, 62, 9, '#f9c1d3', '#e8486f') + blossom(34, 70, 9, '#f9c1d3', '#e8486f') + blossom(48, 56, 8, '#f9c1d3', '#e8486f');
    },
    '8K': function () {
      return C(30, 34, 17, '#fff4b8') + C(24, 30, 3, '#f0e08a') + C(36, 40, 4, '#f0e08a') + C(33, 26, 2, '#f0e08a') + P('M0 90V62Q20 46 42 60T60 54V90Z', '#2d2a3a');
    },
    '11K': function () {
      var W = '#fbfbfb', K = '#141414', o = P('M13 48Q7 52 9 63', null, INK, 1.4) + E(9, 64, 1.6, 2.4, K);
      [17, 23, 36, 42].forEach(function (x) { o += R(x, 60, 3.6, 12, W) + R(x, 70, 3.6, 3, K); });
      return o + E(29, 53, 16, 9, W) + E(23, 50, 5.5, 4, K) + E(36, 57, 5, 3.4, K) + E(31, 46, 3, 2, K) + E(24, 62, 3, 2, '#f2a0a8') +
        E(43, 47, 5, 8, W, -25) + E(50, 51, 6.5, 5, W, 10) + E(54.5, 53, 3.4, 3, '#f2a0a8') + C(54, 53, .7, INK) + C(56, 53, .7, INK) +
        E(44, 42, 4, 1.8, K, -35) + P('M46 42L47 36L50 42Z', '#f5e6b8', INK, .4) + C(49, 48.5, 1, INK) + P('M12 50Q29 44 44 43', null, INK, .5);
    },
    '12K': function () {
      return P('M8 34Q30 6 52 34Z', '#c8302c', INK, .6) + P('M30 34V60', null, INK, 1) + P('M8 34L30 12M52 34L30 12M20 30L30 12M40 30L30 12', null, '#7a1a17', .5) +
        C(28, 50, 4.5, '#f0c9a0') + P('M22 48Q28 42 34 48', '#3a2a1c') + P('M20 56L36 56L38 84L18 84Z', '#4a6f9c', INK, .5) + P('M24 84V90M32 84V90', null, INK, 2);
    },
    '2Y': function () { return P('M12 74Q30 60 40 50', null, '#5a3b22', 2.4).replace('M12', 'M12') + bird(31, 44, 1.5, '#9aa63c', '#6f7a24', '#eadf8a'); },
    '4Y': function () { return P('M14 74Q34 68 50 62', null, '#5a3b22', 2.4) + bird(32, 60, 1.6, '#6f7a90', '#3f4658', '#ddd8ca', '#2b2b2b'); },
    '5Y': function () {
      var o = '';
      [[2, 68], [16, 60], [30, 52], [44, 44]].forEach(function (p) { o += P('M' + p[0] + ' ' + (p[1] + 8) + 'L' + (p[0] + 14) + ' ' + p[1] + 'L' + (p[0] + 18) + ' ' + (p[1] + 5) + 'L' + (p[0] + 4) + ' ' + (p[1] + 13) + 'Z', '#a86a3a', INK, .6); });
      return P('M4 82V72M32 66V58M46 58V50', null, '#5a3b22', 2) + o;
    },
    '6Y': function () {
      function bf(x, y, s, a, c1, c2) { return G('translate(' + x + ' ' + y + ') rotate(' + a + ') scale(' + s + ')', E(-5, -4, 6, 4, c1, -25) + E(5, -4, 6, 4, c1, 25) + E(-4, 4, 4.4, 3, c2, 20) + E(4, 4, 4.4, 3, c2, -20) + P('M0 -6V7', null, INK, 1.2) + P('M0 -6L-3 -10M0 -6L3 -10', null, INK, .5)); }
      return bf(20, 26, 1.5, -20, '#f2c94c', '#e08a1c') + bf(42, 50, 1.4, 25, '#3a7be0', '#2a4fb0');
    },
    '7Y': function () {
      return E(30, 54, 16, 9, '#6b4a32') + P('M16 48Q26 42 42 46', null, INK, 1.4) + C(45, 54, 8, '#5a3d28') + E(52, 58, 4.5, 3.4, '#c9a08a') +
        P('M50 61L55 55L52 62Z', '#fff', INK, .4) + P('M42 46L46 40L48 48Z', '#3a2a1c') + C(46, 52, 1.1, '#fff') + R(17, 60, 3.4, 12, '#4a3220') + R(24, 60, 3.4, 12, '#4a3220') + R(36, 60, 3.4, 12, '#4a3220') + R(42, 60, 3.4, 12, '#4a3220') +
        P('M14 52Q8 50 8 44', null, INK, 1.2);
    },
    '8Y': function () {
      function goose(x, y, s, c) {
        var body = function (k, col) { return G('translate(' + x + ' ' + y + ') scale(' + k + ')', E(0, 0, 7, 2.8, col) + P('M-2 0L-11 -9L-4 -1Z', col) + P('M2 0L11 -8L5 0Z', col) + P('M6 -1L13 -2L11 1.5Z', col) + P('M-7 0L-13 1L-7 2.4Z', col)); };
        return body(s * 1.22, '#1f1c2a') + body(s, c);
      }
      return C(30, 34, 17, '#fff4b8') + P('M0 90V62Q20 46 42 60T60 54V90Z', '#2d2a3a') + goose(19, 22, 1.5, '#f5c518') + goose(41, 34, 1.5, '#e02626') + goose(22, 47, 1.5, '#f07f1a');
    },
    '9Y': function () {
      return E(30, 52, 15, 4.5, '#f5d98a', 0) + P('M15 52C15 68 45 68 45 52Z', '#c8272d', INK, .7) + P('M25 66H35L37 72H23Z', '#a01d22', INK, .6) + E(30, 52, 15, 4.5, '#e9b84a') + E(30, 52, 12, 3, '#5a1414') + P('M20 58Q30 64 40 58', null, '#f5d98a', .8);
    },
    '10Y': function () {
      var B = '#5a3418';
      return E(30, 44, 28, 32, '#fbe9c4') + G('translate(30 45) scale(1.15) translate(-30 -45)',
        E(28, 56, 14, 7, B) + E(27, 60, 9, 3, '#c8925a') + P('M38 52Q44 40 40 34', null, B, 6) + E(38, 30, 5, 4, B, -20) + C(36, 29, 1, '#fff') + E(41, 32, 2, 1.4, '#2b1a0c') +
        P('M36 26L32 14L28 18M32 14L34 6M40 24L46 12L52 14M46 12L46 5', null, '#2b1a0c', 1.4) + R(18, 60, 2.8, 14, B) + R(24, 60, 2.8, 14, B) + R(34, 60, 2.8, 14, B) + R(39, 60, 2.8, 14, B) +
        C(22, 54, 1.3, '#fff') + C(28, 52, 1.3, '#fff') + C(32, 56, 1.3, '#fff') + C(26, 58, 1.3, '#fff') + P('M14 54Q10 52 11 48', null, B, 2));
    },
    '12Y': function () {
      var R1 = '#d8322c', Y = '#f5c518';
      return P('M28 51L17 30M31 50L25 27M34 49L33 25M37 48L41 27', null, Y, 2.4) + P('M17 30L25 27L33 25L41 27', null, Y, 1) +
        P('M19 57L8 63M19 57L9 54', null, R1, 2) + P('M18 57Q30 51 41 46', null, R1, 5.5) + C(44, 44, 4.2, R1) + P('M47.5 42.6L54 45L47.5 46.6Z', '#e8a31c') + C(45, 43, .9, INK) +
        P('M30 54L28 64M34 52L35 63', null, INK, 1.1);
    }
  };

  /* ---------- ribbon + marks ---------- */
  var RIB = { hong: '#d9292b', cheong: '#2f62d0', cho: '#d9292b', rain: '#8f2a2a' };
  function ribbon(k) {
    var o = R(3, 40, 54, 12, RIB[k]) + P('M3 40L0 46L3 52Z', '#0004') + P('M57 40L60 46L57 52Z', '#0004') + '<rect x="3" y="40" width="54" height="12" fill="none" stroke="#fff8" stroke-width=".6"/>';
    if (k === 'hong') o += P('M9 46H14M11.5 43V49M18 43L24 43M21 43V49M28 44H35M31.5 43V49M39 43V49M39 46H45M49 44L53 49', null, '#fff', 1);
    if (k === 'cheong') o += P('M7 46q3 -4.5 6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0', null, '#fff', 1.1) + C(30, 42.6, .9, '#fff') + C(12, 49.4, .9, '#fff') + C(48, 42.6, .9, '#fff');
    return G('rotate(-12 30 46)', o);
  }
  function kwSeal() { return C(49.6, 11.6, 9.4, '#0006') + C(49, 11, 9.4, '#fff') + C(49, 11, 7.8, '#d8322c') + '<text x="49" y="15.6" font-size="12.5" font-weight="900" text-anchor="middle" fill="#fff" font-family="\'Noto Serif CJK KR\',\'Noto Serif KR\',\'Malgun Gothic\',serif">光</text>'; }

  function face(m, type, x, idx) {
    var v = idx % 4, subj = SUBJ[m + type], dbl = (type === 'P' && x && x.d) || (x && x.sp);
    var o = (m === 12 ? R(0, 0, 60, 90, '#dfe6ea') : '') + (dbl ? R(0, 45, 60, 45, '#d8322c') : '') + FLORA[m](v);
    if (v % 2 && !subj && type === 'P') o = mirror(o);
    if (subj) o += subj();
    if (type === 'T') o += ribbon(x);
    if (type === 'K') o += kwSeal();
    return o;
  }

  window.GSArt = {
    install: function (defs) {
      var s = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>';
      defs.forEach(function (d, i) {
        var m = d[0], t = d[1], x = d[2];
        s += '<symbol id="card-c' + i + '" viewBox="0 0 60 90">' + R(0, 0, 60, 90, '#f6edd6') + face(m, t, t === 'T' ? x : x, i) + '</symbol>';
      });
      document.body.insertAdjacentHTML('afterbegin', s + '</defs></svg>');
    }
  };
})();

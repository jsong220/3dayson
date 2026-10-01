/* Accessibility layer for KO Blackjack. Loaded after game.js; touches no game logic.
   - labels cards and hands for screen readers
   - gives every .modal-bg overlay dialog semantics, focus management, Esc and a Tab trap */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var SUITS = {'\u2660': 'spades', '\u2665': 'hearts', '\u2666': 'diamonds', '\u2663': 'clubs'};
  var RANKS = {A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack'};

  /* ---------- cards + hands ---------- */
  function labelCards(root) {
    if (!root) return;
    root.querySelectorAll('.playing-card').forEach(function (el) {
      var label;
      if (el.classList.contains('hidden-card')) label = 'Face-down card';
      else {
        var rank = (el.firstElementChild && el.firstElementChild.textContent || '').trim();
        var pip = el.querySelector('.card-pip');
        var suit = SUITS[(pip && pip.textContent || '').trim()];
        label = rank && suit ? (RANKS[rank] || rank) + ' of ' + suit : 'Card';
      }
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', label);
    });
  }
  function labelHands() {
    var d = $('dealerHand'), p = $('playerHandsContainer');
    if (d) { d.setAttribute('role', 'group'); d.setAttribute('aria-label', 'Dealer hand'); labelCards(d); }
    if (p) {
      p.setAttribute('role', 'group'); p.setAttribute('aria-label', 'Your hands');
      p.querySelectorAll('.hand-wrap').forEach(function (w, i) {
        var l = w.querySelector('.hand-label');
        w.setAttribute('role', 'group');
        w.setAttribute('aria-label', 'Hand ' + (i + 1) + (l ? ': ' + l.textContent.replace(/\s+/g, ' ').trim() : ''));
        var badge = w.querySelector('.hand-badge'); if (badge) badge.setAttribute('aria-hidden', 'true');
      });
      labelCards(p);
    }
  }
  var raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; labelHands(); }); }
  ['dealerHand', 'playerHandsContainer'].forEach(function (id) {
    var el = $(id); if (el) new MutationObserver(schedule).observe(el, {childList: true, subtree: true});
  });
  labelHands();

  /* ---------- dialogs ---------- */
  var dialogs = Array.prototype.slice.call(document.querySelectorAll('.modal-bg'));
  var openers = new Map();
  function title(dlg) { return dlg.querySelector('h2, h3'); }
  dialogs.forEach(function (dlg) {
    dlg.setAttribute('role', dlg.id === 'insuranceModal' ? 'alertdialog' : 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    var h = title(dlg);
    if (h) { if (!h.id) h.id = dlg.id + 'Title'; dlg.setAttribute('aria-labelledby', h.id); }
    var wasOpen = !dlg.classList.contains('hidden');
    new MutationObserver(function () {
      var open = !dlg.classList.contains('hidden');
      if (open === wasOpen) return;
      wasOpen = open;
      if (open) {
        openers.set(dlg, document.activeElement);
        var first = dlg.querySelector('button, input, select, [tabindex]:not([tabindex="-1"])');
        if (first) first.focus({preventScroll: true});
      } else {
        var o = openers.get(dlg); openers.delete(dlg);
        if (o && o !== document.body && document.contains(o) && o.focus) o.focus({preventScroll: true});
      }
    }).observe(dlg, {attributes: true, attributeFilter: ['class']});
  });
  function openDialog() {
    for (var i = dialogs.length - 1; i >= 0; i--) if (!dialogs[i].classList.contains('hidden')) return dialogs[i];
    return null;
  }
  document.addEventListener('keydown', function (e) {
    var dlg = openDialog(); if (!dlg) return;
    if (e.key === 'Escape') {
      var close = dlg.querySelector('[id^="btnClose"]');      /* insurance has none: it needs an answer */
      if (close) { e.preventDefault(); close.click(); }
    } else if (e.key === 'Tab') {
      var f = Array.prototype.filter.call(dlg.querySelectorAll('button, input, select, [href], [tabindex]:not([tabindex="-1"])'),
        function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) { e.preventDefault(); return; }
      var first = f[0], last = f[f.length - 1];
      if (!dlg.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();

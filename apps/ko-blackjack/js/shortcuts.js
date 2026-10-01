/* Keyboard shortcuts for KO Blackjack. Loaded after trainer.js. Every shortcut clicks the
   real on-screen button, so it behaves exactly like a tap (including 2-player mode). */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const shown = id => { const el = $(id); return !!el && !el.classList.contains('hidden'); };
  const usable = id => { const b = $(id); return !!b && !b.disabled && !b.classList.contains('hidden'); };
  const click = id => { if (usable(id)) { $(id).click(); return true; } return false; };
  const modalOpen = () => document.querySelector('.modal-bg:not(.hidden)');

  const PLAY = {h: 'btnHit', s: 'btnStand', d: 'btnDouble', p: 'btnSplit', r: 'btnSurrender'};

  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const onControl = !!t && /^(BUTTON|A|SUMMARY)$/.test(t.tagName);
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    /* the insurance question is a window, but it deserves quick answers */
    if (shown('insuranceModal')) {
      if (k === 'y') { e.preventDefault(); click('btnInsYes'); }
      else if (k === 'n') { e.preventDefault(); click('btnInsNo'); }
      return;
    }
    if (modalOpen()) return;

    if (k === '?') { e.preventDefault(); $('shortcutsModal').classList.remove('hidden'); return; }
    if (k === 'm') { e.preventDefault(); $('btnSound').click(); return; }

    /* playing a hand */
    if (PLAY[k] && shown('actionControls')) {
      if (typeof actionLocked === 'function' && actionLocked()) return;
      e.preventDefault(); click(PLAY[k]); return;
    }

    /* betting */
    if (shown('betControls')) {
      if (k >= '1' && k <= '6') {
        const chip = document.querySelectorAll('.add-bet-btn')[Number(k) - 1];
        if (chip) { e.preventDefault(); chip.click(); }
      } else if (k === 'c') { e.preventDefault(); click('btnClearBet'); }
      else if ((k === ' ' || k === 'Enter') && !onControl) { e.preventDefault(); click('btnDeal'); }
      return;
    }

    /* between hands */
    if (shown('postGameControls') && (k === 'n' || ((k === ' ' || k === 'Enter') && !onControl))) {
      e.preventDefault(); click('btnNext');
    }
  });
})();

#!/usr/bin/env python3
"""Browser tests for the KO Blackjack table (simulated players, seat order, layout, insurance, skills, speed, 2P mirror, screen-reader labels).

Run (needs `pip install playwright` and `playwright install chromium`):
    python3 tests/table-browser.py            # all tests
    python3 tests/table-browser.py order peek # only the named tests

It opens index.html straight from disk with the network blocked, so it needs no server. Exit code 1 if anything fails."""
import json, os, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = (Path(__file__).resolve().parent.parent / 'index.html').as_uri()
RIG = """(hole)=>{const mk=(v,n)=>({suit:'\\u2660',value:v,numVal:n,countVal:0,isRed:false});
  initializeDeck(); const d=STATE.deck; d.splice(0,40); d.unshift(mk(hole,hole==='5'?5:10)); d.push(mk('A',11), mk('9',9), mk('5',5));}"""   # dealer shows an Ace; hole card = 10-value ('K') or 5

def page(b, w=1100, h=1240, bots=True, seats=4, skill='perfect', skills=None, pace='fast'):
    pg = b.new_context(viewport={'width': w, 'height': h}).new_page()
    pg.errs = []; pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    pg.route('**/*', lambda r: r.abort() if r.request.url.startswith('http') else r.continue_())
    cfg = {'vol': 0, 'bots': bots, 'seats': seats, 'noise': False, 'skill': skill, 'pace': pace}
    if skills: cfg['skills'] = skills
    pg.add_init_script("localStorage.setItem('koTrainer.pro.v1', %s)" % json.dumps(json.dumps(cfg)))
    pg.goto(BASE); pg.wait_for_timeout(500)
    pg.evaluate("STATE.autoNext=false; STATE.showHints=false"); return pg

def bet_and_deal(pg, rig=None):
    if rig: pg.evaluate(RIG, rig)
    pg.evaluate("clearBet(); document.querySelector('.add-bet-btn[data-bet=\"5\"]').click(); document.getElementById('btnDeal').click()")

def next_round(pg):
    pg.evaluate("resetBoard()"); pg.wait_for_timeout(900)

def stand_through(pg, limit=60):
    for _ in range(limit):
        if pg.evaluate("STATE.isGameOver"): break
        pg.evaluate("STATE.isAnimating||document.getElementById('btnStand').click()"); pg.wait_for_timeout(250)
    pg.wait_for_function("STATE.isGameOver", timeout=60000)
    pg.wait_for_function("[...document.querySelectorAll('.bot-seat')].every(e=>/WIN|LOSE|PUSH|BUST|BLACKJACK|SURRENDER/.test(e.querySelector('.bot-results').innerText))", timeout=30000)

def seats_text(pg):
    return pg.evaluate("[...document.querySelectorAll('.bot-seat')].map(e=>e.innerText.replace(/\\s+/g,' ').trim())")

def need(cond, msg):
    if not cond: raise AssertionError(msg)

# ---------------------------------------------------------------- tests
def t_order(b):
    """Cards are dealt, and everyone plays, left to right: left seats, you, right seats, dealer."""
    for attempt in range(8):
        pg = page(b, pace='fast'); pg.evaluate("STATE.allowInsurance=false")      # an insurance prompt would pause the round
        pg.evaluate("""(()=>{window.__seq=[]; const last={};
          setInterval(()=>{ const c={}; document.querySelectorAll('.bot-seat').forEach(e=>{c[e.querySelector('b').innerText.split(' \\u00b7')[0]]=e.querySelectorAll('.playing-card').length});
            c.YOU=document.querySelectorAll('#playerHandsContainer .playing-card').length; c.DEALER=document.querySelectorAll('#dealerHand .playing-card').length;
            for(const k in c){ if((last[k]||0)<c[k]) window.__seq.push(k); last[k]=c[k]; } },8);
          window.__ev=[]; let prev='';
          setInterval(()=>{ const a=document.querySelector('.bot-seat.bot-active'), act=a?a.querySelector('b').innerText.split(' \\u00b7')[0]:'-', can=!document.getElementById('actionControls').classList.contains('pointer-events-none')&&!STATE.isGameOver;
            const k=act+'|'+can; if(k!==prev){ window.__ev.push(k); prev=k; } },8); })()""")
        bet_and_deal(pg)
        pg.wait_for_function("STATE.isGameOver || STATE.dealerCards.length==2 && !STATE.isAnimating", timeout=30000)
        if pg.evaluate("STATE.isGameOver"): pg.context.close(); continue             # dealer or player blackjack: bots don't play, try again
        for _ in range(30):
            if pg.evaluate("STATE.isGameOver"): break
            pg.evaluate("STATE.isAnimating||document.getElementById('btnStand').click()"); pg.wait_for_timeout(120)
        pg.wait_for_timeout(500)
        seq = pg.evaluate("window.__seq")[:12]; ev = pg.evaluate("window.__ev")
        want = ['Player 1', 'Player 2', 'YOU', 'Player 4', 'Player 5', 'DEALER'] * 2
        need(seq == want, 'deal order was %s' % seq)
        acts = [e.split('|')[0] for e in ev if not e.startswith('-')]; first_you = next(i for i, e in enumerate(ev) if e.endswith('|true'))
        before = [e.split('|')[0] for e in ev[:first_you] if not e.startswith('-')]; after = [e.split('|')[0] for e in ev[first_you:] if not e.startswith('-')]
        need(before == ['Player 1', 'Player 2'], 'seats that played before you: %s' % before)
        need(after == ['Player 4', 'Player 5'], 'seats that played after you: %s' % after)
        need(not pg.errs, pg.errs); pg.context.close(); return
    raise AssertionError('could not get a normal round in 8 tries')

def t_split_layout(b):
    """After you split, the bot seats never overlap your hands (any screen size)."""
    for w, h in [(1100, 1240), (700, 900), (390, 800)]:
        pg = page(b, w=w, h=h, pace='instant'); pg.evaluate("STATE.practiceMode='split'; STATE.allowInsurance=false")
        for attempt in range(10):
            if attempt: next_round(pg)
            bet_and_deal(pg)
            try: pg.wait_for_function("STATE.isGameOver || (!STATE.isAnimating && STATE.playerHands[0] && STATE.playerHands[0].cards.length==2 && STATE.dealerCards.length==2)", timeout=30000)
            except Exception: continue
            if not pg.evaluate("STATE.isGameOver || document.getElementById('btnSplit').disabled"): break
        pg.evaluate("document.getElementById('btnSplit').click()"); pg.wait_for_timeout(1500)
        r = pg.evaluate("""(()=>{const pc=[...document.querySelectorAll('#playerHandsContainer > div')].map(e=>e.getBoundingClientRect()), bs=[...document.querySelectorAll('.bot-seat')].map(e=>e.getBoundingClientRect()); let n=0;
          for(const a of pc) for(const c of bs) if(a.width&&c.width&&a.left<c.right&&a.right>c.left&&a.top<c.bottom&&a.bottom>c.top) n++; return {hands:pc.length,n}})()""")
        need(r['hands'] >= 2, 'never got a split hand at %dx%d' % (w, h)); need(r['n'] == 0, '%d overlaps at %dx%d' % (r['n'], w, h)); need(not pg.errs, pg.errs); pg.context.close()

def t_peek(b):
    """Dealer ace + blackjack with insurance OFF still ends the round straight away."""
    pg = page(b, bots=False); pg.evaluate("STATE.allowInsurance=false")
    bet_and_deal(pg, 'K'); pg.wait_for_timeout(4000)
    need(pg.evaluate("STATE.isGameOver"), 'round did not end'); need('Blackjack' in pg.evaluate("document.getElementById('gameMessage').innerText"), 'no dealer blackjack message'); need(not pg.errs, pg.errs)

def t_insurance(b):
    """Perfect bots never insure; casual bots do, and the chip settles to INS + (dealer blackjack) or INS - (none)."""
    out = {}
    for skill in ['perfect', 'casual']:
        pg = page(b, skill=skill, pace='instant'); seen = set(); taken = 0
        pg.evaluate('Math.random=()=>0')                       # casual bots insure with 35% odds; pin the dice so the test is deterministic
        for r in range(4):
            if r: next_round(pg)
            bet_and_deal(pg, 'K' if r % 2 == 0 else '5')
            pg.wait_for_function("!document.getElementById('insuranceModal').classList.contains('hidden')", timeout=30000); pg.wait_for_timeout(200); pg.evaluate("handleInsurance(false)")
            stand_through(pg)
            chips = pg.evaluate("[...document.querySelectorAll('.bot-res')].map(e=>e.innerText)")
            for c in chips:
                if c.startswith('INS'): taken += 1; seen.add(('BJ' if r % 2 == 0 else 'noBJ', c))
        out[skill] = (taken, seen); need(not pg.errs, pg.errs); pg.context.close()
    need(out['perfect'][0] == 0, 'perfect bots took insurance %d times' % out['perfect'][0])
    need(('BJ', 'INS +') in out['casual'][1] and ('noBJ', 'INS \u2212') in out['casual'][1], 'casual insurance outcomes: %s' % out['casual'][1])

def t_skills(b):
    """Per-seat skills: a casual seat never doubles, splits or surrenders; perfect seats do."""
    pg = page(b, pace='instant', skills=['casual', 'perfect', 'perfect', 'perfect']); fancy_casual = 0; fancy_perfect = 0
    for r in range(40):
        if r: next_round(pg)
        pg.evaluate("STATE.allowInsurance=false"); bet_and_deal(pg)
        try: stand_through(pg)
        except Exception: continue
        t = seats_text(pg)
        for i, s in enumerate(t):
            f = any(w in s.split('LOSE')[0].split('WIN')[0] for w in ['\u00b7 double', '\u00b7 split', '\u00b7 surrender'])
            if i == 0: fancy_casual += f
            else: fancy_perfect += f
        if r >= 12 and fancy_perfect: break
    need(fancy_casual == 0, 'casual seat made %d fancy plays' % fancy_casual); need(fancy_perfect > 0, 'perfect seats never doubled/split/surrendered'); need(not pg.errs, pg.errs)

def t_pace(b):
    """Instant speed is much quicker than slow from Deal to your first turn."""
    ms = {}
    for pace in ['instant', 'slow']:
        pg = page(b, pace=pace); pg.evaluate("STATE.allowInsurance=false")
        for attempt in range(6):
            if attempt: next_round(pg)
            t0 = time.time(); bet_and_deal(pg)
            pg.wait_for_function("STATE.isGameOver || (!STATE.isAnimating && !document.getElementById('actionControls').classList.contains('pointer-events-none'))", timeout=60000)
            if not pg.evaluate("STATE.isGameOver"): ms[pace] = time.time() - t0; break
        pg.context.close()
    need(len(ms) == 2, 'could not time both speeds'); need(ms['instant'] < ms['slow'] * 0.5, 'instant %.1fs vs slow %.1fs' % (ms['instant'], ms['slow']))

def t_2p_mirror(b):
    """2P (fake connection): bots are dealt between host and friend order, and the friend's screen shows the same seats and results."""
    host = page(b, pace='fast'); host.evaluate("STATE.allowInsurance=false")
    host.evaluate("(()=>{window.__out=[]; MP.active=true; MP.me='host'; MP.actor='host'; MP.conn={open:true, send:m=>window.__out.push(JSON.parse(JSON.stringify(m)))};})()")
    host.evaluate("document.querySelector('.add-bet-btn[data-bet=\"5\"]').click(); MP.guestBet=10; document.getElementById('btnDeal').click()")
    host.wait_for_function("STATE.isGameOver || (!STATE.isAnimating && STATE.dealerCards.length==2)", timeout=30000)
    need(host.evaluate("[...document.querySelectorAll('.bot-seat b')].map(e=>e.innerText.split(' \\u00b7')[0])") == ['Player 1', 'Player 2', 'Player 5', 'Player 6'], 'seat numbers in 2P')
    for _ in range(80):
        if host.evaluate("STATE.isGameOver"): break
        host.evaluate("(()=>{ if(STATE.isAnimating) return; const h=STATE.playerHands[STATE.currentHandIndex]; if(!h) return; if(h.owner==='host') stand(); else { MP.actor='guest'; try{ stand(); } finally{ MP.actor='host'; } } })()"); host.wait_for_timeout(400)
    host.wait_for_function("[...document.querySelectorAll('.bot-seat')].every(e=>/WIN|LOSE|PUSH|BUST|BLACKJACK|SURRENDER/.test(e.querySelector('.bot-results').innerText))", timeout=30000); host.wait_for_timeout(500)
    msgs = host.evaluate("window.__out"); lastb = [m for m in msgs if m['t'] == 'b'][-1]; lasts = [m for m in msgs if m['t'] == 's'][-1]
    guest = page(b, bots=False); guest.evaluate("MP.active=true; MP.me='guest'")
    guest.evaluate("(m)=>{ STATE.dealerCards=m.d; STATE.playerHands=m.p; STATE.currentHandIndex=m.i; STATE.isGameOver=m.over; STATE.isAnimating=m.anim; renderTable(); }", lasts)
    guest.evaluate("(m)=>ProBots.apply(m)", lastb['b']); guest.wait_for_timeout(500)
    a, g = seats_text(host), seats_text(guest)
    need(a == g, 'guest seats differ:\n host  %s\n guest %s' % (a, g)); need(not host.errs and not guest.errs, host.errs + guest.errs)

def t_a11y(b):
    """Every bot seat has a spoken summary, and the live log announces what the bots do."""
    pg = page(b, pace='instant'); pg.evaluate("STATE.allowInsurance=false")
    for r in range(8):                                         # skip rounds where a blackjack ends things before the bots act
        if r: next_round(pg)
        bet_and_deal(pg); stand_through(pg)
        if pg.evaluate("[...document.querySelectorAll('#botLive div')].some(e=>/stands|hits|doubles|splits|surrenders/.test(e.textContent))"): break
    labels = pg.evaluate("[...document.querySelectorAll('.bot-seat')].map(e=>[e.getAttribute('role'), e.getAttribute('aria-label')])")
    need(len(labels) == 4 and all(r == 'img' and l.startswith('Player ') and 'total' in l and 'Result:' in l for r, l in labels), 'seat labels: %s' % labels)
    log = pg.evaluate("[...document.querySelectorAll('#botLive div')].map(e=>e.textContent)")
    need(any('Table results' in x for x in log), 'no results announcement: %s' % log); need(any(w in ' '.join(log) for w in ['stands on', 'hits and draws', 'doubles', 'splits', 'surrenders']), 'no play announcements: %s' % log); need(not pg.errs, pg.errs)

TESTS = {'order': t_order, 'split-layout': t_split_layout, 'peek': t_peek, 'insurance': t_insurance, 'skills': t_skills, 'pace': t_pace, '2p-mirror': t_2p_mirror, 'a11y': t_a11y}
if __name__ == '__main__':
    pick = sys.argv[1:] or list(TESTS); bad = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name in pick:
            t0 = time.time()
            try: TESTS[name](b); print('PASS  %-13s %5.1fs  %s' % (name, time.time() - t0, TESTS[name].__doc__.split('.')[0]))
            except Exception as e: bad.append(name); print('FAIL  %-13s %s' % (name, str(e)[:600]))
        b.close()
    print('\n%d/%d passed' % (len(pick) - len(bad), len(pick))); sys.exit(1 if bad else 0)

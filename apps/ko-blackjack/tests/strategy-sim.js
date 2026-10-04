/* Strategy check: plays millions of hands with the trainer's own basic-strategy chart (getCorrectAction in js/game.js,
   the same one the bots and the grader use) and prints the house edge. Run:  node tests/strategy-sim.js [hands]
   Expected for 6 decks, dealer hits soft 17, double after split, late surrender, 3:2: roughly 0.4% to 0.7% in the house's favor. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8');
const head = src.slice(0, src.indexOf('function processMove'));         /* STATE, STRATEGY, getCorrectAction ... no DOM code */
const ctx = {console, window: {}, document: {getElementById: () => ({})}, localStorage: {getItem: () => null, setItem() {}}};
vm.createContext(ctx); vm.runInContext(head + '\nthis.STATE = STATE; this.getCorrectAction = getCorrectAction; this.MAXHANDS = MAXHANDS;', ctx);
const {STATE, getCorrectAction, MAXHANDS} = ctx;

const N = +process.argv[2] || 2000000;
const V = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'], card = v => ({value: v, numVal: v === 'A' ? 11 : 'JQK'.includes(v) ? 10 : +v});
function total(cs) { let s = 0, a = 0; for (const c of cs) { s += c.numVal; if (c.value === 'A') a++; } while (s > 21 && a) { s -= 10; a--; } return {s, soft: a > 0}; }
function run(cfg, label) {
  Object.assign(STATE, {numDecks: cfg.decks, dealerHitsS17: cfg.h17, allowDAS: true, allowSurrender: true, allowResplitAces: false, enableDeviations: false, blackjackPays: 1.5, koCount: 0, showHints: false});
  let shoe = [], net = 0, wagered = 0;
  const fresh = () => { shoe = []; for (let d = 0; d < cfg.decks; d++) for (const v of V) for (let k = 0; k < 4; k++) shoe.push(v); for (let i = shoe.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shoe[i], shoe[j]] = [shoe[j], shoe[i]]; } };
  const draw = () => { if (shoe.length < 52 * cfg.decks * .25) fresh(); return card(shoe.pop()); };
  fresh();
  for (let n = 0; n < N; n++) {
    const p = [draw()], d = [draw()]; p.push(draw()); d.push(draw());
    const pBJ = total(p).s === 21, dBJ = total(d).s === 21;
    if (pBJ || dBJ) { wagered += 1; net += pBJ && dBJ ? 0 : pBJ ? 1.5 : -1; continue; }
    let hands = [{cards: p, bet: 1, fromSplit: false, aceSplit: false, done: false, surr: false}], i = 0;
    while (i < hands.length) {
      const h = hands[i];
      if (h.done) { i++; continue; }
      STATE.playerHands = hands;
      if (total(h.cards).s >= 21) { h.done = true; continue; }
      const a = getCorrectAction(h, d[0]);
      if (a === 'Hit') h.cards.push(draw());
      else if (a === 'Double') { h.bet *= 2; h.cards.push(draw()); h.done = true; }
      else if (a === 'Surrender') { h.surr = true; h.done = true; }
      else if (a === 'Split') {
        const aces = h.cards[0].value === 'A', moved = h.cards.pop(), nh = {cards: [moved], bet: 1, fromSplit: true, aceSplit: aces, done: false, surr: false};
        h.fromSplit = true; h.aceSplit = aces; hands.splice(i + 1, 0, nh); h.cards.push(draw()); nh.cards.push(draw());
        if (aces) { h.done = true; nh.done = true; }
      } else h.done = true;
    }
    for (const h of hands) wagered += h.bet;
    const live = hands.some(h => !h.surr && total(h.cards).s <= 21);
    if (live) for (;;) { const t = total(d); if (t.s < 17 || (t.s === 17 && t.soft && cfg.h17)) d.push(draw()); else break; }
    const ds = total(d).s;
    for (const h of hands) { const ps = total(h.cards).s; net += h.surr ? -.5 * h.bet : ps > 21 ? -h.bet : ds > 21 || ps > ds ? h.bet : ps < ds ? -h.bet : 0; }
  }
  const edge = -net / wagered * 100, se = 1.15 / Math.sqrt(N) * 100;
  console.log(label.padEnd(26), 'house edge ' + edge.toFixed(2) + '%  (+/- ' + (2 * se).toFixed(2) + ')');
  return edge;
}
const e1 = run({decks: 6, h17: true}, '6 deck, H17'), e2 = run({decks: 6, h17: false}, '6 deck, S17'), e3 = run({decks: 2, h17: true}, '2 deck, H17');
const ok = e1 > -0.1 && e1 < 1.2 && e2 < e1 + 0.3 && e3 > -0.3 && e3 < 1.2;   /* generous bounds: a broken chart costs several percent */
console.log(ok ? 'PASS: edges are in the expected range' : 'FAIL: edge outside the expected range, the strategy chart or rules may be wrong');
process.exit(ok ? 0 : 1);

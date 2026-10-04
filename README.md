# 3dayson

A collection of browser card games. Vanilla HTML/CSS/JS — no build step, no
framework. Open `index.html` in a browser or serve the folder with any static
server.

## Apps

| App | Path | Description |
| --- | ---- | ----------- |
| Go-Stop | `apps/go-stop/` | Korean flower-card game (Hwatu) vs CPU, with online 2P via PeerJS |
| KO Blackjack | `apps/ko-blackjack/` | Blackjack trainer built around the reKO counting system, with online 2P via PeerJS |

### KO Blackjack: reKO rules

The trainer follows reKO from Norman Wattenberger's *Modern Blackjack*. Where sources
disagree the do-it-yourself charts at https://www.qfit.com/book/index.htm win.

- **Count:** 2-7 are +1, 8-9 are 0, tens and aces are -1.
- **Starting count:** 1 deck -1, 2 decks -5, 4 decks -12, 6 decks -20, 8 decks -27.
- **Indexes:** every one is +2. Below +2 you play plain basic strategy; at +2 and above
  play the starred cells of the charts differently (insurance, 15 vs 10 and 16 vs 10 when
  surrender is off, 12 vs 2-3, the doubles, and the surrenders). With surrender on, 16 vs 10
  and 15 vs 10 are surrendered at every count.
- **Deck-specific basic strategy:** the no-double-after-split pairs, soft doubles and
  16 vs 9 follow the 6, 2 and 1 deck charts. 4 and 8 decks use the 6-deck plays.
- **Bet ramps:** the dollar schedules from the book for 1, 2, 6 and 8 decks; 4 decks uses
  the 6-deck ramp. Chips are $5, $10, $20, $25, $50 and $100.
- **House rules (Settings):** decks, penetration, dealer hits or stands on soft 17, double
  after split, late surrender, insurance, resplit aces (off by default; split aces get one
  card), and blackjack paying 3:2 or 6:5. Insurance pays 2:1 and the dealer peeks for
  blackjack under an Ace or a ten. 6:5 does not change the reKO charts or ramps.
- **Shoe running out mid-round:** the shoe is reshuffled without the cards on the table.

### KO Blackjack training tools

- **Count checks** (Settings): between hands the game occasionally asks for the
  True Count (the big number on the KO tracker) and grades you, whether or not
  the count display is showing.
- **Mistake log** (Stats, then *Mistakes & count checks*): every graded slip is
  stored with the hand, dealer card, count and correct play, and ranked into
  weak spots.
- **Weak Spots** (Settings, *Hand Focus*): deals the situations you miss most.
- **Count Drill** (header button, `js/drill.js`): cards are dealt face-up from a fresh shoe
  at 20-40 seconds per deck and the drill stops to ask for the running count at random
  moments, once more with 3-5 cards left (random), and always after the last card so you can
  confirm the shoe ends at the right count. The card that triggers a check stays on screen for
  a moment before the question appears, so you are always asked about cards you have seen. The count starts at 0, or at the shoe's real starting count if you tick the box. Runs show up under Stats, then
  *Mistakes & count checks*.
- **Trainer Tools** (header button, `js/pro.js`): spaced-repetition review of missed spots (1/3/7 days),
  bet-ramp grading, accuracy heatmap, bankroll and risk-of-ruin view (from your logged hands), simulated
  table players whose cards you must count, table noise, master volume, and backup/restore of all trainer data.
  Count Drill levels up by 3 sec/deck when you score 80%+ on its checks.
- **Keyboard shortcuts**: `H` `S` `D` `P` `R` to play, `1`-`6` chips, `Space` to
  deal / next hand, `Y` `N` for insurance, `M` mute, `?` for the full list.

All of this is stored in your browser (`localStorage`); nothing is sent anywhere.

The landing page at the repo root (`index.html`) is a small launcher menu that
links out to both games.

## Repository layout

```
3dayson/
├── index.html            # launcher menu (site entry point)
├── assets/
│   ├── css/menu.css      # launcher styles
│   └── js/menu.js        # launcher logic
├── apps/
│   ├── go-stop/
│   │   ├── index.html    # game page
│   │   ├── css/main.css  # game styles
│   │   └── js/
│   │       ├── game.js         # core game logic + UI
│   │       ├── art.js          # canvas card art
│   │       └── multiplayer.js  # PeerJS 2P networking
│   └── ko-blackjack/
│       ├── index.html
│       ├── css/main.css
│       └── js/
│           ├── game.js         # core game logic + UI
│           ├── a11y.js         # screen-reader labels, dialog focus handling
│           ├── trainer.js      # count checks, mistake log, weak-spot drills
│           ├── drill.js        # count drill (face-up shoe, random count checks)
│           ├── shortcuts.js    # keyboard shortcuts
│           ├── pro.js          # trainer tools (review, bets, heatmap, bankroll, bots, backup)
│           └── multiplayer.js  # PeerJS 2P networking
├── README.md
└── SECURITY.md
```

Each app is self-contained under `apps/<name>/` with the same `index.html` /
`css/` / `js/` convention, so games can be moved, renamed, or deployed
independently. Shared site-wide files live in `assets/`.

## Running locally

```sh
# from the repo root — then open http://localhost:8000
python3 -m http.server 8000
```

Or just open `index.html` directly in a browser. Online multiplayer needs
internet access for the PeerJS CDN + cloud broker. Blackjack room codes are 6 characters.

## Tech

- Plain JavaScript, no bundler
- Canvas-rendered Hwatu cards (Go-Stop)
- [PeerJS](https://peerjs.com/) for browser-to-browser multiplayer rooms

## Versioning

History lives in git — use tags (e.g. `v1`, `v2`) for release snapshots
instead of versioned zip filenames.

## KO Blackjack: simulated players and tests

- Tools → Table: turn on simulated players, pick 1-4 seats, a speed (Slow, Normal, Fast, Instant) and a skill (Perfect, Mixed, Casual) for all seats or per seat. Each bot seat is read out by screen readers as one sentence, and a live log announces what the bots do. They sit on both sides of you (and of your friend in 2P), are dealt and play in table order from the left, and get WIN / LOSE / PUSH tags after the round.
- `node apps/ko-blackjack/tests/strategy-sim.js [hands]` plays millions of hands with the trainer's strategy chart and checks the house edge is in the expected range (about 0.4-0.6% for 6 decks).
- `python3 apps/ko-blackjack/tests/table-browser.py` runs the browser tests (needs `pip install playwright` and `playwright install chromium`): deal and play order, no overlap after a split, dealer peek, insurance, per-seat skills, speed setting, the 2P mirror and screen-reader labels. Pass test names to run only some, e.g. `... table-browser.py order peek`.

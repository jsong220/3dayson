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

The trainer follows the reKO strategy at https://www.qfit.com/rekostrategy.htm:

- **Count:** 2-7 are +1, 8-9 are 0, tens and aces are -1.
- **Starting count:** 1 deck -1, 2 decks -5, 6 decks -20, 8 decks -27.
- **Indexes:** every one is +2. Below +2 play basic strategy; at +2 and above play the
  listed hands differently (insurance, 16/15 vs 10, 12 vs 2-4, the doubles, and the
  surrenders). Single deck adds five more plays; 8 decks drops 12 vs 4.
- **Bet ramps:** the dollar schedules from the page, for 1, 2, 6 and 8 decks.
- **4 decks** is not on the page, so it uses the 6-deck plays and ramp with the standard KO
  start of -12.

### KO Blackjack training tools

- **Count checks** (Settings): between hands the game occasionally asks for the
  True Count (the big number on the KO tracker) and grades you, whether or not
  the count display is showing.
- **Mistake log** (Stats, then *Mistakes & count checks*): every graded slip is
  stored with the hand, dealer card, count and correct play, and ranked into
  weak spots.
- **Weak Spots** (Settings, *Hand Focus*): deals the situations you miss most.
- **Keyboard shortcuts**: `H` `S` `D` `P` `R` to play, `1`-`4` chips, `Space` to
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
│           ├── shortcuts.js    # keyboard shortcuts
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
internet access for the PeerJS CDN + cloud broker.

## Tech

- Plain JavaScript, no bundler
- Canvas-rendered Hwatu cards (Go-Stop)
- [PeerJS](https://peerjs.com/) for browser-to-browser multiplayer rooms

## Versioning

History lives in git — use tags (e.g. `v1`, `v2`) for release snapshots
instead of versioned zip filenames.

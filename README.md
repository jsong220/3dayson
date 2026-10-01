# 3dayson

A collection of browser card games. Vanilla HTML/CSS/JS — no build step, no
framework. Open `index.html` in a browser or serve the folder with any static
server.

## Apps

| App | Path | Description |
| --- | ---- | ----------- |
| Go-Stop | `apps/go-stop/` | Korean flower-card game (Hwatu) vs CPU, with online 2P via PeerJS |
| KO Blackjack | `apps/ko-blackjack/` | Blackjack trainer built around the KO counting system, with online 2P via PeerJS |

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

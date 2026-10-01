# 3dayson

zz

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

## Tech

- Plain JavaScript, no bundler
- Canvas-rendered Hwatu cards (Go-Stop)
- [PeerJS](https://peerjs.com/) for browser-to-browser multiplayer rooms

## Versioning


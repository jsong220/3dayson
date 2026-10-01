# Security Policy

## Supported versions

3dayson is a static site with no versioned releases. Only the latest commit on
`main` is supported; fixes land there.

## Reporting a vulnerability

Please report security issues privately rather than in a public issue. Use
GitHub's **Security → Report a vulnerability** option on this repository.

Include what you found, how to reproduce it, and which app it affects
(launcher, Go-Stop, or KO Blackjack). Expect an acknowledgement within a
week. If the report is accepted, the fix goes to `main` and you'll be told
when it ships; if it is declined, you'll get the reason.

## Scope notes

- Everything runs in the browser. There is no server or database, and game
  progress is stored only in your own browser's `localStorage`.
- Online 2-player rooms connect browsers directly through PeerJS and its
  public broker. Treat a room code like a password: share it only with the
  person you want to play with.

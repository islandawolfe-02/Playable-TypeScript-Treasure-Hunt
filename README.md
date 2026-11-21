# Playable TypeScript Treasure Hunt

[![p2-gates](https://github.com/islandawolfe-02/Playable-TypeScript-Treasure-Hunt/actions/workflows/p2-gates.yml/badge.svg)](https://github.com/islandawolfe-02/Playable-TypeScript-Treasure-Hunt/actions/workflows/p2-gates.yml)

Project 2 (BP Software Engineering Academy, Week 2) is a playable treasure-hunt game in TypeScript. A player starts,
moves around a 3×3 board, picks up the treasure, reaches the exit, and can restart, all through browser buttons.
It loads its board from a same-origin API, handles loading and failures, records each action in a local event
view, and ships as a named local release.

> **Scope.** Local only: Node.js server, local event view (process memory, not Grafana) and a local `release.py`
> release. This is not a container, Kubernetes or BP deployment. BP Yalla, the BP pull request and BP deployment are
> **pending**. Deployment through a central GitOps repo is planned for later.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the request path, file ownership and game rules.

## The game
- Board: 3×3. Start (0,0), wall (1,1), treasure t1 at (2,0) worth 10, exit (2,2). 6 moves.
- Each accepted move costs 1. The treasure scores once.
- **Win:** reach the exit holding t1, even on the last move. **Lose:** run out of moves first.
- Walls, the board edge, unknown moves and moves after the game ends are rejected and change nothing.
- Winning route: East, East, South, South (finishes with 2 moves left).

## Quick start
```bash
npm ci
npx playwright install chromium     # once per machine
npm run check:boot                  # scaffold boots
npm run check:rules                 # 13 contract fixtures + learner regressions
npm start                           # http://127.0.0.1:4182  (PORT=4183 npm start to change)
```

## Checks
| Command | What it runs | Result (recorded) |
|---|---|---|
| `npm run check:boot` | Page, modules, both data routes, collector, `/healthz`, config guard | PASS |
| `npm run check:rules` | Fixtures F01–F11 (13 files) + 3 learner tests; range R01–R05 skipped | 16 pass, 0 fail, 6 skipped |
| `npm run check:browser` | 10 Playwright checks: lifecycle, request failures, local events | 10 passed |
| `npm test` | `check:rules` then `check:browser` | green |

Real outputs are in [`evidence/`](evidence/). The first red run of the unchanged starter is
`evidence/02-starter-check-rules-RED.txt`.

## See failures by hand
Stop the normal server first, then run:
```bash
npm start -- --fault=slow         # "Loading game data..." for about 1.5 s, then verified
npm start -- --fault=http         # "Game data request failed: HTTP 503"
npm start -- --fault=malformed    # "Game data was malformed JSON"
npm start -- --fault=unexpected   # "Unexpected game definition: ..."
npm start -- --collector=down     # moves still work; "Local recording unavailable"
```

## Local release
```bash
npm test
python3 tools/release.py pack ../releases/playable-01
python3 tools/release.py verify ../releases/playable-01
python3 ../releases/playable-01/serve.py                       # terminal 1
P2_URL=http://127.0.0.1:4182 npm run check:browser             # terminal 2
```
The game-data response header `X-Lab-Release: playable-01` names the release that answered. Use a new name for
every new release (`playable-02`, ...). Keep `release.json`. A copy is in `evidence/release.json`.

## Event view
Each move posts one event: run ID, sequence, action, accepted, before, after. Open **Local event view** from the
page. It is already filtered to the current run ID. Restarting the server clears the rows, so save them first.

## CI
GitHub Actions (`.github/workflows/p2-gates.yml`) runs `check:boot`, `npm test` with Chromium, and a release
pack + verify on every pull request and push to `main`. CI never deploys.

## Status
| Outcome | Status |
|---|---|
| 1. Typed models | completed with guided support |
| 2. Core logic | completed with guided support |
| 3. Browser lifecycle | completed with guided support |
| 4. API loading and failure | completed with guided support |
| 5. Debugging | completed with guided support |
| 6. Event | completed with guided support |
| 7. Release | completed with guided support |

BP items still pending: Yalla scaffolding, BP pull request, BP deployment.

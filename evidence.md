# Project 2 evidence: playable TypeScript game

Owned by you. Write, speak, annotate or record each response; a pair shares the artifact but gives two
individual responses. Record observations you actually made, not what you expected to see.

Learner id (synthetic, e.g. `learner-01`): learner-01  Pair/team id (e.g. `p2-team-a`): solo
Genre route chosen in `src/genre.ts` (`treasure` / `range`) and the game identity kept from your brief: `treasure`,
the treasure hunt on the 3×3 reference board (same game as my W2.10 brief and my P1 game intention).

Where these runs happened: work laptop, WSL Ubuntu-26.04, Node 22.22.1 / npm 9.2.0, TypeScript 5.9.3,
Playwright 1.61.0 / Chromium, 2026-11-16. Raw outputs are in [`evidence/`](evidence/). Runs repeated on the Mac
go in `evidence/mac/`.

## 1. Plan check (Thursday PM, minute 0-20)
- Brief, minimum slice and acceptance examples brought from W2.10: start at (0,0) with 6 moves; move with N/E/S/W;
  collect t1 at (2,0) for 10; win at the exit (2,2) holding t1, lose at 0 moves. Completion: East, East, South, South.
  Invalid: East then South (wall). W2.10 showed that the collected ID must be kept between moves, or the exit never wins.
- The seven outcomes and which owned file delivers each:
  1 typed models → `models.ts`; 2 core logic → `rules.ts` + `tests/learner.test.mjs`; 3 browser lifecycle → `app.ts`;
  4 API → `api.ts` + `app.ts`; 5 debugging → `rules.ts` + `tests/learner.test.mjs`; 6 event → `app.ts`;
  7 release → all of them, packed by the supplied `tools/release.py`.

## 2. Typed models (acceptance 1)
- Field names, permitted actions and one invariant (quote `src/models.ts`):
  `GameState { position: Point; movesRemaining: number; score: number; collected: readonly string[]; status: Status }`,
  `Status = "playing" | "won" | "lost"`, `MoveAction { type: "move"; direction: "north" | "east" | "south" | "west" }`,
  `Reason = "WALL" | "EDGE" | "INVALID_ACTION" | "GAME_COMPLETE"`.
  Invariant: "once `won` or `lost`, the state never changes again" (enforced by the `GAME_COMPLETE` rejection).
- Incompatible value you tried, the compiler diagnostic (code + message), and the restored valid source:
  I set the start `status` to `"paused"`. The compiler printed
  `src/rules.ts(48,5): error TS2322: Type '"paused"' is not assignable to type 'Status'.` (exit 2). After I
  restored `status: "playing"`, it compiled with exit 0. (`evidence/06-typed-model-compiler.txt`)

## 3. Core logic (acceptance 2)
- `npm run check:rules` result (first red run, then green): paste the pass/fail/skipped lines.
  Red (unchanged starter): `# tests 20  # pass 0  # fail 14  # skipped 6` (`evidence/02-starter-check-rules-RED.txt`).
  Green (final): `# tests 22  # pass 16  # fail 0  # skipped 6` (13 fixtures + 3 learner tests; 6 range fixtures skipped).
- Your changed-input regression: before-state, action, expected result worked out by hand **before** running:
  Before: (2,1), 1 move left, score 0, collected none, playing. Action: South onto the exit. Expected: accepted;
  (2,2); 0 moves; score 0; collected none; status **lost**, because the exit needs t1 and the moves ran out. The
  fixtures cover "exit without t1 with moves left" (F11) and "last move, not at the exit" (F08), but not this mix.
- Evidence that inputs are unchanged and invalid/completed actions are rejected: every fixture runs on a deep-frozen
  state and checks its JSON is unchanged after `evaluate()`. My learner test checks the same thing, and also checks
  that a rejected move returns a separate copy (`notStrictEqual`). F03 (WALL), F04 (EDGE), F09A/B (GAME_COMPLETE)
  and F10A/B (INVALID_ACTION) all pass.

## 4. Checkpoints
- Minute 120: start / accepted / rejected checks you can show: F01 start, F02 East accepted, F03 wall rejected, all green.
- Minute 180: one browser action rendered from returned state; the remaining handoff: Start then East shows (1,0),
  5 moves from the returned state. Remaining: none; the full lifecycle was connected next.
- Minute 270 (midpoint, about 60%): what is complete, what remains, support requested: rules, browser path, API
  failures and events all complete; release and evidence remained.

## 5. Browser lifecycle (acceptance 3)
- Public start -> progress -> finish -> fresh restart: steps and what the page showed at each
  (run `run-ba71a581`, against release playable-01, `evidence/09-play-through-and-event-rows.json`):
  1. Page load: api "Game data verified: Reference treasure hunt (3x3, 6 moves)", status "Ready: press Start game."
  2. Start: (0,0), 6 moves, score 0, collected none, playing.
  3. East: "Moved east", (1,0), 5 moves.
  4. South: "Rejected: WALL", still (1,0), 5 moves.
  5. East: (2,0), 4 moves, score 10, collected t1.
  6. South: (2,1), 3 moves.
  7. South: (2,2), 2 moves, score 10, **won**, "You won! Press Restart to play again." All move buttons disabled.
  Restart gives a fresh (0,0), 6 moves and a new run ID; this is checked by `lifecycle.spec.mjs` (passed).

## 6. API loading and failure (acceptance 4)
- Loading observed before response (how): `npm start -- --fault=slow`. The api region showed "Loading game data..."
  at 73 ms, then "Game data verified: ..." at 1566 ms (`evidence/10-api-faults-by-hand.txt`).
- Success message: "Game data verified: Reference treasure hunt (3x3, 6 moves)".
- HTTP failure / malformed JSON / unexpected definition: message shown for each, and the command or check used:
  - `--fault=http`: "Game data request failed: HTTP 503"
  - `--fault=malformed`: "Game data was malformed JSON"
  - `--fault=unexpected`: "Unexpected game definition: this package supports only the fixed reference definition"
  - In each case, Start then showed "No verified game data yet: use Reload game data." with 0 state rows. The
    browser checks `request-failure.spec.mjs` (4 tests) also passed.
- Failed reload kept the last confirmed session (state before and after): checked by "a failed reload preserves the
  last confirmed session" (passed). After Start + East, a Reload returning 503 left the state at (1,0), 5 moves,
  playing, with the buttons still enabled. Only the api region changed, to "HTTP 503".

## 7. Debugging (acceptance 5)
- Reproducible failing behaviour (input and observed result): in a preserved debug copy, the end-of-move checks were
  in the wrong order (`movesRemaining === 0 ? "lost" : ...` before the win). Input: (2,1), 1 move left, holding t1,
  South. Observed: status `lost` at the exit instead of `won`.
- Responsible boundary and the narrow correction: `rules.ts`, one line. Check "at the exit with every treasure → won"
  before "0 moves → lost".
- Same regression failing before / passing after (paste both runs):
  Before: `not ok 7 - F07 Final-move win` and `not ok 22 - final-move win: exit with the treasure on the LAST move is a win`
  (`+ status: 'lost'  - status: 'won'`); `# pass 14  # fail 2`.
  After: `ok 7 - F07 ...` and `ok 22 - final-move win ...`; `# pass 16  # fail 0`.
  (`evidence/03-debug-before-fix-RED.txt`, `evidence/04-debug-after-fix-GREEN.txt`, which includes the diff.)
- Diagnostic variant requested? (yes/no; when; in which preserved copy): no supplied variant. The defect was put
  into a separate preserved copy after the core attempt passed, as the manual allows.

## 8. Event (acceptance 6)
- Displayed run ID, sequence, action, acceptance: `run-ba71a581`, sequence 2, `south`, rejected.
- Saved event-view row (paste the row text before stopping the collector):
  `2026-11-16T10:10:25.753Z run-ba71a581 2 south rejected {"position":{"x":1,"y":0},"movesRemaining":5,"score":0,"collected":[],"status":"playing"} {"position":{"x":1,"y":0},"movesRemaining":5,"score":0,"collected":[],"status":"playing"}`
- Comparison of the row's before/after with the page: the page showed "Rejected: WALL" with (1,0), 5 moves, score 0,
  collected none, playing. The row's before and after are the same values, so nothing changed, matching the page.
  All 5 rows of the run are in `evidence/09-play-through-and-event-rows.json`.

## 9. Release (acceptance 7)
- `npm test` result: rules 16 pass / 0 fail / 6 skipped, then browser **10 passed** (`evidence/05-npm-test-GREEN.txt`).
- Release name, `pack` and `verify` output, `release.json` retained at: `playable-01`.
  "Packed release playable-01 (treasure): 47 files" and "Release playable-01 verified: 47 files match release.json
  (SHA-256)". A copy is at `evidence/release.json` (`evidence/07-release-pack-verify.txt`).
- `P2_URL=http://127.0.0.1:4182 npm run check:browser` result against the running release: **10 passed**. The game
  data answered with `X-Lab-Release: playable-01` and `/healthz` returned Healthy (`evidence/08-release-running.txt`).
- Source vs artifact vs process: what each was in your run, and the accurate scope label (local only): source = this
  repo's TypeScript and server files; artifact = the `releases/playable-01/` folder with its SHA-256 `release.json`;
  process = `python3 releases/playable-01/serve.py` on port 4182, identified by the `X-Lab-Release` header.
  **Local release only**: not a container, Kubernetes or BP deployment.

## 10. Individual responses
- Changed invalid or completion input: prediction from the brief, execution, actual result: prediction: the last move
  onto the exit without t1 is a loss. Executed as the learner test "last move onto the exit WITHOUT the treasure is a
  loss". Actual: accepted, (2,2), 0 moves, score 0, `lost`, matching the prediction.
- Public-start trace and one bounded change you made yourself: trace in section 5 (`run-ba71a581`). Bounded change:
  ______

## 11. Assistance and status
- Supplied examples/hints/checkpoints reused (name them): W2.10 reference rules (same check order); supplied
  fixtures, browser checks and release tools used as given.
- How the code was written: the six owned files were written with Claude Code on the work laptop. On the Mac, Codex
  helps when asked (bug fixes, package versions). Any later fix is listed here:
  - ______
- Status per outcome: demonstrated independently / demonstrated with a prompt / completed with guided support / not yet demonstrated
  1 typed models: completed with guided support · 2 core logic: completed with guided support ·
  3 browser lifecycle: completed with guided support · 4 API: completed with guided support ·
  5 debugging: completed with guided support · 6 event: completed with guided support ·
  7 release: completed with guided support
- Environment blocked (separately, with what was blocked): none. The runs used WSL Node 22.22.1 / npm 9.2.0 instead of
  the course pin 22.23.2 / 10.9.8; all checks passed.

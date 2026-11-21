// OWNED: changed-input regressions with INDEPENDENT expected values (worked out by hand from the rules
// before running). The fixtures cover "exit without treasure, moves left" (F11) and "last move, not at
// the exit" (F08). These cover the gaps between them.
//
// Run with: npm run check:rules   (it builds first, then imports the compiled rules from dist/)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseConfig } from "../dist/supplied/config.js";
import { evaluate, initialState } from "../dist/rules.js";

const board = parseConfig("treasure", JSON.parse(readFileSync(new URL("../fixtures/board-reference.json", import.meta.url), "utf8")));
const freeze = (v) => { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };

test("last move onto the exit WITHOUT the treasure is a loss, not a win", () => {
  // Given (2,1), 1 move left, no treasure. When South -> lands on the exit (2,2) and spends the last move.
  // Expected by hand: accepted; (2,2); moves 0; score 0; collected []; status "lost" (exit needs t1).
  const state = freeze({ position: { x: 2, y: 1 }, movesRemaining: 1, score: 0, collected: [], status: "playing" });
  const before = JSON.stringify(state);
  const result = evaluate(board, state, freeze({ type: "move", direction: "south" }));
  assert.deepStrictEqual(result, {
    accepted: true,
    reason: null,
    state: { position: { x: 2, y: 2 }, movesRemaining: 0, score: 0, collected: [], status: "lost" },
  });
  assert.equal(JSON.stringify(state), before, "evaluate() must not mutate its input state");
});

test("final-move win: exit with the treasure on the LAST move is a win", () => {
  // Regression for the debugging exercise (evidence/03 and 04): checking "moves = 0 -> lost" before the win.
  // Given (2,1), 1 move left, holding t1 (score 10). When South onto the exit.
  // Expected by hand: accepted; (2,2); moves 0; score 10; collected ["t1"]; status "won".
  const state = freeze({ position: { x: 2, y: 1 }, movesRemaining: 1, score: 10, collected: ["t1"], status: "playing" });
  const result = evaluate(board, state, freeze({ type: "move", direction: "south" }));
  assert.deepStrictEqual(result.state, { position: { x: 2, y: 2 }, movesRemaining: 0, score: 10, collected: ["t1"], status: "won" });
});

test("a rejected move never shares objects with the input state", () => {
  // Given the public start. When North (off the board). Expected: rejected EDGE, an equal but SEPARATE state,
  // so a later change to the returned state can never reach back into the caller's state.
  const start = initialState(board);
  const result = evaluate(board, start, { type: "move", direction: "north" });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "EDGE");
  assert.deepStrictEqual(result.state, start);
  assert.notStrictEqual(result.state, start);
  assert.notStrictEqual(result.state.position, start.position);
  assert.notStrictEqual(result.state.collected, start.collected);
});

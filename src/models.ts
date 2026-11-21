// OWNED: precise state and action types for the treasure-hunt route, and the invariants they keep.
// Field order matches the shared fixtures (F01-F11), so paint() lists them in the same order.

import type { Point } from "./supplied/config.js";
import type { Direction } from "./supplied/controls.js";

export type { Direction, Point };

/** playing until the exit is reached with every treasure (won) or the moves run out (lost). */
export type Status = "playing" | "won" | "lost";

/** Why an action was rejected. An accepted action always has reason null. */
export type Reason = "WALL" | "EDGE" | "INVALID_ACTION" | "GAME_COMPLETE";

export interface GameState {
  /** Invariant: always inside the board (0 <= x < width, 0 <= y < height) and never on a wall. */
  readonly position: Point;
  /** Invariant: starts at the board's initialMoves, drops by exactly 1 per accepted move, never below 0. */
  readonly movesRemaining: number;
  /** Invariant: the sum of the values of the collected treasures (each counted once). */
  readonly score: number;
  /** Invariant: treasure ids in the order they were collected, with no duplicates. */
  readonly collected: readonly string[];
  /** Invariant: once "won" or "lost", the state never changes again. */
  readonly status: Status;
}

/** The only permitted player action: move one square in one of four directions. */
export interface MoveAction {
  readonly type: "move";
  readonly direction: Direction;
}

export type GameAction = MoveAction;

/** The result envelope every evaluate() call returns. */
export type RuleResult =
  | { readonly accepted: true; readonly reason: null; readonly state: GameState }
  | { readonly accepted: false; readonly reason: Reason; readonly state: GameState };

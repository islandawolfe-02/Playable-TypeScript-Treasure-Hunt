// OWNED: pure treasure-hunt rules. No DOM, clock, randomness or I/O, and no input is ever mutated.
//
//   initialState(config)             -> a fresh state for the validated board
//   evaluate(config, state, action)  -> { accepted, reason, state }
//
// Order of checks (matches fixtures F01-F11):
//   1. finished game -> GAME_COMPLETE      2. not a known move -> INVALID_ACTION
//   3. off the board -> EDGE               4. into a wall -> WALL
//   5. move, pay one move, collect an uncollected treasure once
//   6. exit holding every treasure -> won (checked BEFORE the zero-moves loss, so a final-move win counts)
//   7. otherwise no moves left -> lost

import type { TreasureConfig } from "./supplied/config.js";
import type { Direction, GameState, Point, Reason, RuleResult } from "./models.js";

const STEPS: Readonly<Record<Direction, Point>> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

function isDirection(value: unknown): value is Direction {
  return typeof value === "string" && Object.hasOwn(STEPS, value);
}

/** A complete, independent copy, so a returned state never shares objects with an input. */
function copy(state: GameState): GameState {
  return {
    position: { x: state.position.x, y: state.position.y },
    movesRemaining: state.movesRemaining,
    score: state.score,
    collected: [...state.collected],
    status: state.status,
  };
}

function reject(state: GameState, reason: Reason): RuleResult {
  return { accepted: false, reason, state: copy(state) };
}

export function initialState(config: TreasureConfig): GameState {
  return {
    position: { x: config.start.x, y: config.start.y },
    movesRemaining: config.initialMoves,
    score: 0,
    collected: [],
    status: "playing",
  };
}

/** `action` is unknown on purpose: the rules must reject anything that is not a valid move. */
export function evaluate(config: TreasureConfig, state: GameState, action: unknown): RuleResult {
  if (isFinished(state)) return reject(state, "GAME_COMPLETE");

  const move = action as { type?: unknown; direction?: unknown } | null;
  if (typeof move !== "object" || move === null || move.type !== "move" || !isDirection(move.direction)) {
    return reject(state, "INVALID_ACTION");
  }

  const step = STEPS[move.direction];
  const x = state.position.x + step.x;
  const y = state.position.y + step.y;
  if (x < 0 || y < 0 || x >= config.width || y >= config.height) return reject(state, "EDGE");
  if (config.walls.some((w) => w.x === x && w.y === y)) return reject(state, "WALL");

  const collected = [...state.collected];
  let score = state.score;
  for (const t of config.treasures) {
    if (t.x === x && t.y === y && !collected.includes(t.id)) {
      collected.push(t.id);
      score += t.value;
    }
  }

  const movesRemaining = state.movesRemaining - 1;
  const atExit = x === config.exit.x && y === config.exit.y;
  const hasAll = config.treasures.every((t) => collected.includes(t.id));
  const status = atExit && hasAll ? "won" : movesRemaining === 0 ? "lost" : "playing";

  return { accepted: true, reason: null, state: { position: { x, y }, movesRemaining, score, collected, status } };
}

/** True when no further action can be accepted (used by the app to disable the action buttons). */
export function isFinished(state: GameState): boolean {
  return state.status !== "playing";
}

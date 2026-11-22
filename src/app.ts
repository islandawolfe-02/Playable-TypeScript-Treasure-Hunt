// OWNED: the application adapter: load -> start -> dispatch -> restart.
//
// Retained values:
//   config   the last VERIFIED game data (null until the first successful load)
//   state    the state returned by the last rule call (null until a game starts)
//   runId    a new id for every start/restart; sequence counts actions in that run from 1
// Regions: "api" = transport only, "status" = game status, "result" = last action, "telemetry" = recording.

import { GENRE } from "./genre.js";
import { loadConfig } from "./api.js";
import { evaluate, initialState, isFinished } from "./rules.js";
import type { GameState } from "./models.js";
import { connect, playable, type TreasurePanelAction } from "./supplied/controls.js";
import { identify, paint, text } from "./supplied/render.js";
import { newRunId, recordEvent } from "./supplied/telemetry.js";
import type { TreasureConfig } from "./supplied/config.js";

let config: TreasureConfig | null = null;
let state: GameState | null = null;
let runId = "";
let sequence = 0;

const STATUS_TEXT: Record<GameState["status"], string> = {
  playing: "Playing: collect the treasure, then reach the exit.",
  won: "You won! Treasure secured. Press Restart for another adventure.",
  lost: "Out of moves: you lost. Press Restart to try again.",
};

function show(next: GameState): void {
  state = next;
  paint(next);
  playable(!isFinished(next));
  text("status", STATUS_TEXT[next.status]);
}

/** Start a fresh game (new run) from the verified data only. */
function begin(): void {
  if (!config) {
    text("status", "No verified game data yet: use Reload game data.");
    return;
  }
  runId = newRunId();
  sequence = 0;
  identify(runId);
  text("result", "New game started");
  text("telemetry", "No event recorded yet");
  show(initialState(config));
}

function dispatch(action: TreasurePanelAction): void {
  if (!config || !state) {
    text("result", "Start a game first");
    return;
  }
  const before = state;
  const result = evaluate(config, before, action);
  show(result.state);
  text("result", result.accepted ? `Moved ${action.direction}` : `Rejected: ${result.reason}`);

  sequence += 1;
  recordEvent({ runId, sequence, action: action.direction, accepted: result.accepted, before, after: result.state })
    .then(() => text("telemetry", "Recorded locally"))
    .catch(() => text("telemetry", "Local recording unavailable")); // never undoes the action
}

/** Request the game data. A failure keeps the last confirmed config and the game in progress. */
async function load(): Promise<void> {
  text("api", "Loading game data...");
  try {
    config = await loadConfig();
    text("api", `Game data verified: ${config.name} (${config.width}x${config.height}, ${config.initialMoves} moves)`);
    if (!state) text("status", "Ready: press Start game.");
  } catch (error) {
    text("api", error instanceof Error ? error.message : String(error));
    if (!state) text("status", "No game yet: the game data could not be used.");
  }
}

connect(GENRE, { dispatch, start: begin, restart: begin, reload: () => void load() });
playable(false);
void load();

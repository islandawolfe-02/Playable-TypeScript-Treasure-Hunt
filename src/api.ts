// OWNED: request the game data, keep each failure kind separate, and call parseConfig.
//
// Route: GET /api/boards/reference (same origin). Each failure gets its own message for the "api" region:
//   network failure  -> "Game data unavailable: ..."
//   HTTP failure     -> "Game data request failed: HTTP <status>"
//   malformed JSON   -> "Game data was malformed JSON"
//   wrong definition -> the ConfigError message from parseConfig (starts "Unexpected game definition")
// These are transport problems, so the app shows them in "api", never in the game "status".

import { GENRE } from "./genre.js";
import { parseConfig, type ConfigFor } from "./supplied/config.js";

const ROUTE = GENRE === "treasure" ? "/api/boards/reference" : "/api/ranges/reference";

export class GameDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameDataError";
  }
}

export async function loadConfig(): Promise<ConfigFor<typeof GENRE>> {
  let response: Response;
  try {
    response = await fetch(ROUTE, { cache: "no-store" });
  } catch (error) {
    throw new GameDataError(`Game data unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) throw new GameDataError(`Game data request failed: HTTP ${response.status}`);

  let data: unknown;
  try {
    data = JSON.parse(await response.text());
  } catch {
    throw new GameDataError("Game data was malformed JSON");
  }
  return parseConfig(GENRE, data); // throws ConfigError for a wrong shape or an unexpected definition
}

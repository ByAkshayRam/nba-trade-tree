import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "nba-trades.db");
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });
export { schema };

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    abbreviation TEXT NOT NULL,
    primary_color TEXT,
    secondary_color TEXT,
    logo_url TEXT
  );

  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    current_team_id TEXT REFERENCES teams(id),
    draft_year INTEGER,
    draft_round INTEGER,
    draft_pick INTEGER,
    draft_team_id TEXT REFERENCES teams(id),
    headshot_url TEXT,
    position TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    description TEXT,
    source_url TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS draft_picks (
    id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    round INTEGER NOT NULL,
    pick_number INTEGER,
    original_team_id TEXT NOT NULL REFERENCES teams(id),
    current_team_id TEXT NOT NULL REFERENCES teams(id),
    player_id TEXT REFERENCES players(id),
    is_used INTEGER DEFAULT 0,
    protections TEXT
  );

  CREATE TABLE IF NOT EXISTS trade_assets (
    id TEXT PRIMARY KEY,
    trade_id TEXT NOT NULL REFERENCES trades(id),
    team_from TEXT NOT NULL REFERENCES teams(id),
    team_to TEXT NOT NULL REFERENCES teams(id),
    asset_type TEXT NOT NULL CHECK (asset_type IN ('player', 'pick', 'cash', 'rights')),
    player_id TEXT REFERENCES players(id),
    pick_id TEXT REFERENCES draft_picks(id),
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS acquisitions (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id),
    team_id TEXT NOT NULL REFERENCES teams(id),
    type TEXT NOT NULL CHECK (type IN ('draft', 'trade', 'signing', 'waiver', 'unknown')),
    date TEXT NOT NULL,
    trade_id TEXT REFERENCES trades(id),
    pick_id TEXT REFERENCES draft_picks(id),
    notes TEXT
  );
`);

console.log("Database initialized at:", dbPath);

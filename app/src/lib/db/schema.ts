import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Teams table
export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(), // e.g., "BOS", "LAL"
  name: text("name").notNull(), // e.g., "Boston Celtics"
  abbreviation: text("abbreviation").notNull(),
  primaryColor: text("primary_color"), // hex color
  secondaryColor: text("secondary_color"),
  logoUrl: text("logo_url"),
});

// Players table
export const players = sqliteTable("players", {
  id: text("id").primaryKey(), // basketball-reference ID
  name: text("name").notNull(),
  currentTeamId: text("current_team_id").references(() => teams.id),
  draftYear: integer("draft_year"),
  draftRound: integer("draft_round"),
  draftPick: integer("draft_pick"),
  draftTeamId: text("draft_team_id").references(() => teams.id),
  headshotUrl: text("headshot_url"),
  position: text("position"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

// Trades table
export const trades = sqliteTable("trades", {
  id: text("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  description: text("description"),
  sourceUrl: text("source_url"),
  createdAt: text("created_at").notNull(),
});

// Trade assets - what was exchanged in each trade
export const tradeAssets = sqliteTable("trade_assets", {
  id: text("id").primaryKey(),
  tradeId: text("trade_id").notNull().references(() => trades.id),
  teamFrom: text("team_from").notNull().references(() => teams.id),
  teamTo: text("team_to").notNull().references(() => teams.id),
  assetType: text("asset_type", { enum: ["player", "pick", "cash", "rights"] }).notNull(),
  playerId: text("player_id").references(() => players.id),
  pickId: text("pick_id").references(() => draftPicks.id),
  description: text("description"), // For cash or other assets
});

// Draft picks table
export const draftPicks = sqliteTable("draft_picks", {
  id: text("id").primaryKey(), // e.g., "2024-1-BOS" (year-round-originalTeam)
  year: integer("year").notNull(),
  round: integer("round").notNull(),
  pickNumber: integer("pick_number"), // null if not yet determined
  originalTeamId: text("original_team_id").notNull().references(() => teams.id),
  currentTeamId: text("current_team_id").notNull().references(() => teams.id),
  playerId: text("player_id").references(() => players.id), // who was drafted (if used)
  isUsed: integer("is_used", { mode: "boolean" }).default(false),
  protections: text("protections"), // e.g., "top-5 protected"
});

// Acquisitions - how each player joined each team
export const acquisitions = sqliteTable("acquisitions", {
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull().references(() => players.id),
  teamId: text("team_id").notNull().references(() => teams.id),
  type: text("type", { enum: ["draft", "trade", "signing", "waiver", "unknown"] }).notNull(),
  date: text("date").notNull(),
  tradeId: text("trade_id").references(() => trades.id),
  pickId: text("pick_id").references(() => draftPicks.id), // if drafted
  notes: text("notes"),
});

// Export types
export type Team = typeof teams.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type TradeAsset = typeof tradeAssets.$inferSelect;
export type DraftPick = typeof draftPicks.$inferSelect;
export type Acquisition = typeof acquisitions.$inferSelect;

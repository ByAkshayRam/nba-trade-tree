import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  abbreviation: text("abbreviation").unique().notNull(),
  name: text("name").notNull(),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  logoUrl: text("logo_url"),
});

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  currentTeamId: integer("current_team_id").references(() => teams.id),
  draftYear: integer("draft_year"),
  draftRound: integer("draft_round").default(1),
  draftPick: integer("draft_pick"),
  draftTeamId: integer("draft_team_id").references(() => teams.id),
  headshotUrl: text("headshot_url"),
  position: text("position"),
  isActive: integer("is_active").default(1),
});

export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  description: text("description"),
  sourceUrl: text("source_url"),
  isMultiTeam: integer("is_multi_team").default(0), // For 3+ team trades
  parentTradeId: integer("parent_trade_id").references((): typeof trades => trades.id), // Links related sub-trades
});

export const tradeAssets = sqliteTable("trade_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tradeId: integer("trade_id").notNull().references(() => trades.id),
  teamFromId: integer("team_from_id").notNull().references(() => teams.id),
  teamToId: integer("team_to_id").notNull().references(() => teams.id),
  assetType: text("asset_type").notNull(), // 'player' | 'pick' | 'cash' | 'rights'
  playerId: integer("player_id").references(() => players.id),
  pickId: integer("pick_id").references(() => draftPicks.id),
  description: text("description"), // For cash or other assets, or pick description
});

export const draftPicks = sqliteTable("draft_picks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  year: integer("year").notNull(),
  round: integer("round").notNull(),
  pickNumber: integer("pick_number"), // null if not yet determined
  originalTeamId: integer("original_team_id").notNull().references(() => teams.id),
  currentTeamId: integer("current_team_id").notNull().references(() => teams.id),
  playerId: integer("player_id").references(() => players.id), // who was drafted (if used)
  isUsed: integer("is_used").default(0),
  protections: text("protections"), // e.g., "top-5 protected", "lottery protected"
  conveyed: integer("conveyed").default(0), // 1 if pick has been conveyed
  conveyedYear: integer("conveyed_year"), // Year it actually conveyed (if different)
});

export const acquisitions = sqliteTable("acquisitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id").notNull().references(() => players.id),
  teamId: integer("team_id").notNull().references(() => teams.id),
  acquisitionType: text("acquisition_type").notNull(), // 'trade' | 'draft' | 'signing' | 'waiver'
  date: text("date").notNull(),
  tradeId: integer("trade_id").references(() => trades.id),
  originTradeId: integer("origin_trade_id").references(() => trades.id), // The trade that started the chain
  pickId: integer("pick_id").references(() => draftPicks.id), // if drafted via traded pick
  notes: text("notes"),
});

export const tradeChains = sqliteTable("trade_chains", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  originTradeId: integer("origin_trade_id").notNull().references(() => trades.id),
  resultingPlayerId: integer("resulting_player_id").references(() => players.id),
  resultingPickId: integer("resulting_pick_id").references(() => draftPicks.id),
  chainJson: text("chain_json").notNull(), // JSON array of chain steps
  branchIndex: integer("branch_index").default(0), // For multiple branches from same origin
});

// Types
export type Team = typeof teams.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type TradeAsset = typeof tradeAssets.$inferSelect;
export type DraftPick = typeof draftPicks.$inferSelect;
export type Acquisition = typeof acquisitions.$inferSelect;
export type TradeChain = typeof tradeChains.$inferSelect;

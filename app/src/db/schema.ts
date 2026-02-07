import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  abbreviation: text("abbreviation").unique().notNull(),
  name: text("name").notNull(),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
});

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  currentTeamId: integer("current_team_id").references(() => teams.id),
  draftYear: integer("draft_year"),
  draftPick: integer("draft_pick"),
  headshotUrl: text("headshot_url"),
});

export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  description: text("description"),
  sourceUrl: text("source_url"),
});

export const tradeAssets = sqliteTable("trade_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tradeId: integer("trade_id").notNull().references(() => trades.id),
  teamFrom: text("team_from").notNull(),
  teamTo: text("team_to").notNull(),
  assetType: text("asset_type").notNull(), // 'player' | 'pick'
  assetId: integer("asset_id"),
  pickYear: integer("pick_year"),
  pickRound: integer("pick_round"),
  pickNumber: integer("pick_number"),
  notes: text("notes"),
});

export const draftPicks = sqliteTable("draft_picks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  year: integer("year").notNull(),
  round: integer("round").notNull(),
  number: integer("number"),
  originalTeamId: integer("original_team_id").references(() => teams.id),
  currentTeamId: integer("current_team_id").references(() => teams.id),
  playerId: integer("player_id").references(() => players.id),
});

export const acquisitions = sqliteTable("acquisitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id").notNull().references(() => players.id),
  teamId: integer("team_id").notNull().references(() => teams.id),
  acquisitionType: text("acquisition_type").notNull(), // 'trade' | 'draft' | 'signing' | 'waiver'
  date: text("date").notNull(),
  tradeId: integer("trade_id").references(() => trades.id),
  originTradeId: integer("origin_trade_id").references(() => trades.id),
  notes: text("notes"),
});

export const tradeChains = sqliteTable("trade_chains", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  originTradeId: integer("origin_trade_id").notNull().references(() => trades.id),
  resultingPlayerId: integer("resulting_player_id").references(() => players.id),
  chainJson: text("chain_json").notNull(),
});

// Types
export type Team = typeof teams.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type TradeAsset = typeof tradeAssets.$inferSelect;
export type DraftPick = typeof draftPicks.$inferSelect;
export type Acquisition = typeof acquisitions.$inferSelect;
export type TradeChain = typeof tradeChains.$inferSelect;

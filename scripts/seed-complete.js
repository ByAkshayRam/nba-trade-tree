#!/usr/bin/env node
/**
 * Complete seed script for NBA Trade Tree
 * Seeds: Celtics/Nets, James Harden journey, Luka/Trae swap
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'nba_trades.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Drop existing tables and recreate
console.log('Recreating tables...');
db.exec(`
  DROP TABLE IF EXISTS trade_chains;
  DROP TABLE IF EXISTS acquisitions;
  DROP TABLE IF EXISTS trade_assets;
  DROP TABLE IF EXISTS draft_picks;
  DROP TABLE IF EXISTS trades;
  DROP TABLE IF EXISTS players;
  DROP TABLE IF EXISTS teams;

  CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    abbreviation TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    primary_color TEXT,
    secondary_color TEXT,
    logo_url TEXT
  );

  CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    current_team_id INTEGER REFERENCES teams(id),
    draft_year INTEGER,
    draft_round INTEGER DEFAULT 1,
    draft_pick INTEGER,
    draft_team_id INTEGER REFERENCES teams(id),
    headshot_url TEXT,
    position TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    description TEXT,
    source_url TEXT,
    is_multi_team INTEGER DEFAULT 0,
    parent_trade_id INTEGER REFERENCES trades(id)
  );

  CREATE TABLE draft_picks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    round INTEGER NOT NULL,
    pick_number INTEGER,
    original_team_id INTEGER NOT NULL REFERENCES teams(id),
    current_team_id INTEGER NOT NULL REFERENCES teams(id),
    player_id INTEGER REFERENCES players(id),
    is_used INTEGER DEFAULT 0,
    protections TEXT,
    conveyed INTEGER DEFAULT 0,
    conveyed_year INTEGER
  );

  CREATE TABLE trade_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id INTEGER NOT NULL REFERENCES trades(id),
    team_from_id INTEGER NOT NULL REFERENCES teams(id),
    team_to_id INTEGER NOT NULL REFERENCES teams(id),
    asset_type TEXT NOT NULL,
    player_id INTEGER REFERENCES players(id),
    pick_id INTEGER REFERENCES draft_picks(id),
    description TEXT
  );

  CREATE TABLE acquisitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id),
    team_id INTEGER NOT NULL REFERENCES teams(id),
    acquisition_type TEXT NOT NULL,
    date TEXT NOT NULL,
    trade_id INTEGER REFERENCES trades(id),
    origin_trade_id INTEGER REFERENCES trades(id),
    pick_id INTEGER REFERENCES draft_picks(id),
    notes TEXT
  );

  CREATE TABLE trade_chains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin_trade_id INTEGER NOT NULL REFERENCES trades(id),
    resulting_player_id INTEGER REFERENCES players(id),
    resulting_pick_id INTEGER REFERENCES draft_picks(id),
    chain_json TEXT NOT NULL,
    branch_index INTEGER DEFAULT 0
  );
`);

// ============ TEAMS ============
console.log('Seeding teams...');
const insertTeam = db.prepare(`
  INSERT INTO teams (abbreviation, name, primary_color, secondary_color)
  VALUES (?, ?, ?, ?)
`);

const teams = [
  ['ATL', 'Atlanta Hawks', '#E03A3E', '#C1D32F'],
  ['BOS', 'Boston Celtics', '#007A33', '#BA9653'],
  ['BKN', 'Brooklyn Nets', '#000000', '#FFFFFF'],
  ['CLE', 'Cleveland Cavaliers', '#860038', '#FDBB30'],
  ['DAL', 'Dallas Mavericks', '#00538C', '#002B5E'],
  ['DEN', 'Denver Nuggets', '#0E2240', '#FEC524'],
  ['GSW', 'Golden State Warriors', '#1D428A', '#FFC72C'],
  ['HOU', 'Houston Rockets', '#CE1141', '#000000'],
  ['IND', 'Indiana Pacers', '#002D62', '#FDBB30'],
  ['LAC', 'LA Clippers', '#C8102E', '#1D428A'],
  ['LAL', 'Los Angeles Lakers', '#552583', '#FDB927'],
  ['MIA', 'Miami Heat', '#98002E', '#F9A01B'],
  ['MIN', 'Minnesota Timberwolves', '#0C2340', '#236192'],
  ['NOP', 'New Orleans Pelicans', '#0C2340', '#C8102E'],
  ['NYK', 'New York Knicks', '#006BB6', '#F58426'],
  ['OKC', 'Oklahoma City Thunder', '#007AC1', '#EF3B24'],
  ['ORL', 'Orlando Magic', '#0077C0', '#C4CED4'],
  ['PHI', 'Philadelphia 76ers', '#006BB6', '#ED174C'],
  ['PHX', 'Phoenix Suns', '#1D1160', '#E56020'],
  ['POR', 'Portland Trail Blazers', '#E03A3E', '#000000'],
  ['SAC', 'Sacramento Kings', '#5A2D81', '#63727A'],
  ['SAS', 'San Antonio Spurs', '#C4CED4', '#000000'],
  ['TOR', 'Toronto Raptors', '#CE1141', '#000000'],
  ['UTA', 'Utah Jazz', '#002B5C', '#00471B'],
  ['WAS', 'Washington Wizards', '#002B5C', '#E31837'],
];

const teamIds = {};
teams.forEach(([abbr, name, primary, secondary]) => {
  const result = insertTeam.run(abbr, name, primary, secondary);
  teamIds[abbr] = result.lastInsertRowid;
});

// ============ PLAYERS ============
console.log('Seeding players...');
const insertPlayer = db.prepare(`
  INSERT INTO players (name, current_team_id, draft_year, draft_round, draft_pick, draft_team_id, headshot_url, position, is_active)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const playerData = [
  // Celtics/Nets tree players
  ['Kevin Garnett', null, 1995, 1, 5, 'MIN', null, 'PF', 0],
  ['Paul Pierce', null, 1998, 1, 10, 'BOS', null, 'SF', 0],
  ['Jason Terry', null, 1999, 1, 10, 'ATL', null, 'PG', 0],
  ['James Young', null, 2014, 1, 17, 'BOS', null, 'SG', 0],
  ['Jaylen Brown', 'BOS', 2016, 1, 3, 'BOS', 'https://cdn.nba.com/headshots/nba/latest/1040x760/1627759.png', 'SG', 1],
  ['Jayson Tatum', 'BOS', 2017, 1, 3, 'BOS', 'https://cdn.nba.com/headshots/nba/latest/1040x760/1628369.png', 'SF', 1],
  ['Markelle Fultz', 'ORL', 2017, 1, 1, 'PHI', 'https://cdn.nba.com/headshots/nba/latest/1040x760/1628365.png', 'PG', 1],
  ['Kyrie Irving', 'DAL', 2011, 1, 1, 'CLE', 'https://cdn.nba.com/headshots/nba/latest/1040x760/202681.png', 'PG', 1],
  ['Isaiah Thomas', null, 2011, 2, 60, 'SAC', null, 'PG', 0],
  ['Ante Zizic', null, 2016, 1, 23, 'BOS', null, 'C', 0],
  ['Jae Crowder', 'MIL', 2012, 2, 34, 'CLE', null, 'SF', 1],
  ['Collin Sexton', 'UTA', 2018, 1, 8, 'CLE', 'https://cdn.nba.com/headshots/nba/latest/1040x760/1629012.png', 'PG', 1],

  // James Harden journey
  ['James Harden', 'LAC', 2009, 1, 3, 'OKC', 'https://cdn.nba.com/headshots/nba/latest/1040x760/201935.png', 'SG', 1],
  ['Kevin Martin', null, 2004, 1, 26, 'SAC', null, 'SG', 0],
  ['Jeremy Lamb', null, 2012, 1, 12, 'HOU', null, 'SG', 0],
  ['Steven Adams', 'HOU', 2013, 1, 12, 'OKC', 'https://cdn.nba.com/headshots/nba/latest/1040x760/203500.png', 'C', 1],
  ['Victor Oladipo', 'IND', 2013, 1, 2, 'ORL', 'https://cdn.nba.com/headshots/nba/latest/1040x760/203506.png', 'SG', 1],
  ['Domantas Sabonis', 'SAC', 2016, 1, 11, 'OKC', 'https://cdn.nba.com/headshots/nba/latest/1040x760/1627734.png', 'C', 1],
  ['Ben Simmons', 'BKN', 2016, 1, 1, 'PHI', 'https://cdn.nba.com/headshots/nba/latest/1040x760/1627732.png', 'PG', 1],
  ['Seth Curry', 'CHA', 2013, 2, 54, 'CLE', 'https://cdn.nba.com/headshots/nba/latest/1040x760/203552.png', 'SG', 1],
  ['Andre Drummond', null, 2012, 1, 9, 'DET', null, 'C', 0],

  // Luka/Trae swap
  ['Luka Doncic', 'DAL', 2018, 1, 3, 'ATL', 'https://cdn.nba.com/headshots/nba/latest/1040x760/1629029.png', 'PG', 1],
  ['Trae Young', 'ATL', 2018, 1, 5, 'DAL', 'https://cdn.nba.com/headshots/nba/latest/1040x760/1629027.png', 'PG', 1],
  ['Cam Reddish', 'LAL', 2019, 1, 10, 'ATL', 'https://cdn.nba.com/headshots/nba/latest/1040x760/1629629.png', 'SF', 1],

  // Additional players for more complete trees
  ['Derrick White', 'BOS', 2017, 1, 29, 'SAS', 'https://cdn.nba.com/headshots/nba/latest/1040x760/1628401.png', 'PG', 1],
  ['Al Horford', 'BOS', 2007, 1, 3, 'ATL', 'https://cdn.nba.com/headshots/nba/latest/1040x760/201143.png', 'C', 1],
  ['Kristaps Porzingis', 'BOS', 2015, 1, 4, 'NYK', 'https://cdn.nba.com/headshots/nba/latest/1040x760/204001.png', 'PF', 1],
  ['Chris Paul', 'SAS', 2005, 1, 4, 'NOP', 'https://cdn.nba.com/headshots/nba/latest/1040x760/101108.png', 'PG', 1],
  ['Russell Westbrook', 'DEN', 2008, 1, 4, 'OKC', 'https://cdn.nba.com/headshots/nba/latest/1040x760/201566.png', 'PG', 1],
  ['Kevin Durant', 'PHX', 2007, 1, 2, 'OKC', 'https://cdn.nba.com/headshots/nba/latest/1040x760/201142.png', 'SF', 1],
];

const playerIds = {};
playerData.forEach(([name, currentTeam, draftYear, draftRound, draftPick, draftTeam, headshot, position, isActive]) => {
  const result = insertPlayer.run(
    name,
    currentTeam ? teamIds[currentTeam] : null,
    draftYear,
    draftRound,
    draftPick,
    teamIds[draftTeam],
    headshot,
    position,
    isActive
  );
  playerIds[name] = result.lastInsertRowid;
});

// ============ TRADES ============
console.log('Seeding trades...');
const insertTrade = db.prepare(`
  INSERT INTO trades (date, description, is_multi_team, parent_trade_id)
  VALUES (?, ?, ?, ?)
`);

const tradeData = [
  // CELTICS/NETS TREE
  ['2013-07-12', 'Celtics trade Kevin Garnett, Paul Pierce, Jason Terry to Nets for 4 future first-round picks', 0, null],
  ['2017-06-22', 'Celtics trade #1 pick (Fultz) to 76ers for #3 pick (Tatum) and future first', 0, null],
  ['2017-08-22', 'Celtics trade Isaiah Thomas, Jae Crowder, Ante Zizic, 2018 BKN pick to Cavaliers for Kyrie Irving', 0, null],

  // HARDEN JOURNEY
  ['2012-10-27', 'Thunder trade James Harden, Cole Aldrich, Daequan Cook to Rockets for Kevin Martin, Jeremy Lamb, 2013 1st, 2013 2nd, future 1st', 0, null],
  ['2021-01-14', 'Rockets trade James Harden to Nets in 4-team deal for Ben Simmons, picks', 1, null],
  ['2022-02-10', 'Nets trade James Harden, Paul Millsap to 76ers for Ben Simmons, Seth Curry, Andre Drummond, 2 firsts', 0, null],
  ['2024-10-02', '76ers trade James Harden to Clippers for picks and players', 0, null],

  // LUKA/TRAE SWAP
  ['2018-06-21', 'Hawks trade #3 pick (Luka Doncic) to Mavericks for #5 pick (Trae Young) and future protected 1st', 0, null],

  // ADDITIONAL CONTEXT TRADES
  ['2022-02-10', 'Spurs trade Derrick White to Celtics for Romeo Langford, Josh Richardson, 2022 1st', 0, null],
  ['2016-07-08', 'Celtics sign Al Horford as free agent from Hawks', 0, null],
  ['2023-06-23', 'Celtics acquire Kristaps Porzingis from Wizards for Marcus Smart, picks', 0, null],
];

const tradeIds = {};
tradeData.forEach(([date, desc, isMulti, parentId], index) => {
  const result = insertTrade.run(date, desc, isMulti, parentId);
  tradeIds[index] = result.lastInsertRowid;
});

// ============ DRAFT PICKS ============
console.log('Seeding draft picks...');
const insertPick = db.prepare(`
  INSERT INTO draft_picks (year, round, pick_number, original_team_id, current_team_id, player_id, is_used, protections, conveyed, conveyed_year)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const pickData = [
  // Nets picks from Celtics trade
  [2014, 1, 17, 'BKN', 'BOS', 'James Young', 1, null, 1, 2014],
  [2016, 1, 3, 'BKN', 'BOS', 'Jaylen Brown', 1, null, 1, 2016],
  [2017, 1, 1, 'BKN', 'PHI', 'Markelle Fultz', 1, null, 1, 2017], // Traded to PHI
  [2018, 1, 8, 'BKN', 'CLE', 'Collin Sexton', 1, null, 1, 2018], // Traded to CLE

  // Sixers pick to Celtics
  [2017, 1, 3, 'PHI', 'BOS', 'Jayson Tatum', 1, null, 1, 2017],

  // Luka/Trae trade pick
  [2019, 1, 10, 'DAL', 'ATL', 'Cam Reddish', 1, 'Top-5 protected', 1, 2019],

  // Harden trade picks (some examples)
  [2013, 1, 12, 'TOR', 'OKC', 'Steven Adams', 1, null, 1, 2013],
  [2024, 1, null, 'PHI', 'LAC', null, 0, 'Top-6 protected', 0, null],
  [2026, 1, null, 'PHI', 'LAC', null, 0, 'Unprotected', 0, null],
];

const pickIds = {};
pickData.forEach(([year, round, number, origTeam, currTeam, playerName, isUsed, protections, conveyed, conveyedYear], index) => {
  const result = insertPick.run(
    year,
    round,
    number,
    teamIds[origTeam],
    teamIds[currTeam],
    playerName ? playerIds[playerName] : null,
    isUsed,
    protections,
    conveyed,
    conveyedYear
  );
  pickIds[`${year}-${round}-${origTeam}`] = result.lastInsertRowid;
});

// ============ TRADE ASSETS ============
console.log('Seeding trade assets...');
const insertAsset = db.prepare(`
  INSERT INTO trade_assets (trade_id, team_from_id, team_to_id, asset_type, player_id, pick_id, description)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Celtics/Nets Trade (tradeIds[0])
insertAsset.run(tradeIds[0], teamIds['BOS'], teamIds['BKN'], 'player', playerIds['Kevin Garnett'], null, null);
insertAsset.run(tradeIds[0], teamIds['BOS'], teamIds['BKN'], 'player', playerIds['Paul Pierce'], null, null);
insertAsset.run(tradeIds[0], teamIds['BOS'], teamIds['BKN'], 'player', playerIds['Jason Terry'], null, null);
insertAsset.run(tradeIds[0], teamIds['BKN'], teamIds['BOS'], 'pick', null, pickIds['2014-1-BKN'], '2014 1st round pick');
insertAsset.run(tradeIds[0], teamIds['BKN'], teamIds['BOS'], 'pick', null, pickIds['2016-1-BKN'], '2016 1st round pick');
insertAsset.run(tradeIds[0], teamIds['BKN'], teamIds['BOS'], 'pick', null, pickIds['2017-1-BKN'], '2017 1st round pick');
insertAsset.run(tradeIds[0], teamIds['BKN'], teamIds['BOS'], 'pick', null, pickIds['2018-1-BKN'], '2018 1st round pick');

// Fultz/Tatum trade (tradeIds[1])
insertAsset.run(tradeIds[1], teamIds['BOS'], teamIds['PHI'], 'pick', null, pickIds['2017-1-BKN'], '2017 #1 pick (via BKN)');
insertAsset.run(tradeIds[1], teamIds['PHI'], teamIds['BOS'], 'pick', null, pickIds['2017-1-PHI'], '2017 #3 pick');

// Kyrie trade (tradeIds[2])
insertAsset.run(tradeIds[2], teamIds['BOS'], teamIds['CLE'], 'player', playerIds['Isaiah Thomas'], null, null);
insertAsset.run(tradeIds[2], teamIds['BOS'], teamIds['CLE'], 'player', playerIds['Jae Crowder'], null, null);
insertAsset.run(tradeIds[2], teamIds['BOS'], teamIds['CLE'], 'player', playerIds['Ante Zizic'], null, null);
insertAsset.run(tradeIds[2], teamIds['BOS'], teamIds['CLE'], 'pick', null, pickIds['2018-1-BKN'], '2018 1st (via BKN)');
insertAsset.run(tradeIds[2], teamIds['CLE'], teamIds['BOS'], 'player', playerIds['Kyrie Irving'], null, null);

// Harden to Rockets (tradeIds[3])
insertAsset.run(tradeIds[3], teamIds['OKC'], teamIds['HOU'], 'player', playerIds['James Harden'], null, null);
insertAsset.run(tradeIds[3], teamIds['HOU'], teamIds['OKC'], 'player', playerIds['Kevin Martin'], null, null);
insertAsset.run(tradeIds[3], teamIds['HOU'], teamIds['OKC'], 'player', playerIds['Jeremy Lamb'], null, null);
insertAsset.run(tradeIds[3], teamIds['HOU'], teamIds['OKC'], 'pick', null, pickIds['2013-1-TOR'], '2013 1st (via TOR)');

// Luka/Trae swap (tradeIds[7])
insertAsset.run(tradeIds[7], teamIds['ATL'], teamIds['DAL'], 'player', playerIds['Luka Doncic'], null, '2018 #3 pick');
insertAsset.run(tradeIds[7], teamIds['DAL'], teamIds['ATL'], 'player', playerIds['Trae Young'], null, '2018 #5 pick');
insertAsset.run(tradeIds[7], teamIds['DAL'], teamIds['ATL'], 'pick', null, pickIds['2019-1-DAL'], '2019 1st (top-5 protected)');

// ============ ACQUISITIONS ============
console.log('Seeding acquisitions...');
const insertAcq = db.prepare(`
  INSERT INTO acquisitions (player_id, team_id, acquisition_type, date, trade_id, origin_trade_id, pick_id, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

// Jaylen Brown - drafted via Nets pick from Celtics/Nets trade
insertAcq.run(playerIds['Jaylen Brown'], teamIds['BOS'], 'draft', '2016-06-23', null, tradeIds[0], pickIds['2016-1-BKN'], 'Drafted #3 with Nets pick from KG/Pierce trade');

// Jayson Tatum - drafted via pick swap with PHI, originated from Celtics/Nets
insertAcq.run(playerIds['Jayson Tatum'], teamIds['BOS'], 'draft', '2017-06-22', tradeIds[1], tradeIds[0], pickIds['2017-1-PHI'], 'Drafted #3 after trading down from #1 (Nets pick)');

// James Young - drafted via Nets pick
insertAcq.run(playerIds['James Young'], teamIds['BOS'], 'draft', '2014-06-26', null, tradeIds[0], pickIds['2014-1-BKN'], 'Drafted #17 with Nets pick');

// Collin Sexton - drafted via Nets pick (traded to CLE)
insertAcq.run(playerIds['Collin Sexton'], teamIds['CLE'], 'draft', '2018-06-21', tradeIds[2], tradeIds[0], pickIds['2018-1-BKN'], 'Drafted #8 with Nets pick from Kyrie trade');

// Luka Doncic - traded on draft night
insertAcq.run(playerIds['Luka Doncic'], teamIds['DAL'], 'trade', '2018-06-21', tradeIds[7], tradeIds[7], null, 'Acquired from Hawks for Trae Young and future 1st');

// Trae Young - traded on draft night
insertAcq.run(playerIds['Trae Young'], teamIds['ATL'], 'trade', '2018-06-21', tradeIds[7], tradeIds[7], null, 'Acquired from Mavs for Luka Doncic');

// Cam Reddish - drafted via Mavs pick from Luka trade
insertAcq.run(playerIds['Cam Reddish'], teamIds['ATL'], 'draft', '2019-06-20', null, tradeIds[7], pickIds['2019-1-DAL'], 'Drafted #10 with Mavs pick from Luka trade');

// Steven Adams - drafted via pick from Harden trade
insertAcq.run(playerIds['Steven Adams'], teamIds['OKC'], 'draft', '2013-06-27', null, tradeIds[3], pickIds['2013-1-TOR'], 'Drafted #12 with pick from Harden trade');

// Kyrie Irving - traded
insertAcq.run(playerIds['Kyrie Irving'], teamIds['BOS'], 'trade', '2017-08-22', tradeIds[2], null, null, 'Acquired from Cavaliers');

// James Harden journey acquisitions
insertAcq.run(playerIds['James Harden'], teamIds['HOU'], 'trade', '2012-10-27', tradeIds[3], null, null, 'Acquired from Thunder');

// ============ TRADE CHAINS ============
console.log('Seeding trade chains...');
const insertChain = db.prepare(`
  INSERT INTO trade_chains (origin_trade_id, resulting_player_id, resulting_pick_id, chain_json, branch_index)
  VALUES (?, ?, ?, ?, ?)
`);

// Jaylen Brown chain (branch 0)
insertChain.run(tradeIds[0], playerIds['Jaylen Brown'], null, JSON.stringify([
  { event: 'Celtics trade KG, Pierce, Terry to Nets', date: '2013-07-12', action: 'Received 4 first-round picks', teamFrom: 'BOS', teamTo: 'BKN', assets: ['Kevin Garnett', 'Paul Pierce', 'Jason Terry'], received: ['2014 1st', '2016 1st', '2017 1st', '2018 1st'] },
  { event: 'Celtics draft Jaylen Brown #3', date: '2016-06-23', action: 'Used 2016 Nets pick', teamFrom: 'BKN', teamTo: 'BOS', assets: ['2016 1st (via BKN)'], received: ['Jaylen Brown'] }
]), 0);

// Jayson Tatum chain (branch 1)
insertChain.run(tradeIds[0], playerIds['Jayson Tatum'], null, JSON.stringify([
  { event: 'Celtics trade KG, Pierce, Terry to Nets', date: '2013-07-12', action: 'Received 4 first-round picks', teamFrom: 'BOS', teamTo: 'BKN', assets: ['Kevin Garnett', 'Paul Pierce', 'Jason Terry'], received: ['2014 1st', '2016 1st', '2017 1st', '2018 1st'] },
  { event: 'Celtics trade #1 to 76ers for #3', date: '2017-06-22', action: 'Moved down 2 spots', teamFrom: 'BOS', teamTo: 'PHI', assets: ['2017 #1 pick (Fultz)'], received: ['2017 #3 pick', '2019 SAC 1st'] },
  { event: 'Celtics draft Jayson Tatum #3', date: '2017-06-22', action: 'Selected with #3 pick', teamFrom: 'PHI', teamTo: 'BOS', assets: ['2017 #3 pick'], received: ['Jayson Tatum'] }
]), 1);

// Collin Sexton chain (branch 2 - via Kyrie trade)
insertChain.run(tradeIds[0], playerIds['Collin Sexton'], null, JSON.stringify([
  { event: 'Celtics trade KG, Pierce, Terry to Nets', date: '2013-07-12', action: 'Received 4 first-round picks', teamFrom: 'BOS', teamTo: 'BKN', assets: ['Kevin Garnett', 'Paul Pierce', 'Jason Terry'], received: ['2014 1st', '2016 1st', '2017 1st', '2018 1st'] },
  { event: 'Celtics trade IT, Crowder, 2018 pick for Kyrie', date: '2017-08-22', action: 'Sent 2018 Nets pick to Cleveland', teamFrom: 'BOS', teamTo: 'CLE', assets: ['Isaiah Thomas', 'Jae Crowder', 'Ante Zizic', '2018 1st (via BKN)'], received: ['Kyrie Irving'] },
  { event: 'Cavaliers draft Collin Sexton #8', date: '2018-06-21', action: 'Used 2018 Nets pick', teamFrom: 'BKN', teamTo: 'CLE', assets: ['2018 1st (via BKN)'], received: ['Collin Sexton'] }
]), 2);

// James Young chain (branch 3)
insertChain.run(tradeIds[0], playerIds['James Young'], null, JSON.stringify([
  { event: 'Celtics trade KG, Pierce, Terry to Nets', date: '2013-07-12', action: 'Received 4 first-round picks', teamFrom: 'BOS', teamTo: 'BKN', assets: ['Kevin Garnett', 'Paul Pierce', 'Jason Terry'], received: ['2014 1st', '2016 1st', '2017 1st', '2018 1st'] },
  { event: 'Celtics draft James Young #17', date: '2014-06-26', action: 'Used 2014 Nets pick', teamFrom: 'BKN', teamTo: 'BOS', assets: ['2014 1st (via BKN)'], received: ['James Young'] }
]), 3);

// Luka Doncic chain
insertChain.run(tradeIds[7], playerIds['Luka Doncic'], null, JSON.stringify([
  { event: 'Hawks draft Luka Doncic #3, trade to Mavs', date: '2018-06-21', action: 'Swapped for Trae Young + future 1st', teamFrom: 'ATL', teamTo: 'DAL', assets: ['2018 #3 pick (Luka Doncic)'], received: ['Trae Young', '2019 1st (top-5 protected)'] }
]), 0);

// Trae Young chain
insertChain.run(tradeIds[7], playerIds['Trae Young'], null, JSON.stringify([
  { event: 'Mavs draft Trae Young #5, trade to Hawks', date: '2018-06-21', action: 'Swapped for Luka Doncic', teamFrom: 'DAL', teamTo: 'ATL', assets: ['2018 #5 pick (Trae Young)', '2019 1st (top-5 protected)'], received: ['Luka Doncic'] }
]), 0);

// Cam Reddish chain (downstream from Luka trade)
insertChain.run(tradeIds[7], playerIds['Cam Reddish'], null, JSON.stringify([
  { event: 'Hawks trade Luka to Mavs for Trae + pick', date: '2018-06-21', action: 'Received 2019 top-5 protected 1st', teamFrom: 'ATL', teamTo: 'DAL', assets: ['Luka Doncic'], received: ['Trae Young', '2019 1st (top-5 protected)'] },
  { event: 'Hawks draft Cam Reddish #10', date: '2019-06-20', action: 'Used Mavs pick from Luka trade', teamFrom: 'DAL', teamTo: 'ATL', assets: ['2019 1st (via DAL)'], received: ['Cam Reddish'] }
]), 1);

// Steven Adams chain (from Harden trade)
insertChain.run(tradeIds[3], playerIds['Steven Adams'], null, JSON.stringify([
  { event: 'Thunder trade James Harden to Rockets', date: '2012-10-27', action: 'Received Kevin Martin, Jeremy Lamb, picks', teamFrom: 'OKC', teamTo: 'HOU', assets: ['James Harden'], received: ['Kevin Martin', 'Jeremy Lamb', '2013 1st (via TOR)', '2013 2nd'] },
  { event: 'Thunder draft Steven Adams #12', date: '2013-06-27', action: 'Used 2013 pick from Harden trade', teamFrom: 'TOR', teamTo: 'OKC', assets: ['2013 1st (via TOR)'], received: ['Steven Adams'] }
]), 0);

console.log('✅ Database seeded successfully!');
console.log(`   Teams: ${Object.keys(teamIds).length}`);
console.log(`   Players: ${Object.keys(playerIds).length}`);
console.log(`   Trades: ${Object.keys(tradeIds).length}`);

db.close();

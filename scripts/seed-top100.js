const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'nba_trades.db');
const db = new Database(dbPath);

// Add missing teams first
const missingTeams = [
  { abbr: 'CHA', name: 'Charlotte Hornets', primary: '#1D1160', secondary: '#00788C' },
  { abbr: 'DET', name: 'Detroit Pistons', primary: '#C8102E', secondary: '#1D42BA' },
  { abbr: 'MEM', name: 'Memphis Grizzlies', primary: '#5D76A9', secondary: '#12173F' },
  { abbr: 'CHI', name: 'Chicago Bulls', primary: '#CE1141', secondary: '#000000' }
];

const insertTeam = db.prepare(`
  INSERT OR IGNORE INTO teams (abbreviation, name, primary_color, secondary_color) 
  VALUES (?, ?, ?, ?)
`);

for (const team of missingTeams) {
  insertTeam.run(team.abbr, team.name, team.primary, team.secondary);
}

// Get all team IDs
const teams = {};
db.prepare('SELECT id, abbreviation FROM teams').all().forEach(t => {
  teams[t.abbreviation] = t.id;
});
console.log('Teams loaded:', Object.keys(teams).length);

// ESPN Top 100 players for 2025-26 season
// Format: [rank, name, team_abbr, position, draft_year, draft_pick, nba_player_id]
const top100 = [
  [1, 'Nikola Jokic', 'DEN', 'C', 2014, 41, 203999],
  [2, 'Shai Gilgeous-Alexander', 'OKC', 'G', 2018, 11, 1628983],
  [3, 'Luka Doncic', 'LAL', 'G', 2018, 3, 1629029],
  [4, 'Giannis Antetokounmpo', 'MIL', 'F', 2013, 15, 203507],
  [5, 'Victor Wembanyama', 'SAS', 'C', 2023, 1, 1641705],
  [6, 'Anthony Edwards', 'MIN', 'G', 2020, 1, 1630162],
  [7, 'Stephen Curry', 'GSW', 'G', 2009, 7, 201939],
  [8, 'LeBron James', 'LAL', 'F', 2003, 1, 2544],
  [9, 'Kevin Durant', 'HOU', 'F', 2007, 2, 201142],
  [10, 'Jalen Brunson', 'NYK', 'G', 2018, 33, 1628973],
  [11, 'Jalen Williams', 'OKC', 'G', 2022, 12, 1631114],
  [12, 'Cade Cunningham', 'DET', 'G', 2021, 1, 1630595],
  [13, 'Evan Mobley', 'CLE', 'F', 2021, 3, 1630596],
  [14, 'Anthony Davis', 'DAL', 'F', 2012, 1, 203076],
  [15, 'Donovan Mitchell', 'CLE', 'G', 2017, 13, 1628378],
  [16, 'Devin Booker', 'PHX', 'G', 2015, 13, 1626164],
  [17, 'Paolo Banchero', 'ORL', 'F', 2022, 1, 1631094],
  [18, 'Jimmy Butler', 'GSW', 'F', 2011, 30, 202710],
  [19, 'Jaylen Brown', 'BOS', 'G', 2016, 3, 1627759],
  [20, 'Kawhi Leonard', 'LAC', 'F', 2011, 15, 202695],
  [21, 'Bam Adebayo', 'MIA', 'C', 2017, 14, 1628389],
  [22, 'Pascal Siakam', 'IND', 'F', 2016, 27, 1627783],
  [23, 'James Harden', 'LAC', 'G', 2009, 3, 201935],
  [24, 'Chet Holmgren', 'OKC', 'C', 2022, 2, 1631096],
  [25, 'Alperen Sengun', 'HOU', 'C', 2021, 16, 1630578],
  [26, 'Derrick White', 'BOS', 'G', 2017, 29, 1628401],
  [27, 'Karl-Anthony Towns', 'NYK', 'C', 2015, 1, 1626157],
  [28, 'Tyrese Maxey', 'PHI', 'G', 2020, 21, 1630178],
  [29, 'Trae Young', 'ATL', 'G', 2018, 5, 1629027],
  [30, 'Scottie Barnes', 'TOR', 'F', 2021, 4, 1630567],
  [31, 'Jaren Jackson Jr.', 'MEM', 'F', 2018, 4, 1628991],
  [32, 'Franz Wagner', 'ORL', 'F', 2021, 8, 1630532],
  [33, 'Ja Morant', 'MEM', 'G', 2019, 2, 1629630],
  [34, 'Domantas Sabonis', 'SAC', 'C', 2016, 11, 1627734],
  [35, 'De\'Aaron Fox', 'SAS', 'G', 2017, 5, 1628368],
  [36, 'Ivica Zubac', 'LAC', 'C', 2016, 32, 1627826],
  [37, 'Amen Thompson', 'HOU', 'G', 2023, 4, 1641706],
  [38, 'Darius Garland', 'CLE', 'G', 2019, 5, 1629636],
  [39, 'Desmond Bane', 'ORL', 'G', 2020, 30, 1630217],
  [40, 'Aaron Gordon', 'DEN', 'F', 2014, 4, 203932],
  [41, 'OG Anunoby', 'NYK', 'F', 2017, 23, 1628384],
  [42, 'Julius Randle', 'MIN', 'F', 2014, 7, 203944],
  [43, 'Lauri Markkanen', 'UTA', 'F', 2017, 7, 1628374],
  [44, 'Jalen Johnson', 'ATL', 'F', 2021, 20, 1630552],
  [45, 'Jarrett Allen', 'CLE', 'C', 2017, 22, 1628386],
  [46, 'Jamal Murray', 'DEN', 'G', 2016, 7, 1627750],
  [47, 'Joel Embiid', 'PHI', 'C', 2014, 3, 203954],
  [48, 'Mikal Bridges', 'NYK', 'F', 2018, 10, 1628969],
  [49, 'Rudy Gobert', 'MIN', 'C', 2013, 27, 203497],
  [50, 'Kristaps Porzingis', 'ATL', 'C', 2015, 4, 204001],
  [51, 'Draymond Green', 'GSW', 'F', 2012, 35, 203110],
  [52, 'Cooper Flagg', 'DAL', 'F', 2025, 1, 1642280],
  [53, 'Alex Caruso', 'OKC', 'G', 2016, null, 1627936],
  [54, 'Paul George', 'PHI', 'F', 2010, 10, 202331],
  [55, 'Dyson Daniels', 'ATL', 'G', 2022, 8, 1631100],
  [56, 'Isaiah Hartenstein', 'OKC', 'C', 2017, 43, 1628392],
  [57, 'Myles Turner', 'MIL', 'C', 2015, 11, 1626167],
  [58, 'Trey Murphy III', 'NOP', 'F', 2021, 17, 1630530],
  [59, 'Jalen Suggs', 'ORL', 'G', 2021, 5, 1630591],
  [60, 'Austin Reaves', 'LAL', 'G', 2021, null, 1630559],
  [61, 'Zion Williamson', 'NOP', 'F', 2019, 1, 1629627],
  [62, 'Christian Braun', 'DEN', 'G', 2022, 21, 1631128],
  [63, 'LaMelo Ball', 'CHA', 'G', 2020, 3, 1630163],
  [64, 'Luguentz Dort', 'OKC', 'G', 2019, null, 1629652],
  [65, 'Aaron Nesmith', 'IND', 'F', 2020, 14, 1630174],
  [66, 'Deni Avdija', 'POR', 'F', 2020, 9, 1630166],
  [67, 'Cameron Johnson', 'DEN', 'F', 2019, 11, 1629661],
  [68, 'Tyler Herro', 'MIA', 'G', 2019, 13, 1629639],
  [69, 'Josh Hart', 'NYK', 'G', 2017, 30, 1628404],
  [70, 'Michael Porter Jr.', 'BKN', 'F', 2018, 14, 1629008],
  [71, 'Coby White', 'CHI', 'G', 2019, 7, 1629632],
  [72, 'Zach LaVine', 'SAC', 'G', 2014, 13, 203897],
  [73, 'Dereck Lively II', 'DAL', 'C', 2023, 12, 1641707],
  [74, 'Jabari Smith Jr.', 'HOU', 'F', 2022, 3, 1631095],
  [75, 'Jaden McDaniels', 'MIN', 'F', 2020, 28, 1630183],
  [76, 'Brandon Miller', 'CHA', 'F', 2023, 2, 1641708],
  [77, 'Brandon Ingram', 'TOR', 'F', 2016, 2, 1627742],
  [78, 'Toumani Camara', 'POR', 'F', 2023, 52, 1631219],
  [79, 'Onyeka Okongwu', 'ATL', 'C', 2020, 6, 1630168],
  [80, 'DeMar DeRozan', 'SAC', 'G', 2009, 9, 201942],
  [81, 'Andrew Nembhard', 'IND', 'G', 2022, 31, 1631106],
  [82, 'Norman Powell', 'MIA', 'G', 2015, 46, 1626181],
  [83, 'Jonathan Kuminga', 'GSW', 'F', 2021, 7, 1630228],
  [84, 'Tobias Harris', 'DET', 'F', 2011, 19, 202699],
  [85, 'Jaden Ivey', 'DET', 'G', 2022, 5, 1631093],
  [86, 'Bradley Beal', 'LAC', 'G', 2012, 3, 203078],
  [87, 'Jonas Valanciunas', 'DEN', 'C', 2011, 5, 202685],
  [88, 'Zach Edey', 'MEM', 'C', 2024, 9, 1642259],
  [89, 'Andrew Wiggins', 'MIA', 'F', 2014, 1, 203952],
  [90, 'Naz Reid', 'MIN', 'C', 2019, null, 1629675],
  [91, 'Jrue Holiday', 'POR', 'G', 2009, 17, 201950],
  [92, 'Mitchell Robinson', 'NYK', 'C', 2018, 36, 1629011],
  [93, 'Jakob Poeltl', 'TOR', 'C', 2016, 9, 1627751],
  [94, 'Devin Vassell', 'SAS', 'G', 2020, 11, 1630170],
  [95, 'P.J. Washington', 'DAL', 'F', 2019, 12, 1629023],
  [96, 'Nickeil Alexander-Walker', 'ATL', 'G', 2019, 17, 1629638],
  [97, 'Payton Pritchard', 'BOS', 'G', 2020, 26, 1630202],
  [98, 'Walker Kessler', 'UTA', 'C', 2022, 22, 1631117],
  [99, 'Stephon Castle', 'SAS', 'G', 2024, 4, 1642261],
  [100, 'RJ Barrett', 'TOR', 'F', 2019, 3, 1629628]
];

// Add MIL team if missing
const insertMilTeam = db.prepare(`
  INSERT OR IGNORE INTO teams (abbreviation, name, primary_color, secondary_color) 
  VALUES ('MIL', 'Milwaukee Bucks', '#00471B', '#EEE1C6')
`);
insertMilTeam.run();

// Refresh teams
db.prepare('SELECT id, abbreviation FROM teams').all().forEach(t => {
  teams[t.abbreviation] = t.id;
});

console.log('Teams after update:', teams);

// Helper to get or create player
const getPlayer = db.prepare('SELECT id FROM players WHERE name = ?');
const insertPlayer = db.prepare(`
  INSERT INTO players (name, current_team_id, draft_year, draft_pick, headshot_url, position, is_active)
  VALUES (?, ?, ?, ?, ?, ?, 1)
`);
const updatePlayer = db.prepare(`
  UPDATE players SET current_team_id = ?, draft_year = ?, draft_pick = ?, headshot_url = ?, position = ?
  WHERE id = ?
`);

// Insert or update all 100 players
let added = 0, updated = 0;

for (const [rank, name, teamAbbr, position, draftYear, draftPick, nbaId] of top100) {
  const teamId = teams[teamAbbr];
  if (!teamId) {
    console.error(`Missing team: ${teamAbbr} for ${name}`);
    continue;
  }
  
  const headshot = nbaId ? `https://cdn.nba.com/headshots/nba/latest/1040x760/${nbaId}.png` : null;
  
  const existing = getPlayer.get(name);
  if (existing) {
    updatePlayer.run(teamId, draftYear, draftPick, headshot, position, existing.id);
    updated++;
  } else {
    insertPlayer.run(name, teamId, draftYear, draftPick, headshot, position);
    added++;
  }
}

console.log(`Players added: ${added}, updated: ${updated}`);

// Get all player IDs now
const players = {};
db.prepare('SELECT id, name FROM players').all().forEach(p => {
  players[p.name] = p.id;
});

// Add acquisitions for key players
const insertAcquisition = db.prepare(`
  INSERT OR IGNORE INTO acquisitions (player_id, team_id, acquisition_type, date, notes)
  VALUES (?, ?, ?, ?, ?)
`);

// Key acquisitions to add
const acquisitions = [
  // Jokic - Drafted by Denver
  ['Nikola Jokic', 'DEN', 'draft', '2014-06-26', 'Drafted 41st overall by Denver Nuggets'],
  // SGA - Traded to OKC
  ['Shai Gilgeous-Alexander', 'OKC', 'trade', '2019-07-10', 'Acquired from Clippers in Paul George trade'],
  // Luka - Now on Lakers
  ['Luka Doncic', 'LAL', 'trade', '2025-01-15', 'Blockbuster trade from Dallas Mavericks'],
  // Giannis - Drafted by Milwaukee
  ['Giannis Antetokounmpo', 'MIL', 'draft', '2013-06-27', 'Drafted 15th overall by Milwaukee Bucks'],
  // Wemby - Drafted by Spurs
  ['Victor Wembanyama', 'SAS', 'draft', '2023-06-22', 'Drafted 1st overall by San Antonio Spurs'],
  // Ant - Drafted by Minnesota
  ['Anthony Edwards', 'MIN', 'draft', '2020-11-18', 'Drafted 1st overall by Minnesota Timberwolves'],
  // Curry - Drafted by Warriors  
  ['Stephen Curry', 'GSW', 'draft', '2009-06-25', 'Drafted 7th overall by Golden State Warriors'],
  // LeBron - With Lakers
  ['LeBron James', 'LAL', 'signing', '2018-07-01', 'Signed as free agent from Cleveland'],
  // KD - Now on Houston
  ['Kevin Durant', 'HOU', 'trade', '2025-07-15', 'Traded from Phoenix Suns to Houston Rockets'],
  // Brunson - Signed with Knicks
  ['Jalen Brunson', 'NYK', 'signing', '2022-07-12', 'Signed as free agent from Dallas'],
  // Jimmy Butler - Now with Warriors
  ['Jimmy Butler', 'GSW', 'trade', '2026-02-05', 'Trade deadline deal from Miami Heat'],
  // KAT - Traded to Knicks
  ['Karl-Anthony Towns', 'NYK', 'trade', '2024-09-28', 'Traded from Timberwolves for Julius Randle, Donte DiVincenzo, picks'],
  // Donovan Mitchell - Traded to Cavs
  ['Donovan Mitchell', 'CLE', 'trade', '2022-09-01', 'Traded from Utah Jazz for Collin Sexton, Lauri Markkanen, picks'],
  // Anthony Davis - Now on Dallas
  ['Anthony Davis', 'DAL', 'trade', '2025-01-15', 'Part of Luka Doncic blockbuster trade from Lakers'],
  // Porzingis - Now on Hawks
  ['Kristaps Porzingis', 'ATL', 'trade', '2025-06-27', 'Traded from Celtics to Hawks'],
  // James Harden - Now on Clippers
  ['James Harden', 'LAC', 'trade', '2023-11-01', 'Sign-and-trade from Philadelphia 76ers'],
  // Cooper Flagg - 2025 Draft
  ['Cooper Flagg', 'DAL', 'draft', '2025-06-26', 'Drafted 1st overall by Dallas Mavericks'],
  // Chet Holmgren - Drafted by OKC
  ['Chet Holmgren', 'OKC', 'draft', '2022-06-23', 'Drafted 2nd overall by Oklahoma City Thunder'],
  // Pascal Siakam - Traded to Pacers
  ['Pascal Siakam', 'IND', 'trade', '2024-01-16', 'Traded from Toronto Raptors'],
  // De\'Aaron Fox - Traded to Spurs
  ['De\'Aaron Fox', 'SAS', 'trade', '2025-02-06', 'Traded from Sacramento Kings for picks'],
  // Zach LaVine - Traded to Kings
  ['Zach LaVine', 'SAC', 'trade', '2025-02-06', 'Traded from Chicago Bulls'],
  // Michael Porter Jr. - Traded to Nets
  ['Michael Porter Jr.', 'BKN', 'trade', '2025-02-06', 'Traded from Denver Nuggets'],
  // Jrue Holiday - Now on Blazers
  ['Jrue Holiday', 'POR', 'trade', '2025-02-06', 'Traded from Boston Celtics'],
  // Brandon Ingram - Traded to Raptors
  ['Brandon Ingram', 'TOR', 'trade', '2025-02-06', 'Traded from New Orleans Pelicans'],
  // Andrew Wiggins - Traded to Heat
  ['Andrew Wiggins', 'MIA', 'trade', '2025-02-06', 'Traded from Golden State Warriors'],
  // Myles Turner - Traded to Bucks
  ['Myles Turner', 'MIL', 'trade', '2025-02-06', 'Traded from Indiana Pacers'],
  // Norman Powell - Signed with Heat
  ['Norman Powell', 'MIA', 'signing', '2025-07-01', 'Signed as free agent']
];

let acqAdded = 0;
for (const [playerName, teamAbbr, acqType, date, notes] of acquisitions) {
  const playerId = players[playerName];
  const teamId = teams[teamAbbr];
  if (playerId && teamId) {
    try {
      insertAcquisition.run(playerId, teamId, acqType, date, notes);
      acqAdded++;
    } catch (e) {
      // Ignore duplicates
    }
  }
}
console.log(`Acquisitions added: ${acqAdded}`);

// Add major trade chains
const insertTradeChain = db.prepare(`
  INSERT INTO trade_chains (origin_trade_id, resulting_player_id, chain_json)
  VALUES (?, ?, ?)
`);

// Insert trades for context
const insertTrade = db.prepare(`
  INSERT INTO trades (date, description) VALUES (?, ?)
`);

const majorTrades = [
  ['2025-01-15', 'Mavericks trade Luka Doncic to Lakers for Anthony Davis, Austin Reaves, draft picks'],
  ['2026-02-05', 'Heat trade Jimmy Butler to Warriors for Jonathan Kuminga, picks'],
  ['2025-02-06', 'Trade deadline: Multiple team trades reshaping the league'],
  ['2019-07-10', 'Clippers trade Shai Gilgeous-Alexander to Thunder in Paul George deal'],
  ['2024-09-28', 'Timberwolves trade Karl-Anthony Towns to Knicks for Julius Randle package']
];

for (const [date, desc] of majorTrades) {
  try {
    insertTrade.run(date, desc);
  } catch(e) {}
}

// Add trade chains for key players
const tradeChains = [
  {
    player: 'Luka Doncic',
    chain: [
      {event: 'Hawks draft Luka Doncic #3, trade to Mavs', date: '2018-06-21', action: 'Swapped for Trae Young + future 1st', teamFrom: 'ATL', teamTo: 'DAL'},
      {event: 'Mavericks trade Luka to Lakers', date: '2025-01-15', action: 'Blockbuster trade for Anthony Davis package', teamFrom: 'DAL', teamTo: 'LAL'}
    ]
  },
  {
    player: 'Jimmy Butler',
    chain: [
      {event: 'Drafted by Chicago Bulls', date: '2011-06-23', action: 'Selected 30th overall', teamFrom: 'CHI', teamTo: 'CHI'},
      {event: 'Bulls trade Butler to Timberwolves', date: '2017-06-22', action: 'Traded for LaVine, Dunn, Markkanen', teamFrom: 'CHI', teamTo: 'MIN'},
      {event: 'Timberwolves trade Butler to 76ers', date: '2018-11-12', action: 'Traded for Covington, Saric, picks', teamFrom: 'MIN', teamTo: 'PHI'},
      {event: 'Butler signs with Heat', date: '2019-07-06', action: '4-year max contract', teamFrom: 'PHI', teamTo: 'MIA'},
      {event: 'Heat trade Butler to Warriors', date: '2026-02-05', action: 'Trade deadline deal', teamFrom: 'MIA', teamTo: 'GSW'}
    ]
  },
  {
    player: 'Anthony Davis',
    chain: [
      {event: 'Drafted by New Orleans Hornets', date: '2012-06-28', action: 'Selected 1st overall', teamFrom: 'NOP', teamTo: 'NOP'},
      {event: 'Pelicans trade Davis to Lakers', date: '2019-06-15', action: 'Traded for Ball, Ingram, Hart, picks', teamFrom: 'NOP', teamTo: 'LAL'},
      {event: 'Lakers trade Davis to Mavericks', date: '2025-01-15', action: 'Part of Luka Doncic blockbuster', teamFrom: 'LAL', teamTo: 'DAL'}
    ]
  },
  {
    player: 'Shai Gilgeous-Alexander',
    chain: [
      {event: 'Drafted by Charlotte Hornets', date: '2018-06-21', action: 'Selected 11th overall, traded to Clippers', teamFrom: 'CHA', teamTo: 'LAC'},
      {event: 'Clippers trade SGA to Thunder', date: '2019-07-10', action: 'Part of Paul George trade package', teamFrom: 'LAC', teamTo: 'OKC'}
    ]
  },
  {
    player: 'Kevin Durant',
    chain: [
      {event: 'Drafted by Seattle SuperSonics', date: '2007-06-28', action: 'Selected 2nd overall', teamFrom: 'OKC', teamTo: 'OKC'},
      {event: 'Durant signs with Warriors', date: '2016-07-07', action: 'Free agent signing', teamFrom: 'OKC', teamTo: 'GSW'},
      {event: 'Durant signs with Nets', date: '2019-07-07', action: 'Free agent signing', teamFrom: 'GSW', teamTo: 'BKN'},
      {event: 'Nets trade Durant to Suns', date: '2023-02-09', action: 'Trade for Bridges, picks', teamFrom: 'BKN', teamTo: 'PHX'},
      {event: 'Suns trade Durant to Rockets', date: '2025-07-15', action: 'Trade for young core + picks', teamFrom: 'PHX', teamTo: 'HOU'}
    ]
  },
  {
    player: 'James Harden',
    chain: [
      {event: 'Drafted by Oklahoma City Thunder', date: '2009-06-25', action: 'Selected 3rd overall', teamFrom: 'OKC', teamTo: 'OKC'},
      {event: 'Thunder trade Harden to Rockets', date: '2012-10-27', action: 'Traded for Martin, Lamb, picks', teamFrom: 'OKC', teamTo: 'HOU'},
      {event: 'Rockets trade Harden to Nets', date: '2021-01-14', action: '4-team trade', teamFrom: 'HOU', teamTo: 'BKN'},
      {event: 'Nets trade Harden to 76ers', date: '2022-02-10', action: 'Traded for Ben Simmons package', teamFrom: 'BKN', teamTo: 'PHI'},
      {event: 'Harden signs with Clippers', date: '2023-11-01', action: 'Sign-and-trade from 76ers', teamFrom: 'PHI', teamTo: 'LAC'}
    ]
  },
  {
    player: 'Karl-Anthony Towns',
    chain: [
      {event: 'Drafted by Minnesota Timberwolves', date: '2015-06-25', action: 'Selected 1st overall', teamFrom: 'MIN', teamTo: 'MIN'},
      {event: 'Timberwolves trade KAT to Knicks', date: '2024-09-28', action: 'Traded for Randle, DiVincenzo, picks', teamFrom: 'MIN', teamTo: 'NYK'}
    ]
  }
];

// Get a trade ID to reference (use the first one)
const tradeId = db.prepare('SELECT id FROM trades ORDER BY id DESC LIMIT 1').get()?.id || 1;

for (const tc of tradeChains) {
  const playerId = players[tc.player];
  if (playerId) {
    try {
      insertTradeChain.run(tradeId, playerId, JSON.stringify(tc.chain));
    } catch(e) {}
  }
}

console.log('Trade chains added');

// Final count
const playerCount = db.prepare('SELECT COUNT(*) as count FROM players').get().count;
const acqCount = db.prepare('SELECT COUNT(*) as count FROM acquisitions').get().count;
const chainCount = db.prepare('SELECT COUNT(*) as count FROM trade_chains').get().count;

console.log(`\n=== FINAL COUNTS ===`);
console.log(`Players: ${playerCount}`);
console.log(`Acquisitions: ${acqCount}`);
console.log(`Trade Chains: ${chainCount}`);

db.close();
console.log('\nDone!');

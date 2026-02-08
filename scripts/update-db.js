const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'nba_trades.db');
const db = new Database(dbPath);

// Helper to get team ID by abbreviation
function getTeamId(abbr) {
  const team = db.prepare('SELECT id FROM teams WHERE abbreviation = ?').get(abbr);
  return team ? team.id : null;
}

// Helper to get player by name
function getPlayerByName(name) {
  return db.prepare('SELECT * FROM players WHERE name = ?').get(name);
}

// Step 1: Remove duplicate players (keep lower ID)
console.log('=== Removing duplicate players ===');

const duplicates = db.prepare(`
  SELECT name, MIN(id) as keep_id, GROUP_CONCAT(id) as all_ids
  FROM players
  GROUP BY name
  HAVING COUNT(*) > 1
`).all();

for (const dup of duplicates) {
  const ids = dup.all_ids.split(',').map(Number);
  const toDelete = ids.filter(id => id !== dup.keep_id);
  console.log(`Removing duplicates for ${dup.name}: keeping ID ${dup.keep_id}, deleting ${toDelete.join(', ')}`);
  
  // Delete from trade_chains
  db.prepare(`DELETE FROM trade_chains WHERE resulting_player_id IN (${toDelete.join(',')})`).run();
  
  // Delete from acquisitions
  db.prepare(`DELETE FROM acquisitions WHERE player_id IN (${toDelete.join(',')})`).run();
  
  // Delete from players
  db.prepare(`DELETE FROM players WHERE id IN (${toDelete.join(',')})`).run();
}

// Step 2: Add new trades from Feb 2026 deadline
console.log('\n=== Adding new trades ===');

// Check if trades already exist
const existingTrades = db.prepare("SELECT * FROM trades WHERE date >= '2026-02-01'").all();
console.log('Existing Feb 2026 trades:', existingTrades.length);

// Trade: Harden to Cavs (if not exists)
const hardenTrade = db.prepare("SELECT * FROM trades WHERE description LIKE '%Harden%' AND description LIKE '%Cavaliers%'").get();
if (!hardenTrade) {
  const result = db.prepare(`
    INSERT INTO trades (date, description, source_url)
    VALUES ('2026-02-05', 'Clippers trade James Harden to Cavaliers for Darius Garland', 'https://www.hoopsrumors.com/2026/02/2026-nba-trade-deadline-recap.html')
  `).run();
  console.log('Added Harden to Cavs trade, ID:', result.lastInsertRowid);
}

// Trade: Anthony Davis to Wizards
const adTrade = db.prepare("SELECT * FROM trades WHERE description LIKE '%Anthony Davis%' AND description LIKE '%Wizards%'").get();
if (!adTrade) {
  const result = db.prepare(`
    INSERT INTO trades (date, description, source_url)
    VALUES ('2026-02-05', 'Mavericks trade Anthony Davis to Wizards for draft picks and players', 'https://www.hoopsrumors.com/2026/02/2026-nba-trade-deadline-recap.html')
  `).run();
  console.log('Added AD to Wizards trade, ID:', result.lastInsertRowid);
}

// Trade: Kristaps Porzingis to Warriors
const kpTrade = db.prepare("SELECT * FROM trades WHERE description LIKE '%Porzingis%' AND description LIKE '%Warriors%'").get();
if (!kpTrade) {
  const result = db.prepare(`
    INSERT INTO trades (date, description, source_url)
    VALUES ('2026-02-05', 'Hawks trade Kristaps Porzingis to Warriors for Jonathan Kuminga and Buddy Hield', 'https://www.hoopsrumors.com/2026/02/2026-nba-trade-deadline-recap.html')
  `).run();
  console.log('Added Porzingis to Warriors trade, ID:', result.lastInsertRowid);
}

// Trade: Jimmy Butler to Warriors
const butlerTrade = db.prepare("SELECT * FROM trades WHERE description LIKE '%Jimmy Butler%' AND description LIKE '%Warriors%'").get();
if (!butlerTrade) {
  const result = db.prepare(`
    INSERT INTO trades (date, description, source_url)
    VALUES ('2026-02-05', 'Heat trade Jimmy Butler to Warriors', 'https://www.nba.com/news/2025-26-nba-trade-tracker')
  `).run();
  console.log('Added Butler to Warriors trade, ID:', result.lastInsertRowid);
}

// Step 3: Update player current teams
console.log('\n=== Updating player current teams ===');

const teamUpdates = [
  { name: 'Trae Young', team: 'WAS' },
  { name: 'Anthony Davis', team: 'WAS' },
  { name: 'James Harden', team: 'CLE' },
  { name: 'Luka Doncic', team: 'LAL' },
  { name: 'Jimmy Butler', team: 'GSW' },
  { name: 'Anthony Edwards', team: 'MIN' },
  { name: 'Bam Adebayo', team: 'MIA' },
  { name: 'Cade Cunningham', team: 'DET' },
  { name: 'Damian Lillard', team: 'MIL' },
  { name: "De'Aaron Fox", team: 'SAC' },
  { name: 'Devin Booker', team: 'PHX' },
  { name: 'Donovan Mitchell', team: 'CLE' },
  { name: 'Giannis Antetokounmpo', team: 'MIL' },
  { name: 'Ja Morant', team: 'MEM' },
  { name: 'Joel Embiid', team: 'PHI' },
  { name: 'Kawhi Leonard', team: 'LAC' },
  { name: 'Kevin Durant', team: 'PHX' },
  { name: 'LeBron James', team: 'LAL' },
  { name: 'Nikola Jokic', team: 'DEN' },
  { name: 'Shai Gilgeous-Alexander', team: 'OKC' },
  { name: 'Stephen Curry', team: 'GSW' },
  { name: 'Victor Wembanyama', team: 'SAS' },
  { name: 'Zion Williamson', team: 'NOP' },
];

for (const update of teamUpdates) {
  const teamId = getTeamId(update.team);
  const player = getPlayerByName(update.name);
  
  if (player && teamId) {
    const currentTeamAbbr = db.prepare('SELECT abbreviation FROM teams WHERE id = ?').get(player.current_team_id);
    if (currentTeamAbbr?.abbreviation !== update.team) {
      db.prepare('UPDATE players SET current_team_id = ? WHERE id = ?').run(teamId, player.id);
      console.log(`Updated ${update.name}: ${currentTeamAbbr?.abbreviation || 'NULL'} → ${update.team}`);
    } else {
      console.log(`${update.name}: Already on ${update.team}`);
    }
  } else if (!player) {
    console.log(`Player not found: ${update.name}`);
  } else if (!teamId) {
    console.log(`Team not found: ${update.team}`);
  }
}

// Step 4: Add acquisitions for newly traded players
console.log('\n=== Updating acquisitions ===');

// Harden to Cavs
const hardenPlayer = getPlayerByName('James Harden');
const hardenTradeId = db.prepare("SELECT id FROM trades WHERE description LIKE '%Harden%' AND description LIKE '%Cavaliers%'").get();
if (hardenPlayer && hardenTradeId) {
  const existingAcq = db.prepare('SELECT * FROM acquisitions WHERE player_id = ? AND team_id = ?')
    .get(hardenPlayer.id, getTeamId('CLE'));
  if (!existingAcq) {
    db.prepare(`
      INSERT INTO acquisitions (player_id, team_id, acquisition_type, date, trade_id, notes)
      VALUES (?, ?, 'trade', '2026-02-05', ?, 'Traded from Clippers')
    `).run(hardenPlayer.id, getTeamId('CLE'), hardenTradeId.id);
    console.log('Added Harden to Cavs acquisition');
  }
}

// AD to Wizards
const adPlayer = getPlayerByName('Anthony Davis');
const adTradeId = db.prepare("SELECT id FROM trades WHERE description LIKE '%Anthony Davis%' AND description LIKE '%Wizards%'").get();
if (adPlayer && adTradeId) {
  const existingAcq = db.prepare('SELECT * FROM acquisitions WHERE player_id = ? AND team_id = ?')
    .get(adPlayer.id, getTeamId('WAS'));
  if (!existingAcq) {
    db.prepare(`
      INSERT INTO acquisitions (player_id, team_id, acquisition_type, date, trade_id, origin_trade_id, notes)
      VALUES (?, ?, 'trade', '2026-02-05', ?, ?, 'Traded from Mavericks')
    `).run(adPlayer.id, getTeamId('WAS'), adTradeId.id, adTradeId.id);
    console.log('Added AD to Wizards acquisition');
  }
}

// Butler to Warriors
const butlerPlayer = getPlayerByName('Jimmy Butler');
const butlerTradeId = db.prepare("SELECT id FROM trades WHERE description LIKE '%Jimmy Butler%' AND description LIKE '%Warriors%'").get();
if (butlerPlayer && butlerTradeId) {
  const existingAcq = db.prepare('SELECT * FROM acquisitions WHERE player_id = ? AND team_id = ?')
    .get(butlerPlayer.id, getTeamId('GSW'));
  if (!existingAcq) {
    db.prepare(`
      INSERT INTO acquisitions (player_id, team_id, acquisition_type, date, trade_id, origin_trade_id, notes)
      VALUES (?, ?, 'trade', '2026-02-05', ?, ?, 'Traded from Heat')
    `).run(butlerPlayer.id, getTeamId('GSW'), butlerTradeId.id, butlerTradeId.id);
    console.log('Added Butler to Warriors acquisition');
  }
}

// Trae Young to Wizards
const traePlayer = getPlayerByName('Trae Young');
const traeTrade = db.prepare("SELECT id FROM trades WHERE description LIKE '%Trae Young%' AND description LIKE '%Wizards%'").get();
if (traePlayer && traeTrade) {
  const existingAcq = db.prepare('SELECT * FROM acquisitions WHERE player_id = ? AND team_id = ?')
    .get(traePlayer.id, getTeamId('WAS'));
  if (!existingAcq) {
    db.prepare(`
      INSERT INTO acquisitions (player_id, team_id, acquisition_type, date, trade_id, origin_trade_id, notes)
      VALUES (?, ?, 'trade', '2026-01-15', ?, ?, 'Traded from Hawks')
    `).run(traePlayer.id, getTeamId('WAS'), traeTrade.id, traeTrade.id);
    console.log('Added Trae Young to Wizards acquisition');
  }
}

// Luka Doncic to Lakers
const lukaPlayer = getPlayerByName('Luka Doncic');
const lukaTrade = db.prepare("SELECT id FROM trades WHERE description LIKE '%Luka Doncic%' AND description LIKE '%Lakers%'").get();
if (lukaPlayer && lukaTrade) {
  const existingAcq = db.prepare('SELECT * FROM acquisitions WHERE player_id = ? AND team_id = ?')
    .get(lukaPlayer.id, getTeamId('LAL'));
  if (!existingAcq) {
    db.prepare(`
      INSERT INTO acquisitions (player_id, team_id, acquisition_type, date, trade_id, origin_trade_id, notes)
      VALUES (?, ?, 'trade', '2025-01-15', ?, ?, 'Traded from Mavericks')
    `).run(lukaPlayer.id, getTeamId('LAL'), lukaTrade.id, lukaTrade.id);
    console.log('Added Luka to Lakers acquisition');
  }
}

// Step 5: Update trade chains for traded players
console.log('\n=== Updating trade chains ===');

// Harden trade chain
if (hardenPlayer && hardenTradeId) {
  const hardenChain = [
    { event: "Drafted by Oklahoma City Thunder", date: "2009-06-25", action: "Selected 3rd overall" },
    { event: "Thunder trade James Harden to Rockets", date: "2012-10-27", action: "Traded for Kevin Martin and picks" },
    { event: "Rockets trade James Harden to Nets", date: "2021-01-14", action: "Part of 4-team trade" },
    { event: "Nets trade James Harden to 76ers", date: "2022-02-10", action: "Traded for Ben Simmons package" },
    { event: "Harden signs with Clippers", date: "2023-11-01", action: "Sign-and-trade from 76ers" },
    { event: "Clippers trade James Harden to Cavaliers", date: "2026-02-05", action: "Traded for Darius Garland" }
  ];
  
  const existingChain = db.prepare('SELECT * FROM trade_chains WHERE resulting_player_id = ?').get(hardenPlayer.id);
  if (existingChain) {
    db.prepare('UPDATE trade_chains SET chain_json = ? WHERE id = ?')
      .run(JSON.stringify(hardenChain), existingChain.id);
    console.log('Updated Harden trade chain');
  } else {
    db.prepare('INSERT INTO trade_chains (origin_trade_id, resulting_player_id, chain_json) VALUES (?, ?, ?)')
      .run(hardenTradeId.id, hardenPlayer.id, JSON.stringify(hardenChain));
    console.log('Inserted Harden trade chain');
  }
}

// Anthony Davis trade chain
if (adPlayer && adTradeId) {
  const adChain = [
    { event: "Drafted by New Orleans Hornets", date: "2012-06-28", action: "Selected 1st overall" },
    { event: "Pelicans trade Anthony Davis to Lakers", date: "2019-06-15", action: "Traded for Lonzo Ball, Brandon Ingram, Josh Hart, and picks" },
    { event: "Lakers trade Anthony Davis in Luka Doncic deal", date: "2025-01-15", action: "Traded to Mavericks as part of Luka package" },
    { event: "Mavericks trade Anthony Davis to Wizards", date: "2026-02-05", action: "Traded for picks and players" }
  ];
  
  const existingChain = db.prepare('SELECT * FROM trade_chains WHERE resulting_player_id = ?').get(adPlayer.id);
  if (existingChain) {
    db.prepare('UPDATE trade_chains SET chain_json = ? WHERE id = ?')
      .run(JSON.stringify(adChain), existingChain.id);
    console.log('Updated AD trade chain');
  } else {
    db.prepare('INSERT INTO trade_chains (origin_trade_id, resulting_player_id, chain_json) VALUES (?, ?, ?)')
      .run(adTradeId.id, adPlayer.id, JSON.stringify(adChain));
    console.log('Inserted AD trade chain');
  }
}

// Jimmy Butler trade chain
if (butlerPlayer && butlerTradeId) {
  const butlerChain = [
    { event: "Drafted by Chicago Bulls", date: "2011-06-23", action: "Selected 30th overall" },
    { event: "Bulls trade Jimmy Butler to Timberwolves", date: "2017-06-22", action: "Traded for Zach LaVine, Kris Dunn, and Lauri Markkanen" },
    { event: "Timberwolves trade Jimmy Butler to 76ers", date: "2018-11-12", action: "Traded for Robert Covington, Dario Saric, and picks" },
    { event: "Butler signs with Heat as free agent", date: "2019-07-06", action: "4-year max contract" },
    { event: "Heat trade Jimmy Butler to Warriors", date: "2026-02-05", action: "Trade deadline deal" }
  ];
  
  const existingChain = db.prepare('SELECT * FROM trade_chains WHERE resulting_player_id = ?').get(butlerPlayer.id);
  if (existingChain) {
    db.prepare('UPDATE trade_chains SET chain_json = ? WHERE id = ?')
      .run(JSON.stringify(butlerChain), existingChain.id);
    console.log('Updated Butler trade chain');
  } else {
    db.prepare('INSERT INTO trade_chains (origin_trade_id, resulting_player_id, chain_json) VALUES (?, ?, ?)')
      .run(butlerTradeId.id, butlerPlayer.id, JSON.stringify(butlerChain));
    console.log('Inserted Butler trade chain');
  }
}

// Update Trae Young chain
if (traePlayer) {
  const existingChain = db.prepare('SELECT * FROM trade_chains WHERE resulting_player_id = ?').get(traePlayer.id);
  if (existingChain) {
    console.log('Trae Young trade chain already exists');
  }
}

// Update Luka chain  
if (lukaPlayer) {
  const lukaChain = [
    { event: "Hawks trade #3 pick (Luka Doncic) to Mavericks for #5 pick (Trae Young) and future 1st", date: "2018-06-21", action: "Trade completed" },
    { event: "2018 #3 pick (via Trae Young trade)", date: "2018-06-21", action: "Drafted Luka Doncic" },
    { event: "Mavericks trade Luka Doncic to Lakers", date: "2025-01-15", action: "Blockbuster trade to Los Angeles" }
  ];
  
  const existingChain = db.prepare('SELECT * FROM trade_chains WHERE resulting_player_id = ?').get(lukaPlayer.id);
  if (existingChain) {
    db.prepare('UPDATE trade_chains SET chain_json = ? WHERE id = ?')
      .run(JSON.stringify(lukaChain), existingChain.id);
    console.log('Updated Luka trade chain');
  }
}

console.log('\n=== Database update complete ===');

// Final verification
console.log('\n=== Verification ===');
const verifyPlayers = db.prepare(`
  SELECT p.name, t.abbreviation as team
  FROM players p
  LEFT JOIN teams t ON p.current_team_id = t.id
  WHERE p.name IN ('James Harden', 'Anthony Davis', 'Jimmy Butler', 'Trae Young', 'Luka Doncic')
`).all();
console.log('Key player teams:');
verifyPlayers.forEach(p => console.log(`  ${p.name}: ${p.team}`));

const totalPlayers = db.prepare('SELECT COUNT(*) as count FROM players').get();
console.log(`\nTotal players in database: ${totalPlayers.count}`);

const totalTrades = db.prepare('SELECT COUNT(*) as count FROM trades').get();
console.log(`Total trades in database: ${totalTrades.count}`);

db.close();

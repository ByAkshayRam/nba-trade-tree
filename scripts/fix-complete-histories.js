const Database = require('better-sqlite3');
const db = new Database('/home/ubuntu/clawd/projects/nba-trade-tree/data/nba_trades.db');

// Complete transaction histories for key players
// Each entry: draft info + all transactions in order
const playerHistories = {
  'Kristaps Porzingis': {
    draftTeam: 'NYK',
    currentTeam: 'GSW', // Updated per Akshay
    transactions: [
      { type: 'draft', date: '2015-06-25', toTeam: 'NYK', notes: 'Drafted #4 overall by Knicks' },
      { type: 'trade', date: '2019-01-31', fromTeam: 'NYK', toTeam: 'DAL', notes: 'Traded to Mavericks for Dennis Smith Jr., DeAndre Jordan, picks' },
      { type: 'trade', date: '2022-02-10', fromTeam: 'DAL', toTeam: 'WAS', notes: 'Traded to Wizards for Spencer Dinwiddie, Davis Bertans' },
      { type: 'trade', date: '2023-06-23', fromTeam: 'WAS', toTeam: 'BOS', notes: 'Traded to Celtics for Marcus Smart, picks' },
      { type: 'trade', date: '2025-06-27', fromTeam: 'BOS', toTeam: 'ATL', notes: 'Traded to Hawks' },
      { type: 'trade', date: '2026-02-06', fromTeam: 'ATL', toTeam: 'GSW', notes: 'Trade deadline - traded to Warriors' },
    ]
  },
  'Jalen Brunson': {
    draftTeam: 'DAL',
    currentTeam: 'NYK',
    transactions: [
      { type: 'draft', date: '2018-06-21', toTeam: 'DAL', notes: 'Drafted #33 overall by Mavericks' },
      { type: 'signing', date: '2022-07-12', fromTeam: 'DAL', toTeam: 'NYK', notes: 'Signed 4-year, $104M deal with Knicks as free agent' },
    ]
  },
  'LeBron James': {
    draftTeam: 'CLE',
    currentTeam: 'LAL',
    transactions: [
      { type: 'draft', date: '2003-06-26', toTeam: 'CLE', notes: 'Drafted #1 overall by Cavaliers' },
      { type: 'signing', date: '2010-07-08', fromTeam: 'CLE', toTeam: 'MIA', notes: 'Signed with Heat ("The Decision")' },
      { type: 'signing', date: '2014-07-11', fromTeam: 'MIA', toTeam: 'CLE', notes: 'Returned to Cleveland as free agent' },
      { type: 'signing', date: '2018-07-01', fromTeam: 'CLE', toTeam: 'LAL', notes: 'Signed 4-year deal with Lakers' },
    ]
  },
  'Kevin Durant': {
    draftTeam: 'SEA', // Drafted by Sonics (became OKC)
    currentTeam: 'PHX',
    transactions: [
      { type: 'draft', date: '2007-06-28', toTeam: 'OKC', notes: 'Drafted #2 overall by Seattle SuperSonics (became OKC)' },
      { type: 'signing', date: '2016-07-04', fromTeam: 'OKC', toTeam: 'GSW', notes: 'Signed with Warriors as free agent' },
      { type: 'trade', date: '2019-07-07', fromTeam: 'GSW', toTeam: 'BKN', notes: 'Sign-and-trade to Nets' },
      { type: 'trade', date: '2023-02-09', fromTeam: 'BKN', toTeam: 'PHX', notes: 'Traded to Suns for Mikal Bridges, Cam Johnson, picks' },
    ]
  },
  'James Harden': {
    draftTeam: 'OKC',
    currentTeam: 'CLE',
    transactions: [
      { type: 'draft', date: '2009-06-25', toTeam: 'OKC', notes: 'Drafted #3 overall by Thunder' },
      { type: 'trade', date: '2012-10-27', fromTeam: 'OKC', toTeam: 'HOU', notes: 'Traded to Rockets for Kevin Martin, picks' },
      { type: 'trade', date: '2021-01-14', fromTeam: 'HOU', toTeam: 'BKN', notes: 'Traded to Nets in 4-team deal' },
      { type: 'trade', date: '2022-02-10', fromTeam: 'BKN', toTeam: 'PHI', notes: 'Traded to 76ers for Ben Simmons' },
      { type: 'trade', date: '2023-11-01', fromTeam: 'PHI', toTeam: 'LAC', notes: 'Sign-and-trade to Clippers' },
      { type: 'trade', date: '2026-02-06', fromTeam: 'LAC', toTeam: 'CLE', notes: 'Trade deadline - traded to Cavaliers' },
    ]
  },
  'Kawhi Leonard': {
    draftTeam: 'IND',
    currentTeam: 'LAC',
    transactions: [
      { type: 'draft', date: '2011-06-23', toTeam: 'SAS', notes: 'Drafted #15 by Pacers, traded to Spurs on draft night' },
      { type: 'trade', date: '2018-07-18', fromTeam: 'SAS', toTeam: 'TOR', notes: 'Traded to Raptors for DeMar DeRozan' },
      { type: 'signing', date: '2019-07-10', fromTeam: 'TOR', toTeam: 'LAC', notes: 'Signed with Clippers as free agent' },
    ]
  },
  'Jimmy Butler': {
    draftTeam: 'CHI',
    currentTeam: 'GSW',
    transactions: [
      { type: 'draft', date: '2011-06-23', toTeam: 'CHI', notes: 'Drafted #30 overall by Bulls' },
      { type: 'trade', date: '2017-06-22', fromTeam: 'CHI', toTeam: 'MIN', notes: 'Traded to Timberwolves for Zach LaVine, Kris Dunn, Lauri Markkanen' },
      { type: 'trade', date: '2018-11-12', fromTeam: 'MIN', toTeam: 'PHI', notes: 'Traded to 76ers for Robert Covington, Dario Saric' },
      { type: 'signing', date: '2019-07-06', fromTeam: 'PHI', toTeam: 'MIA', notes: 'Sign-and-trade to Heat' },
      { type: 'trade', date: '2026-02-05', fromTeam: 'MIA', toTeam: 'GSW', notes: 'Trade deadline - traded to Warriors for Kuminga, picks' },
    ]
  },
  'Trae Young': {
    draftTeam: 'DAL', // Drafted by Dallas, traded to Atlanta
    currentTeam: 'WAS',
    transactions: [
      { type: 'draft', date: '2018-06-21', toTeam: 'ATL', notes: 'Drafted #5 by Mavericks, traded to Hawks for Luka Doncic' },
      { type: 'trade', date: '2026-02-06', fromTeam: 'ATL', toTeam: 'WAS', notes: 'Trade deadline - traded to Wizards' },
    ]
  },
  'Anthony Davis': {
    draftTeam: 'NOP',
    currentTeam: 'WAS',
    transactions: [
      { type: 'draft', date: '2012-06-28', toTeam: 'NOP', notes: 'Drafted #1 overall by Hornets (became Pelicans)' },
      { type: 'trade', date: '2019-07-06', fromTeam: 'NOP', toTeam: 'LAL', notes: 'Traded to Lakers for Brandon Ingram, Lonzo Ball, picks' },
      { type: 'trade', date: '2025-01-15', fromTeam: 'LAL', toTeam: 'DAL', notes: 'Part of Luka Doncic blockbuster' },
      { type: 'trade', date: '2026-02-06', fromTeam: 'DAL', toTeam: 'WAS', notes: 'Trade deadline - traded to Wizards' },
    ]
  },
  'Donovan Mitchell': {
    draftTeam: 'DEN',
    currentTeam: 'CLE',
    transactions: [
      { type: 'draft', date: '2017-06-22', toTeam: 'UTA', notes: 'Drafted #13 by Nuggets, traded to Jazz on draft night' },
      { type: 'trade', date: '2022-09-01', fromTeam: 'UTA', toTeam: 'CLE', notes: 'Traded to Cavaliers for Lauri Markkanen, Collin Sexton, picks' },
    ]
  },
  'Paul George': {
    draftTeam: 'IND',
    currentTeam: 'PHI',
    transactions: [
      { type: 'draft', date: '2010-06-24', toTeam: 'IND', notes: 'Drafted #10 overall by Pacers' },
      { type: 'trade', date: '2017-07-07', fromTeam: 'IND', toTeam: 'OKC', notes: 'Traded to Thunder for Victor Oladipo, Domantas Sabonis' },
      { type: 'trade', date: '2019-07-10', fromTeam: 'OKC', toTeam: 'LAC', notes: 'Traded to Clippers for SGA, picks' },
      { type: 'signing', date: '2024-07-01', fromTeam: 'LAC', toTeam: 'PHI', notes: 'Signed with 76ers as free agent' },
    ]
  },
  'Kyrie Irving': {
    draftTeam: 'CLE',
    currentTeam: 'DAL',
    transactions: [
      { type: 'draft', date: '2011-06-23', toTeam: 'CLE', notes: 'Drafted #1 overall by Cavaliers' },
      { type: 'trade', date: '2017-08-22', fromTeam: 'CLE', toTeam: 'BOS', notes: 'Traded to Celtics for Isaiah Thomas, Jae Crowder, picks' },
      { type: 'signing', date: '2019-07-07', fromTeam: 'BOS', toTeam: 'BKN', notes: 'Signed with Nets as free agent' },
      { type: 'trade', date: '2023-02-06', fromTeam: 'BKN', toTeam: 'DAL', notes: 'Traded to Mavericks for Spencer Dinwiddie, Dorian Finney-Smith' },
    ]
  },
  'Damian Lillard': {
    draftTeam: 'POR',
    currentTeam: 'MIL',
    transactions: [
      { type: 'draft', date: '2012-06-28', toTeam: 'POR', notes: 'Drafted #6 overall by Trail Blazers' },
      { type: 'trade', date: '2023-10-01', fromTeam: 'POR', toTeam: 'MIL', notes: 'Traded to Bucks for Jrue Holiday (who went to BOS)' },
    ]
  },
};

// Get team IDs
const teams = {};
db.prepare('SELECT id, abbreviation FROM teams').all().forEach(t => {
  teams[t.abbreviation] = t.id;
});

db.exec('BEGIN TRANSACTION');

// Get max IDs
let nextTradeId = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 as next FROM trades').get().next;
let nextAcqId = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 as next FROM acquisitions').get().next;

// Process each player
for (const [playerName, history] of Object.entries(playerHistories)) {
  console.log(`\nProcessing ${playerName}...`);
  
  // Get player
  const player = db.prepare('SELECT id, draft_team_id FROM players WHERE name = ?').get(playerName);
  if (!player) {
    console.log(`  ⚠ Player not found: ${playerName}`);
    continue;
  }
  
  // Update current team
  const currentTeamId = teams[history.currentTeam];
  if (currentTeamId) {
    db.prepare('UPDATE players SET current_team_id = ? WHERE id = ?').run(currentTeamId, player.id);
    console.log(`  ✓ Updated current team to ${history.currentTeam}`);
  }
  
  // Update draft team if specified
  if (history.draftTeam && teams[history.draftTeam]) {
    db.prepare('UPDATE players SET draft_team_id = ? WHERE id = ?').run(teams[history.draftTeam], player.id);
  }
  
  // Clear existing acquisitions for this player
  db.prepare('DELETE FROM acquisitions WHERE player_id = ?').run(player.id);
  
  // Add all transactions as acquisitions
  for (const tx of history.transactions) {
    const teamId = teams[tx.toTeam];
    if (!teamId) {
      console.log(`  ⚠ Team not found: ${tx.toTeam}`);
      continue;
    }
    
    // Create trade record for trades
    let tradeId = null;
    if (tx.type === 'trade') {
      db.prepare('INSERT INTO trades (id, date, description, is_multi_team) VALUES (?, ?, ?, 0)')
        .run(nextTradeId, tx.date, tx.notes);
      tradeId = nextTradeId++;
    }
    
    // Create acquisition record
    db.prepare(`
      INSERT INTO acquisitions (id, player_id, team_id, acquisition_type, date, trade_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(nextAcqId++, player.id, teamId, tx.type, tx.date, tradeId, tx.notes);
    
    console.log(`  ✓ ${tx.type}: ${tx.fromTeam || 'DRAFT'} → ${tx.toTeam} (${tx.date})`);
  }
}

db.exec('COMMIT');

// Summary
const summary = db.prepare(`
  SELECT 
    (SELECT COUNT(*) FROM acquisitions) as total_acquisitions,
    (SELECT COUNT(DISTINCT player_id) FROM acquisitions) as players_with_history
`).get();
console.log(`\n✅ Done! Total acquisitions: ${summary.total_acquisitions}, Players with history: ${summary.players_with_history}`);

db.close();

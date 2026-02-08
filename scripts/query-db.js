const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'nba_trades.db');
const db = new Database(dbPath);

console.log('=== TEAMS ===');
const teams = db.prepare('SELECT * FROM teams ORDER BY id').all();
console.log(JSON.stringify(teams, null, 2));

console.log('\n=== PLAYERS ===');
const players = db.prepare(`
  SELECT p.*, t.abbreviation as team_abbr 
  FROM players p 
  LEFT JOIN teams t ON p.current_team_id = t.id 
  ORDER BY p.id
`).all();
console.log(JSON.stringify(players, null, 2));

console.log('\n=== TRADES ===');
const trades = db.prepare('SELECT * FROM trades ORDER BY id').all();
console.log(JSON.stringify(trades, null, 2));

console.log('\n=== ACQUISITIONS ===');
const acquisitions = db.prepare(`
  SELECT a.*, p.name as player_name, t.abbreviation as team_abbr
  FROM acquisitions a
  LEFT JOIN players p ON a.player_id = p.id
  LEFT JOIN teams t ON a.team_id = t.id
  ORDER BY a.id
`).all();
console.log(JSON.stringify(acquisitions, null, 2));

console.log('\n=== TRADE CHAINS ===');
const chains = db.prepare('SELECT * FROM trade_chains ORDER BY id').all();
console.log(JSON.stringify(chains, null, 2));

db.close();

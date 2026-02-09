const Database = require('better-sqlite3');
const db = new Database('./data/nba_trades.db');

// Get player stats
const totalPlayers = db.prepare('SELECT COUNT(*) as count FROM players WHERE is_active = 1').get();
const verifiedCount = db.prepare('SELECT COUNT(*) as count FROM verified_transactions').get();
const tradeChains = db.prepare('SELECT COUNT(*) as count FROM trade_chains').get();

console.log('=== Database Stats ===');
console.log('Total active players:', totalPlayers.count);
console.log('Verified transactions:', verifiedCount.count);
console.log('Trade chains table:', tradeChains.count);

// Sample of complex transaction histories
console.log('\n=== Players with 4+ transactions ===');
const complex = db.prepare(`
  SELECT p.name, vt.chain_json
  FROM verified_transactions vt
  JOIN players p ON vt.player_id = p.id
  WHERE json_array_length(vt.chain_json) >= 4
  ORDER BY json_array_length(vt.chain_json) DESC
  LIMIT 15
`).all();

complex.forEach(c => {
  const chain = JSON.parse(c.chain_json);
  console.log(`${c.name} (${chain.length} events): ${chain.map(e => e.event.split(' ').slice(-1)[0]).join(' → ')}`);
});

// Count by team
console.log('\n=== Players per team (verified) ===');
const byTeam = db.prepare(`
  SELECT t.abbreviation, COUNT(*) as count
  FROM verified_transactions vt
  JOIN players p ON vt.player_id = p.id
  JOIN teams t ON p.current_team_id = t.id
  GROUP BY t.id
  ORDER BY count DESC
`).all();

byTeam.forEach(t => console.log(`${t.abbreviation}: ${t.count}`));

db.close();

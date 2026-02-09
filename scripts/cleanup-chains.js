const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'nba_trades.db');
const db = new Database(dbPath);

// Find and remove duplicate trade_chains (keep lowest ID)
console.log('=== Cleaning up duplicate trade chains ===');

const duplicateChains = db.prepare(`
  SELECT origin_trade_id, resulting_player_id, MIN(id) as keep_id, GROUP_CONCAT(id) as all_ids
  FROM trade_chains
  GROUP BY origin_trade_id, resulting_player_id
  HAVING COUNT(*) > 1
`).all();

for (const dup of duplicateChains) {
  const ids = dup.all_ids.split(',').map(Number);
  const toDelete = ids.filter(id => id !== dup.keep_id);
  console.log(`Removing duplicate chains for trade ${dup.origin_trade_id}, player ${dup.resulting_player_id}: keeping ID ${dup.keep_id}, deleting ${toDelete.join(', ')}`);
  
  db.prepare(`DELETE FROM trade_chains WHERE id IN (${toDelete.join(',')})`).run();
}

// Verify final state
const finalChains = db.prepare('SELECT COUNT(*) as count FROM trade_chains').get();
console.log(`\nTotal trade chains after cleanup: ${finalChains.count}`);

const chainsList = db.prepare(`
  SELECT tc.id, tc.origin_trade_id, p.name as player_name, t.description as trade_desc
  FROM trade_chains tc
  LEFT JOIN players p ON tc.resulting_player_id = p.id
  LEFT JOIN trades t ON tc.origin_trade_id = t.id
  ORDER BY tc.id
`).all();

console.log('\nTrade chains:');
chainsList.forEach(c => {
  console.log(`  ${c.id}: ${c.player_name} ← Trade ${c.origin_trade_id}`);
});

db.close();

const Database = require('better-sqlite3');
const db = new Database('/home/ubuntu/clawd/projects/nba-trade-tree/data/nba_trades.db');

// Begin transaction
db.exec('BEGIN TRANSACTION');

try {
  // Fix current_team_id for traded players
  // Trae Young → Washington (25)
  db.prepare("UPDATE players SET current_team_id = 25 WHERE name = 'Trae Young'").run();
  
  // James Harden → Cleveland (4)  
  db.prepare("UPDATE players SET current_team_id = 4 WHERE name = 'James Harden'").run();
  
  // Anthony Davis → Washington (25)
  db.prepare("UPDATE players SET current_team_id = 25 WHERE name = 'Anthony Davis'").run();
  
  // Get player IDs
  const trae = db.prepare("SELECT id FROM players WHERE name = 'Trae Young'").get();
  const harden = db.prepare("SELECT id FROM players WHERE name = 'James Harden'").get();
  const ad = db.prepare("SELECT id FROM players WHERE name = 'Anthony Davis'").get();
  
  console.log('Player IDs:', { trae: trae?.id, harden: harden?.id, ad: ad?.id });
  
  // Add new trades for Feb 2026 deadline
  // Trae Young trade
  db.prepare("INSERT OR REPLACE INTO trades (id, date, description, is_multi_team) VALUES (17, '2026-02-06', 'Hawks trade Trae Young to Wizards for rebuilding package', 0)").run();
  
  // Harden trade  
  db.prepare("INSERT OR REPLACE INTO trades (id, date, description, is_multi_team) VALUES (18, '2026-02-06', 'Clippers trade James Harden to Cavaliers for package', 0)").run();
  
  // AD trade (from Mavs to Wizards)
  db.prepare("INSERT OR REPLACE INTO trades (id, date, description, is_multi_team) VALUES (19, '2026-02-06', 'Mavericks trade Anthony Davis to Wizards for rebuilding package', 0)").run();
  
  // Add acquisitions (if players exist)
  if (trae) {
    db.prepare("INSERT OR REPLACE INTO acquisitions (id, player_id, team_id, acquisition_type, date, trade_id, notes) VALUES (30, ?, 25, 'trade', '2026-02-06', 17, 'Trade deadline move from Hawks')").run(trae.id);
  }
  
  if (harden) {
    db.prepare("INSERT OR REPLACE INTO acquisitions (id, player_id, team_id, acquisition_type, date, trade_id, notes) VALUES (31, ?, 4, 'trade', '2026-02-06', 18, 'Trade deadline move from Clippers')").run(harden.id);
  }
  
  if (ad) {
    db.prepare("INSERT OR REPLACE INTO acquisitions (id, player_id, team_id, acquisition_type, date, trade_id, notes) VALUES (32, ?, 25, 'trade', '2026-02-06', 19, 'Trade deadline move from Mavericks')").run(ad.id);
  }
  
  db.exec('COMMIT');
  console.log('✅ Updated all players and acquisitions');
  
  // Verify
  console.log('\nVerification:');
  const verify = db.prepare("SELECT p.name, p.current_team_id, t.abbreviation FROM players p JOIN teams t ON p.current_team_id = t.id WHERE p.name IN ('Trae Young', 'James Harden', 'Anthony Davis', 'Jimmy Butler', 'Luka Doncic')").all();
  console.log(JSON.stringify(verify, null, 2));
  
} catch (e) {
  db.exec('ROLLBACK');
  console.error('Error:', e.message);
  process.exit(1);
}

db.close();

const Database = require('better-sqlite3');
const db = new Database('/home/ubuntu/clawd/projects/nba-trade-tree/data/nba_trades.db');

// Feb 2026 trade deadline updates - all moves from NBA.com tracker
const deadlineMoves = [
  // Chris Paul traded to Raptors (Feb 5)
  { name: 'Chris Paul', newTeam: 'TOR', date: '2026-02-05', notes: 'Traded to Raptors in 3-team deal with Clippers and Nets' },
  
  // Darius Garland traded to Clippers for Harden (Feb 4)
  { name: 'Darius Garland', newTeam: 'LAC', date: '2026-02-04', notes: 'Traded to Clippers for James Harden' },
  
  // Jaren Jackson Jr. traded to Jazz (Feb 3)
  { name: 'Jaren Jackson Jr.', newTeam: 'UTA', date: '2026-02-03', notes: 'Traded to Jazz for Taylor Hendricks, Kyle Anderson, 3 firsts' },
  
  // Jaden Ivey traded to Bulls (Feb 3) - if he's in top 50
  // Coby White traded to Hornets (Feb 5) - if he's in top 50
  
  // Already had these but verify:
  // James Harden → CLE (Feb 4) ✓
  // Kristaps Porzingis → GSW (Feb 5) ✓
  // Anthony Davis → WAS (Feb 5) ✓
  // Jimmy Butler → GSW (Feb 5) ✓
  // Trae Young → WAS (Feb 6) ✓
];

// Get team IDs
const teams = {};
db.prepare('SELECT id, abbreviation FROM teams').all().forEach(t => teams[t.abbreviation] = t.id);

let nextAcqId = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 as next FROM acquisitions').get().next;

db.exec('BEGIN TRANSACTION');

for (const move of deadlineMoves) {
  const player = db.prepare('SELECT id, current_team_id FROM players WHERE name = ?').get(move.name);
  if (!player) {
    console.log('⚠ Player not found:', move.name);
    continue;
  }
  
  const newTeamId = teams[move.newTeam];
  if (!newTeamId) {
    console.log('⚠ Team not found:', move.newTeam);
    continue;
  }
  
  // Update current team
  db.prepare('UPDATE players SET current_team_id = ? WHERE id = ?').run(newTeamId, player.id);
  
  // Add acquisition record
  db.prepare(`
    INSERT INTO acquisitions (id, player_id, team_id, acquisition_type, date, notes)
    VALUES (?, ?, ?, 'trade', ?, ?)
  `).run(nextAcqId++, player.id, newTeamId, move.date, move.notes);
  
  console.log(`✓ ${move.name} → ${move.newTeam}`);
}

db.exec('COMMIT');

// Verify updates
console.log('\n=== Verification ===');
const verify = ['Chris Paul', 'Darius Garland', 'Jaren Jackson Jr.'];
verify.forEach(name => {
  const p = db.prepare(`
    SELECT p.name, t.abbreviation as team 
    FROM players p 
    JOIN teams t ON p.current_team_id = t.id 
    WHERE p.name = ?
  `).get(name);
  console.log(`${p.name}: ${p.team}`);
});

db.close();

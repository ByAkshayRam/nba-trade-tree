const Database = require('better-sqlite3');
const db = new Database('/home/ubuntu/clawd/projects/nba-trade-tree/data/nba_trades.db');

// Complete transaction histories for top 50 players
// Each player: all teams they played for in order
const completeHistories = {
  'Domantas Sabonis': [
    { type: 'draft', date: '2016-06-23', team: 'OKC', notes: 'Drafted #11 overall by Thunder' },
    { type: 'trade', date: '2016-06-23', team: 'IND', notes: 'Traded to Pacers on draft night for Victor Oladipo' },
    { type: 'trade', date: '2022-02-08', team: 'SAC', notes: 'Traded to Kings for Tyrese Haliburton' },
  ],
  'Ben Simmons': [
    { type: 'draft', date: '2016-06-23', team: 'PHI', notes: 'Drafted #1 overall by 76ers' },
    { type: 'trade', date: '2022-02-10', team: 'BKN', notes: 'Traded to Nets for James Harden' },
  ],
  'Derrick White': [
    { type: 'draft', date: '2017-06-22', team: 'SAS', notes: 'Drafted #29 overall by Spurs' },
    { type: 'trade', date: '2022-02-10', team: 'BOS', notes: 'Traded to Celtics for Romeo Langford, Josh Richardson, 1st' },
  ],
  'Al Horford': [
    { type: 'draft', date: '2007-06-28', team: 'ATL', notes: 'Drafted #3 overall by Hawks' },
    { type: 'signing', date: '2016-07-01', team: 'BOS', notes: 'Signed with Celtics as free agent' },
    { type: 'signing', date: '2019-07-09', team: 'PHI', notes: 'Signed with 76ers as free agent' },
    { type: 'trade', date: '2020-12-09', team: 'OKC', notes: 'Traded to Thunder for Danny Green' },
    { type: 'trade', date: '2021-06-18', team: 'BOS', notes: 'Traded back to Celtics for Kemba Walker' },
  ],
  'Chris Paul': [
    { type: 'draft', date: '2005-06-28', team: 'NOP', notes: 'Drafted #4 overall by Hornets (now Pelicans)' },
    { type: 'trade', date: '2011-12-14', team: 'LAC', notes: 'Traded to Clippers for Eric Gordon, picks' },
    { type: 'trade', date: '2017-06-28', team: 'HOU', notes: 'Traded to Rockets for Patrick Beverley, Lou Williams, picks' },
    { type: 'trade', date: '2019-07-16', team: 'OKC', notes: 'Traded to Thunder for Russell Westbrook' },
    { type: 'trade', date: '2020-11-16', team: 'PHX', notes: 'Traded to Suns for Ricky Rubio, Kelly Oubre, picks' },
    { type: 'signing', date: '2023-07-01', team: 'GSW', notes: 'Signed with Warriors as free agent' },
    { type: 'signing', date: '2024-07-01', team: 'SAS', notes: 'Signed with Spurs as free agent' },
  ],
  'Russell Westbrook': [
    { type: 'draft', date: '2008-06-26', team: 'OKC', notes: 'Drafted #4 overall by Thunder' },
    { type: 'trade', date: '2019-07-16', team: 'HOU', notes: 'Traded to Rockets for Chris Paul' },
    { type: 'trade', date: '2020-12-03', team: 'WAS', notes: 'Traded to Wizards for John Wall' },
    { type: 'trade', date: '2021-07-29', team: 'LAL', notes: 'Traded to Lakers for Montrezl Harrell, KCP, Kuzma' },
    { type: 'signing', date: '2023-02-23', team: 'LAC', notes: 'Signed after Lakers buyout' },
    { type: 'signing', date: '2024-09-05', team: 'DEN', notes: 'Signed with Nuggets as free agent' },
  ],
  'Pascal Siakam': [
    { type: 'draft', date: '2016-06-23', team: 'TOR', notes: 'Drafted #27 overall by Raptors' },
    { type: 'trade', date: '2024-01-17', team: 'IND', notes: 'Traded to Pacers for Bruce Brown, picks' },
  ],
  'Aaron Gordon': [
    { type: 'draft', date: '2014-06-26', team: 'ORL', notes: 'Drafted #4 overall by Magic' },
    { type: 'trade', date: '2021-03-25', team: 'DEN', notes: 'Traded to Nuggets for Gary Harris, RJ Hampton, pick' },
  ],
  'OG Anunoby': [
    { type: 'draft', date: '2017-06-22', team: 'TOR', notes: 'Drafted #23 overall by Raptors' },
    { type: 'trade', date: '2023-12-30', team: 'NYK', notes: 'Traded to Knicks for RJ Barrett, Immanuel Quickley' },
  ],
  'Julius Randle': [
    { type: 'draft', date: '2014-06-26', team: 'LAL', notes: 'Drafted #7 overall by Lakers' },
    { type: 'signing', date: '2018-07-06', team: 'NOP', notes: 'Signed with Pelicans as free agent' },
    { type: 'signing', date: '2019-07-09', team: 'NYK', notes: 'Signed with Knicks as free agent' },
    { type: 'trade', date: '2024-09-28', team: 'MIN', notes: 'Traded to Timberwolves for Karl-Anthony Towns' },
  ],
  'Lauri Markkanen': [
    { type: 'draft', date: '2017-06-22', team: 'CHI', notes: 'Drafted #7 overall by Bulls' },
    { type: 'trade', date: '2021-08-27', team: 'CLE', notes: 'Traded to Cavaliers for Larry Nance Jr.' },
    { type: 'trade', date: '2022-09-01', team: 'UTA', notes: 'Traded to Jazz in Donovan Mitchell deal' },
  ],
  'Karl-Anthony Towns': [
    { type: 'draft', date: '2015-06-25', team: 'MIN', notes: 'Drafted #1 overall by Timberwolves' },
    { type: 'trade', date: '2024-09-28', team: 'NYK', notes: 'Traded to Knicks for Julius Randle package' },
  ],
  'Shai Gilgeous-Alexander': [
    { type: 'draft', date: '2018-06-21', team: 'LAC', notes: 'Drafted #11 overall by Clippers' },
    { type: 'trade', date: '2019-07-10', team: 'OKC', notes: 'Traded to Thunder in Paul George deal' },
  ],
  'Donovan Mitchell': [
    { type: 'draft', date: '2017-06-22', team: 'UTA', notes: 'Drafted #13 overall by Jazz (via Nuggets)' },
    { type: 'trade', date: '2022-09-01', team: 'CLE', notes: 'Traded to Cavaliers for Lauri Markkanen, picks' },
  ],
};

// Get team IDs
const teams = {};
db.prepare('SELECT id, abbreviation FROM teams').all().forEach(t => teams[t.abbreviation] = t.id);

// Get next acquisition ID
let nextAcqId = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 as next FROM acquisitions').get().next;

db.exec('BEGIN TRANSACTION');

for (const [playerName, history] of Object.entries(completeHistories)) {
  const player = db.prepare('SELECT id FROM players WHERE name = ?').get(playerName);
  if (!player) {
    console.log('⚠ Player not found:', playerName);
    continue;
  }

  // Delete existing acquisitions for this player
  const deleted = db.prepare('DELETE FROM acquisitions WHERE player_id = ?').run(player.id);
  
  // Insert complete history
  for (const tx of history) {
    const teamId = teams[tx.team];
    if (!teamId) {
      console.log('⚠ Team not found:', tx.team, 'for', playerName);
      continue;
    }
    
    db.prepare(`
      INSERT INTO acquisitions (id, player_id, team_id, acquisition_type, date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(nextAcqId++, player.id, teamId, tx.type, tx.date, tx.notes);
  }
  
  console.log(`✓ ${playerName}: ${history.length} transactions`);
}

db.exec('COMMIT');
console.log('\nDone!');
db.close();

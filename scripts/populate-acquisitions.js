const Database = require('better-sqlite3');
const db = new Database('/home/ubuntu/clawd/projects/nba-trade-tree/data/nba_trades.db');

// Known acquisitions for key players (how they got to current team)
// Format: { playerName: { type, date, fromTeam, notes } }
const knownAcquisitions = {
  // Lakers
  'LeBron James': { type: 'signing', date: '2018-07-01', fromTeam: 'CLE', notes: 'Signed as free agent from Cleveland' },
  'Austin Reaves': { type: 'draft', date: '2021-07-29', notes: 'Undrafted, signed by Lakers' },
  
  // Knicks
  'Jaylen Brunson': { type: 'signing', date: '2022-07-12', fromTeam: 'DAL', notes: 'Signed as free agent from Dallas' },
  'Karl-Anthony Towns': { type: 'trade', date: '2024-09-28', fromTeam: 'MIN', notes: 'Traded from Timberwolves for Julius Randle package' },
  'Josh Hart': { type: 'trade', date: '2023-02-09', fromTeam: 'POR', notes: 'Traded from Trail Blazers' },
  'OG Anunoby': { type: 'trade', date: '2023-12-30', fromTeam: 'TOR', notes: 'Traded from Raptors for RJ Barrett, Immanuel Quickley' },
  'Mikal Bridges': { type: 'trade', date: '2024-06-26', fromTeam: 'BKN', notes: 'Traded from Nets for picks' },
  
  // Celtics
  'Jayson Tatum': { type: 'draft', date: '2017-06-22', notes: 'Drafted #3 overall (trade with PHI)' },
  'Jaylen Brown': { type: 'draft', date: '2016-06-23', notes: 'Drafted #3 overall' },
  'Derrick White': { type: 'trade', date: '2022-02-10', fromTeam: 'SAS', notes: 'Traded from Spurs for Romeo Langford, Josh Richardson, 1st' },
  'Al Horford': { type: 'signing', date: '2021-06-18', fromTeam: 'OKC', notes: 'Traded back to Boston from OKC' },
  'Jrue Holiday': { type: 'trade', date: '2023-10-01', fromTeam: 'MIL', notes: 'Traded from Bucks for Robert Williams, Malcolm Brogdon, pick' },
  'Kristaps Porzingis': { type: 'trade', date: '2023-06-23', fromTeam: 'WAS', notes: 'Traded from Wizards for Marcus Smart' },
  
  // Thunder
  'Shai Gilgeous-Alexander': { type: 'trade', date: '2019-07-10', fromTeam: 'LAC', notes: 'Traded from Clippers in Paul George deal' },
  'Jalen Williams': { type: 'draft', date: '2022-06-23', notes: 'Drafted #12 overall' },
  'Chet Holmgren': { type: 'draft', date: '2022-06-23', notes: 'Drafted #2 overall' },
  'Alex Caruso': { type: 'trade', date: '2025-01-10', fromTeam: 'CHI', notes: 'Traded from Bulls for Josh Giddey' },
  
  // Cavaliers
  'Donovan Mitchell': { type: 'trade', date: '2022-09-01', fromTeam: 'UTA', notes: 'Traded from Jazz for Lauri Markkanen, picks' },
  'Darius Garland': { type: 'draft', date: '2019-06-20', notes: 'Drafted #5 overall' },
  'Evan Mobley': { type: 'draft', date: '2021-07-29', notes: 'Drafted #3 overall' },
  'Jarrett Allen': { type: 'trade', date: '2021-01-16', fromTeam: 'BKN', notes: 'Traded from Nets in Harden deal' },
  
  // Nuggets
  'Nikola Jokic': { type: 'draft', date: '2014-06-26', notes: 'Drafted #41 overall' },
  'Jamal Murray': { type: 'draft', date: '2016-06-23', notes: 'Drafted #7 overall' },
  'Michael Porter Jr.': { type: 'draft', date: '2018-06-21', notes: 'Drafted #14 overall' },
  'Aaron Gordon': { type: 'trade', date: '2021-03-25', fromTeam: 'ORL', notes: 'Traded from Magic for Gary Harris, RJ Hampton, pick' },
  
  // Bucks  
  'Giannis Antetokounmpo': { type: 'draft', date: '2013-06-27', notes: 'Drafted #15 overall' },
  'Damian Lillard': { type: 'trade', date: '2023-10-01', fromTeam: 'POR', notes: 'Traded from Blazers for Jrue Holiday package' },
  'Khris Middleton': { type: 'draft', date: '2012-06-28', notes: 'Drafted #39 overall by DET, traded to MIL' },
  'Brook Lopez': { type: 'signing', date: '2018-07-06', notes: 'Signed as free agent' },
  
  // Warriors
  'Stephen Curry': { type: 'draft', date: '2009-06-25', notes: 'Drafted #7 overall' },
  'Draymond Green': { type: 'draft', date: '2012-06-28', notes: 'Drafted #35 overall' },
  'Andrew Wiggins': { type: 'trade', date: '2020-02-06', fromTeam: 'MIN', notes: 'Traded from Wolves for D\'Angelo Russell' },
  'Jonathan Kuminga': { type: 'draft', date: '2021-07-29', notes: 'Drafted #7 overall' },
  
  // Suns
  'Kevin Durant': { type: 'trade', date: '2023-02-09', fromTeam: 'BKN', notes: 'Traded from Nets for Mikal Bridges, Cam Johnson, picks' },
  'Devin Booker': { type: 'draft', date: '2015-06-25', notes: 'Drafted #13 overall' },
  'Bradley Beal': { type: 'trade', date: '2023-06-17', fromTeam: 'WAS', notes: 'Traded from Wizards for Chris Paul, picks' },
  
  // Mavericks
  'Kyrie Irving': { type: 'trade', date: '2023-02-06', fromTeam: 'BKN', notes: 'Traded from Nets for Spencer Dinwiddie, Dorian Finney-Smith' },
  'Klay Thompson': { type: 'signing', date: '2024-07-01', fromTeam: 'GSW', notes: 'Signed as free agent from Warriors' },
  'P.J. Washington': { type: 'trade', date: '2024-02-08', fromTeam: 'CHA', notes: 'Traded from Hornets for Grant Williams' },
  
  // Heat
  'Bam Adebayo': { type: 'draft', date: '2017-06-22', notes: 'Drafted #14 overall' },
  'Tyler Herro': { type: 'draft', date: '2019-06-20', notes: 'Drafted #13 overall' },
  
  // 76ers
  'Joel Embiid': { type: 'draft', date: '2014-06-26', notes: 'Drafted #3 overall' },
  'Tyrese Maxey': { type: 'draft', date: '2020-11-18', notes: 'Drafted #21 overall' },
  'Paul George': { type: 'signing', date: '2024-07-01', fromTeam: 'LAC', notes: 'Signed as free agent from Clippers' },
  
  // Timberwolves
  'Anthony Edwards': { type: 'draft', date: '2020-11-18', notes: 'Drafted #1 overall' },
  'Rudy Gobert': { type: 'trade', date: '2022-07-06', fromTeam: 'UTA', notes: 'Traded from Jazz for 4 first-round picks' },
  'Julius Randle': { type: 'trade', date: '2024-09-28', fromTeam: 'NYK', notes: 'Traded from Knicks for Karl-Anthony Towns' },
  
  // Pacers
  'Tyrese Haliburton': { type: 'trade', date: '2022-02-08', fromTeam: 'SAC', notes: 'Traded from Kings for Domantas Sabonis' },
  'Pascal Siakam': { type: 'trade', date: '2024-01-17', fromTeam: 'TOR', notes: 'Traded from Raptors for Bruce Brown, picks' },
  'Myles Turner': { type: 'draft', date: '2015-06-25', notes: 'Drafted #11 overall' },
  
  // Magic
  'Paolo Banchero': { type: 'draft', date: '2022-06-23', notes: 'Drafted #1 overall' },
  'Franz Wagner': { type: 'draft', date: '2021-07-29', notes: 'Drafted #8 overall' },
  'Jalen Suggs': { type: 'draft', date: '2021-07-29', notes: 'Drafted #5 overall' },
  
  // Kings
  'De\'Aaron Fox': { type: 'draft', date: '2017-06-22', notes: 'Drafted #5 overall' },
  'Domantas Sabonis': { type: 'trade', date: '2022-02-08', fromTeam: 'IND', notes: 'Traded from Pacers for Tyrese Haliburton' },
  
  // Clippers
  'Kawhi Leonard': { type: 'signing', date: '2019-07-10', fromTeam: 'TOR', notes: 'Signed as free agent from Raptors' },
  'Norman Powell': { type: 'trade', date: '2022-02-04', fromTeam: 'POR', notes: 'Traded from Blazers for Eric Bledsoe' },
  
  // Grizzlies
  'Ja Morant': { type: 'draft', date: '2019-06-20', notes: 'Drafted #2 overall' },
  'Jaren Jackson Jr.': { type: 'draft', date: '2018-06-21', notes: 'Drafted #4 overall' },
  'Desmond Bane': { type: 'draft', date: '2020-11-18', notes: 'Drafted #30 overall' },
  
  // Pelicans
  'Zion Williamson': { type: 'draft', date: '2019-06-20', notes: 'Drafted #1 overall' },
  'Brandon Ingram': { type: 'trade', date: '2019-07-06', fromTeam: 'LAL', notes: 'Traded from Lakers for Anthony Davis' },
  'CJ McCollum': { type: 'trade', date: '2022-02-08', fromTeam: 'POR', notes: 'Traded from Blazers for Josh Hart' },
  'Dejounte Murray': { type: 'trade', date: '2024-09-10', fromTeam: 'ATL', notes: 'Traded from Hawks for picks' },
  
  // Rockets
  'Jalen Green': { type: 'draft', date: '2021-07-29', notes: 'Drafted #2 overall' },
  'Alperen Sengun': { type: 'draft', date: '2021-07-29', notes: 'Drafted #16 overall' },
  'Amen Thompson': { type: 'draft', date: '2023-06-22', notes: 'Drafted #4 overall' },
  'Fred VanVleet': { type: 'signing', date: '2023-07-01', fromTeam: 'TOR', notes: 'Signed as free agent from Raptors' },
  
  // Spurs
  'Victor Wembanyama': { type: 'draft', date: '2023-06-22', notes: 'Drafted #1 overall' },
  'Chris Paul': { type: 'signing', date: '2024-07-01', fromTeam: 'GSW', notes: 'Signed as free agent from Warriors' },
  
  // Nets
  'Ben Simmons': { type: 'trade', date: '2022-02-10', fromTeam: 'PHI', notes: 'Traded from 76ers for James Harden' },
  'Cam Thomas': { type: 'draft', date: '2021-07-29', notes: 'Drafted #27 overall' },
  
  // Hawks (post-Trae)
  // Trae Young already handled in fix script
  
  // Bulls
  'Coby White': { type: 'draft', date: '2019-06-20', notes: 'Drafted #7 overall' },
  'Zach LaVine': { type: 'trade', date: '2017-06-22', fromTeam: 'MIN', notes: 'Traded from Wolves for Jimmy Butler' },
  
  // Hornets
  'LaMelo Ball': { type: 'draft', date: '2020-11-18', notes: 'Drafted #3 overall' },
  'Brandon Miller': { type: 'draft', date: '2023-06-22', notes: 'Drafted #2 overall' },
  
  // Pistons
  'Cade Cunningham': { type: 'draft', date: '2021-07-29', notes: 'Drafted #1 overall' },
  'Jaden Ivey': { type: 'draft', date: '2022-06-23', notes: 'Drafted #5 overall' },
  
  // Raptors
  'Scottie Barnes': { type: 'draft', date: '2021-07-29', notes: 'Drafted #4 overall' },
  'RJ Barrett': { type: 'trade', date: '2023-12-30', fromTeam: 'NYK', notes: 'Traded from Knicks for OG Anunoby' },
  'Immanuel Quickley': { type: 'trade', date: '2023-12-30', fromTeam: 'NYK', notes: 'Traded from Knicks for OG Anunoby' },
  
  // Jazz
  'Lauri Markkanen': { type: 'trade', date: '2022-09-01', fromTeam: 'CLE', notes: 'Traded from Cavaliers in Donovan Mitchell deal' },
  'Walker Kessler': { type: 'trade', date: '2022-07-06', fromTeam: 'MIN', notes: 'Traded from Wolves in Rudy Gobert deal' },
  
  // Wizards (post-deadline)
  // Trae Young and AD already handled
  
  // Trail Blazers
  'Anfernee Simons': { type: 'draft', date: '2018-06-21', notes: 'Drafted #24 overall' },
  'Scoot Henderson': { type: 'draft', date: '2023-06-22', notes: 'Drafted #3 overall' },
};

// Get all players without acquisition data
const playersWithoutAcq = db.prepare(`
  SELECT p.id, p.name, p.draft_year, p.draft_team_id, p.current_team_id,
         dt.abbreviation as draft_team, ct.abbreviation as current_team
  FROM players p
  LEFT JOIN teams dt ON p.draft_team_id = dt.id
  LEFT JOIN teams ct ON p.current_team_id = ct.id
  LEFT JOIN acquisitions a ON p.id = a.player_id
  WHERE a.id IS NULL
`).all();

console.log(`Found ${playersWithoutAcq.length} players without acquisition data`);

// Get next acquisition ID
let nextId = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 as next FROM acquisitions').get().next;

const insertAcq = db.prepare(`
  INSERT INTO acquisitions (id, player_id, team_id, acquisition_type, date, notes)
  VALUES (?, ?, ?, ?, ?, ?)
`);

db.exec('BEGIN TRANSACTION');

let added = 0;
let skipped = 0;

playersWithoutAcq.forEach(player => {
  const known = knownAcquisitions[player.name];
  
  if (known) {
    // Use known acquisition data
    insertAcq.run(
      nextId++,
      player.id,
      player.current_team_id,
      known.type,
      known.date,
      known.notes
    );
    console.log(`✓ ${player.name}: ${known.type} → ${player.current_team}`);
    added++;
  } else if (player.draft_team_id === player.current_team_id && player.current_team_id) {
    // Player is still with draft team
    const draftDate = `${player.draft_year}-06-25`; // Approximate draft date
    insertAcq.run(
      nextId++,
      player.id,
      player.current_team_id,
      'draft',
      draftDate,
      `Drafted by ${player.current_team}`
    );
    console.log(`✓ ${player.name}: draft (still with ${player.current_team})`);
    added++;
  } else if (player.current_team_id) {
    // Player moved teams but we don't have specific data - mark as unknown
    insertAcq.run(
      nextId++,
      player.id,
      player.current_team_id,
      'unknown',
      '2024-01-01',
      `Acquired by ${player.current_team} (details pending)`
    );
    console.log(`? ${player.name}: unknown → ${player.current_team} (needs research)`);
    added++;
  } else {
    console.log(`✗ ${player.name}: no current team, skipping`);
    skipped++;
  }
});

db.exec('COMMIT');

console.log(`\nDone! Added ${added} acquisitions, skipped ${skipped}`);

// Final count
const finalCount = db.prepare('SELECT COUNT(DISTINCT player_id) as count FROM acquisitions').get();
console.log(`Total players with acquisitions: ${finalCount.count}`);

db.close();

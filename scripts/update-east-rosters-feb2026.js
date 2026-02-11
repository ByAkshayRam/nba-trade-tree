const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data', 'acquisition-trees');

// Helper to create player slug
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// Clear old team files
function clearTeamFiles(team) {
  const files = fs.readdirSync(dataDir).filter(f => f.startsWith(team.toLowerCase() + '-'));
  files.forEach(f => fs.unlinkSync(path.join(dataDir, f)));
  console.log(`Cleared ${files.length} old files for ${team}`);
}

// Create a tree file
function createTree(team, player, acquisitionType, date, opts = {}) {
  const filename = `${team.toLowerCase()}-${slugify(player)}.json`;
  const originYear = opts.originYear || new Date(date).getFullYear();
  
  const treeNode = {
    type: "player",
    name: player,
    acquisitionType: acquisitionType,
    date: date,
    currentTeam: team,
    ...(opts.draftPick && { draftPick: opts.draftPick, draftRound: opts.draftRound || 1 }),
    ...(opts.tradePartner && { tradePartner: opts.tradePartner }),
    ...(opts.tradeDescription && { tradeDescription: opts.tradeDescription }),
    ...(opts.note && { note: opts.note }),
  };
  
  if (opts.assetsGivenUp) {
    treeNode.assetsGivenUp = opts.assetsGivenUp;
  }
  
  const tree = {
    "_meta": {
      "team": team,
      "player": player,
      "source": "ESPN/NBA Trade History - Feb 2026",
      "originYear": originYear,
      "depth": opts.depth || 1,
      "lastUpdated": "2026-02-11"
    },
    "tree": treeNode
  };
  
  fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(tree, null, 2));
  console.log(`  + ${player}`);
}

console.log('=== REBUILDING EASTERN CONFERENCE ROSTERS (Feb 2026) ===\n');

// ==================== ATLANTA HAWKS ====================
// Post-deadline: Trae Young OUT, CJ McCollum, Kuminga, Buddy Hield IN
console.log('ATL - Atlanta Hawks');
clearTeamFiles('ATL');

createTree('ATL', 'CJ McCollum', 'trade', '2026-02-06', {
  tradePartner: 'NOP', tradeDescription: 'Acquired from Pelicans at deadline', note: 'Veteran scorer',
  originYear: 2026, depth: 1
});
createTree('ATL', 'Jonathan Kuminga', 'trade', '2026-02-06', {
  tradePartner: 'GSW', tradeDescription: 'Acquired from Warriors', note: 'Young athletic forward',
  originYear: 2026, depth: 1
});
createTree('ATL', 'Buddy Hield', 'trade', '2026-02-06', {
  tradePartner: 'GSW', note: 'Sharpshooting guard', originYear: 2026, depth: 1
});
createTree('ATL', 'Jalen Johnson', 'draft', '2021-07-29', { draftPick: 20, note: 'Breakout All-Star candidate' });
createTree('ATL', 'Onyeka Okongwu', 'draft', '2020-11-18', { draftPick: 6, note: 'Athletic big man' });
createTree('ATL', 'Zaccharie Risacher', 'draft', '2024-06-26', { draftPick: 1, note: '#1 overall pick 2024' });
createTree('ATL', 'Dyson Daniels', 'trade', '2024-09-01', { tradePartner: 'NOP', note: 'Defensive guard' });
createTree('ATL', 'Corey Kispert', 'trade', '2026-02-06', { tradePartner: 'WAS', note: 'Sharpshooter' });
createTree('ATL', 'Nickeil Alexander-Walker', 'trade', '2024-02-08', { tradePartner: 'MIN' });
createTree('ATL', 'Gabe Vincent', 'free-agent', '2024-07-01', { note: 'Veteran guard' });
createTree('ATL', 'Jock Landale', 'free-agent', '2024-07-01', { note: 'Stretch big' });
createTree('ATL', 'Christian Koloko', 'free-agent', '2025-10-01');
createTree('ATL', 'Caleb Houstan', 'trade', '2025-02-01', { tradePartner: 'ORL' });
createTree('ATL', 'Mouhamed Gueye', 'draft', '2023-06-22', { draftPick: 39 });
createTree('ATL', 'Nikola Durisic', 'draft', '2024-06-26', { draftPick: 52 });
createTree('ATL', 'Asa Newell', 'draft', '2025-06-26', { draftPick: 11 });

// ==================== BROOKLYN NETS ====================
// Major rebuild: Cam Thomas OUT, MPJ IN
console.log('\nBKN - Brooklyn Nets');
clearTeamFiles('BKN');

createTree('BKN', 'Michael Porter Jr.', 'trade', '2026-02-06', {
  tradePartner: 'DEN', tradeDescription: 'Acquired from Nuggets at deadline', note: 'Scoring forward',
  originYear: 2026, depth: 1
});
createTree('BKN', 'Nic Claxton', 'draft', '2019-06-20', { draftPick: 31, draftRound: 2, note: 'Elite rim protector, team cornerstone' });
createTree('BKN', 'Day\'Ron Sharpe', 'draft', '2021-07-29', { draftPick: 29 });
createTree('BKN', 'Noah Clowney', 'draft', '2023-06-22', { draftPick: 49, draftRound: 2 });
createTree('BKN', 'Jalen Wilson', 'trade', '2024-02-08', { tradePartner: 'BKN' });
createTree('BKN', 'Ziaire Williams', 'trade', '2024-07-01', { tradePartner: 'MEM' });
createTree('BKN', 'Terance Mann', 'trade', '2025-02-08', { tradePartner: 'LAC' });
createTree('BKN', 'Ochai Agbaji', 'trade', '2026-02-06', { tradePartner: 'TOR' });
createTree('BKN', 'Egor Demin', 'draft', '2025-06-26', { draftPick: 9 });
createTree('BKN', 'Nolan Traore', 'draft', '2025-06-26', { draftPick: 12 });
createTree('BKN', 'Danny Wolf', 'draft', '2025-06-26', { draftPick: 33, draftRound: 2 });
createTree('BKN', 'Drake Powell', 'draft', '2025-06-26', { draftPick: 24 });
createTree('BKN', 'Ben Saraf', 'draft', '2025-06-26', { draftPick: 37, draftRound: 2 });

// ==================== BOSTON CELTICS ====================
// Stable roster - champions
console.log('\nBOS - Boston Celtics');
// Keep existing BOS files - they're accurate and have deep trade chains

// ==================== CHARLOTTE HORNETS ====================
console.log('\nCHA - Charlotte Hornets');
clearTeamFiles('CHA');

createTree('CHA', 'LaMelo Ball', 'draft', '2020-11-18', { draftPick: 3, note: 'All-Star franchise player' });
createTree('CHA', 'Brandon Miller', 'draft', '2023-06-22', { draftPick: 2, note: 'Two-way wing' });
createTree('CHA', 'Miles Bridges', 'draft', '2018-06-21', { draftPick: 12 });
createTree('CHA', 'Coby White', 'trade', '2026-02-06', {
  tradePartner: 'CHI', tradeDescription: 'Acquired from Bulls at deadline', note: 'Scoring guard',
  originYear: 2026, depth: 1
});
createTree('CHA', 'Tre Mann', 'trade', '2024-02-08', { tradePartner: 'OKC' });
createTree('CHA', 'Grant Williams', 'trade', '2023-07-06', { tradePartner: 'DAL' });
createTree('CHA', 'Josh Green', 'trade', '2024-02-08', { tradePartner: 'DAL' });
createTree('CHA', 'Pat Connaughton', 'trade', '2026-02-06', { tradePartner: 'MIL' });
createTree('CHA', 'Tidjane Salaun', 'draft', '2024-06-26', { draftPick: 6 });
createTree('CHA', 'Moussa Diabate', 'free-agent', '2023-07-01');
createTree('CHA', 'Malaki Branham', 'trade', '2025-02-08', { tradePartner: 'SAS' });
createTree('CHA', 'Kon Knueppel', 'draft', '2025-06-26', { draftPick: 14 });
createTree('CHA', 'Liam McNeeley', 'draft', '2025-06-26', { draftPick: 45, draftRound: 2 });
createTree('CHA', 'Xavier Tillman', 'free-agent', '2024-07-01');
createTree('CHA', 'Antonio Reeves', 'draft', '2025-06-26', { draftPick: 43, draftRound: 2 });

// ==================== CHICAGO BULLS ====================
// Massive overhaul: LaVine OUT, Simons + Ivey IN
console.log('\nCHI - Chicago Bulls');
clearTeamFiles('CHI');

createTree('CHI', 'Anfernee Simons', 'trade', '2026-02-06', {
  tradePartner: 'POR', tradeDescription: 'Acquired from Trail Blazers at deadline', note: 'Scoring guard',
  originYear: 2026, depth: 1
});
createTree('CHI', 'Jaden Ivey', 'trade', '2026-02-06', {
  tradePartner: 'DET', tradeDescription: 'Acquired from Pistons at deadline', note: 'Explosive guard',
  assetsGivenUp: [
    { type: "pick", name: "2026 1st Round Pick", acquisitionType: "original", date: "2026-02-06", isOrigin: true }
  ],
  originYear: 2026, depth: 2
});
createTree('CHI', 'Josh Giddey', 'trade', '2024-06-20', {
  tradePartner: 'OKC', tradeDescription: 'Bulls trade Alex Caruso for Giddey', note: 'Young playmaker',
  assetsGivenUp: [
    { type: "player", name: "Alex Caruso", acquisitionType: "trade", date: "2021-08-11", tradePartner: "LAL", isOrigin: true }
  ],
  originYear: 2021, depth: 2
});
createTree('CHI', 'Patrick Williams', 'draft', '2020-11-18', { draftPick: 4, note: 'Athletic forward' });
createTree('CHI', 'Matas Buzelis', 'draft', '2024-06-26', { draftPick: 11 });
createTree('CHI', 'Jalen Smith', 'free-agent', '2023-07-01');
createTree('CHI', 'Isaac Okoro', 'trade', '2026-02-06', { tradePartner: 'CLE' });
createTree('CHI', 'Collin Sexton', 'trade', '2026-02-06', { tradePartner: 'UTA' });
createTree('CHI', 'Nick Richards', 'trade', '2026-02-06', { tradePartner: 'CHA' });
createTree('CHI', 'Zach Collins', 'free-agent', '2024-07-01');
createTree('CHI', 'Tre Jones', 'trade', '2025-02-08', { tradePartner: 'SAS' });
createTree('CHI', 'Rob Dillingham', 'trade', '2026-02-06', { tradePartner: 'MIN' });
createTree('CHI', 'Guerschon Yabusele', 'free-agent', '2024-07-01');
createTree('CHI', 'Noa Essengue', 'draft', '2025-06-26', { draftPick: 17 });
createTree('CHI', 'Leonard Miller', 'draft', '2023-06-22', { draftPick: 33, draftRound: 2 });

// ==================== CLEVELAND CAVALIERS ====================
// Harden IN, Garland OUT
console.log('\nCLE - Cleveland Cavaliers');
clearTeamFiles('CLE');

createTree('CLE', 'Donovan Mitchell', 'trade', '2022-09-01', {
  tradePartner: 'UTA', tradeDescription: 'Blockbuster: Markkanen, Sexton, picks for Mitchell', note: '3x All-Star',
  assetsGivenUp: [
    { type: "player", name: "Collin Sexton", acquisitionType: "draft", date: "2018-06-21", draftPick: 8, isOrigin: true },
    { type: "pick", name: "2025 1st Round Pick", acquisitionType: "original", date: "2022-09-01", isOrigin: true }
  ],
  originYear: 2018, depth: 2
});
createTree('CLE', 'Evan Mobley', 'draft', '2021-07-29', { draftPick: 3, note: 'DPOY candidate, All-Star' });
createTree('CLE', 'Jarrett Allen', 'trade', '2021-01-14', {
  tradePartner: 'BKN', tradeDescription: '4-team Harden trade', note: 'All-Star center',
  originYear: 2021, depth: 1
});
createTree('CLE', 'James Harden', 'trade', '2026-02-06', {
  tradePartner: 'LAC', tradeDescription: 'Blockbuster deadline deal', note: 'MVP, scoring champion',
  assetsGivenUp: [
    { type: "player", name: "Darius Garland", acquisitionType: "draft", date: "2019-06-20", draftPick: 5, note: "All-Star traded for Harden", isOrigin: true },
    { type: "pick", name: "2027 1st Round Pick", acquisitionType: "original", date: "2026-02-06", isOrigin: true }
  ],
  originYear: 2019, depth: 2
});
createTree('CLE', 'Max Strus', 'free-agent', '2023-07-01', { note: 'Elite shooter from Miami' });
createTree('CLE', 'Dennis Schroder', 'trade', '2026-02-06', { tradePartner: 'BKN' });
createTree('CLE', 'Dean Wade', 'free-agent', '2021-10-01', { note: 'Homegrown role player' });
createTree('CLE', 'Sam Merrill', 'free-agent', '2023-07-01');
createTree('CLE', 'Craig Porter Jr.', 'free-agent', '2023-09-01');
createTree('CLE', 'Jaylon Tyson', 'draft', '2024-06-26', { draftPick: 20 });
createTree('CLE', 'Thomas Bryant', 'free-agent', '2025-07-01');
createTree('CLE', 'Larry Nance Jr.', 'trade', '2026-02-06', { tradePartner: 'ATL' });
createTree('CLE', 'Keon Ellis', 'trade', '2026-02-06', { tradePartner: 'SAC' });
createTree('CLE', 'Tyrese Proctor', 'draft', '2025-06-26', { draftPick: 36, draftRound: 2 });

// ==================== DETROIT PISTONS ====================
// Ivey OUT, Duncan Robinson IN
console.log('\nDET - Detroit Pistons');
clearTeamFiles('DET');

createTree('DET', 'Cade Cunningham', 'draft', '2021-07-29', { draftPick: 1, note: '#1 overall, franchise cornerstone, All-Star' });
createTree('DET', 'Jalen Duren', 'trade', '2022-06-23', {
  tradePartner: 'CHA', tradeDescription: 'Draft night trade', note: 'Athletic center',
  assetsGivenUp: [
    { type: "pick", name: "2022 #13 Pick", acquisitionType: "original", date: "2022-06-23", isOrigin: true }
  ],
  originYear: 2022, depth: 2
});
createTree('DET', 'Ausar Thompson', 'draft', '2023-06-22', { draftPick: 5, note: 'Athletic wing' });
createTree('DET', 'Ron Holland II', 'draft', '2024-06-26', { draftPick: 5 });
createTree('DET', 'Tobias Harris', 'free-agent', '2024-07-06', { note: 'Veteran scorer' });
createTree('DET', 'Isaiah Stewart', 'draft', '2020-11-18', { draftPick: 16 });
createTree('DET', 'Marcus Sasser', 'draft', '2023-06-22', { draftPick: 25 });
createTree('DET', 'Duncan Robinson', 'trade', '2026-02-06', {
  tradePartner: 'MIA', tradeDescription: 'Deadline acquisition', note: 'Elite shooter',
  originYear: 2026, depth: 1
});
createTree('DET', 'Kevin Huerter', 'trade', '2026-02-06', { tradePartner: 'SAC' });
createTree('DET', 'Caris LeVert', 'trade', '2026-02-06', { tradePartner: 'CLE' });
createTree('DET', 'Paul Reed', 'trade', '2026-02-06', { tradePartner: 'PHI' });
createTree('DET', 'Dario Saric', 'free-agent', '2025-07-01');
createTree('DET', 'Wendell Moore Jr.', 'draft', '2022-06-23', { draftPick: 26 });
createTree('DET', 'Bobi Klintman', 'draft', '2023-06-22', { draftPick: 37, draftRound: 2 });
createTree('DET', 'Daniss Jenkins', 'draft', '2025-06-26', { draftPick: 42, draftRound: 2 });

// ==================== INDIANA PACERS ====================
// Turner OUT to MIL
console.log('\nIND - Indiana Pacers');
clearTeamFiles('IND');

createTree('IND', 'Tyrese Haliburton', 'trade', '2022-02-08', {
  tradePartner: 'SAC', tradeDescription: 'Pacers trade Sabonis for Haliburton', note: 'All-Star, best trade in Pacers history',
  assetsGivenUp: [
    { type: "player", name: "Domantas Sabonis", acquisitionType: "trade", date: "2017-07-07", tradePartner: "OKC", note: "Came in Paul George trade",
      assetsGivenUp: [{ type: "player", name: "Paul George", acquisitionType: "draft", date: "2010-06-24", draftPick: 10, note: "7x All-Star", isOrigin: true }]
    }
  ],
  originYear: 2010, depth: 3
});
createTree('IND', 'Pascal Siakam', 'trade', '2024-01-17', {
  tradePartner: 'TOR', tradeDescription: 'Deadline blockbuster', note: 'All-Star forward, champion',
  assetsGivenUp: [
    { type: "pick", name: "2024 1st Round Pick", acquisitionType: "original", date: "2024-01-17", isOrigin: true }
  ],
  originYear: 2024, depth: 2
});
createTree('IND', 'Andrew Nembhard', 'draft', '2022-06-23', { draftPick: 31, draftRound: 2, note: 'Clutch playoff performer' });
createTree('IND', 'Ivica Zubac', 'trade', '2026-02-06', { tradePartner: 'LAC', note: 'Solid center' });
createTree('IND', 'T.J. McConnell', 'free-agent', '2019-07-06', { note: 'Fan favorite' });
createTree('IND', 'Aaron Nesmith', 'trade', '2022-02-08', { tradePartner: 'BOS' });
createTree('IND', 'Obi Toppin', 'trade', '2023-06-23', { tradePartner: 'NYK' });
createTree('IND', 'Jarace Walker', 'draft', '2023-06-22', { draftPick: 8 });
createTree('IND', 'Ben Sheppard', 'draft', '2023-06-22', { draftPick: 26 });
createTree('IND', 'Johnny Furphy', 'draft', '2024-06-26', { draftPick: 35, draftRound: 2 });
createTree('IND', 'Kam Jones', 'draft', '2025-06-26', { draftPick: 28 });
createTree('IND', 'Kobe Brown', 'free-agent', '2024-07-01');

// ==================== MIAMI HEAT ====================
// Butler OUT, Wiggins + Powell IN
console.log('\nMIA - Miami Heat');
clearTeamFiles('MIA');

createTree('MIA', 'Bam Adebayo', 'draft', '2017-06-22', { draftPick: 14, note: '3x All-Star, DPOY candidate, Heat Culture' });
createTree('MIA', 'Tyler Herro', 'draft', '2019-06-20', { draftPick: 13, note: '6MOTY, elite scorer' });
createTree('MIA', 'Andrew Wiggins', 'trade', '2026-02-06', {
  tradePartner: 'GSW', tradeDescription: 'Part of Jimmy Butler mega-deal', note: 'Champion, All-Star starter',
  assetsGivenUp: [
    { type: "player", name: "Jimmy Butler", acquisitionType: "trade", date: "2019-07-06", tradePartner: "PHI", note: "6x All-Star, traded at deadline", isOrigin: true }
  ],
  originYear: 2019, depth: 2
});
createTree('MIA', 'Norman Powell', 'trade', '2026-02-06', { tradePartner: 'LAC', note: 'Scoring guard' });
createTree('MIA', 'Terry Rozier', 'trade', '2024-02-08', { tradePartner: 'CHA', note: 'Scoring guard' });
createTree('MIA', 'Jaime Jaquez Jr.', 'draft', '2023-06-22', { draftPick: 18, note: 'All-Rookie, Heat Culture' });
createTree('MIA', 'Nikola Jovic', 'draft', '2022-06-23', { draftPick: 27 });
createTree('MIA', 'Kel\'el Ware', 'draft', '2024-06-26', { draftPick: 15 });
createTree('MIA', 'Pelle Larsson', 'draft', '2023-06-22', { draftPick: 44, draftRound: 2 });
createTree('MIA', 'Davion Mitchell', 'trade', '2026-02-06', { tradePartner: 'SAC' });
createTree('MIA', 'Simone Fontecchio', 'trade', '2026-02-06', { tradePartner: 'DET' });
createTree('MIA', 'Kasparas Jakucionis', 'draft', '2025-06-26', { draftPick: 19 });
createTree('MIA', 'Keshad Johnson', 'free-agent', '2025-07-01');
createTree('MIA', 'Dru Smith', 'free-agent', '2024-07-01');

// ==================== MILWAUKEE BUCKS ====================
// Dame OUT, Cam Thomas + Turner IN
console.log('\nMIL - Milwaukee Bucks');
clearTeamFiles('MIL');

createTree('MIL', 'Giannis Antetokounmpo', 'draft', '2013-06-27', { draftPick: 15, note: '2x MVP, DPOY, 2021 Champion, Finals MVP' });
createTree('MIL', 'Cam Thomas', 'trade', '2026-02-06', {
  tradePartner: 'BKN', tradeDescription: 'Deadline deal for young scorer', note: 'Elite bucket getter',
  assetsGivenUp: [
    { type: "player", name: "Damian Lillard", acquisitionType: "trade", date: "2023-09-27", tradePartner: "POR", note: "Superstar traded after 1.5 seasons", isOrigin: true }
  ],
  originYear: 2023, depth: 2
});
createTree('MIL', 'Myles Turner', 'trade', '2026-02-06', {
  tradePartner: 'IND', tradeDescription: 'Deadline acquisition', note: 'Elite shot blocker',
  originYear: 2026, depth: 1
});
createTree('MIL', 'Kyle Kuzma', 'trade', '2026-02-06', { tradePartner: 'WAS', note: 'Scoring forward' });
createTree('MIL', 'Bobby Portis', 'free-agent', '2020-11-29', { note: 'Fan favorite, 2021 champion' });
createTree('MIL', 'Gary Trent Jr.', 'free-agent', '2024-07-01');
createTree('MIL', 'Gary Harris', 'free-agent', '2025-07-01');
createTree('MIL', 'Andre Jackson Jr.', 'draft', '2023-06-22', { draftPick: 36, draftRound: 2 });
createTree('MIL', 'Ryan Rollins', 'draft', '2022-06-23', { draftPick: 44, draftRound: 2 });
createTree('MIL', 'Taurean Prince', 'free-agent', '2025-07-01');
createTree('MIL', 'Kevin Porter Jr.', 'free-agent', '2025-10-01');
createTree('MIL', 'AJ Green', 'free-agent', '2024-07-01');
createTree('MIL', 'Ousmane Dieng', 'trade', '2025-02-08', { tradePartner: 'OKC' });
createTree('MIL', 'Thanasis Antetokounmpo', 'free-agent', '2019-07-22', { note: 'Giannis brother' });
createTree('MIL', 'Alex Antetokounmpo', 'free-agent', '2025-10-01', { note: 'Giannis brother' });
createTree('MIL', 'Jericho Sims', 'free-agent', '2025-07-01');

// ==================== NEW YORK KNICKS ====================
// Stable contender roster
console.log('\nNYK - New York Knicks');
// Keep existing NYK files - they're mostly accurate

// ==================== ORLANDO MAGIC ====================
// Desmond Bane IN
console.log('\nORL - Orlando Magic');
clearTeamFiles('ORL');

createTree('ORL', 'Paolo Banchero', 'draft', '2022-06-23', { draftPick: 1, note: '#1 overall, ROY, All-Star' });
createTree('ORL', 'Franz Wagner', 'draft', '2021-07-29', { draftPick: 8, note: 'All-Star level wing' });
createTree('ORL', 'Jalen Suggs', 'draft', '2021-07-29', { draftPick: 5, note: 'Elite defender' });
createTree('ORL', 'Wendell Carter Jr.', 'trade', '2021-03-25', {
  tradePartner: 'CHI', tradeDescription: 'Part of Vucevic deal', note: 'Two-way center',
  assetsGivenUp: [
    { type: "player", name: "Nikola Vucevic", acquisitionType: "trade", date: "2012-08-10", tradePartner: "PHI", note: "Came in Dwight Howard trade",
      assetsGivenUp: [{ type: "player", name: "Dwight Howard", acquisitionType: "draft", date: "2004-06-24", draftPick: 1, note: "#1 overall pick", isOrigin: true }]
    }
  ],
  originYear: 2004, depth: 3
});
createTree('ORL', 'Desmond Bane', 'trade', '2026-02-06', {
  tradePartner: 'MEM', tradeDescription: 'Major deadline acquisition', note: 'All-Star level scorer',
  originYear: 2026, depth: 1
});
createTree('ORL', 'Anthony Black', 'draft', '2023-06-22', { draftPick: 6 });
createTree('ORL', 'Jett Howard', 'draft', '2023-06-22', { draftPick: 11 });
createTree('ORL', 'Tristan da Silva', 'draft', '2024-06-26', { draftPick: 18 });
createTree('ORL', 'Jonathan Isaac', 'draft', '2017-06-22', { draftPick: 6, note: 'DPOY potential when healthy' });
createTree('ORL', 'Moritz Wagner', 'trade', '2021-03-25', { tradePartner: 'BOS' });
createTree('ORL', 'Goga Bitadze', 'trade', '2023-07-06', { tradePartner: 'IND' });
createTree('ORL', 'Jevon Carter', 'free-agent', '2025-07-01');
createTree('ORL', 'Jase Richardson', 'draft', '2025-06-26', { draftPick: 21 });
createTree('ORL', 'Colin Castleton', 'free-agent', '2024-07-01');

// ==================== PHILADELPHIA 76ERS ====================
console.log('\nPHI - Philadelphia 76ers');
clearTeamFiles('PHI');

createTree('PHI', 'Joel Embiid', 'draft', '2014-06-26', { draftPick: 3, note: 'MVP, 7x All-Star, Process success' });
createTree('PHI', 'Tyrese Maxey', 'draft', '2020-11-18', { draftPick: 21, note: 'All-Star, MIP, franchise cornerstone' });
createTree('PHI', 'Paul George', 'free-agent', '2024-07-01', { note: '9x All-Star, chose Philly' });
createTree('PHI', 'Kelly Oubre Jr.', 'free-agent', '2023-07-01', { note: 'Athletic wing scorer' });
createTree('PHI', 'Kyle Lowry', 'trade', '2024-02-08', { tradePartner: 'MIA', note: 'Veteran leader' });
createTree('PHI', 'Andre Drummond', 'free-agent', '2024-07-01', { note: 'Backup center' });
createTree('PHI', 'Adem Bona', 'draft', '2024-06-26', { draftPick: 41, draftRound: 2 });
createTree('PHI', 'Quentin Grimes', 'trade', '2026-02-06', { tradePartner: 'DAL' });
createTree('PHI', 'Dalen Terry', 'trade', '2026-02-06', { tradePartner: 'CHI' });
createTree('PHI', 'Trendon Watford', 'trade', '2026-02-06', { tradePartner: 'BKN' });
createTree('PHI', 'MarJon Beauchamp', 'trade', '2026-02-06', { tradePartner: 'MIL' });
createTree('PHI', 'Justin Edwards', 'draft', '2024-06-26', { draftPick: 22 });
createTree('PHI', 'VJ Edgecombe', 'draft', '2025-06-26', { draftPick: 8 });
createTree('PHI', 'Johni Broome', 'draft', '2025-06-26', { draftPick: 25 });
createTree('PHI', 'Jabari Walker', 'trade', '2025-02-08', { tradePartner: 'POR' });
createTree('PHI', 'Patrick Baldwin Jr.', 'free-agent', '2025-07-01');
createTree('PHI', 'Dominick Barlow', 'free-agent', '2025-07-01');

// ==================== TORONTO RAPTORS ====================
// Ingram IN
console.log('\nTOR - Toronto Raptors');
clearTeamFiles('TOR');

createTree('TOR', 'Scottie Barnes', 'draft', '2021-07-29', { draftPick: 4, note: 'ROY, All-Star, franchise player' });
createTree('TOR', 'RJ Barrett', 'trade', '2023-12-30', {
  tradePartner: 'NYK', tradeDescription: 'Barrett and Quickley for Anunoby', note: 'Canadian star homecoming',
  assetsGivenUp: [
    { type: "player", name: "OG Anunoby", acquisitionType: "draft", date: "2017-06-22", draftPick: 23, note: "Developed into elite 3&D", isOrigin: true }
  ],
  originYear: 2017, depth: 2
});
createTree('TOR', 'Immanuel Quickley', 'trade', '2023-12-30', { tradePartner: 'NYK', note: 'Came with RJ Barrett' });
createTree('TOR', 'Brandon Ingram', 'trade', '2026-02-06', {
  tradePartner: 'NOP', tradeDescription: 'Major deadline acquisition', note: 'All-Star scorer',
  originYear: 2026, depth: 1
});
createTree('TOR', 'Jakob Poeltl', 'trade', '2023-02-09', { tradePartner: 'SAS', note: 'Returned to Toronto' });
createTree('TOR', 'Gradey Dick', 'draft', '2023-06-22', { draftPick: 13, note: 'Sharpshooter' });
createTree('TOR', 'Ja\'Kobe Walter', 'draft', '2024-06-26', { draftPick: 19 });
createTree('TOR', 'Garrett Temple', 'free-agent', '2024-09-01');
createTree('TOR', 'Jonathan Mogbo', 'free-agent', '2024-07-01');
createTree('TOR', 'Jamal Shead', 'draft', '2024-06-26', { draftPick: 45, draftRound: 2 });
createTree('TOR', 'Trayce Jackson-Davis', 'free-agent', '2024-07-01');
createTree('TOR', 'Collin Murray-Boyles', 'draft', '2025-06-26', { draftPick: 7 });
createTree('TOR', 'Jamison Battle', 'free-agent', '2024-07-01');

// ==================== WASHINGTON WIZARDS ====================
// Trae Young + AD IN (confirmed real trades!)
console.log('\nWAS - Washington Wizards');
clearTeamFiles('WAS');

createTree('WAS', 'Trae Young', 'trade', '2026-02-06', {
  tradePartner: 'ATL', tradeDescription: 'Blockbuster deadline deal', note: '3x All-Star, elite playmaker',
  assetsGivenUp: [
    { type: "pick", name: "2026 1st Round Pick", acquisitionType: "original", date: "2026-02-06", isOrigin: true },
    { type: "pick", name: "2028 1st Round Pick", acquisitionType: "original", date: "2026-02-06", isOrigin: true },
    { type: "player", name: "Corey Kispert", acquisitionType: "draft", date: "2021-07-29", draftPick: 15, isOrigin: true }
  ],
  originYear: 2021, depth: 2
});
createTree('WAS', 'Anthony Davis', 'trade', '2026-02-06', {
  tradePartner: 'LAL', tradeDescription: 'Massive deadline blockbuster', note: '9x All-Star, Champion',
  assetsGivenUp: [
    { type: "pick", name: "2027 1st Round Pick", acquisitionType: "original", date: "2026-02-06", isOrigin: true },
    { type: "pick", name: "2029 1st Round Pick", acquisitionType: "original", date: "2026-02-06", isOrigin: true },
    { type: "player", name: "Kyle Kuzma", acquisitionType: "trade", date: "2021-08-02", tradePartner: "LAL", isOrigin: true }
  ],
  originYear: 2021, depth: 2
});
createTree('WAS', 'Alex Sarr', 'draft', '2024-06-26', { draftPick: 2, note: '#2 overall pick, future anchor' });
createTree('WAS', 'Bilal Coulibaly', 'draft', '2023-06-22', { draftPick: 7, note: 'Two-way wing potential' });
createTree('WAS', 'Bub Carrington', 'draft', '2024-06-26', { draftPick: 14 });
createTree('WAS', 'Tre Johnson', 'draft', '2025-06-26', { draftPick: 4, note: 'Lottery pick' });
createTree('WAS', 'Kyshawn George', 'draft', '2024-06-26', { draftPick: 24 });
createTree('WAS', 'Will Riley', 'draft', '2025-06-26', { draftPick: 22 });
createTree('WAS', 'D\'Angelo Russell', 'trade', '2026-02-06', { tradePartner: 'LAL', note: 'Part of AD deal' });
createTree('WAS', 'Jaden Hardy', 'trade', '2025-02-08', { tradePartner: 'DAL' });
createTree('WAS', 'Justin Champagnie', 'free-agent', '2024-07-01');
createTree('WAS', 'Sharife Cooper', 'free-agent', '2024-07-01');
createTree('WAS', 'Anthony Gill', 'free-agent', '2021-10-01');
createTree('WAS', 'Skal Labissiere', 'free-agent', '2025-10-01');
createTree('WAS', 'Cam Whitmore', 'draft', '2023-06-22', { draftPick: 20 });
createTree('WAS', 'Tristan Vukcevic', 'free-agent', '2024-07-01');
createTree('WAS', 'Jamir Watkins', 'free-agent', '2025-07-01');
createTree('WAS', 'Keshon Gilbert', 'free-agent', '2025-07-01');

console.log('\n✅ All Eastern Conference rosters updated for February 2026!');
console.log('Total teams: 15 (BOS and NYK kept existing data)');

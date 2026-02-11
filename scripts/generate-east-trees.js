const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data', 'acquisition-trees');

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function createSimpleTree(team, player, acquisitionType, date, opts = {}) {
  const filename = `${team.toLowerCase()}-${slugify(player)}.json`;
  const originYear = opts.originYear || new Date(date).getFullYear();
  
  const treeNode = {
    type: "player",
    name: player,
    acquisitionType: acquisitionType,
    date: date,
    currentTeam: team,
    ...(opts.draftPick && { draftPick: opts.draftPick, draftRound: 1 }),
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
      "source": "NBA/ESPN Trade History Research",
      "originYear": originYear,
      "depth": opts.depth || 1,
      "lastUpdated": "2026-02-11"
    },
    "tree": treeNode
  };
  
  fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(tree, null, 2));
  console.log(`Created: ${filename}`);
}

console.log('Generating Eastern Conference acquisition trees...\n');

// ==================== ATLANTA HAWKS ====================
console.log('=== ATL ===');
createSimpleTree('ATL', 'Trae Young', 'draft', '2018-06-21', {
  draftPick: 5, note: 'Traded pick with DAL - Luka for Trae swap', originYear: 2018, depth: 3,
  assetsGivenUp: [
    { type: "pick", name: "2018 #3 Pick (traded to DAL)", acquisitionType: "trade", date: "2018-06-21", tradePartner: "DAL", becamePlayer: "Luka Doncic", tradeDescription: "Hawks trade #3 (Doncic) for #5 (Young) and 2019 1st", isOrigin: true }
  ]
});
createSimpleTree('ATL', 'Dejounte Murray', 'trade', '2022-06-29', {
  tradePartner: 'SAS', tradeDescription: 'Hawks trade Danilo Gallinari, 3 1sts for Murray', note: 'All-Star acquisition', originYear: 2020, depth: 2,
  assetsGivenUp: [
    { type: "player", name: "Danilo Gallinari", acquisitionType: "free-agent", date: "2020-11-21", isOrigin: true },
    { type: "pick", name: "2023 1st Round Pick", acquisitionType: "original", date: "2022-06-29", isOrigin: true }
  ]
});
createSimpleTree('ATL', "De'Andre Hunter", 'draft', '2019-06-20', { draftPick: 4, note: 'Selected with pick from DAL/Trae trade' });
createSimpleTree('ATL', 'Jalen Johnson', 'draft', '2021-07-29', { draftPick: 20, note: 'Rising star, breakout 2024 season' });
createSimpleTree('ATL', 'Clint Capela', 'trade', '2020-02-05', {
  tradePartner: 'HOU', tradeDescription: '4-team trade involving Robert Covington', note: 'Elite rim protector', originYear: 2020, depth: 2,
  assetsGivenUp: [{ type: "pick", name: "2020 1st Round Pick", acquisitionType: "original", date: "2020-02-05", isOrigin: true }]
});
createSimpleTree('ATL', 'Bogdan Bogdanovic', 'free-agent', '2020-11-21', { note: 'Signed from Sacramento in RFA' });
createSimpleTree('ATL', 'Onyeka Okongwu', 'draft', '2020-11-18', { draftPick: 6, note: 'Athletic big man' });
createSimpleTree('ATL', 'Garrison Mathews', 'free-agent', '2023-07-01', { note: 'Signed from Houston' });
createSimpleTree('ATL', 'Kobe Bufkin', 'draft', '2023-06-22', { draftPick: 15 });
createSimpleTree('ATL', 'Zaccharie Risacher', 'draft', '2024-06-26', { draftPick: 1, note: '#1 overall pick' });
createSimpleTree('ATL', 'David Roddy', 'trade', '2024-02-08', { tradePartner: 'MEM', note: 'Trade deadline acquisition' });
createSimpleTree('ATL', 'Vit Krejci', 'trade', '2023-02-09', { tradePartner: 'OKC' });

// ==================== BROOKLYN NETS ====================
console.log('\n=== BKN ===');
createSimpleTree('BKN', 'Cam Thomas', 'draft', '2021-07-29', { draftPick: 27, note: 'Elite scorer emerging from rebuild' });
createSimpleTree('BKN', 'Nic Claxton', 'draft', '2019-06-20', { draftPick: 31, note: 'Developed into elite rim protector' });
createSimpleTree('BKN', 'Ben Simmons', 'trade', '2022-02-10', {
  tradePartner: 'PHI', tradeDescription: 'Harden-Simmons blockbuster', note: "Hasn't lived up to potential", originYear: 2017, depth: 3,
  assetsGivenUp: [
    { type: "player", name: "James Harden", acquisitionType: "trade", date: "2021-01-14", tradePartner: "HOU", note: "Nets gave up Jarrett Allen, picks", isOrigin: true }
  ]
});
createSimpleTree('BKN', 'Dennis Schroder', 'free-agent', '2024-07-06', { note: 'Veteran PG signing' });
createSimpleTree('BKN', 'Dorian Finney-Smith', 'trade', '2022-12-25', { tradePartner: 'DAL', note: 'Came with Spencer Dinwiddie' });
createSimpleTree('BKN', "Day'Ron Sharpe", 'draft', '2021-07-29', { draftPick: 29 });
createSimpleTree('BKN', 'Trendon Watford', 'free-agent', '2022-04-10', { note: 'Undrafted, signed after 10-day' });
createSimpleTree('BKN', 'Keon Johnson', 'trade', '2023-02-09', { tradePartner: 'POR' });
createSimpleTree('BKN', 'Dariq Whitehead', 'draft', '2023-06-22', { draftPick: 22 });
createSimpleTree('BKN', 'Jalen Wilson', 'trade', '2024-02-08', { tradePartner: 'BKN' });
createSimpleTree('BKN', 'Noah Clowney', 'draft', '2023-06-22', { draftPick: 49 });
createSimpleTree('BKN', 'Cameron Johnson', 'trade', '2022-12-25', {
  tradePartner: 'PHO', tradeDescription: 'Durant trade package', note: 'Part of KD deal', originYear: 2023, depth: 2,
  assetsGivenUp: [{ type: "player", name: "Kevin Durant", acquisitionType: "free-agent", date: "2019-07-07", note: "Signed in FA, later traded", isOrigin: true }]
});
createSimpleTree('BKN', 'Mikal Bridges', 'trade', '2022-12-25', { tradePartner: 'PHO', note: 'Part of KD deal' });

// ==================== CHARLOTTE HORNETS ====================
console.log('\n=== CHA ===');
createSimpleTree('CHA', 'LaMelo Ball', 'draft', '2020-11-18', { draftPick: 3, note: 'ROY, All-Star, franchise cornerstone' });
createSimpleTree('CHA', 'Brandon Miller', 'draft', '2023-06-22', { draftPick: 2, note: 'Two-way wing, ROY candidate' });
createSimpleTree('CHA', 'Miles Bridges', 'draft', '2018-06-21', { draftPick: 12, note: 'Returned after suspension' });
createSimpleTree('CHA', 'Mark Williams', 'draft', '2022-06-23', { draftPick: 15, note: 'Athletic center' });
createSimpleTree('CHA', 'Tre Mann', 'trade', '2024-02-08', { tradePartner: 'OKC', note: 'Trade deadline pickup' });
createSimpleTree('CHA', 'Grant Williams', 'trade', '2023-07-06', { tradePartner: 'DAL', note: 'Sign-and-trade' });
createSimpleTree('CHA', 'Nick Richards', 'draft', '2020-11-18', { draftPick: 42 });
createSimpleTree('CHA', 'Cody Martin', 'free-agent', '2019-07-09', { note: 'Undrafted, signed after summer league' });
createSimpleTree('CHA', 'Vasilije Micic', 'free-agent', '2023-07-01', { note: 'EuroLeague MVP' });
createSimpleTree('CHA', 'Tidjane Salaun', 'draft', '2024-06-26', { draftPick: 6 });
createSimpleTree('CHA', 'Josh Green', 'trade', '2024-02-08', { tradePartner: 'DAL' });

// ==================== CHICAGO BULLS ====================
console.log('\n=== CHI ===');
createSimpleTree('CHI', 'Zach LaVine', 'trade', '2017-06-22', {
  tradePartner: 'MIN', tradeDescription: 'Butler trade', note: '2x All-Star, came in Jimmy Butler trade', originYear: 2011, depth: 2,
  assetsGivenUp: [{ type: "player", name: "Jimmy Butler", acquisitionType: "draft", date: "2011-06-23", draftPick: 30, note: "Bulls developed into All-Star", isOrigin: true }]
});
createSimpleTree('CHI', 'Coby White', 'draft', '2019-06-20', { draftPick: 7, note: 'Improved scorer' });
createSimpleTree('CHI', 'Patrick Williams', 'draft', '2020-11-18', { draftPick: 4, note: 'Athletic forward' });
createSimpleTree('CHI', 'Nikola Vucevic', 'trade', '2021-03-25', {
  tradePartner: 'ORL', tradeDescription: 'Bulls trade picks and Wendell Carter Jr.', note: 'All-Star center', originYear: 2018, depth: 2,
  assetsGivenUp: [{ type: "player", name: "Wendell Carter Jr.", acquisitionType: "draft", date: "2018-06-21", draftPick: 7, isOrigin: true }]
});
createSimpleTree('CHI', 'Josh Giddey', 'trade', '2024-06-20', { tradePartner: 'OKC', tradeDescription: 'Bulls trade picks for Giddey', note: 'Young playmaker' });
createSimpleTree('CHI', 'Ayo Dosunmu', 'draft', '2021-07-29', { draftPick: 38, note: 'Chicago native, fan favorite' });
createSimpleTree('CHI', 'Torrey Craig', 'free-agent', '2023-07-01', { note: 'Veteran wing' });
createSimpleTree('CHI', 'Jalen Smith', 'free-agent', '2023-07-01', { note: 'Stretch big' });
createSimpleTree('CHI', 'Jevon Carter', 'free-agent', '2023-07-01');
createSimpleTree('CHI', 'Matas Buzelis', 'draft', '2024-06-26', { draftPick: 11 });
createSimpleTree('CHI', 'Julian Phillips', 'draft', '2023-06-22', { draftPick: 35 });
createSimpleTree('CHI', 'Dalen Terry', 'draft', '2022-06-23', { draftPick: 18 });

// ==================== CLEVELAND CAVALIERS ====================
console.log('\n=== CLE ===');
createSimpleTree('CLE', 'Donovan Mitchell', 'trade', '2022-09-01', {
  tradePartner: 'UTA', tradeDescription: 'Blockbuster: Markkanen, Sexton, picks for Mitchell', note: '3x All-Star, changed Cavs trajectory', originYear: 2018, depth: 2,
  assetsGivenUp: [
    { type: "player", name: "Collin Sexton", acquisitionType: "draft", date: "2018-06-21", draftPick: 8, isOrigin: true },
    { type: "pick", name: "2025 1st Round Pick", acquisitionType: "original", date: "2022-09-01", isOrigin: true }
  ]
});
createSimpleTree('CLE', 'Darius Garland', 'draft', '2019-06-20', { draftPick: 5, note: 'All-Star point guard' });
createSimpleTree('CLE', 'Evan Mobley', 'draft', '2021-07-29', { draftPick: 3, note: 'DPOY candidate, All-Star' });
createSimpleTree('CLE', 'Jarrett Allen', 'trade', '2021-01-14', {
  tradePartner: 'BKN', tradeDescription: '4-team Harden trade', note: 'All-Star center', originYear: 2019, depth: 2,
  assetsGivenUp: [{ type: "player", name: "Dante Exum", acquisitionType: "trade", date: "2019-07-06", tradePartner: "UTA", isOrigin: true }]
});
createSimpleTree('CLE', 'Max Strus', 'free-agent', '2023-07-01', { note: 'Elite 3PT shooter from Miami' });
createSimpleTree('CLE', 'Caris LeVert', 'trade', '2022-02-06', { tradePartner: 'IND', note: 'Scorer off bench' });
createSimpleTree('CLE', 'Isaac Okoro', 'draft', '2020-11-18', { draftPick: 5, note: 'Elite perimeter defender' });
createSimpleTree('CLE', 'Georges Niang', 'free-agent', '2023-07-01', { note: 'Stretch 4 from 76ers' });
createSimpleTree('CLE', 'Sam Merrill', 'free-agent', '2023-07-01');
createSimpleTree('CLE', 'Ty Jerome', 'free-agent', '2023-07-01');
createSimpleTree('CLE', 'Craig Porter Jr.', 'free-agent', '2023-09-01', { note: 'Undrafted' });
createSimpleTree('CLE', 'Jaylon Tyson', 'draft', '2024-06-26', { draftPick: 20 });

// ==================== DETROIT PISTONS ====================
console.log('\n=== DET ===');
createSimpleTree('DET', 'Cade Cunningham', 'draft', '2021-07-29', { draftPick: 1, note: '#1 overall, franchise cornerstone' });
createSimpleTree('DET', 'Jaden Ivey', 'draft', '2022-06-23', { draftPick: 5, note: 'Explosive guard' });
createSimpleTree('DET', 'Ausar Thompson', 'draft', '2023-06-22', { draftPick: 5, note: 'Athletic wing' });
createSimpleTree('DET', 'Jalen Duren', 'trade', '2022-06-23', {
  tradePartner: 'CHA', tradeDescription: 'Draft night trade for #13 pick', note: 'Athletic center', originYear: 2022, depth: 2,
  assetsGivenUp: [{ type: "pick", name: "2022 #13 Pick", acquisitionType: "original", date: "2022-06-23", isOrigin: true }]
});
createSimpleTree('DET', 'Tim Hardaway Jr.', 'trade', '2024-02-08', { tradePartner: 'DAL', note: 'Trade deadline' });
createSimpleTree('DET', 'Tobias Harris', 'free-agent', '2024-07-06', { note: 'Veteran signing' });
createSimpleTree('DET', 'Malik Beasley', 'free-agent', '2024-07-01', { note: 'Sharpshooting guard' });
createSimpleTree('DET', 'Isaiah Stewart', 'draft', '2020-11-18', { draftPick: 16, note: 'Physical big' });
createSimpleTree('DET', 'Simone Fontecchio', 'trade', '2024-02-08', { tradePartner: 'UTA' });
createSimpleTree('DET', 'Ron Holland II', 'draft', '2024-06-26', { draftPick: 5 });
createSimpleTree('DET', 'Marcus Sasser', 'draft', '2023-06-22', { draftPick: 25 });

// ==================== INDIANA PACERS ====================
console.log('\n=== IND ===');
createSimpleTree('IND', 'Tyrese Haliburton', 'trade', '2022-02-08', {
  tradePartner: 'SAC', tradeDescription: 'Pacers trade Sabonis for Haliburton', note: 'All-Star, one of best trades in Pacers history', originYear: 2010, depth: 3,
  assetsGivenUp: [
    { type: "player", name: "Domantas Sabonis", acquisitionType: "trade", date: "2017-07-07", tradePartner: "OKC", note: "Came in Paul George trade",
      assetsGivenUp: [{ type: "player", name: "Paul George", acquisitionType: "draft", date: "2010-06-24", draftPick: 10, note: "7x All-Star, developed in Indiana", isOrigin: true }]
    }
  ]
});
createSimpleTree('IND', 'Andrew Nembhard', 'draft', '2022-06-23', { draftPick: 31, note: 'Clutch playoff performer' });
createSimpleTree('IND', 'Pascal Siakam', 'trade', '2024-01-17', {
  tradePartner: 'TOR', tradeDescription: 'Deadline blockbuster', note: 'All-Star forward, former champion', originYear: 2023, depth: 2,
  assetsGivenUp: [
    { type: "player", name: "Bruce Brown", acquisitionType: "trade", date: "2023-07-06", tradePartner: "DEN", isOrigin: true },
    { type: "pick", name: "2024 1st Round Pick", acquisitionType: "original", date: "2024-01-17", isOrigin: true }
  ]
});
createSimpleTree('IND', 'Myles Turner', 'draft', '2015-06-25', { draftPick: 11, note: 'Longest-tenured Pacer, elite shot blocker' });
createSimpleTree('IND', 'Bennedict Mathurin', 'draft', '2022-06-23', { draftPick: 6, note: 'Scoring wing' });
createSimpleTree('IND', 'T.J. McConnell', 'free-agent', '2019-07-06', { note: 'Fan favorite, hustle player' });
createSimpleTree('IND', 'Aaron Nesmith', 'trade', '2022-02-08', { tradePartner: 'BOS', note: 'Part of Haliburton deal' });
createSimpleTree('IND', 'Obi Toppin', 'trade', '2023-06-23', { tradePartner: 'NYK', note: 'Athletic dunker' });
createSimpleTree('IND', 'Isaiah Jackson', 'draft', '2021-07-29', { draftPick: 22 });
createSimpleTree('IND', 'Jarace Walker', 'draft', '2023-06-22', { draftPick: 8 });
createSimpleTree('IND', 'Ben Sheppard', 'draft', '2023-06-22', { draftPick: 26 });
createSimpleTree('IND', 'James Wiseman', 'trade', '2024-02-08', { tradePartner: 'DET', note: 'Former #2 pick' });

// ==================== MIAMI HEAT ====================
console.log('\n=== MIA ===');
createSimpleTree('MIA', 'Jimmy Butler', 'trade', '2019-07-06', {
  tradePartner: 'PHI', tradeDescription: 'Sign-and-trade for Richardson', note: '4x All-Star in Miami, 2x Finals', originYear: 2015, depth: 2,
  assetsGivenUp: [{ type: "player", name: "Josh Richardson", acquisitionType: "draft", date: "2015-06-25", draftPick: 40, note: "Heat developed into starter", isOrigin: true }]
});
createSimpleTree('MIA', 'Bam Adebayo', 'draft', '2017-06-22', { draftPick: 14, note: '3x All-Star, DPOY candidate' });
createSimpleTree('MIA', 'Tyler Herro', 'draft', '2019-06-20', { draftPick: 13, note: '6MOTY, elite scorer' });
createSimpleTree('MIA', 'Terry Rozier', 'trade', '2024-02-08', {
  tradePartner: 'CHA', tradeDescription: 'Deadline trade for Lowry', note: 'Scoring guard upgrade', originYear: 2021, depth: 2,
  assetsGivenUp: [{ type: "player", name: "Kyle Lowry", acquisitionType: "trade", date: "2021-08-06", tradePartner: "TOR", isOrigin: true }]
});
createSimpleTree('MIA', 'Jaime Jaquez Jr.', 'draft', '2023-06-22', { draftPick: 18, note: 'All-Rookie, Heat Culture' });
createSimpleTree('MIA', 'Duncan Robinson', 'free-agent', '2018-04-09', { note: 'Undrafted, elite shooter' });
createSimpleTree('MIA', 'Nikola Jovic', 'draft', '2022-06-23', { draftPick: 27, note: 'International prospect' });
createSimpleTree('MIA', 'Kevin Love', 'free-agent', '2023-07-01', { note: 'Veteran champion' });
createSimpleTree('MIA', 'Haywood Highsmith', 'free-agent', '2022-01-22', { note: 'Undrafted gem' });
createSimpleTree('MIA', 'Thomas Bryant', 'free-agent', '2023-07-01');
createSimpleTree('MIA', "Kel'el Ware", 'draft', '2024-06-26', { draftPick: 15 });
createSimpleTree('MIA', 'Pelle Larsson', 'draft', '2023-06-22', { draftPick: 44 });

// ==================== MILWAUKEE BUCKS ====================
console.log('\n=== MIL ===');
createSimpleTree('MIL', 'Giannis Antetokounmpo', 'draft', '2013-06-27', { draftPick: 15, note: '2x MVP, DPOY, 2021 Champion, Finals MVP' });
createSimpleTree('MIL', 'Damian Lillard', 'trade', '2023-09-27', {
  tradePartner: 'POR', tradeDescription: 'Bucks trade Beasley, Allen, picks for Dame', note: 'Superstar acquisition', originYear: 2020, depth: 3,
  assetsGivenUp: [
    { type: "player", name: "Jrue Holiday", acquisitionType: "trade", date: "2020-11-24", tradePartner: "NOP", note: "Key to 2021 title",
      assetsGivenUp: [{ type: "pick", name: "2025 1st Round Pick", acquisitionType: "original", date: "2020-11-24", isOrigin: true }]
    },
    { type: "pick", name: "2028 1st Round Pick", acquisitionType: "original", date: "2023-09-27", isOrigin: true }
  ]
});
createSimpleTree('MIL', 'Khris Middleton', 'trade', '2013-07-31', {
  tradePartner: 'DET', tradeDescription: 'Acquired for Brandon Jennings', note: '3x All-Star, 2021 champion', originYear: 2009, depth: 2,
  assetsGivenUp: [{ type: "player", name: "Brandon Jennings", acquisitionType: "draft", date: "2009-06-25", draftPick: 10, isOrigin: true }]
});
createSimpleTree('MIL', 'Brook Lopez', 'free-agent', '2018-07-02', { note: 'Elite stretch 5, DPOY runner-up' });
createSimpleTree('MIL', 'Bobby Portis', 'free-agent', '2020-11-29', { note: 'Fan favorite, 2021 champion' });
createSimpleTree('MIL', 'Pat Connaughton', 'free-agent', '2018-07-09', { note: 'Veteran, 2021 champion' });
createSimpleTree('MIL', 'Gary Trent Jr.', 'free-agent', '2024-07-01', { note: 'Scoring guard' });
createSimpleTree('MIL', 'MarJon Beauchamp', 'draft', '2022-06-23', { draftPick: 24 });
createSimpleTree('MIL', 'AJ Johnson', 'draft', '2024-06-26', { draftPick: 23 });
createSimpleTree('MIL', 'Andre Jackson Jr.', 'draft', '2023-06-22', { draftPick: 36 });
createSimpleTree('MIL', 'Ryan Rollins', 'draft', '2022-06-23', { draftPick: 44 });

// ==================== ORLANDO MAGIC ====================
console.log('\n=== ORL ===');
createSimpleTree('ORL', 'Paolo Banchero', 'draft', '2022-06-23', { draftPick: 1, note: '#1 overall, ROY, All-Star' });
createSimpleTree('ORL', 'Franz Wagner', 'draft', '2021-07-29', { draftPick: 8, note: 'All-Star level wing' });
createSimpleTree('ORL', 'Jalen Suggs', 'draft', '2021-07-29', { draftPick: 5, note: 'Elite defender' });
createSimpleTree('ORL', 'Wendell Carter Jr.', 'trade', '2021-03-25', {
  tradePartner: 'CHI', tradeDescription: 'Part of Vucevic deal', note: 'Two-way center', originYear: 2004, depth: 3,
  assetsGivenUp: [
    { type: "player", name: "Nikola Vucevic", acquisitionType: "trade", date: "2012-08-10", tradePartner: "PHI", note: "Came in Dwight Howard trade",
      assetsGivenUp: [{ type: "player", name: "Dwight Howard", acquisitionType: "draft", date: "2004-06-24", draftPick: 1, note: "#1 overall pick", isOrigin: true }]
    }
  ]
});
createSimpleTree('ORL', 'Kentavious Caldwell-Pope', 'free-agent', '2024-07-06', { note: 'Champion, 3&D wing' });
createSimpleTree('ORL', 'Cole Anthony', 'draft', '2020-11-18', { draftPick: 15 });
createSimpleTree('ORL', 'Gary Harris', 'trade', '2021-03-25', { tradePartner: 'DEN', note: 'Part of Aaron Gordon trade' });
createSimpleTree('ORL', 'Jonathan Isaac', 'draft', '2017-06-22', { draftPick: 6, note: 'DPOY potential, injury plagued' });
createSimpleTree('ORL', 'Moritz Wagner', 'trade', '2021-03-25', { tradePartner: 'BOS', note: 'Trade deadline pickup' });
createSimpleTree('ORL', 'Goga Bitadze', 'trade', '2023-07-06', { tradePartner: 'IND' });
createSimpleTree('ORL', 'Anthony Black', 'draft', '2023-06-22', { draftPick: 6 });
createSimpleTree('ORL', 'Jett Howard', 'draft', '2023-06-22', { draftPick: 11 });
createSimpleTree('ORL', 'Tristan da Silva', 'draft', '2024-06-26', { draftPick: 18 });

// ==================== PHILADELPHIA 76ERS ====================
console.log('\n=== PHI ===');
createSimpleTree('PHI', 'Joel Embiid', 'draft', '2014-06-26', { draftPick: 3, note: 'MVP, 7x All-Star, Process success' });
createSimpleTree('PHI', 'Tyrese Maxey', 'draft', '2020-11-18', { draftPick: 21, note: 'All-Star, MIP, franchise cornerstone' });
createSimpleTree('PHI', 'Paul George', 'free-agent', '2024-07-01', { note: '9x All-Star, chose Philly in free agency' });
createSimpleTree('PHI', 'Caleb Martin', 'free-agent', '2024-07-01', { note: '3&D wing from Miami' });
createSimpleTree('PHI', 'Kelly Oubre Jr.', 'free-agent', '2023-07-01', { note: 'Athletic wing scorer' });
createSimpleTree('PHI', 'Kyle Lowry', 'trade', '2024-02-08', { tradePartner: 'MIA', note: 'Veteran leader' });
createSimpleTree('PHI', 'Andre Drummond', 'free-agent', '2024-07-01', { note: 'Backup center' });
createSimpleTree('PHI', 'Eric Gordon', 'free-agent', '2024-07-01', { note: 'Veteran shooter' });
createSimpleTree('PHI', 'KJ Martin', 'free-agent', '2024-07-01', { note: 'Athletic forward' });
createSimpleTree('PHI', 'Jared McCain', 'draft', '2024-06-26', { draftPick: 16, note: 'Scoring guard' });
createSimpleTree('PHI', 'Adem Bona', 'draft', '2024-06-26', { draftPick: 41 });
createSimpleTree('PHI', 'Ricky Council IV', 'free-agent', '2023-07-01', { note: 'Undrafted find' });

// ==================== TORONTO RAPTORS ====================
console.log('\n=== TOR ===');
createSimpleTree('TOR', 'Scottie Barnes', 'draft', '2021-07-29', { draftPick: 4, note: 'ROY, All-Star, franchise player' });
createSimpleTree('TOR', 'RJ Barrett', 'trade', '2023-12-30', {
  tradePartner: 'NYK', tradeDescription: 'Barrett and Quickley for Anunoby', note: 'Homecoming for Canadian star', originYear: 2017, depth: 2,
  assetsGivenUp: [{ type: "player", name: "OG Anunoby", acquisitionType: "draft", date: "2017-06-22", draftPick: 23, note: "Developed into elite 3&D", isOrigin: true }]
});
createSimpleTree('TOR', 'Immanuel Quickley', 'trade', '2023-12-30', { tradePartner: 'NYK', note: 'Came with RJ Barrett' });
createSimpleTree('TOR', 'Jakob Poeltl', 'trade', '2023-02-09', {
  tradePartner: 'SAS', note: 'Returned to Toronto', originYear: 2023, depth: 2,
  assetsGivenUp: [{ type: "pick", name: "2024 1st Round Pick", acquisitionType: "original", date: "2023-02-09", isOrigin: true }]
});
createSimpleTree('TOR', 'Gradey Dick', 'draft', '2023-06-22', { draftPick: 13, note: 'Sharpshooter' });
createSimpleTree('TOR', 'Kelly Olynyk', 'free-agent', '2024-07-01', { note: 'Veteran stretch big' });
createSimpleTree('TOR', 'Ochai Agbaji', 'trade', '2024-02-08', { tradePartner: 'UTA' });
createSimpleTree('TOR', 'Bruce Brown', 'trade', '2024-02-08', { tradePartner: 'IND' });
createSimpleTree('TOR', 'Chris Boucher', 'free-agent', '2018-07-21', { note: 'Undrafted, developed in Toronto' });
createSimpleTree('TOR', "Ja'Kobe Walter", 'draft', '2024-06-26', { draftPick: 19 });
createSimpleTree('TOR', 'Garrett Temple', 'free-agent', '2024-09-01', { note: 'Veteran presence' });
createSimpleTree('TOR', 'Jonathan Mogbo', 'free-agent', '2024-07-01', { note: 'Undrafted' });

console.log('\n✅ All Eastern Conference trees generated!');

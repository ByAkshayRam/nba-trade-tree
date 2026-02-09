#!/usr/bin/env node
/**
 * NBA Trade Tree - ESPN Roster Validation
 * Uses ESPN's undocumented API (faster than NBA.com)
 */

const Database = require('better-sqlite3');
const db = new Database('/home/ubuntu/clawd/projects/nba-trade-tree/data/nba_trades.db');

const ESPN_TEAM_ROSTER = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams';

// Map ESPN team IDs to our abbreviations
const ESPN_TEAM_MAP = {
  '1': 'ATL', '2': 'BOS', '3': 'NOP', '4': 'CHI', '5': 'CLE',
  '6': 'DAL', '7': 'DEN', '8': 'DET', '9': 'GSW', '10': 'HOU',
  '11': 'IND', '12': 'LAC', '13': 'LAL', '14': 'MIA', '15': 'MIL',
  '16': 'MIN', '17': 'BKN', '18': 'NYK', '19': 'ORL', '20': 'PHI',
  '21': 'PHX', '22': 'POR', '23': 'SAC', '24': 'SAS', '25': 'OKC',
  '26': 'UTA', '27': 'WAS', '28': 'TOR', '29': 'MEM', '30': 'CHA'
};

async function fetchESPNRosters() {
  console.log('Fetching rosters from ESPN...');
  const rosters = {};
  
  for (const [espnId, abbr] of Object.entries(ESPN_TEAM_MAP)) {
    try {
      const url = `${ESPN_TEAM_ROSTER}/${espnId}/roster`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.athletes) {
        for (const athlete of data.athletes) {
          const name = athlete.fullName;
          rosters[name] = abbr;
        }
      }
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      console.error(`Error fetching ${abbr}: ${err.message}`);
    }
  }
  
  return rosters;
}

async function validate() {
  console.log('=' .repeat(60));
  console.log('NBA Trade Tree - ESPN Roster Validation');
  console.log(`Date: ${new Date().toISOString().split('T')[0]}`);
  console.log('=' .repeat(60));
  
  // Get our players
  const ourPlayers = db.prepare(`
    SELECT p.name, t.abbreviation as team
    FROM players p
    LEFT JOIN teams t ON p.current_team_id = t.id
    WHERE p.is_active = 1
  `).all();
  
  console.log(`\nOur database: ${ourPlayers.length} active players`);
  
  // Fetch ESPN rosters
  const espnRosters = await fetchESPNRosters();
  console.log(`ESPN rosters: ${Object.keys(espnRosters).length} players\n`);
  
  // Compare
  const discrepancies = [];
  let matched = 0;
  let notFound = 0;
  
  // Key players to check
  const keyPlayers = [
    'LeBron James', 'Stephen Curry', 'Kevin Durant', 'Giannis Antetokounmpo',
    'Nikola Jokic', 'Joel Embiid', 'Jayson Tatum', 'Luka Doncic',
    'Shai Gilgeous-Alexander', 'Anthony Edwards', 'Donovan Mitchell',
    'James Harden', 'Trae Young', 'Anthony Davis', 'Chris Paul',
    'Ja Morant', 'Devin Booker', 'Kyrie Irving', 'Jimmy Butler',
    'Kristaps Porzingis', 'Jaren Jackson Jr.', 'Darius Garland'
  ];
  
  console.log('Checking key players...');
  console.log('-'.repeat(50));
  
  for (const name of keyPlayers) {
    const ours = ourPlayers.find(p => p.name === name);
    const espnTeam = espnRosters[name];
    
    if (!ours) {
      console.log(`  ? ${name}: Not in our DB`);
      continue;
    }
    
    if (!espnTeam) {
      console.log(`  ? ${name}: Not found in ESPN (${ours.team})`);
      notFound++;
      continue;
    }
    
    if (ours.team !== espnTeam) {
      discrepancies.push({ name, ours: ours.team, espn: espnTeam });
      console.log(`  ❌ ${name}: Ours=${ours.team}, ESPN=${espnTeam}`);
    } else {
      console.log(`  ✓ ${name}: ${ours.team}`);
      matched++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${matched} matched, ${discrepancies.length} discrepancies, ${notFound} not found in ESPN`);
  
  if (discrepancies.length > 0) {
    console.log('\n⚠ DISCREPANCIES (may need update):');
    for (const d of discrepancies) {
      console.log(`  - ${d.name}: ${d.ours} → ${d.espn}?`);
    }
    console.log('\nNote: ESPN may lag behind trade announcements by a few hours.');
  } else {
    console.log('\n✅ All key players match ESPN data!');
  }
  
  db.close();
  return discrepancies;
}

validate().catch(console.error);

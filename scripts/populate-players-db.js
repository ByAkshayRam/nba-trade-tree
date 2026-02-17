#!/usr/bin/env node
/**
 * Populate the players SQLite DB from all 512 acquisition-tree JSON files.
 * Extracts player name, team, acquisition type, draft info, and headshot URLs.
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'nba_trades.db');
const DATA_DIR = path.join(__dirname, '..', 'app', 'data', 'acquisition-trees');
const TSX_PATH = path.join(__dirname, '..', 'app', 'src', 'components', 'TeamAcquisitionTree.tsx');

// Extract NBA_PLAYER_IDS and ESPN_PLAYER_IDS from the TSX file
function extractPlayerIds(tsxContent) {
  const nbaIds = {};
  const espnIds = {};
  
  // Extract NBA_PLAYER_IDS block
  const nbaMatch = tsxContent.match(/const NBA_PLAYER_IDS[^{]*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
  if (nbaMatch) {
    const entries = nbaMatch[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g);
    for (const m of entries) nbaIds[m[1]] = m[2];
  }
  
  // Extract ESPN_PLAYER_IDS block
  const espnMatch = tsxContent.match(/const ESPN_PLAYER_IDS[^{]*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
  if (espnMatch) {
    const entries = espnMatch[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g);
    for (const m of entries) espnIds[m[1]] = m[2];
  }
  
  return { nbaIds, espnIds };
}

function getHeadshotUrl(playerName, nbaIds, espnIds) {
  if (nbaIds[playerName]) {
    return `https://cdn.nba.com/headshots/nba/latest/1040x760/${nbaIds[playerName]}.png`;
  }
  if (espnIds[playerName]) {
    return `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${espnIds[playerName]}.png&w=350&h=254`;
  }
  return null;
}

// Team abbreviation -> team ID mapping
function getTeamMap(db) {
  const rows = db.prepare('SELECT id, abbreviation FROM teams').all();
  const map = {};
  for (const r of rows) map[r.abbreviation] = r.id;
  return map;
}

function main() {
  const db = new Database(DB_PATH);
  const teamMap = getTeamMap(db);
  
  // Read TSX for headshot IDs
  const tsxContent = fs.readFileSync(TSX_PATH, 'utf-8');
  const { nbaIds, espnIds } = extractPlayerIds(tsxContent);
  console.log(`Extracted ${Object.keys(nbaIds).length} NBA IDs, ${Object.keys(espnIds).length} ESPN IDs`);
  
  // Clear existing players (disable FK constraints temporarily)
  db.pragma('foreign_keys = OFF');
  db.prepare('DELETE FROM players').run();
  
  // Prepare insert statement
  const insert = db.prepare(`
    INSERT INTO players (name, current_team_id, draft_year, draft_pick, headshot_url) 
    VALUES (?, ?, ?, ?, ?)
  `);
  
  // Read all JSON files
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  console.log(`Processing ${files.length} files...`);
  
  const insertMany = db.transaction((entries) => {
    for (const e of entries) {
      insert.run(e.name, e.teamId, e.draftYear, e.draftPick, e.headshotUrl);
    }
  });
  
  const entries = [];
  const seen = new Set(); // dedup by name+team
  
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
      const meta = data._meta;
      const tree = data.tree;
      
      if (!meta || !tree) continue;
      
      const key = `${meta.player}::${meta.team}`;
      if (seen.has(key)) continue;
      seen.add(key);
      
      const teamId = teamMap[meta.team] || null;
      const headshotUrl = getHeadshotUrl(meta.player, nbaIds, espnIds);
      
      let draftYear = null;
      let draftPick = null;
      if (tree.acquisitionType === 'draft') {
        draftYear = tree.date ? parseInt(tree.date.split('-')[0]) : null;
        draftPick = tree.draftPick || null;
      }
      
      entries.push({
        name: meta.player,
        teamId,
        draftYear,
        draftPick,
        headshotUrl,
      });
    } catch (err) {
      console.error(`Error processing ${file}:`, err.message);
    }
  }
  
  insertMany(entries);
  console.log(`Inserted ${entries.length} players into database`);
  
  // Verify
  const count = db.prepare('SELECT count(*) as c FROM players').get();
  console.log(`Total players in DB: ${count.c}`);
  
  db.close();
}

main();

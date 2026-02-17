#!/usr/bin/env node
/**
 * Validate team acquisition tree data
 * 
 * Usage: node scripts/validate-team-data.js [TEAM]
 * Example: node scripts/validate-team-data.js BOS
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../app/data/acquisition-trees');

// Expected roster sizes (approximate)
const EXPECTED_ROSTER = {
  BOS: 15, NYK: 17, OKC: 15, WAS: 18,
  ATL: 16, BKN: 13, CHA: 15, CHI: 15,
  CLE: 14, DET: 15, IND: 12, MIA: 14,
  MIL: 16, ORL: 14, PHI: 17, TOR: 13
};

function countEdges(node, count = 0) {
  if (!node.assetsGivenUp || node.assetsGivenUp.length === 0) {
    return count;
  }
  
  for (const asset of node.assetsGivenUp) {
    count++;
    count = countEdges(asset, count);
  }
  
  return count;
}

function validateTeam(teamAbbr) {
  const team = teamAbbr.toUpperCase();
  const files = fs.readdirSync(DATA_DIR).filter(f => 
    f.startsWith(team.toLowerCase() + '-') && f.endsWith('.json')
  );
  
  console.log(`\n=== ${team} ===`);
  console.log(`Files found: ${files.length} (expected ~${EXPECTED_ROSTER[team] || '?'})`);
  
  let totalEdges = 0;
  let tradeCount = 0;
  let draftCount = 0;
  let faCount = 0;
  const issues = [];
  
  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
    const meta = content._meta;
    const tree = content.tree;
    
    // Check for required fields
    if (!meta.team) issues.push(`${file}: Missing _meta.team`);
    if (!meta.player) issues.push(`${file}: Missing _meta.player`);
    if (!tree.type) issues.push(`${file}: Missing tree.type`);
    if (!tree.acquisitionType) issues.push(`${file}: Missing tree.acquisitionType`);
    
    // Count acquisition types
    if (tree.acquisitionType === 'trade') tradeCount++;
    else if (tree.acquisitionType === 'draft') draftCount++;
    else if (tree.acquisitionType === 'freeagent' || tree.acquisitionType === 'free-agent') faCount++;
    
    // Count edges
    const edges = countEdges(tree);
    totalEdges += edges;
    
    // Check for trade players missing assetsGivenUp
    if (tree.acquisitionType === 'trade' && (!tree.assetsGivenUp || tree.assetsGivenUp.length === 0)) {
      issues.push(`${file}: Trade player missing assetsGivenUp!`);
    }
    
    // Check for isOrigin on leaf nodes
    if (tree.assetsGivenUp) {
      for (const asset of tree.assetsGivenUp) {
        if (!asset.assetsGivenUp && !asset.isOrigin) {
          issues.push(`${file}: Asset "${asset.name}" missing isOrigin or nested assetsGivenUp`);
        }
      }
    }
  }
  
  console.log(`\nBreakdown:`);
  console.log(`  - Trade acquisitions: ${tradeCount}`);
  console.log(`  - Draft picks: ${draftCount}`);
  console.log(`  - Free agents: ${faCount}`);
  console.log(`\nTotal edges: ${totalEdges}`);
  
  if (issues.length > 0) {
    console.log(`\n⚠️  Issues found (${issues.length}):`);
    issues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log(`\n✅ No issues found`);
  }
  
  return { files: files.length, edges: totalEdges, issues: issues.length };
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  // Validate all teams
  console.log('Validating all Eastern Conference teams...\n');
  
  const teams = ['ATL', 'BKN', 'BOS', 'CHA', 'CHI', 'CLE', 'DET', 'IND', 'MIA', 'MIL', 'NYK', 'ORL', 'PHI', 'TOR', 'WAS'];
  const results = [];
  
  for (const team of teams) {
    const result = validateTeam(team);
    results.push({ team, ...result });
  }
  
  console.log('\n\n=== SUMMARY ===');
  console.log('Team | Files | Edges | Issues');
  console.log('-----|-------|-------|-------');
  results.sort((a, b) => b.edges - a.edges);
  for (const r of results) {
    const status = r.issues > 0 ? '⚠️' : '✅';
    console.log(`${r.team}  | ${r.files.toString().padStart(5)} | ${r.edges.toString().padStart(5)} | ${r.issues} ${status}`);
  }
} else {
  // Validate specific team
  validateTeam(args[0]);
}

#!/usr/bin/env node
/**
 * NBA Trade Tree QA Test Suite
 * Run with: node run-tests.js [data|api|all]
 */

const config = require('./qa-config.json');
const baseUrl = config.baseUrl;

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function pass(msg) { console.log(`${colors.green}✓${colors.reset} ${msg}`); }
function fail(msg) { console.log(`${colors.red}✗${colors.reset} ${msg}`); }
function warn(msg) { console.log(`${colors.yellow}⚠${colors.reset} ${msg}`); }
function header(msg) { console.log(`\n${colors.bold}${msg}${colors.reset}`); }

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Data Integrity Tests
async function runDataTests() {
  header('=== DATA INTEGRITY TESTS ===');
  let passed = 0, failed = 0;

  for (const player of config.testPlayers) {
    try {
      // Test player search
      const searchResults = await fetchJson(`${baseUrl}/api/players?q=${encodeURIComponent(player.name.split(' ')[1] || player.name)}`);
      const found = searchResults.find(p => p.name === player.name);
      
      if (!found) {
        fail(`${player.name}: Not found in search`);
        failed++;
        continue;
      }

      // Check team
      if (found.teamAbbr !== player.expectedTeam) {
        fail(`${player.name}: Wrong team - expected ${player.expectedTeam}, got ${found.teamAbbr}`);
        failed++;
      } else {
        pass(`${player.name}: Correct team (${found.teamAbbr})`);
        passed++;
      }

      // Test tree data
      const tree = await fetchJson(`${baseUrl}/api/tree/${found.id}`);
      
      // Check node count if expected
      if (player.expectedNodes && tree.nodes.length !== player.expectedNodes) {
        warn(`${player.name}: Node count mismatch - expected ${player.expectedNodes}, got ${tree.nodes.length}`);
      }

      // Validate tree structure
      if (!tree.nodes || tree.nodes.length < 2) {
        fail(`${player.name}: Tree has insufficient nodes (${tree.nodes?.length || 0})`);
        failed++;
      } else {
        pass(`${player.name}: Tree structure valid (${tree.nodes.length} nodes)`);
        passed++;
      }

      // Check for draft origin
      const hasDraft = tree.nodes.some(n => n.type === 'pick' || n.data?.label?.includes('Drafted'));
      if (!hasDraft) {
        warn(`${player.name}: No draft origin found in tree`);
      }

      // Check edges connect properly
      const nodeIds = new Set(tree.nodes.map(n => n.id));
      const brokenEdges = tree.edges.filter(e => !nodeIds.has(e.source) || !nodeIds.has(e.target));
      if (brokenEdges.length > 0) {
        fail(`${player.name}: ${brokenEdges.length} broken edges`);
        failed++;
      }

    } catch (err) {
      fail(`${player.name}: Error - ${err.message}`);
      failed++;
    }
  }

  return { passed, failed };
}

// API Tests
async function runApiTests() {
  header('=== API TESTS ===');
  let passed = 0, failed = 0;

  // Test search endpoint
  try {
    const results = await fetchJson(`${baseUrl}/api/players?q=LeBron`);
    if (Array.isArray(results) && results.length > 0) {
      pass('Search API returns results');
      passed++;
    } else {
      fail('Search API returns empty');
      failed++;
    }
  } catch (err) {
    fail(`Search API error: ${err.message}`);
    failed++;
  }

  // Test empty search
  try {
    const results = await fetchJson(`${baseUrl}/api/players?q=`);
    if (Array.isArray(results)) {
      pass('Empty search returns array');
      passed++;
    }
  } catch (err) {
    fail(`Empty search error: ${err.message}`);
    failed++;
  }

  // Test tree endpoint with invalid ID
  try {
    const response = await fetch(`${baseUrl}/api/tree/99999`);
    if (response.status === 404) {
      pass('Invalid player ID returns 404');
      passed++;
    } else {
      warn(`Invalid player ID returns ${response.status} instead of 404`);
    }
  } catch (err) {
    fail(`Tree API error: ${err.message}`);
    failed++;
  }

  // Test tree endpoint with valid ID
  try {
    const tree = await fetchJson(`${baseUrl}/api/tree/37`); // LeBron
    if (tree.player && tree.nodes && tree.edges) {
      pass('Tree API returns complete structure');
      passed++;
    } else {
      fail('Tree API missing required fields');
      failed++;
    }
  } catch (err) {
    fail(`Tree API error: ${err.message}`);
    failed++;
  }

  return { passed, failed };
}

// UI Spacing Tests - verify nodes don't overlap
async function runUiSpacingTests() {
  header('=== UI SPACING TESTS ===');
  let passed = 0, failed = 0;

  // Layout constants (must match TradeTree.tsx)
  const nodeSpacingY = 350;
  const assetRowSpacing = 200;
  const nodeHeight = 180; // Approximate max node height
  const playerNodeHeight = 120;

  // Simulate node positioning logic
  function calculateNodePositions(tree) {
    const positions = [];
    
    // Check if using chain-based or acq-based layout
    const chainNodes = tree.nodes.filter(n => n.id.match(/chain-\d+-\d+/));
    const acqNodes = tree.nodes.filter(n => n.id.startsWith('acq-'));
    const playerNode = tree.nodes.find(n => n.id.startsWith('player-'));
    
    if (chainNodes.length > 0) {
      // Chain-based layout
      const branchNodes = new Map();
      
      [...chainNodes].forEach(node => {
        const match = node.id.match(/chain-(\d+)-(\d+)/);
        if (match) {
          const branchIdx = parseInt(match[1]);
          const stepIdx = parseInt(match[2]);
          if (!branchNodes.has(branchIdx)) branchNodes.set(branchIdx, []);
          branchNodes.get(branchIdx).push({ node, index: stepIdx, isHeader: node.type === 'trade-header' });
        }
      });

      let maxFinalY = 0;
      branchNodes.forEach(steps => {
        steps.sort((a, b) => a.index - b.index);
        let currentY = 0;
        
        steps.forEach(step => {
          const hasAboveAssets = tree.nodes.some(n => 
            n.data?.parentTradeId === step.node.id && n.data?.position === 'above'
          );
          const hasBelowAssets = tree.nodes.some(n => 
            n.data?.parentTradeId === step.node.id && n.data?.position === 'below'
          );
          
          if (step.isHeader) {
            if (hasAboveAssets) currentY += assetRowSpacing;
            positions.push({ id: step.node.id, y: currentY, height: nodeHeight });
            currentY += nodeSpacingY;
            if (hasBelowAssets) currentY += assetRowSpacing;
          } else {
            positions.push({ id: step.node.id, y: currentY, height: nodeHeight });
            currentY += nodeSpacingY;
          }
        });
        
        maxFinalY = Math.max(maxFinalY, currentY);
      });
      
      if (playerNode) {
        positions.push({ id: playerNode.id, y: maxFinalY, height: playerNodeHeight });
      }
    } else if (acqNodes.length > 0) {
      // Acq-based layout
      acqNodes.sort((a, b) => {
        const aIdx = parseInt(a.id.split('-')[2] || '0');
        const bIdx = parseInt(b.id.split('-')[2] || '0');
        return aIdx - bIdx;
      });
      
      let currentY = 0;
      acqNodes.forEach(node => {
        positions.push({ id: node.id, y: currentY, height: nodeHeight });
        currentY += nodeSpacingY;
      });
      
      if (playerNode) {
        positions.push({ id: playerNode.id, y: currentY, height: playerNodeHeight });
      }
    }
    
    return positions;
  }

  // Check for overlapping nodes
  function findOverlaps(positions) {
    const overlaps = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];
        // Check if vertical ranges overlap
        const aTop = a.y;
        const aBottom = a.y + a.height;
        const bTop = b.y;
        const bBottom = b.y + b.height;
        
        if (aTop < bBottom && aBottom > bTop) {
          overlaps.push({ node1: a.id, node2: b.id, gap: Math.min(bTop - aBottom, aTop - bBottom) });
        }
      }
    }
    return overlaps;
  }

  // Test various player types - sample from all test players
  const allPlayers = config.testPlayers;
  
  // Always test key edge cases
  const keyPlayers = [
    'Jayson Tatum',    // Complex multi-trade chain
    'LeBron James',    // Multiple team acquisitions
    'Stephen Curry',   // Direct draft, stayed with team
    'Luka Doncic',     // Recent trade deadline move
    'Jaylen Brown',    // Same origin as Tatum
    'Kevin Durant',    // Many trades
    'James Harden',    // Recent trade
  ];
  
  // Add random sample of 10 more players
  const otherPlayers = allPlayers.filter(p => !keyPlayers.includes(p.name));
  const randomSample = otherPlayers.sort(() => Math.random() - 0.5).slice(0, 10);
  
  const testCases = [
    ...keyPlayers.map(name => ({ name, reason: 'Key player' })),
    ...randomSample.map(p => ({ name: p.name, reason: 'Random sample' }))
  ];

  for (const testCase of testCases) {
    try {
      const searchResults = await fetchJson(`${baseUrl}/api/players?q=${encodeURIComponent(testCase.name.split(' ')[1])}`);
      const found = searchResults.find(p => p.name === testCase.name);
      
      if (!found) {
        warn(`${testCase.name}: Not found, skipping spacing test`);
        continue;
      }

      const tree = await fetchJson(`${baseUrl}/api/tree/${found.id}`);
      const positions = calculateNodePositions(tree);
      const overlaps = findOverlaps(positions);

      if (overlaps.length > 0) {
        fail(`${testCase.name}: ${overlaps.length} node overlaps detected`);
        overlaps.forEach(o => warn(`  - ${o.node1} overlaps ${o.node2} (gap: ${o.gap}px)`));
        failed++;
      } else {
        pass(`${testCase.name}: No node overlaps (${positions.length} nodes)`);
        passed++;
      }

      // Check minimum spacing between consecutive nodes
      const minGap = 50; // Minimum gap in pixels
      for (let i = 0; i < positions.length - 1; i++) {
        const gap = positions[i + 1].y - (positions[i].y + positions[i].height);
        if (gap < minGap && gap >= 0) {
          warn(`${testCase.name}: Tight spacing between nodes (${gap}px gap)`);
        }
      }

    } catch (err) {
      fail(`${testCase.name}: Error - ${err.message}`);
      failed++;
    }
  }

  return { passed, failed };
}

// Check for common UI/UX issues in data
async function runUxChecks() {
  header('=== UX DATA CHECKS ===');
  let issues = [];

  for (const player of config.testPlayers) {
    try {
      const searchResults = await fetchJson(`${baseUrl}/api/players?q=${encodeURIComponent(player.name.split(' ')[0])}`);
      const found = searchResults.find(p => p.name === player.name);
      if (!found) continue;

      const tree = await fetchJson(`${baseUrl}/api/tree/${found.id}`);

      // Check for very long labels that might overflow
      for (const node of tree.nodes) {
        if (node.data?.label?.length > 50) {
          issues.push(`${player.name}: Long label "${node.data.label.substring(0, 30)}..." may overflow`);
        }
      }

      // Check for missing dates
      const nodesWithoutDates = tree.nodes.filter(n => 
        n.type !== 'player' && !n.data?.date
      );
      if (nodesWithoutDates.length > 0) {
        issues.push(`${player.name}: ${nodesWithoutDates.length} nodes missing dates`);
      }

      // Check for duplicate consecutive nodes
      for (let i = 1; i < tree.nodes.length; i++) {
        if (tree.nodes[i].data?.label === tree.nodes[i-1].data?.label) {
          issues.push(`${player.name}: Duplicate consecutive labels "${tree.nodes[i].data.label}"`);
        }
      }

      // Check for unexpected multiple branches (bug: should be linear for most players)
      if (tree.branches && tree.branches.length > 1) {
        // Only flag if branches have identical descriptions (likely duplicate data)
        const branchDescs = tree.branches.map(b => b.description);
        const uniqueDescs = new Set(branchDescs);
        if (uniqueDescs.size < tree.branches.length) {
          issues.push(`${player.name}: Duplicate branches detected (${tree.branches.length} branches with same origin)`);
        }
      }

    } catch (err) {
      issues.push(`${player.name}: Error checking - ${err.message}`);
    }
  }

  if (issues.length === 0) {
    pass('No UX data issues found');
  } else {
    console.log(`Found ${issues.length} potential issues:`);
    issues.forEach(i => warn(i));
  }

  return { issues: issues.length };
}

// Main
async function main() {
  const mode = process.argv[2] || 'all';
  
  console.log(`${colors.bold}NBA Trade Tree QA Test Suite${colors.reset}`);
  console.log(`Testing: ${baseUrl}\n`);

  let totalPassed = 0, totalFailed = 0;

  if (mode === 'data' || mode === 'all') {
    const { passed, failed } = await runDataTests();
    totalPassed += passed;
    totalFailed += failed;
  }

  if (mode === 'api' || mode === 'all') {
    const { passed, failed } = await runApiTests();
    totalPassed += passed;
    totalFailed += failed;
  }

  if (mode === 'ui' || mode === 'all') {
    const { passed, failed } = await runUiSpacingTests();
    totalPassed += passed;
    totalFailed += failed;
  }

  if (mode === 'ux' || mode === 'all') {
    await runUxChecks();
  }

  header('=== SUMMARY ===');
  console.log(`Passed: ${colors.green}${totalPassed}${colors.reset}`);
  console.log(`Failed: ${colors.red}${totalFailed}${colors.reset}`);
  
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});

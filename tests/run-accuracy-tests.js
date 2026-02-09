#!/usr/bin/env node
/**
 * NBA Trade Tree - Transaction Accuracy Test Runner
 * 
 * Validates that our trade tree data matches verified sources.
 * Run: node tests/run-accuracy-tests.js
 */

const fs = require('fs');
const path = require('path');

const TEST_FILE = path.join(__dirname, 'transaction-accuracy.json');
const API_BASE = 'http://localhost:3456';

async function fetchPlayerTree(playerId) {
  try {
    const res = await fetch(`${API_BASE}/api/tree/${playerId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function runAccuracyTests() {
  const testData = JSON.parse(fs.readFileSync(TEST_FILE, 'utf8'));
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };
  
  console.log('\n🔍 NBA Trade Tree - Transaction Accuracy Tests\n');
  console.log(`Testing ${testData.test_cases.length} players...\n`);
  
  for (const testCase of testData.test_cases) {
    const playerResult = {
      player: testCase.player,
      tests: [],
      status: 'pass'
    };
    
    // Skip if no player_id
    if (!testCase.player_id) {
      console.log(`⏭️  ${testCase.player}: Skipped (no player_id)`);
      results.skipped++;
      continue;
    }
    
    // Fetch player tree
    const tree = await fetchPlayerTree(testCase.player_id);
    
    if (!tree) {
      console.log(`❌ ${testCase.player}: API error - could not fetch tree`);
      results.failed++;
      playerResult.status = 'fail';
      playerResult.error = 'API fetch failed';
      results.details.push(playerResult);
      continue;
    }
    
    // Test 1: Current team
    const currentTeam = tree.player?.teamAbbr;
    if (currentTeam === testCase.expected_current_team) {
      playerResult.tests.push({ name: 'current_team', status: 'pass' });
    } else {
      playerResult.tests.push({ 
        name: 'current_team', 
        status: 'fail',
        expected: testCase.expected_current_team,
        actual: currentTeam
      });
      playerResult.status = 'fail';
    }
    
    // Test 2: Transaction count
    const nodeCount = tree.nodes?.length || 0;
    // Nodes include player node + transaction nodes
    const transactionCount = nodeCount - 1; // subtract player node
    
    if (transactionCount >= testCase.expected_transaction_count) {
      playerResult.tests.push({ name: 'transaction_count', status: 'pass' });
    } else {
      playerResult.tests.push({
        name: 'transaction_count',
        status: 'fail',
        expected: testCase.expected_transaction_count,
        actual: transactionCount
      });
      playerResult.status = 'fail';
    }
    
    // Test 3: Key validations
    for (const validation of testCase.key_validations) {
      const matchingNode = tree.nodes?.find(n => {
        const label = n.data?.label || '';
        const sublabel = n.data?.sublabel || '';
        const date = n.data?.date || '';
        
        // Check date if specified
        if (validation.date && !date.includes(validation.date)) {
          return false;
        }
        
        // Check event contains
        if (validation.event_contains && !label.toLowerCase().includes(validation.event_contains.toLowerCase())) {
          return false;
        }
        
        // Check details contains
        if (validation.details_contains && !sublabel.toLowerCase().includes(validation.details_contains.toLowerCase())) {
          return false;
        }
        
        return true;
      });
      
      const validationName = `${validation.date || ''} ${validation.event_contains || ''}`.trim();
      
      if (matchingNode) {
        playerResult.tests.push({ name: validationName, status: 'pass' });
      } else {
        playerResult.tests.push({
          name: validationName,
          status: 'fail',
          expected: validation
        });
        playerResult.status = 'fail';
      }
    }
    
    // Summary for this player
    const passCount = playerResult.tests.filter(t => t.status === 'pass').length;
    const totalTests = playerResult.tests.length;
    
    if (playerResult.status === 'pass') {
      console.log(`✅ ${testCase.player}: ${passCount}/${totalTests} tests passed`);
      results.passed++;
    } else {
      console.log(`❌ ${testCase.player}: ${passCount}/${totalTests} tests passed`);
      const failures = playerResult.tests.filter(t => t.status === 'fail');
      failures.forEach(f => {
        console.log(`   └─ ${f.name}: expected ${JSON.stringify(f.expected)}, got ${JSON.stringify(f.actual || 'not found')}`);
      });
      results.failed++;
    }
    
    results.details.push(playerResult);
  }
  
  // Final summary
  console.log('\n' + '═'.repeat(50));
  console.log(`📊 Results: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`);
  console.log('═'.repeat(50) + '\n');
  
  // Write results to file
  const resultsPath = path.join(__dirname, 'accuracy-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${resultsPath}\n`);
  
  return results.failed === 0;
}

runAccuracyTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });

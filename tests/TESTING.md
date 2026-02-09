# NBA Trade Tree - QA Testing

## Quick Test
```bash
cd /home/ubuntu/clawd/projects/nba-trade-tree/tests
node run-tests.js all
```

## Test Modes
- `node run-tests.js data` - Data integrity only
- `node run-tests.js api` - API endpoints only  
- `node run-tests.js ux` - UX data checks only
- `node run-tests.js all` - Everything

## Test Coverage

### Data Integrity
- Player search returns correct results
- Players show correct current teams
- Tree structures have proper node counts
- All edges connect to valid nodes
- Draft origins are present

### API Tests
- Search endpoint works
- Empty search returns array (not error)
- Invalid player ID returns 404
- Tree endpoint returns complete structure

### UX Checks
- Labels aren't too long (overflow risk)
- Nodes have dates
- No duplicate consecutive nodes

## Adding Test Players
Edit `qa-config.json` to add more players to test:
```json
{
  "testPlayers": [
    { "id": 27, "name": "Player Name", "expectedTeam": "ABC", "expectedNodes": 5 }
  ]
}
```

## Sub-Agent QA
To run a full QA sweep with sub-agents:
```
/spawn QA sweep for NBA Trade Tree - run tests, check for visual issues, verify data integrity
```

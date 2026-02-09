# NBA Trade Tree - Data Sources

## Primary Data Sources (Free)

### 1. nba_api (Python Package)
- **URL**: https://github.com/swar/nba_api
- **Cost**: Free, no API key
- **Data**: Player info, rosters, game stats, transactions
- **Usage**: `pip install nba_api`
- **Our Script**: `scripts/validate-rosters.py`

### 2. NBA.com Trade Tracker
- **URL**: https://www.nba.com/news/2025-26-nba-trade-tracker
- **Cost**: Free (web scraping)
- **Data**: Official trade announcements
- **Update Frequency**: Real-time during trade windows
- **Best for**: Trade deadline updates, verifying recent moves

### 3. Basketball-Reference
- **URL**: https://www.basketball-reference.com
- **Cost**: Free
- **Data**: Historical stats, transaction history, draft data
- **Best for**: Historical trade chains, draft information

### 4. ESPN API (Undocumented)
- **URL**: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/`
- **Cost**: Free (unofficial)
- **Data**: Rosters, schedules, scores
- **Note**: Not officially supported, may change

## Secondary Sources (Free Tier Available)

### 5. balldontlie.io
- **URL**: https://www.balldontlie.io/
- **Cost**: Free tier (limited requests)
- **API Key**: Required (free signup)
- **Data**: Players, teams, games, stats

### 6. SportsData.io
- **URL**: https://sportsdata.io/nba-api
- **Cost**: Free trial, then paid
- **Data**: Comprehensive stats, projections, fantasy

## Validation Process

### Automated (Daily)
```bash
# Validate rosters against NBA.com
python3 scripts/validate-rosters.py

# Run full QA test suite
node tests/run-tests.js all
```

### Manual (Trade Deadline / Major Events)
1. Check NBA.com trade tracker
2. Cross-reference Woj/Shams Twitter
3. Update database with new trades
4. Run validation scripts

## Cron Schedule (Recommended)

```
# Daily roster validation (6 AM PT)
0 14 * * * cd /home/ubuntu/clawd/projects/nba-trade-tree && python3 scripts/validate-rosters.py >> logs/validation.log 2>&1

# QA tests after deadline (Feb 6-10)
0 8 6-10 2 * cd /home/ubuntu/clawd/projects/nba-trade-tree && node tests/run-tests.js all >> logs/qa.log 2>&1
```

## Data Update Workflow

1. **Breaking Trade News**
   - Check @wojespn, @ShamsCharania on Twitter
   - Wait for official NBA.com confirmation
   
2. **Update Database**
   ```bash
   node scripts/add-trade.js "Player Name" "NEW_TEAM" "2026-02-05" "Trade notes"
   ```

3. **Validate**
   ```bash
   python3 scripts/validate-rosters.py
   node tests/run-tests.js data
   ```

4. **Deploy**
   - Restart app if needed
   - Data changes are live immediately (SQLite)

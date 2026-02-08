# NBA Trade Tree - Data Sources & Architecture Research

**Research Date:** 2026-02-07  
**Prepared for:** Edward's NBA Trade Tree Project

---

## 1. Data Sources

### 1.1 APIs & Programmatic Access

#### **nba_api (Python)** ⭐ PRIMARY RECOMMENDATION
- **URL:** https://github.com/swar/nba_api
- **License:** MIT (Open Source)
- **Cost:** Free
- **What it provides:**
  - Player career stats (PlayerCareerStats endpoint)
  - Player info (biographical, draft info)
  - Team rosters by season
  - Static datasets for players and teams
  - Live game data
- **Limitations:**
  - ❌ No dedicated trade history endpoint
  - ❌ No draft pick ownership/conveyance data
  - Must scrape/derive trade data from roster changes
- **Install:** `pip install nba_api`

#### **BallDontLie API** ⭐ RECOMMENDED FOR STATS
- **URL:** https://www.balldontlie.io
- **Cost:** Freemium (API key required)
- **What it provides:**
  - Players, teams, games, stats
  - Real-time scores and odds
  - 20+ leagues coverage
  - Google Sheets integration
  - MCP server for AI integration
- **SDKs:** JavaScript, Python
- **Limitations:**
  - ❌ No trade history data
  - Focused on stats/games, not transactions

#### **Sportradar** (Enterprise)
- **URL:** https://sportradar.com
- **Cost:** Paid (enterprise pricing, $10k+/year)
- **What it provides:**
  - Comprehensive NBA data
  - Transaction feeds
  - Real-time updates
- **Limitations:**
  - Expensive for hobby projects
  - Requires sales call

---

### 1.2 Web Scraping Sources

#### **Basketball-Reference** ⭐ BEST FOR TRADE HISTORY
- **URL:** https://www.basketball-reference.com
- **Trade History:** `/friv/trades.fcgi`
  - Searchable trade matrix between franchises
  - Individual trade details with players/picks exchanged
  - Example: `/friv/trades.fcgi?f1=ATL&f2=BOS` shows all ATL-BOS trades
- **Player Pages:** `/players/[letter]/[player_id].html`
  - Draft position
  - Career history (teams by season)
  - Transactions listed
- **Draft History:** `/draft/NBA_[YEAR].html`
- **Data Quality:** ✅ Excellent, comprehensive back to 1940s
- **Scraping:** Requires rate limiting, may need Cloudflare bypass

#### **Spotrac** ⭐ BEST FOR SALARY DATA
- **URL:** https://www.spotrac.com/nba
- **What it provides:**
  - Current contracts
  - Free agents (by year)
  - Cap hits and AAV
  - Contract structure (player options, team options)
- **Data Structure:**
  - Player IDs in URLs: `/nba/player/_/id/[ID]/[name]`
  - Positions, age, years of experience
- **Scraping:** Works with basic fetch

#### **RealGM**
- **URL:** https://basketball.realgm.com/nba/transactions
- **What it provides:**
  - Transaction logs
  - Draft pick trades
  - Free agent signings
- **Scraping:** Cloudflare protected (403 in testing)

#### **ProSportsTransactions**
- **URL:** https://www.prosportstransactions.com/basketball/
- **What it provides:**
  - Historical transaction database
  - Searchable by player, team, date
- **Scraping:** Cloudflare protected (403 in testing)

---

### 1.3 Draft Pick Ownership Data

**Challenge:** Draft pick ownership chains are complex (protections, swaps, conveyances)

#### Sources:
1. **Tankathon** - https://www.tankathon.com/pick_ownership
   - Current future pick ownership
   - Protection details
   
2. **RealGM Draft** - https://basketball.realgm.com/nba/draft/future_drafts
   - Future pick projections
   - Trade history for picks

3. **ESPN Trade Machine** - For validation only (no API)

---

## 2. Competitor Analysis

### 2.1 Fanspo Trade Machine
- **URL:** https://fanspo.com/nba/trade-machine
- **Features:**
  - Multi-team trades (2-5 teams)
  - Salary matching validation
  - Contract modification
  - Draft pick trading
  - Social sharing & voting
  - Community trade proposals
- **Strengths:**
  - ✅ Clean UI for building trades
  - ✅ Real-time salary cap calculations
  - ✅ Community engagement features
- **Weaknesses:**
  - ❌ No trade TREE visualization (just trade proposals)
  - ❌ No historical trade tracking
  - ❌ Doesn't show downstream effects

### 2.2 Spotrac
- **URL:** https://www.spotrac.com/nba
- **Features:**
  - Contract database
  - Team cap sheets
  - Free agent tracking
  - Transaction log
- **Strengths:**
  - ✅ Authoritative salary data
  - ✅ Historical contract info
  - ✅ Position, age, experience data
- **Weaknesses:**
  - ❌ No trade tree visualization
  - ❌ Trade history not linked/connected

### 2.3 Basketball-Reference
- **URL:** https://www.basketball-reference.com/friv/trades.fcgi
- **Features:**
  - Trade matrix (team-to-team history)
  - Individual trade details
  - Player transaction history
- **Strengths:**
  - ✅ Most comprehensive historical data
  - ✅ Links players to trades
  - ✅ Draft pick tracking
- **Weaknesses:**
  - ❌ No trade CHAIN visualization
  - ❌ Static pages, no interactive exploration
  - ❌ Hard to trace "Player A was traded for picks that became Player B"

### 2.4 Gap in Market
**None of these tools show trade TREES** — the chain of trades and how assets flow through multiple transactions. Example question none can answer easily:
> "Show me how the Celtics' 2013 trade of KG/Pierce to Brooklyn resulted in Jaylen Brown and Jayson Tatum"

**This is the opportunity.**

---

## 3. Proposed Data Schema

### 3.1 Core Entities

```sql
-- PLAYERS
CREATE TABLE players (
  id              TEXT PRIMARY KEY,  -- e.g., "jamesle01" from BBRef
  bref_id         TEXT UNIQUE,       -- Basketball-Reference ID
  nba_id          INTEGER,           -- NBA.com player ID
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  birth_date      DATE,
  height_inches   INTEGER,
  weight_lbs      INTEGER,
  draft_year      INTEGER,
  draft_round     INTEGER,
  draft_pick      INTEGER,
  draft_team_id   TEXT REFERENCES teams(id),
  career_start    INTEGER,           -- First season (e.g., 2003)
  career_end      INTEGER,           -- NULL if active
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- TEAMS
CREATE TABLE teams (
  id              TEXT PRIMARY KEY,  -- e.g., "BOS"
  name            TEXT NOT NULL,     -- "Boston Celtics"
  city            TEXT,
  abbreviation    TEXT UNIQUE,
  conference      TEXT,
  division        TEXT,
  founded_year    INTEGER,
  arena           TEXT,
  is_active       BOOLEAN DEFAULT TRUE
);

-- PLAYER TEAM HISTORY (derived/denormalized for quick lookup)
CREATE TABLE player_teams (
  id              SERIAL PRIMARY KEY,
  player_id       TEXT REFERENCES players(id),
  team_id         TEXT REFERENCES teams(id),
  season          TEXT,              -- e.g., "2023-24"
  start_date      DATE,
  end_date        DATE,
  acquisition     TEXT,              -- "trade", "draft", "fa_signing", "waiver"
  trade_id        TEXT REFERENCES trades(id),
  UNIQUE(player_id, team_id, season, start_date)
);
```

### 3.2 Trade Entities

```sql
-- TRADES (a single transaction event)
CREATE TABLE trades (
  id              TEXT PRIMARY KEY,  -- UUID or composite key
  trade_date      DATE NOT NULL,
  description     TEXT,              -- Human-readable summary
  source_url      TEXT,              -- Where we got this data
  num_teams       INTEGER DEFAULT 2,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- TRADE PARTICIPANTS (which teams were involved)
CREATE TABLE trade_teams (
  id              SERIAL PRIMARY KEY,
  trade_id        TEXT REFERENCES trades(id),
  team_id         TEXT REFERENCES teams(id),
  UNIQUE(trade_id, team_id)
);

-- TRADE ASSETS (what moved in the trade)
CREATE TABLE trade_assets (
  id              SERIAL PRIMARY KEY,
  trade_id        TEXT REFERENCES trades(id),
  from_team_id    TEXT REFERENCES teams(id),
  to_team_id      TEXT REFERENCES teams(id),
  asset_type      TEXT NOT NULL,     -- "player", "draft_pick", "cash", "trade_exception"
  
  -- For players
  player_id       TEXT REFERENCES players(id),
  
  -- For draft picks
  pick_year       INTEGER,
  pick_round      INTEGER,
  pick_original_team TEXT REFERENCES teams(id),  -- Whose pick it was
  pick_protections TEXT,             -- "Top 10 protected" etc.
  pick_swap        BOOLEAN DEFAULT FALSE,
  
  -- For cash/exceptions
  cash_amount     INTEGER,
  exception_value INTEGER,
  
  created_at      TIMESTAMP DEFAULT NOW()
);

-- DRAFT PICKS (actual picks and who they became)
CREATE TABLE draft_picks (
  id              SERIAL PRIMARY KEY,
  year            INTEGER NOT NULL,
  round           INTEGER NOT NULL,
  pick_number     INTEGER NOT NULL,  -- Overall pick (1-60)
  original_team   TEXT REFERENCES teams(id),
  selecting_team  TEXT REFERENCES teams(id),
  player_id       TEXT REFERENCES players(id),
  UNIQUE(year, round, pick_number)
);
```

### 3.3 Trade Chain/Tree Entities

```sql
-- TRADE CHAINS (linking related trades)
-- This is the key innovation for trade trees
CREATE TABLE trade_chains (
  id              TEXT PRIMARY KEY,
  name            TEXT,              -- "Brooklyn Trade Tree"
  description     TEXT,
  root_trade_id   TEXT REFERENCES trades(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

-- TRADE CHAIN LINKS (edges in the tree)
CREATE TABLE trade_chain_links (
  id              SERIAL PRIMARY KEY,
  chain_id        TEXT REFERENCES trade_chains(id),
  parent_trade_id TEXT REFERENCES trades(id),
  child_trade_id  TEXT REFERENCES trades(id),
  
  -- What asset connected these trades?
  linking_asset_type TEXT,           -- "player", "draft_pick"
  linking_player_id  TEXT REFERENCES players(id),
  linking_pick_year  INTEGER,
  linking_pick_round INTEGER,
  
  -- Metadata for visualization
  depth           INTEGER,           -- 0 for root, 1 for direct children, etc.
  branch          TEXT,              -- For grouping branches
  
  UNIQUE(chain_id, parent_trade_id, child_trade_id)
);

-- TRADE TREE NODES (denormalized for visualization)
CREATE VIEW trade_tree_nodes AS
SELECT 
  tc.id as chain_id,
  tc.name as chain_name,
  t.id as trade_id,
  t.trade_date,
  t.description,
  tcl.depth,
  tcl.branch,
  array_agg(DISTINCT tt.team_id) as teams_involved,
  json_agg(json_build_object(
    'type', ta.asset_type,
    'player_name', p.full_name,
    'from', ta.from_team_id,
    'to', ta.to_team_id
  )) as assets
FROM trade_chains tc
JOIN trade_chain_links tcl ON tc.id = tcl.chain_id
JOIN trades t ON tcl.child_trade_id = t.id
JOIN trade_teams tt ON t.id = tt.trade_id
LEFT JOIN trade_assets ta ON t.id = ta.trade_id
LEFT JOIN players p ON ta.player_id = p.id
GROUP BY tc.id, tc.name, t.id, t.trade_date, t.description, tcl.depth, tcl.branch;
```

---

## 4. Data Collection Strategy

### Phase 1: Foundation
1. **Players & Teams:** Seed from nba_api static datasets
2. **Draft History:** Scrape Basketball-Reference draft pages
3. **Basic Stats:** Optional, from nba_api

### Phase 2: Trade Data
1. **Primary Source:** Scrape Basketball-Reference trade pages
2. **Salary Overlay:** Enrich with Spotrac data
3. **Build trade_assets records**

### Phase 3: Trade Trees
1. **Algorithm:** For each trade, trace:
   - Forward: Where did the acquired assets go next?
   - Backward: Where did the departed assets come from?
2. **Link Trades:** When Asset X received in Trade A is sent out in Trade B, create chain link

### Technical Approach
```python
# Pseudocode for trade tree building
def build_trade_tree(root_trade_id: str) -> TradeTree:
    tree = TradeTree(root=root_trade_id)
    queue = [root_trade_id]
    
    while queue:
        trade_id = queue.pop(0)
        assets = get_assets_received(trade_id)
        
        for asset in assets:
            # Find subsequent trades involving this asset
            future_trades = find_trades_involving_asset(asset)
            for ft in future_trades:
                if ft.date > get_trade(trade_id).date:
                    tree.add_edge(trade_id, ft.id, linking_asset=asset)
                    queue.append(ft.id)
    
    return tree
```

---

## 5. Example: The Brooklyn Trade Tree

To validate the schema, here's how we'd represent the famous 2013 trade:

```
ROOT TRADE (2013-06-27):
  Brooklyn → Boston:
    - 2014 1st round pick (became James Young #17)
    - 2016 1st round pick (became Jaylen Brown #3)
    - 2018 1st round pick (became traded to PHI for Markelle Fultz pick, became Tatum #3)
    - Gerald Wallace
  Boston → Brooklyn:
    - Kevin Garnett
    - Paul Pierce
    - Jason Terry

CHILD TRADES:
├── 2017-06-22: BOS trades #1 to PHI, receives #3 + future pick
│   └── Jayson Tatum selected #3
├── 2016-06-23: BOS selects Jaylen Brown #3
└── 2014-06-26: BOS selects James Young #17
```

---

## 6. Recommendations

### Immediate Actions
1. **Set up PostgreSQL database** with above schema
2. **Build scraper for Basketball-Reference** (trades + players)
3. **Use nba_api** for player/team metadata

### Data Sources Priority
| Source | Data Type | Priority |
|--------|-----------|----------|
| nba_api | Player/Team base data | P0 |
| Basketball-Reference | Trade history | P0 |
| Spotrac | Salary/Contract | P1 |
| Tankathon | Draft pick ownership | P1 |

### Technical Stack Suggestion
- **Database:** PostgreSQL (relations + jsonb for flexibility)
- **Scraping:** Python + requests + BeautifulSoup
- **Backend:** FastAPI or Express
- **Frontend:** React + D3.js for tree visualization

---

## 7. Open Questions

1. **How far back to go?** 1984 (Jordan draft) or 2000 (modern era)?
2. **Include G-League/Two-way?** Adds complexity
3. **Cash considerations:** Track or ignore?
4. **Trade exceptions:** Important for cap nerds, complexity for tree

---

*Research complete. Ready for schema implementation and scraper development.*

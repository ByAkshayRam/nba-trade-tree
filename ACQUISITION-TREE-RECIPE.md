# NBA Acquisition Tree — Data Recipe

## Overview
Each roster player gets one JSON file: `{team}-{player-slug}.json`. The tree traces **how the team acquired this player**, walking back through trades, picks, and free agent signings to reach **origin nodes** (drafted players or undrafted signings that entered the NBA).

---

## File Structure

```json
{
  "_meta": {
    "team": "ATL",
    "player": "Buddy Hield",
    "source": "ESPN, NBA.com, Wikipedia",
    "originYear": 2016,
    "depth": 5,
    "lastUpdated": "2026-02-15"
  },
  "tree": { /* root node */ }
}
```

---

## Node Types & Rules

### 1. `player` node
A player involved in the acquisition chain.

```json
{
  "type": "player",
  "name": "Kristaps Porzingis",
  "acquisitionType": "trade",          // trade | draft | draft-night-trade | free-agent | undrafted
  "date": "2025-07-07",
  "currentTeam": "ATL",                // only on root node
  "tradePartner": "BOS",               // team traded with
  "tradeDescription": "3-team trade: Hawks got Porzingis from Celtics",
  "draftPick": 4,                      // if drafted
  "draftRound": 1,                     // if drafted
  "note": "7'2\" unicorn, 2024 champion",
  "isOrigin": true,                    // if this is where the chain ends
  "assetsGivenUp": [ ... ],            // what the team gave up to get this player
  "tradeChain": { ... }                // previous stops for this SAME player (free agent history)
}
```

### 2. `pick` node
A draft pick used as trade asset.

```json
{
  "type": "pick",
  "name": "2025 #22 Pick",             // NO player name in node name
  "acquisitionType": "original",        // original | trade
  "date": "2025-06-26",
  "becamePlayer": "Drake Powell",       // renders as grey "→ Drake Powell" tag
  "note": "Hawks' own 1st-round pick"
}
```

### 3. `other` node (rare)
Cash considerations, trade exceptions, etc.

---

## Key Rules

### Rule 1: Every chain must reach an origin
Every path from root must terminate at a node with `"isOrigin": true`. Origins are:
- **Drafted players** — the oldest drafted player in the chain
- **Undrafted free agents** — players who entered the NBA undrafted (G-League, international)
- **Original picks** — picks the team owned from their own record

### Rule 2: `assetsGivenUp` = what the team SENT OUT
These are the assets the team traded away to acquire the parent node. They flow **right-to-left** in the tree (assets on right, acquired player on left).

### Rule 3: `tradeChain` = same player's PREVIOUS teams
Used when a player bounced through multiple teams before arriving. Each link is the same player at a prior stop. NOT used for different players. This creates intermediate nodes showing the player's journey.

### Rule 4: Draft-night swaps
When a team drafts Player A but immediately trades for Player B:
- Player B (the one kept) = `player` node with `acquisitionType: "draft-night-trade"`, marked `isOrigin: true`
- Player A (the one traded away) = `pick` node in `assetsGivenUp` with `becamePlayer: "Player A"`
- Example: Hawks selected Luka #3, traded to DAL for Trae Young #5
  - Trae Young = origin node
  - "2018 #3 Overall Pick" with `becamePlayer: "Luka Doncic"` = asset given up

### Rule 5: Pick nodes — past vs future
- **Past picks** (already drafted, e.g. 2025 in Feb 2026): Use `"name": "2025 #22 Pick"` + `"becamePlayer": "Drake Powell"`
- **Future picks** (not yet drafted, e.g. 2027): Use full description `"name": "2027 LAC 2nd Round Pick"`, no `becamePlayer`
- **Protected picks**: Include protection in name: `"2026 MEM 2nd Round Pick (protected 43-60)"`

### Rule 6: Free agents / undrafted
- Simple free agent signings (team signed player directly) → `acquisitionType: "free-agent"`, `isOrigin: true`
- If the free agent has a long NBA history, use `tradeChain` to show their journey, with the earliest entry as origin
- Undrafted players → `acquisitionType: "undrafted"`, `isOrigin: true`

### Rule 7: Notes must be factual, not editorial
Notes should ONLY contain factual information about the player, trade, or pick:
- ✅ "Traded from BOS with 2027 1st round pick"
- ✅ "3-team trade: Hawks got Porzingis from Celtics"  
- ✅ "Michigan State forward, drafted 29th overall"
- ❌ "Elite rim protector, team cornerstone, steal at #31"
- ❌ "Dark years after Pierce/KG trade, foundation for future"
- ❌ "Versatile wing with playoff experience"
- ❌ "Championship window push" / "rebuild" / "recovery" / "experiment"

No narrative, no subjective assessments, no team-building commentary. Just facts about trades, drafts, and transactions.

### Rule 8: Filtered node types
Do NOT create nodes for: waivers, future considerations, cap-space, roster spots, season references, draft rights only. **Exception: Cash Considerations** — when a player is acquired for cash considerations, create a node with `"type": "cash"`, `"name": "Cash Considerations"`. This is the only "currency" node type that should appear in the tree. It renders as a yellow 💰 node.

### Rule 8: Shared trade chains
When multiple roster players came from the same trade (e.g., Kuminga + Hield from Porzingis trade), both files contain the same sub-tree. The API deduplicates shared nodes when building the team view.

---

## Acquisition Type Reference

| `acquisitionType` | When to use | Origin? |
|---|---|---|
| `draft` | Team drafted this player with their own pick | Yes |
| `draft-night-trade` | Team acquired player via draft night swap | Yes |
| `trade` | Standard mid-season or offseason trade | Trace deeper |
| `free-agent` | Signed as free agent | Yes (unless tradeChain) |
| `undrafted` | Entered NBA undrafted, signed by team | Yes |
| `original` | Pick the team owned organically | Yes |

---

## Quality Checklist (per team)

- [ ] Every roster player has a JSON file
- [ ] Every file has valid JSON with `_meta` and `tree`
- [ ] Every chain reaches at least one `isOrigin: true` node
- [ ] All drafted players have `draftPick` and `draftRound`
- [ ] All past picks use `becamePlayer` (not inline in name)
- [ ] No filtered node types (cash, waivers, etc.) unless sole asset
- [ ] Trade descriptions are accurate and sourced
- [ ] Dates are correct (use actual trade dates, not announcements)
- [ ] `tradePartner` is correct 3-letter abbreviation
- [ ] ESPN player IDs validated (headshot URL returns HTTP 200)
- [ ] No duplicate ESPN ID entries in the map
- [ ] Roster cross-referenced against ESPN current roster page
- [ ] Draft picks cross-referenced against Basketball-Reference draft history

---

## Data Sources & APIs

### Tier 1 — Primary (use for every player)

| Source | URL Pattern | Best For |
|--------|-------------|----------|
| **ESPN Player Page** | `espn.com/nba/player/_/id/{ID}/{slug}` | ESPN ID, current team, headshot, draft info |
| **ESPN Team Roster** | `espn.com/nba/team/roster/_/name/{abbr}` | Current roster, jersey numbers, positions |
| **ESPN Transactions** | `espn.com/nba/team/transactions/_/name/{abbr}` | Recent trades, signings, waivers |
| **Basketball-Reference Player** | `basketball-reference.com/players/{letter}/{bbref-id}.html` | Full transaction log, career history |
| **Basketball-Reference Draft** | `basketball-reference.com/draft/NBA_{year}.html` | Draft class, pick numbers, team |

### Tier 2 — Cross-reference (use to verify Tier 1)

| Source | URL Pattern | Best For |
|--------|-------------|----------|
| **NBA.com Player** | `nba.com/player/{nba-id}/{slug}` | Official roster verification |
| **NBA.com Transactions** | `nba.com/news/transactions` | Official trade announcements |
| **Spotrac** | `spotrac.com/nba/player/_/id/{id}/{slug}` | Contract details, trade history |
| **RealGM Trade Tracker** | `basketball.realgm.com/nba/transactions/composition_search` | Multi-team trade breakdowns |

### Tier 3 — Deep research (for complex/historical chains)

| Source | Best For |
|--------|----------|
| **Brave Search** (`web_search`) | Specific trade details, pick protections, obscure transactions |
| **Wikipedia Player Pages** | Full career transaction history in prose |
| **Hoops Rumors** | Trade rumors vs. confirmed deals, trade breakdowns |
| **The Athletic / ESPN articles** | Context on blockbuster trades, multi-team deals |

### Headshot APIs (NBA.com preferred)

**NBA.com CDN (PRIMARY — always current team photos):**
```
https://cdn.nba.com/headshots/nba/latest/1040x760/{NBA_ID}.png
```
- Always shows player in current team jersey
- NBA.com player ID found at: `nba.com/player/{NBA_ID}/{slug}`
- Validate: `curl -sI "https://cdn.nba.com/headshots/nba/latest/1040x760/{NBA_ID}.png"` → must return 200

**ESPN CDN (FALLBACK — may show old team jerseys):**
```
https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/{ESPN_ID}.png&w=350&h=254
```
- May show player in previous team's jersey (slow to update)
- Use only when NBA.com ID is unavailable

### Player ID Lookup Methods

**NBA.com IDs (preferred):**
1. `web_search("nba.com/player {player name} {team}")` → extract ID from URL path
2. NBA Stats API: `stats.nba.com/stats/commonteamroster?Season=2025-26&TeamID={team_id}`
3. Add to `NBA_PLAYER_IDS` map in `TeamAcquisitionTree.tsx`

**ESPN IDs (fallback):**
1. `web_search("ESPN {player name} {team} site:espn.com/nba/player")` → extract ID from URL
2. Add to `ESPN_PLAYER_IDS` map in `TeamAcquisitionTree.tsx`

**Validate both:**
```bash
# NBA.com
curl -sI "https://cdn.nba.com/headshots/nba/latest/1040x760/{NBA_ID}.png" -o /dev/null -w "%{http_code}"
# ESPN
curl -sI "https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/{ESPN_ID}.png" -o /dev/null -w "%{http_code}"
```

---

## Validation Pipeline

### Step 1: Roster Verification
Before creating any files, fetch the **current ESPN roster** and cross-reference with **NBA.com roster**:

```bash
# Fetch ESPN roster page for the team
web_fetch("https://www.espn.com/nba/team/roster/_/name/{team_abbr_lower}")
```

Extract: player names, ESPN IDs, jersey numbers, positions, draft info. This is the **source of truth** for who's on the roster.

### Step 2: ESPN ID Validation (MANDATORY)
For every player, before adding to `TeamAcquisitionTree.tsx`:

1. **Look up ESPN ID** from roster page or `web_search`
2. **Verify headshot returns 200**:
   ```bash
   curl -sI "https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/{ID}.png&w=350&h=254" | head -1
   ```
3. **If 404**: the ID is wrong. Re-search ESPN for the correct player page URL.
4. **Check for duplicates**: `grep "{player_name}" TeamAcquisitionTree.tsx` — must return exactly ONE entry.

### Step 3: Transaction History Verification
For each non-homegrown player, verify the acquisition chain:

1. **Basketball-Reference transaction log**: `web_fetch` or `web_search` the player's BBRef page → find "Transactions" section
2. **Cross-reference with ESPN transactions page** for the team
3. **For trades**: confirm both sides of the deal (what was sent, what was received)
4. **For draft picks**: confirm pick number against `basketball-reference.com/draft/NBA_{year}.html`
5. **For multi-team trades**: use RealGM or news articles to map all assets moving between teams

### Step 4: Date Verification
- Trade dates must be the **official trade date**, not the announcement date
- Use Basketball-Reference transaction logs as the authoritative date source
- Draft dates: use the actual draft date for that year (usually late June)
- Free agent signings: use the official signing date, not the agreement date

### Step 5: Origin Verification
For every origin node (`isOrigin: true`):

1. **Drafted players**: Confirm draft year, round, and pick number against BBRef draft page
2. **Undrafted players**: Confirm they were not drafted via BBRef or ESPN draft history
3. **Free agents**: Confirm no prior trade chain that should be traced

### Step 6: Headshot Batch Validation
After all files are created, run a batch check:

```bash
# For each player in the ESPN_PLAYER_IDS map for this team
# Verify: (a) ID exists, (b) headshot URL returns 200, (c) no duplicate entries
```

Any player with a missing or 404 headshot gets flagged for re-lookup.

---

## Production Workflow

### For each team:
1. **Fetch current roster** from ESPN roster page — extract all player names + ESPN IDs
2. **Cross-reference** with NBA.com roster for completeness
3. **Look up NBA.com player IDs** for all roster players — `web_search("nba.com/player {name} {team}")`
4. **Validate all headshots** — batch check NBA.com CDN URLs, fix any 404s immediately
5. **Add IDs to `TeamAcquisitionTree.tsx`** — NBA.com IDs to `NBA_PLAYER_IDS` map, ESPN IDs to `ESPN_PLAYER_IDS` map, check for duplicates
5. **Research each player's acquisition**:
   a. Check Basketball-Reference transaction log
   b. Cross-reference with ESPN transactions page
   c. For trades: verify both sides via Brave Search or RealGM
   d. For drafts: confirm pick number via BBRef draft page
6. **Create player files** — one JSON per player, starting with simple (drafted/FA), then complex (trades)
7. **Build deep chains** — for traded players, trace `assetsGivenUp` recursively
8. **Add `tradeChain`** — for players with multiple team stops
9. **Verify all origins** — every path terminates at `isOrigin: true`
10. **Run validation pipeline** — Steps 1-6 above
11. **Visual check** — load team page, verify headshots, layout, correct data

### Research priority per player:
```
1. ESPN player page → ESPN ID + basic info
2. Basketball-Reference → full transaction history + draft details  
3. ESPN/NBA.com transactions → recent trades this season
4. Brave Search → specific trade details, pick protections, multi-team breakdowns
5. RealGM/Wikipedia → historical trades, complex chains
```

### Red flags to watch for:
- ESPN ID returns 404 headshot → **wrong ID, must re-lookup**
- Player not on ESPN roster but in our data → **may have been waived/traded**
- Trade date doesn't match BBRef → **use BBRef date as authoritative**
- "3-team trade" with unclear asset flow → **must research each team's haul separately**
- Draft pick number mismatch → **always trust BBRef draft page over other sources**
- Player shows as "homegrown" but wasn't drafted by team → **check acquisitionType in JSON**

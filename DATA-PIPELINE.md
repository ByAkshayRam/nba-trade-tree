# NBA Acquisition Tree - Data Pipeline Strategy

## Overview

The acquisition tree visualizes how each roster player was acquired, tracing back to the original assets given up. The visualization creates a graph where:
- **Nodes** = Players, draft picks, cash, or trade actions
- **Edges** = "This asset was traded for that player"

## File Structure

```
data/acquisition-trees/
├── bos-jayson-tatum.json
├── bos-jaylen-brown.json
├── nyk-jalen-brunson.json
└── ... (one file per roster player)
```

## JSON Schema

```json
{
  "_meta": {
    "team": "BOS",           // 3-letter team code
    "player": "Jayson Tatum", // Player's display name
    "source": "Wikipedia/Basketball-Reference",
    "originYear": 2017,      // Year of oldest asset in chain
    "depth": 5,              // Max chain depth
    "lastUpdated": "2026-02-11"
  },
  "tree": {
    "type": "player",        // "player" | "pick" | "cash"
    "name": "Jayson Tatum",
    "acquisitionType": "trade", // "draft" | "trade" | "freeagent" | "undrafted"
    "date": "2017-06-22",
    "currentTeam": "BOS",
    "tradePartner": "PHI",   // Who we traded with (if trade)
    "draftPick": 3,          // If drafted
    "draftRound": 1,
    "tradeDescription": "Celtics trade #1 pick to PHI for #3 and 2019 SAC 1st",
    "note": "Duke phenom, future MVP candidate",
    
    // THIS IS THE KEY FIELD FOR EDGES!
    "assetsGivenUp": [
      {
        "type": "pick",
        "name": "2017 #1 Overall Pick",
        "acquisitionType": "original",
        "date": "2017-06-22",
        "becamePlayer": "Markelle Fultz",
        "tradeDescription": "Boston's own pick traded to Philadelphia",
        "isOrigin": true  // Marks this as an origin node
      },
      {
        "type": "pick",
        "name": "2019 1st Round Pick (SAC)",
        "acquisitionType": "trade",
        "date": "2017-06-22",
        "tradeDescription": "Sacramento's pick, became Matisse Thybulle",
        "isOrigin": true
      }
    ],
    
    // OPTIONAL: Narrative context (does NOT create edges)
    "priorHistory": {
      "type": "player",
      "name": "Jayson Tatum",
      "acquisitionType": "draft",
      "date": "2017-06-22",
      "draftPick": 3,
      "currentTeam": "PHI",  // Team that drafted him (before trade)
      "tradeDescription": "Would have been drafted by Philly without trade",
      "isOrigin": true
    }
  }
}
```

## How Edges Are Created

**Edges come from `assetsGivenUp`, NOT `priorHistory`!**

```
Each assetsGivenUp item → Edge from child to parent

Example:
Player A (acquired via trade)
  └── assetsGivenUp: [Pick X, Player B]
        │
        ├── Creates edge: Pick X → Player A
        └── Creates edge: Player B → Player A

If Player B also has assetsGivenUp:
        └── Player B
              └── assetsGivenUp: [Pick Y]
                    └── Creates edge: Pick Y → Player B
```

## Edge Count Formula

```
Edge Count = Sum of all assetsGivenUp entries across all player files

For deeper chains, nest assetsGivenUp:
- Level 1: Player traded for 2 picks = 2 edges
- Level 2: One pick came from another trade (1 asset) = 3 edges
- Level 3: That asset came from yet another trade = 4+ edges
```

## Creating New Player Files

### For Drafted Players (No Trade = No Edges)
```json
{
  "_meta": { "team": "BOS", "player": "Jaylen Brown", "depth": 1 },
  "tree": {
    "type": "player",
    "name": "Jaylen Brown",
    "acquisitionType": "draft",
    "date": "2016-06-23",
    "draftPick": 3,
    "draftRound": 1,
    "tradeDescription": "Celtics drafted Brown with Brooklyn's pick",
    "note": "The pick that came from the KG/Pierce trade"
    // No assetsGivenUp = no edges (homegrown player)
  }
}
```

### For Free Agents (No Trade = No Edges)
```json
{
  "_meta": { "team": "NYK", "player": "Jalen Brunson", "depth": 1 },
  "tree": {
    "type": "player",
    "name": "Jalen Brunson",
    "acquisitionType": "freeagent",
    "date": "2022-07-12",
    "tradeDescription": "Signed 4-year $104M deal as free agent from Dallas"
    // No assetsGivenUp = no edges
  }
}
```

### For Traded Players (Creates Edges)
```json
{
  "_meta": { "team": "NYK", "player": "Karl-Anthony Towns", "depth": 4 },
  "tree": {
    "type": "player",
    "name": "Karl-Anthony Towns",
    "acquisitionType": "trade",
    "date": "2024-10-02",
    "tradePartner": "MIN",
    "tradeDescription": "Knicks acquire KAT for Randle, DiVincenzo, picks",
    "assetsGivenUp": [
      {
        "type": "player",
        "name": "Julius Randle",
        "acquisitionType": "freeagent",
        "tradeDescription": "Signed as free agent",
        "isOrigin": true  // End of chain
      },
      {
        "type": "player", 
        "name": "Donte DiVincenzo",
        "acquisitionType": "trade",
        "tradePartner": "GSW",
        "assetsGivenUp": [  // NESTED = more edges!
          {
            "type": "pick",
            "name": "2024 2nd Round Pick",
            "acquisitionType": "original",
            "isOrigin": true
          }
        ]
      },
      {
        "type": "pick",
        "name": "2025 1st Round Pick (DET)",
        "acquisitionType": "trade",
        "isOrigin": true
      }
    ]
  }
}
```

## Validation Checklist

For each team to have healthy visualization:

1. ✅ Every roster player has a JSON file
2. ✅ Every trade-acquired player has `assetsGivenUp` array
3. ✅ Each `assetsGivenUp` item has `isOrigin: true` OR its own `assetsGivenUp`
4. ✅ Draft/FA players have no `assetsGivenUp` (they're homegrown)
5. ✅ Dates are in YYYY-MM-DD format
6. ✅ `_meta.team` matches filename prefix

## Target Edge Counts

Based on trade activity, realistic edge counts:

| Tier | Description | Edge Target |
|------|-------------|-------------|
| S | Heavy trade teams (NYK, BOS, OKC) | 30-60+ |
| A | Active traders | 15-30 |
| B | Moderate trade history | 8-15 |
| C | Rebuild/draft-heavy | 5-8 |

## API Endpoint

```
GET /api/acquisition-tree/{TEAM}/team

Response:
{
  team: "BOS",
  teamName: "Boston Celtics", 
  rosterNarrative: "...",
  rosterCount: 15,
  homegrownCount: 8,
  nodeCount: 45,
  edgeCount: 56,  // <-- This is what we're optimizing
  originCount: 12,
  tradeCount: 7,
  earliestOrigin: 1996,
  nodes: [...],
  edges: [...],
  teamColors: { primary: "#007A33", secondary: "#BA9653" }
}
```

## Enrichment Process

To enrich a team's data:

1. **Check roster** - Ensure every player has a file
2. **Identify trades** - Which players were acquired via trade?
3. **Research assets** - What was given up in each trade?
4. **Build chains** - For each asset, was IT acquired via trade?
5. **Add nested assetsGivenUp** - Create depth with connected trades
6. **Verify edge count** - Restart server, check API response

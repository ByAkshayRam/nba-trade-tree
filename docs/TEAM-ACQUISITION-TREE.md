# Team Acquisition Tree - Data Model

## Vision
Trace HOW a team acquired a player by following their asset history backward through time.

**Question answered:** "How did the Celtics get Vucevic?"

**Not:** "Where has Vucevic played?" (that's Player Origin Story)

## Example: Celtics → Vucevic

```
Nikola Vucevic (acquired Feb 2026)
└── Traded Anfernee Simons
    └── Traded Jrue Holiday (Jun 2025)
        └── Traded Malcolm Brogdon + Robert Williams + picks (Oct 2023)
            ├── Malcolm Brogdon
            │   └── Traded Aaron Nesmith + Daniel Theis + 2023 1st (Jul 2022)
            │       └── Aaron Nesmith
            │           └── Drafted 14th (2020) with Grizzlies pick
            │               └── Jeff Green trade (2015)
            │                   └── Kendrick Perkins trade (2011)
            │                       └── Drafted 27th by MEM, traded draft night (2003)
            │                           └── Dahntay Jones + Troy Bell package
            │                               └── Dahntay Jones drafted 20th with PHI pick (2003)
            │                                   └── Jérôme Moïso trade (2001)
            │                                       └── Drafted 11th by BOS (2000)
            └── Robert Williams
                └── Drafted 27th by BOS (2018)
```

26 years of asset history!

## Data Model

### New Table: `acquisition_trees`

```sql
CREATE TABLE acquisition_trees (
  id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  target_player_id INTEGER NOT NULL REFERENCES players(id),
  tree_json TEXT NOT NULL,  -- Full recursive tree structure
  origin_year INTEGER,       -- Earliest asset in tree
  last_updated TEXT,
  UNIQUE(team_id, target_player_id)
);
```

### Tree Node Structure

```typescript
interface AcquisitionNode {
  // What was acquired
  type: 'player' | 'pick' | 'cash';
  name: string;  // "Nikola Vucevic" or "2020 1st Round Pick"
  
  // How it was acquired
  acquisitionType: 'draft' | 'trade' | 'signing' | 'waiver';
  date: string;
  
  // For trades: what was given up to get this
  assetsGivenUp?: AcquisitionNode[];
  
  // Trade details
  tradePartner?: string;  // Team abbreviation
  tradeDescription?: string;
  
  // For picks: who it became
  becamePlayer?: string;
  
  // For players: their current status
  currentTeam?: string;
  
  // Visual
  teamColor?: string;
}
```

### API Endpoint

```
GET /api/acquisition-tree/:teamAbbr/:playerId
```

Response:
```json
{
  "team": "BOS",
  "player": "Nikola Vucevic",
  "originYear": 2000,
  "depth": 11,
  "tree": { ... AcquisitionNode },
  "nodes": [ ... React Flow nodes ],
  "edges": [ ... React Flow edges ]
}
```

## Building the Tree

### Algorithm

1. Start with target player on target team
2. Find how team acquired player:
   - If draft/signing → STOP (leaf node)
   - If trade → get assets given up
3. For each asset given up:
   - If player → recurse (how did team get THAT player?)
   - If pick → find what pick became, then recurse
4. Continue until all branches hit draft picks or signings

### Data Sources

For Celtics → Vucevic, we need:
1. Celtics transaction history (what they've given up in trades)
2. Pick outcomes (what each draft pick became)
3. Player transaction history (to link chains)

### CelticsBlog Article as Seed Data

The article traces:
```
Moïso (2000) → PHI pick (2003) → Jones → Perkins (2003)
→ Green (2011) → MEM pick (2020) → Nesmith (2020)
→ Brogdon (2022) → Holiday (2023) → Simons (2025) → Vucevic (2026)
```

We can use this as the first complete tree.

## UI Changes

### New Route
`/team/:teamAbbr/acquisition/:playerName`

Example: `/team/bos/acquisition/nikola-vucevic`

### Visualization
- Tree flows TOP (origin) → BOTTOM (current player)
- Each branch shows assets given up
- Picks show who they became
- Team colors for each node
- Click any player node to see THEIR acquisition tree

## Migration Path

1. Keep Player Origin Story as `/player/:id`
2. Add Team Acquisition Tree as `/team/:abbr/acquisition/:id`
3. Link between them (player card → "How did [team] get them?")

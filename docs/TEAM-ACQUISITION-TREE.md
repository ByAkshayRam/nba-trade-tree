# Team Acquisition Tree - Complete Implementation

## Vision
Trace HOW a team acquired every player on their current roster by following asset history backward through time.

**Question answered:** "How did the Celtics build their championship roster?"

## ✅ Milestone Completed: Feb 10, 2026

### Features Implemented

#### 1. Full Team Acquisition Tree View (`/team/:teamAbbr`)
- Displays **all current roster players** in a unified acquisition tree
- **Vertical roster column** on the left side, organized by:
  - 🟡 **Starters** (top)
  - 🟢 **Bench** (middle)
  - 🟣 **Two-Way** (bottom)
- **🏠 Homegrown indicator** for players drafted or signed directly (no trade chains)
- Shows complete transaction history tracing back to the **single origin** (oldest player in chain)

#### 2. Interactive Path Highlighting
- **Click any node** to highlight the full acquisition path from that node to its origin
- **Selected path**: Glows brighter, edges thicken, origin star pulses
- **Non-selected nodes**: Dim to 40% opacity
- **Click background** or same node to reset view
- **Status indicator**: Shows "Tracing: [Player Name]" when path is selected

#### 3. Origin Definition Logic
- **Origin** = The oldest player/asset in the transaction chain that led to today's roster
- Only chains that include **at least one trade** have origins marked
- Players acquired via direct signing, waivers, or draft (without subsequent trades) don't show origins
- Example: Antoine Walker (2000) is the single origin for multiple Celtics chains

#### 4. Export to Social Media
- **Export button** with Dark Mode / Light Mode options
- Generates high-quality JPEG with:
  - Title: "[Team Name] Acquisition Tree"
  - Subtitle: "How every player on the current roster was acquired"
  - Stats row: Roster count, Origins, Total Nodes, Transactions
  - Full graph visualization (controls/minimap hidden)
  - Footer: "Created by @ByAkshayRam"
  - Data sources: Basketball Reference, ESPN, NBA.com
  - Current date
- 2x pixel ratio for crisp Twitter sharing

#### 5. Individual Player Trees (`/team/:teamAbbr/acquisition/:playerId`)
- Detailed view of single player's acquisition history
- `becamePlayer` feature shows what draft picks became (grey pills)
- Date formatting: "Month Day, Year" format
- Player selector shows year range (origin → acquisition)

---

## Data Model

### Tree Node Structure

```typescript
interface AcquisitionNode {
  type: 'player' | 'pick' | 'cash';
  name: string;
  acquisitionType: 'draft' | 'trade' | 'signing' | 'waiver' | 'draft-night-trade';
  date: string;
  draftPick?: number;
  draftRound?: number;
  tradePartner?: string;
  tradeDescription?: string;
  becamePlayer?: string;  // For picks: who the pick became
  currentTeam?: string;
  note?: string;
  isOrigin?: boolean;
  assetsGivenUp?: AcquisitionNode[];  // Recursive: what was traded to get this
}
```

### Flow Node Data (for visualization)

```typescript
interface FlowNode {
  id: string;
  type: 'target' | 'player' | 'pick' | 'origin' | 'acquisition';
  data: {
    label: string;
    sublabel?: string;
    date?: string;
    nodeType: 'player' | 'pick' | 'cash';
    acquisitionType?: string;
    tradePartner?: string;
    note?: string;
    isOrigin?: boolean;
    isTarget?: boolean;
    isRosterPlayer?: boolean;
    isHomegrown?: boolean;
    rosterOrder?: number;
    rosterCategory?: 'starter' | 'bench' | 'two-way';
    draftPick?: number;
    becamePlayer?: string;
  };
}
```

---

## API Endpoints

### Team Acquisition Tree
```
GET /api/acquisition-tree/:teamAbbr/team
```

Response:
```json
{
  "team": "BOS",
  "teamName": "Boston Celtics",
  "rosterCount": 15,
  "nodeCount": 65,
  "edgeCount": 56,
  "originCount": 1,
  "tradeCount": 12,
  "earliestOrigin": 2000,
  "nodes": [...],
  "edges": [...],
  "teamColors": { "primary": "#007A33", "secondary": "#BA9653" }
}
```

### Individual Player Tree
```
GET /api/acquisition-tree/:teamAbbr/:playerId
```

### Player List
```
GET /api/acquisition-tree/:teamAbbr/players
```

---

## Origin Detection Algorithm

```typescript
// For each roster player's acquisition chain:
// 1. Trace back through ALL transactions in their history
// 2. Find the single OLDEST node by date in that chain
// 3. Only mark origins for chains that include at least one trade

for (const [rosterId, nodeKeys] of rosterToNodes.entries()) {
  // Skip chains that don't have any trades
  if (!rosterHasTrades.get(rosterId)) continue;
  
  let oldestKey = null;
  let oldestDate = Infinity;
  
  for (const nodeKey of nodeKeys) {
    const node = nodeMap.get(nodeKey);
    if (node?.data.date) {
      const dateMs = parseDate(node.data.date);
      if (dateMs < oldestDate) {
        oldestDate = dateMs;
        oldestKey = nodeKey;
      }
    }
  }
  
  if (oldestKey) originNodeKeys.add(oldestKey);
}
```

---

## Roster Organization

```typescript
const ROSTER_ORDER = {
  // Starters (order 1-5)
  "Derrick White": { order: 1, category: "starter" },
  "Jaylen Brown": { order: 2, category: "starter" },
  "Jayson Tatum": { order: 3, category: "starter" },
  "Nikola Vucevic": { order: 4, category: "starter" },
  "Payton Pritchard": { order: 5, category: "starter" },
  
  // Bench (order 10-18)
  "Sam Hauser": { order: 10, category: "bench" },
  "Neemias Queta": { order: 11, category: "bench" },
  // ... etc
  
  // Two-way (order 20+)
  "John Tonje": { order: 20, category: "two-way" },
  "Max Shulga": { order: 21, category: "two-way" },
};
```

---

## UI Components

### TeamAcquisitionTree.tsx
Main visualization component with:
- ELK.js layered layout algorithm
- Post-processing for vertical roster column
- Interactive path highlighting
- Export functionality with html-to-image

### Node Types
- **RosterNode**: Green with ESPN headshot, category label, homegrown indicator
- **PlayerNode**: Blue accent, shows trade partner
- **PickNode**: Green accent, shows `becamePlayer` as grey pill
- **OriginNode**: Amber with star icon, pulses when selected

### Layout Configuration
```typescript
const elkOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "LEFT",
  "elk.spacing.nodeNode": "80",
  "elk.layered.spacing.nodeNodeBetweenLayers": "180",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
};
```

---

## Example: Celtics Acquisition Chain

```
Antoine Walker (drafted 2000) ← ORIGIN
└── Traded for PHI pick (2001)
    └── Became Dahntay Jones (2003)
        └── Packaged with Troy Bell for Kendrick Perkins (2003)
            └── Traded for Jeff Green (2011)
                └── Traded for MEM pick (2015)
                    └── Became Aaron Nesmith (2020)
                        └── Packaged in trade for Malcolm Brogdon (2022)
                            └── Traded for Jrue Holiday (2023)
                                └── Traded for Anfernee Simons (2025)
                                    └── Traded for Nikola Vucevic (2026) ← ROSTER
```

**26 years** of asset history from a single origin!

---

## Files Changed

### New Files
- `app/src/app/team/[teamAbbr]/page.tsx` - Team acquisition tree page
- `app/src/app/api/acquisition-tree/[teamAbbr]/team/route.ts` - Team tree API
- `app/src/components/TeamAcquisitionTree.tsx` - Main visualization component

### Modified Files
- `app/src/components/AcquisitionTree.tsx` - Added becamePlayer pills, fixed spacing
- `app/src/components/PlayerSelector.tsx` - Added year range display
- `app/package.json` - Added html-to-image dependency
- `data/acquisition-trees/*.json` - Added becamePlayer data

---

## Next Steps

1. Add more teams beyond Celtics
2. Automated roster validation against ESPN
3. Historical roster snapshots (view team at any point in time)
4. Embed/share links for specific paths
5. Animation of asset flow through time

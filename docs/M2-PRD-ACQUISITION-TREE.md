# NBA Trade Tree - Milestone 2: Team Acquisition Tree
## Product Requirements Document

**Version:** 1.0  
**Date:** 2026-02-09  
**Status:** In Development

---

## Overview

The Team Acquisition Tree feature allows users to visualize how a team acquired any player on their roster by tracing the complete chain of assets back to their TRUE ORIGIN - the point where assets were originally acquired through draft picks the team owned OR free agent signings.

### Key Insight
> "Every player on an NBA roster can be traced back to either a draft pick the team owned, or a free agent they signed. The acquisition tree shows the complete genealogy of how assets compounded over time."

---

## Core Requirements

### 1. Complete Asset Tracing (CRITICAL)

**Rule:** Every acquisition chain MUST trace back to a TRUE ORIGIN:

| Origin Type | Definition | Example |
|-------------|------------|---------|
| **Own Draft Pick** | Team drafted player with their OWN pick (not traded for) | Paul Pierce - BOS 1998 #10 (own pick) |
| **Free Agent Signing** | Team signed player with no assets given up | Jason Terry - signed 2012 from DAL |
| **Undrafted Free Agent** | Signed player who went undrafted | Sam Hauser - UDFA 2021 |

**NOT a valid origin:**
- A traded pick (must trace back to what was given up for it)
- A player acquired via trade (must trace back to assets given up)

### 2. Data Structure

Each player's acquisition tree is stored as a nested JSON structure:

```json
{
  "_meta": {
    "team": "BOS",
    "player": "Jayson Tatum",
    "originYear": 1996,        // Year of EARLIEST origin in tree
    "depth": 7,                // Number of transaction levels
    "source": "Source name",
    "sourceUrl": "https://...",
    "lastUpdated": "2026-02-09"
  },
  "tree": {
    "type": "player",
    "name": "Jayson Tatum",
    "acquisitionType": "draft",
    "date": "2017-06-22",
    "draftPick": 3,
    "currentTeam": "BOS",
    "note": "Optional context",
    "assetsGivenUp": [
      // Nested assets that were traded to acquire this player/pick
      // Each asset has its own assetsGivenUp until reaching isOrigin: true
    ]
  }
}
```

### 3. Node Types

| Type | Visual Style | Description |
|------|-------------|-------------|
| **target** | Green, large, with headshot | The current player being traced |
| **origin** | Amber, pulsing | TRUE ORIGIN (own draft pick or free agent) |
| **player** | Blue left border | Player in the trade chain |
| **pick** | Green left border | Draft pick asset |
| **asset** | Gray, smaller | Secondary origin assets |

### 4. Visualization Requirements

#### Layout
- **Direction:** LEFT to RIGHT
  - Target player (current) on LEFT
  - Origins on RIGHT
  - User reads left-to-right, tracing BACK in history

#### Connections
- **Green lines:** Main acquisition path
- **Gray lines:** Secondary/additional assets
- **Arrows:** Show direction of asset flow
- **Handles:** Connection points on nodes (right side = source, left side = target)

#### Node Information
Each node displays:
- Player/pick name
- Acquisition type badge (PLAYER, DRAFT PICK, ORIGIN, etc.)
- Date of transaction
- Trade partner (via XXX)
- Optional notes

#### Target Node Special Features
- Player headshot (from ESPN CDN)
- "Acquired" badge
- Larger size for emphasis

### 5. Player Selector

- Dropdown in header showing all roster players
- Indicates which players have trees built ("Coming soon" for others)
- Shows origin year for available trees
- Instant navigation between players

---

## Data Validation Rules

### Required Fields
- `name` - Player or pick name
- `acquisitionType` - draft | trade | free-agent | undrafted
- `date` - Transaction date (YYYY-MM-DD)

### Conditional Fields
- `draftPick` - Required if acquisitionType = "draft"
- `tradePartner` - Required if acquisitionType = "trade"
- `assetsGivenUp` - Required unless `isOrigin: true`

### Origin Validation
A node is a valid origin ONLY if:
1. `isOrigin: true` is set, AND
2. One of these conditions:
   - `acquisitionType: "draft"` with team's OWN pick
   - `acquisitionType: "free-agent"`
   - `acquisitionType: "undrafted"`

---

## Example: Jayson Tatum Tree

```
Jayson Tatum (2017 #3)
└── 2017 #3 Pick (traded down from #1)
    └── 2017 #1 Pick (from BKN - Nets Trade)
        ├── Kevin Garnett (from MIN)
        │   ├── ★ Al Jefferson (2004 draft - OWN PICK)
        │   ├── ★ Gerald Green (2005 draft - OWN PICK)
        │   ├── ★ Ryan Gomes (2005 draft - OWN PICK)
        │   ├── Sebastian Telfair (from POR)
        │   │   └── Raef LaFrentz (from DAL)
        │   │       ├── ★ Antoine Walker (1996 draft - OWN PICK)
        │   │       └── Tony Delk (from PHO)
        │   │           └── ★ Rodney Rogers (FREE AGENT)
        │   └── ★ Theo Ratliff (trade - salary filler)
        ├── ★ Paul Pierce (1998 draft - OWN PICK)
        └── ★ Jason Terry (FREE AGENT 2012)
```

**Origins (★):** 8 total
- 5 draft picks (Al Jefferson, Gerald Green, Ryan Gomes, Antoine Walker, Paul Pierce)
- 2 free agents (Rodney Rogers, Jason Terry)
- 1 trade acquisition marked as origin (Theo Ratliff - minor asset)

---

## UI Components

### Page Layout
```
┌─────────────────────────────────────────────────────────┐
│ Header: Team Acquisition Tree    [Player Selector ▼]    │
├─────────────────────────────────────────────────────────┤
│ The Story                                               │
│ "The Celtics' acquisition of Jayson Tatum can be       │
│  traced back 28 years to..."                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [TARGET] ←── [chain] ←── [chain] ←── [★ ORIGIN]       │
│              └── [branch] ←── [★ ORIGIN]               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Stats: Years of History | Trade Depth | Origin Year    │
└─────────────────────────────────────────────────────────┘
```

### Legend
- ★ Origin (amber) - Starting point
- ✓ Target (green) - Current player
- Player (blue border)
- Pick (green border)

---

## ESPN Player ID Reference

For headshot images, map player names to ESPN IDs:

```typescript
const ESPN_PLAYER_IDS: Record<string, string> = {
  "Nikola Vucevic": "6478",
  "Jayson Tatum": "4065648",
  "Jaylen Brown": "3917376",
  "Derrick White": "3078576",
  "Payton Pritchard": "4066354",
  "Al Horford": "3213",
  "Jrue Holiday": "6442",
};
```

URL pattern: `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/{ESPN_ID}.png&w=350&h=254`

---

## File Structure

```
/data/acquisition-trees/
  bos-nikola-vucevic.json
  bos-jayson-tatum.json
  bos-jaylen-brown.json
  bos-derrick-white.json
  ...

/app/src/
  components/
    AcquisitionTree.tsx      # Main visualization
    AcquisitionTreeClient.tsx # Client wrapper (SSR compat)
    PlayerSelector.tsx        # Roster dropdown
  app/
    api/acquisition-tree/
      [teamAbbr]/
        [playerId]/route.ts  # Get tree data
        players/route.ts     # List available players
    team/
      [teamAbbr]/
        acquisition/
          [playerId]/page.tsx # Tree page
```

---

## Research Process for New Players

1. **Start with current player** - When did they join the team? How?

2. **For each trade asset given up:**
   - What did the team give up to acquire that asset?
   - Recurse until reaching origin

3. **For draft picks:**
   - Was it the team's OWN pick? → Origin
   - Was it traded for? → Trace what was given up

4. **For free agents:**
   - Mark as origin (no assets given up)

5. **Sources:**
   - Basketball Reference (transaction history)
   - ESPN trade tracker
   - Team blogs (often have deep dives)
   - RealGM trade history

---

## Success Metrics

- [ ] All origin nodes trace to valid origin types
- [ ] No "floating" nodes without connections
- [ ] Complete chains (no "..." or "unknown" gaps)
- [ ] Verified dates match historical records
- [ ] Player headshots load correctly

---

## Future Enhancements (M3+)

1. **Story Mode** - Animated walkthrough of the tree
2. **Shareable URLs** - Deep links to specific trees
3. **Export** - Generate graphics/scripts for content creators
4. **Compare Trees** - Side-by-side player comparison
5. **Team-wide View** - All roster trees combined
6. **Historical Trees** - Championship rosters traced back

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-09 | 1.0 | Initial PRD based on Vucevic and Tatum implementations |

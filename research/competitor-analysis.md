# Competitor Analysis: NBA Trade Tree UI/UX Research

**Date:** February 7, 2026  
**Sites Analyzed:** Fanspo.com, Spotrac.com

---

## Fanspo.com Analysis

### Overview
Social network for sports fans with a focus on fan-generated content and interactive tools. Primary feature is the NBA Trade Machine.

### Key Features
- **NBA Trade Machine** - Multi-team trade builder (2-5 teams)
- **Mock Draft Simulator**
- **Draft Lottery Simulator**
- **Player Comparison Tool**
- **Grid Builder** (for trivia games)
- **Big Board Creator**

### UI/UX Patterns

#### What Works ✅
1. **Clean onboarding flow** - "Add Team 1" → simple progressive disclosure
2. **Step-by-step guidance** - Instructions visible before interaction
3. **Social features** - "Share Your Trade", "Explain Yourself", "View, Vote and Comment"
4. **Community engagement** - User trades are shareable and interactive
5. **Multi-sport support** - NFL, NBA tools in one platform
6. **Dark theme** - Modern, easy on eyes

#### What Could Be Improved ❌
1. **404 errors on navigation** - Some pages don't render properly
2. **Tool discovery** - Tools are in footer, not prominently featured
3. **Limited data visualization** - Focused on trade creation, not trade history
4. **No trade lineage tracking** - Doesn't show downstream effects of trades

### Relevance to Our Project
- **Copy:** Social sharing, voting/commenting on trades
- **Avoid:** Complex multi-step flows for simple queries
- **Gap we fill:** They build trades, we show trade consequences/history

---

## Spotrac.com Analysis

### Overview
The gold standard for sports contract and financial data. Comprehensive, data-dense, premium content model.

### Key Features
- **Team Cap Tables** - Full salary breakdown by team
- **Player Contracts** - Detailed contract history and terms
- **Draft Pick Tracking** - Future pick ownership with protections
- **Transaction History** - Trade and signing logs
- **Free Agent Tracker**
- **News & Analysis** - Trade breakdowns

### UI/UX Patterns (Celtics Cap Table & Jayson Tatum Page)

#### What Works ✅
1. **Data density done right** - Tables packed with info but scannable
2. **Clear hierarchy** - Summary cards at top (Cap Space, Allocations), details below
3. **Navigation structure:**
   - Team dropdown (filter by team/season)
   - Sub-navigation: Overview | Cap | Tax | Cash | Multi-Year | Contracts | Position | Draft | Free Agents
4. **Player profile structure:**
   - Header: Photo, name, team, position, age, experience, draft info
   - Summary cards: Cap Hit, Cash, Career Earnings
   - Tabbed content: Contract Details | Career Earnings | Injuries | Transactions | Fines | Statistics
5. **Contract visualization:**
   - Year-by-year breakdown
   - Multiple views (Cap Hit, Base Salary, Cash)
   - Key dates and deadlines highlighted
6. **Pick ownership visualization:**
   - Visual 1-30 scale showing pick positions
   - Team colors for ownership
   - Complex conditions (swaps, protections) explained inline
7. **Transaction logging** - Clear dated entries
8. **Premium content gating** - Teases data, encourages subscription

#### What Could Be Improved ❌
1. **Mobile experience** - Tables don't work well on small screens
2. **No tree visualization** - All data is tabular, no graph view
3. **Pick chains are text-heavy** - Hard to follow "(via MIL to ORL; via DET to LAC to ORL)"
4. **No player-to-trade-origin tracking** - Shows current contract, not acquisition chain

### Data Patterns We Should Adopt
1. **Player header format:**
   ```
   [Photo] [Name]
   [Team], [Position]
   Age: X | Exp: X Years | College: X | Drafted: Round X (#X), YYYY
   ```

2. **Summary cards** - 3-4 key metrics at top of page

3. **Tab navigation** for content sections

4. **Team color theming** - Each team page uses team colors

5. **Pick visualization** - The 1-30 scale with ownership colors

### Relevance to Our Project
- **Copy:** Data hierarchy, team theming, summary cards, player header format
- **Improve on:** Visualize pick chains as trees, not text
- **Gap we fill:** Connect player acquisition to trade origin with visual tree

---

## Design Principles for NBA Trade Tree

Based on competitor analysis:

### 1. Visual Clarity
- Use React Flow for tree visualization (neither competitor does this)
- Team colors on nodes for instant recognition
- Player headshots where available

### 2. Information Architecture
- **Landing:** Player search (primary action)
- **Player page:** Tree visualization + details panel
- **Team page:** Roster with acquisition sources

### 3. Progressive Disclosure
- Show summary first (player, current team, acquisition type)
- Expand nodes to reveal trade details
- Click-through to full trade breakdown

### 4. Data Density Without Clutter
- Spotrac shows it's possible to pack data if organized well
- Use cards, not walls of text
- Collapsible sections for deep details

### 5. Social Sharing (Future)
- Fanspo's sharing/voting model is engaging
- Embeddable tree images for Twitter/social

### 6. Dark Theme
- Both sites use dark or offer it
- Easier on eyes for data-heavy content
- Matches Mission Control style

---

## Immediate Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Color scheme | Dark theme + team colors | Matches competitors, Mission Control style |
| Primary visualization | Interactive tree (React Flow) | Gap in market - no one does this |
| Data display | Cards + collapsible details | Spotrac's density, better scannability |
| Search | Prominent, autocomplete | Primary user action |
| Player header | Photo + key metadata | Spotrac's format works well |
| Team theming | Primary/secondary colors | Visual differentiation |

---

## Screenshots / Reference Links

- Spotrac Celtics: https://www.spotrac.com/nba/boston-celtics/cap
- Spotrac Tatum: https://www.spotrac.com/nba/player/_/id/23598/jayson-tatum
- Fanspo Trade Machine: https://fanspo.com/nba/trade-machine

---

*Research completed: Feb 7, 2026*

# NBA Trade Tree — Product Requirements Document

**Version:** 1.2  
**Author:** Edward (with Akshay)  
**Date:** February 11, 2026  
**Status:** Active Development  

---

## Vision

An interactive web experience that lets anyone search an NBA player and instantly see the full chain of trades, draft picks, and transactions that led to that player being on their current roster — visualized as a navigable tree.

Think of it as "git blame" for NBA rosters. Every player has an origin story, and the best ones span decades of cascading decisions.

---

## The Problem

NBA trades have cascading downstream effects that are invisible to most fans. When the Celtics traded KG and Pierce to the Nets in 2013, nobody knew those picks would become Jaylen Brown and Jayson Tatum — and eventually a championship. This context is buried across dozens of articles, Wikipedia pages, and Basketball Reference tables. There's no single place to **see** the full picture.

---

## Target Users

1. **NBA fans** — Want to understand how their team's roster was assembled
2. **Sports media/analysts** — Need shareable visuals for trade analysis content
3. **Fantasy/betting enthusiasts** — Want context on player acquisition value
4. **Sports Twitter** — Loves shareable, visual, opinionated content

---

## Current State (February 11, 2026)

### ✅ Completed Features

**Data Foundation:**
- Complete acquisition trees for 4 teams: BOS, NYK, OKC, WAS
- ESPN player ID mapping for headshots
- Player roster data with categories (starter/bench/two-way)
- Origin tracking back to 1996 for some chains

**Web Application:**
- Next.js 16 app running on port 3456
- Team pages at `/team/[teamAbbr]` with full roster visualization
- Interactive graph using React Flow with ELK layout algorithm
- Click-to-trace: Select any player to highlight their acquisition path
- Dynamic narrative generation based on selected player

**Visualization Features:**
- Color-coded nodes: Green (roster), Amber (origin), Blue (player), Green (pick)
- Player headshots from ESPN CDN
- Homegrown indicator (🏠) for drafted players
- Stats row: Roster count, Homegrown, Total Assets, Origins, Earliest Origin

**Export System (3 formats):**
1. **Full Tree (4:5)** - 2160×2700px - Complete graph with headline & stats
2. **Twitter Card (5:4)** - 2700×2160px - Split layout with player cards
3. **Stat Card (16:9)** - 2400×1350px - Provocative headline with chain sidebar

**Export Features:**
- Dark/light mode toggle
- Multi-select export dialog
- ESPN headshots with proper aspect ratio (350×254)
- Web UI color matching (green/blue/gold)
- Larger, centered layouts for social sharing

---

## Famous Example: The Celtics Trade Tree

```
2013: Celtics trade KG + Pierce → Nets
  ├── Receive 2014 1st (#17) → James Young
  ├── Receive 2016 1st (#3) → Jaylen Brown ⭐
  ├── Receive 2017 1st (#1)
  │   └── Trade to PHI → Receive 2017 (#3) → Jayson Tatum ⭐
  └── Receive 2018 1st (#8) → traded in Kyrie deal chain
  
Result: KG/Pierce → 2024 NBA Championship core
```

---

## Milestone Plan

### Milestone 0: Data Foundation ✅ COMPLETE
**Goal:** Build a reliable, queryable dataset of NBA trades, draft picks, and transactions.

**Completed:**
- [x] Acquisition data for BOS, NYK, OKC, WAS (4 teams)
- [x] Player headshots via ESPN CDN integration
- [x] Roster categorization (starter/bench/two-way)
- [x] Homegrown tracking
- [x] Origin year tracking (earliest: 1996 for Celtics)

---

### Milestone 1: Core Web App + Tree Visualization ✅ COMPLETE
**Goal:** Searchable web app that renders a player's trade tree as an interactive graph.

**Completed:**
- [x] Next.js 16 app with TypeScript + Tailwind
- [x] Team pages with full roster visualization
- [x] React Flow graph with ELK layout algorithm
- [x] Click-to-trace functionality (highlight acquisition paths)
- [x] Dynamic narrative generation for selected players
- [x] Responsive layout with zoom/pan controls

---

### Milestone 2: Team View + Polish ✅ IN PROGRESS
**Goal:** Browse by team, see how their entire roster was assembled.

**Completed:**
- [x] Team landing pages: `/team/[teamAbbr]`
- [x] Current roster view with acquisition source
- [x] Visual polish: team colors, animations, loading states
- [x] Stats row with 7 metrics

**Remaining:**
- [ ] Shareable URLs with pretty slugs
- [ ] OG image generation for social sharing
- [ ] SEO optimization

---

### Milestone 6: Content & Social Layer ✅ IN PROGRESS
**Goal:** Make the app a content generation machine for sports Twitter.

**Completed:**
- [x] Export dialog with 3 format options
- [x] Full Tree export (4:5) - complete graph capture
- [x] Twitter Card export (5:4) - split layout with player cards
- [x] Stat Card export (16:9) - provocative headline format
- [x] Dark/light mode for all exports
- [x] ESPN headshots integration in exports
- [x] Centered layouts and larger fonts for viral sharing

**Remaining:**
- [ ] Embeddable widgets for blogs
- [ ] Twitter bot integration
- [ ] Auto-generated "Trade Tree of the Day"

---

### Future Milestones (Not Started)

**Milestone 3: Championship Lineage**
- Championship roster trees
- Impact scoring

**Milestone 4: Trade Deadline Live Mode**
- Real-time trade updates
- Before/after comparisons

**Milestone 5: "What If" Mode**
- Remove trade toggle
- Alternate timeline visualization

---

## Technical Architecture

**Stack:**
- Next.js 16 (App Router) with TypeScript
- React Flow (`@xyflow/react`) for graph visualization
- ELK.js for automatic graph layout
- Tailwind CSS for styling
- html-to-image for graph exports
- Canvas API for custom export graphics

**Key Components:**
```
app/
├── src/
│   ├── app/
│   │   ├── team/[teamAbbr]/page.tsx      # Team page (server)
│   │   └── api/acquisition-tree/...       # API routes
│   └── components/
│       ├── TeamAcquisitionTree.tsx        # Main graph + exports
│       ├── TeamPageClient.tsx             # Client wrapper + narrative
│       └── AcquisitionTreeClient.tsx      # Legacy player view
```

**Export Dimensions:**
| Format | Aspect | Dimensions | Use Case |
|--------|--------|------------|----------|
| Full Tree | 4:5 | 2160×2700 | Instagram, detailed view |
| Twitter Card | 5:4 | 2700×2160 | Twitter/X landscape |
| Stat Card | 16:9 | 2400×1350 | YouTube thumbnails, presentations |

---

## Recent Changes (Feb 10-11, 2026)

### Session: Export System Enhancement

**Full Tree Export:**
- Legend moved up to avoid overlapping stats
- Headline font increased to 64px
- Stats values increased to 56px
- Colors now match web UI (green/blue/gold)

**Stat Card Export:**
- Headline and chain box vertically centered
- Font sizes increased (88px headline, 32px chain items)
- Single player headshot focus (removed extra headshots)
- Larger, more prominent layout for social impact

**Twitter Card Export:**
- Split layout with player cards + trophy section
- Proper headshot aspect ratio preservation
- Team color gradients

**Bug Fixes:**
- Fixed `[object Object]` display bug
- Fixed roster sorting by `rosterOrder`
- Fixed stretched headshots (preserved 350×254 ratio)
- Fixed TypeScript errors in AcquisitionTreeClient

---

## Data Coverage

| Team | Players | Nodes | Edges | Origins | Earliest |
|------|---------|-------|-------|---------|----------|
| BOS | 15 | 65+ | 60+ | 5 | 1996 |
| NYK | 17 | TBD | TBD | TBD | TBD |
| OKC | 19 | TBD | TBD | TBD | TBD |
| WAS | 17 | TBD | TBD | TBD | TBD |

---

## Running the App

```bash
# Development
cd /home/ubuntu/nba-acquisition-tree/app
npm run dev -p 3456

# Production (PM2)
pm2 start npm --name nba-acquisition-tree -- run start -- -p 3456
```

**URLs:**
- Team page: `http://localhost:3456/team/bos`
- API: `http://localhost:3456/api/acquisition-tree/bos/team`

---

## Next Steps

1. **Add more teams:** Expand from 4 to all 30 NBA teams
2. **Player search:** Global search to find any player's tree
3. **Championship view:** 2024 Celtics roster → all acquisition paths
4. **Social sharing:** OG images, Twitter cards
5. **Real data pipeline:** Connect to Basketball-Reference scraper

---

*This is a living document. Last updated: February 11, 2026*

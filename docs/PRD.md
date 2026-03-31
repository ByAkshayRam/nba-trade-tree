# NBA Trade Tree — Product Requirements Document

**Version:** 1.0  
**Author:** Edward (with Akshay)  
**Date:** February 5, 2026  
**Status:** Draft  

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

### Milestone 0: Data Foundation (MVP-critical)
**Goal:** Build a reliable, queryable dataset of NBA trades, draft picks, and transactions.

**Deliverables:**
- [ ] Python scraping pipeline for Basketball-Reference trade history (2000–present)
- [ ] nba_api integration for player profiles, draft history, team rosters
- [ ] Data normalization into a unified schema (players, picks, trades, acquisitions)
- [ ] SQLite database with all scraped data (start local, migrate to Postgres later)
- [ ] Validation against 5 known trade trees (Celtics/Nets, Harden, Westbrook, etc.)
- [ ] Script to refresh/update data incrementally

**Schema (core tables):**
```
players:        id, name, current_team_id, draft_year, draft_pick, headshot_url
teams:          id, abbreviation, name, primary_color, secondary_color
trades:         id, date, description, source_url
trade_assets:   id, trade_id, team_from, team_to, asset_type (player|pick), asset_id
draft_picks:    id, year, round, number, original_team_id, current_team_id, player_id
acquisitions:   id, player_id, team_id, type (trade|draft|signing|waiver), date, trade_id
```

**Success criteria:** Can programmatically trace Jayson Tatum's acquisition back to the KG/Pierce trade in ≤3 recursive queries.

**Estimated effort:** 2–3 sessions

---

### Milestone 1: Core Web App + Tree Visualization
**Goal:** Searchable web app that renders a player's trade tree as an interactive graph.

**Deliverables:**
- [ ] Next.js app with TypeScript + Tailwind + shadcn/ui
- [ ] Player search with autocomplete (type-ahead against player database)
- [ ] API route: `/api/tree/[playerId]` — returns full acquisition chain as a tree
- [ ] React Flow graph visualization of the trade tree
  - Nodes = Players, Draft Picks, Trade Events
  - Edges = "led to" relationships
  - Team colors on nodes
  - Player headshots where available
- [ ] Click any node to see trade details (date, teams, all assets exchanged)
- [ ] Responsive layout (desktop priority, mobile usable)

**Tech stack:**
- Next.js 16 (App Router)
- React Flow (`@xyflow/react`) for graph visualization
- SQLite via Drizzle (same pattern as Mission Control, keep it simple)
- Tailwind + shadcn/ui

**Success criteria:** Search "Jayson Tatum" → see full tree from KG/Pierce trade → click any node for details.

**Estimated effort:** 2–3 sessions

---

### Milestone 2: Team View + Polish
**Goal:** Browse by team, see how their entire roster was assembled.

**Deliverables:**
- [ ] Team landing pages: `/team/[abbreviation]`
- [ ] Current roster view with acquisition source for each player
  - Drafted / Traded / Signed / Waived
  - "Trace" button to expand any player's full tree
- [ ] Visual polish pass:
  - Team-colored themes per page
  - Smooth animations on tree expand/collapse
  - Loading skeletons
  - OG image generation for social sharing
- [ ] Shareable URLs: `/player/[name]` with pretty slugs
- [ ] Basic SEO: page titles, meta descriptions, structured data

**Success criteria:** Can browse to Warriors page, see full roster, click Curry → see he was drafted (simple), click a traded player → see full tree.

**Estimated effort:** 2 sessions

---

### Milestone 3: Championship Lineage
**Goal:** For any championship team, trace how every player on the title roster was acquired.

**Deliverables:**
- [ ] Championship data (year, team, roster)
- [ ] Championship page: `/championships/[year]`
- [ ] Full roster tree — every player's origin story in one view
- [ ] "Championship Impact Score" — which original trade contributed the most championship value
- [ ] Notable championship trade trees highlighted (e.g., "5 players on this roster trace back to 2 trades")

**Success criteria:** View 2024 Celtics championship, see that Brown + Tatum both trace to KG/Pierce trade.

**Estimated effort:** 1–2 sessions

---

### Milestone 4: Trade Deadline Live Mode
**Goal:** Real-time updates during trade deadline, showing immediate impact on trade trees.

**Deliverables:**
- [ ] Live trade feed integration (Twitter/ESPN scraping or manual input)
- [ ] "What just happened" view — when a trade breaks, instantly show the tree implications
- [ ] Push notifications for major tree-altering trades
- [ ] Historical deadline view — browse past deadlines and their downstream impact
- [ ] Before/after tree comparison

**Success criteria:** During next trade deadline, can show real-time tree updates within minutes of a trade being reported.

**Estimated effort:** 2 sessions (timing dependent on deadline schedule)

---

### Milestone 5: "What If" Mode
**Goal:** Alternate timelines — what if a trade never happened?

**Deliverables:**
- [ ] "Remove trade" toggle on any trade node
- [ ] Re-render the tree without that trade, showing the alternate timeline
- [ ] "Biggest butterfly effect" leaderboard — which trades had the most downstream impact
- [ ] Shareable "What If" URLs for social content

**Success criteria:** Remove KG/Pierce trade → see Celtics never get Brown/Tatum → share the comparison.

**Estimated effort:** 2 sessions

---

### Milestone 6: Content & Social Layer
**Goal:** Make the app a content generation machine for sports Twitter.

**Deliverables:**
- [ ] Auto-generated shareable images (tree as PNG/SVG)
- [ ] Embeddable widgets for blogs/articles
- [ ] "Trade Tree of the Day" automated content
- [ ] Twitter bot integration — reply to trade discussions with tree visualizations
- [ ] Newsletter integration — weekly "Best Trade Trees" roundup

**Success criteria:** Generate shareable trade tree images that get engagement on sports Twitter.

**Estimated effort:** 2 sessions

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | SQLite → Postgres later | Start simple, same Drizzle ORM. Migrate when traffic justifies it |
| Graph viz | React Flow | Best React integration, interactive out of the box, good docs |
| Hosting | Vercel | Free tier, instant deploys, edge functions |
| Data source | Basketball-Reference + nba_api | Most complete, scrapeable, API-accessible |
| Styling | Tailwind + shadcn | Fast to build, consistent with Mission Control |
| Auth | None (public app) | No user accounts needed for MVP |

---

## Data Pipeline Architecture

```
Basketball-Reference (scrape)
        │
        ▼
  Raw HTML → Parse trades, transactions
        │
        ▼
nba_api (API)
        │
        ▼
  Player profiles, draft data, team rosters
        │
        ▼
  ┌─────────────┐
  │  Normalize   │ ← Dedupe players, link picks to trades
  │  & Link      │ ← Build acquisition chains
  └─────┬───────┘
        │
        ▼
  ┌─────────────┐
  │   SQLite     │ ← Local dev
  │   (Drizzle)  │
  └─────┬───────┘
        │
        ▼
  ┌─────────────┐
  │  Next.js API │ ← Recursive tree queries
  │  Routes      │
  └─────┬───────┘
        │
        ▼
  ┌─────────────┐
  │  React Flow  │ ← Interactive visualization
  │  Frontend    │
  └─────────────┘
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Basketball-Reference rate limits/blocks | Can't scrape data | Use caching, respect robots.txt, slow scraping. Fallback: manual data entry for key trees |
| Trade data is incomplete/messy | Trees have gaps | Start with well-known trees (Celtics, Rockets), validate before scaling. Allow manual corrections |
| React Flow performance with large trees | UI freezes | Lazy-load branches, collapse by default, virtualize large graphs |
| Draft pick ownership is complex (protections, swaps) | Incorrect trees | Model pick protections explicitly. Start with simpler unprotected picks |
| Scope creep | Never ships | Stick to milestones. M0+M1 = usable product. Everything else is enhancement |

---

## Success Metrics

- **M0+M1 (MVP):** Can search any top-50 NBA player and see their trade tree
- **M2:** 30+ team pages with full roster trees
- **M3:** All championships since 2000 mapped
- **Engagement:** Shareable on social media, gets organic sports Twitter traction
- **Long-term:** Become the go-to reference for NBA trade history visualization

---

## Open Questions

1. **Scope of historical data:** Start from 2000? 1990? Further back = more data but diminishing returns
2. **Pick protections:** How detailed do we model pick protections? (Top-5 protected, lottery protected, etc.)
3. **Three-team trades:** How to visualize cleanly?
4. **Player photos:** NBA headshots API? Or scrape from Basketball-Reference?
5. **Domain name:** nbatradetree.com? tradelineage.com?

---

## Next Steps

1. **Now:** Review this PRD, align on scope and priorities
2. **Milestone 0:** Start building the data scraping pipeline
3. **Milestone 1:** Web app + visualization (this is the "wow" moment)

---

*This is a living document. Updated as we learn more during implementation.*

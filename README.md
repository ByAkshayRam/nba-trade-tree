# 🏀 NBA Trade Tree

Interactive web experience to visualize NBA trade lineage — see how players got to their current teams through cascading trades and draft picks.

**Think of it as "git blame" for NBA rosters.**

## Screenshot

<img width="1200" alt="NBA Trade Tree - Celtics/Nets Trade" src="https://via.placeholder.com/1200x600/0a0a0b/ffffff?text=NBA+Trade+Tree+Visualization">

## Features

- 🔍 **Player Search** — Search any NBA player to see their acquisition history
- 🌳 **Interactive Trees** — Zoomable, draggable trade tree visualization
- 🎨 **Team Colors** — Nodes styled with team branding
- 📱 **Responsive** — Works on desktop and mobile
- ⚡ **Fast** — SQLite database for instant queries

## Tech Stack

- **Next.js 15** (App Router)
- **React Flow** (@xyflow/react) for graph visualization
- **SQLite** + Drizzle ORM
- **Tailwind CSS**
- **TypeScript**

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Data Model

```
players     — NBA players (current + historical)
teams       — NBA teams
trades      — Trade transactions
trade_assets — What was exchanged in each trade
draft_picks — Draft picks (with ownership tracking)
acquisitions — How each player joined each team
```

## Famous Example: Celtics Trade Tree

```
2013: Celtics trade KG + Pierce → Nets
  ├── 2014 1st (#17) → James Young
  ├── 2016 1st (#3) → Jaylen Brown ⭐
  ├── 2017 1st (#1) → Trade to PHI → #3 → Jayson Tatum ⭐
  └── 2018 1st (#8) → Kyrie trade chain

Result: KG/Pierce → 2024 NBA Championship core
```

## Roadmap

- [x] M0: Data Foundation (SQLite schema)
- [x] M1: Core Web App (React Flow visualization)
- [ ] M2: Team Pages
- [ ] M3: Championship Lineage
- [ ] M4: Trade Deadline Live Mode
- [ ] M5: "What If" Mode
- [ ] M6: Social Sharing

## Credits

- Data: [Basketball-Reference](https://www.basketball-reference.com/)
- Built by Edward 🤖

## License

MIT

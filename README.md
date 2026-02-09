# NBA Trade Tree 🏀

An interactive web experience that lets you search any NBA player and instantly see the full chain of trades, draft picks, and transactions that led to them being on their current roster.

Think of it as "git blame" for NBA rosters.

## Features (MVP - Milestones 0 + 1)

### ✅ Data Foundation (Milestone 0)
- Python data pipeline with nba_api integration
- SQLite database with Drizzle ORM
- 37+ players with trade chain data
- 10 major trade events tracked
- Validated trade tree tracing (Jayson Tatum → KG/Pierce trade)

### ✅ Web App + Visualization (Milestone 1)
- Next.js 14 app with TypeScript + Tailwind
- Player search with autocomplete
- `/api/tree/[playerId]` - returns full acquisition chain
- React Flow graph visualization:
  - Player nodes (with headshots & team colors)
  - Trade event nodes
  - Draft pick nodes
  - Animated edge connections
- Click any node for details modal
- Dark theme (#0a0a0b, #141416, #232328)

## Famous Trade Trees Included

1. **Celtics-Nets (2013)** - KG/Pierce → Jaylen Brown + Jayson Tatum → 2024 Championship
2. **Luka-Trae Draft Swap (2018)** - Hawks trade #3 for #5 + future pick
3. **Harden to Houston (2012)** - OKC trades Harden, receives picks that become Steven Adams
4. **Kawhi to Raptors (2018)** - DeMar DeRozan trade → one year, one championship
5. **Anthony Davis to Lakers (2019)** - Lonzo Ball, Ingram, Hart + picks
6. **Gobert to Timberwolves (2022)** - 5 first round picks

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+

### Setup

```bash
# Clone the repo
cd projects/nba-trade-tree

# Set up Python environment for data scripts
python3 -m venv .venv
source .venv/bin/activate
pip install nba_api requests beautifulsoup4 lxml

# Initialize/update the database
python3 scripts/scrape_trades.py
python3 scripts/expand_data.py

# Install Node dependencies
cd app
npm install

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
nba-trade-tree/
├── app/                    # Next.js web application
│   ├── src/
│   │   ├── app/           # Pages & API routes
│   │   ├── components/    # React components
│   │   └── db/            # Drizzle schema & connection
├── data/
│   └── nba_trades.db      # SQLite database
├── scripts/
│   ├── scrape_trades.py   # Core trade data & validation
│   └── expand_data.py     # Extended player/trade data
└── research/              # Research notes on data sources
```

## Tech Stack

- **Frontend:** Next.js 14, React 19, TypeScript, Tailwind CSS
- **Visualization:** React Flow (@xyflow/react)
- **Database:** SQLite + Drizzle ORM (better-sqlite3)
- **Data Pipeline:** Python, nba_api, BeautifulSoup

## Success Criteria ✅

Search "Jayson Tatum" → see full tree from KG/Pierce trade → click any node for details.

**Status: Complete!**

## Roadmap

- [ ] Milestone 2: Team View + Polish
- [ ] Milestone 3: Championship Lineage
- [ ] Milestone 4: Trade Deadline Live Mode
- [ ] Milestone 5: "What If" Mode
- [ ] Milestone 6: Content & Social Layer

---

Built with 🏀 by Edward

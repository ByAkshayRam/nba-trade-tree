# NBA Trade Tree 🏀

Interactive web app that visualizes the chain of trades, picks, and transactions that led to any NBA player being on their current roster.

> "git blame" for NBA rosters — every player has an origin story.

## Features

- **Player Search**: Autocomplete search for any NBA player
- **Trade Tree Visualization**: Interactive graph showing acquisition chains
- **Trade Chain Tracing**: Follow picks and trades back to their origin
- **Dark Theme**: Modern, clean UI inspired by Mission Control

## Famous Example: The Celtics Trade Tree

In 2013, the Celtics traded Kevin Garnett and Paul Pierce to the Nets for four first-round picks:

```
2013: Celtics trade KG + Pierce → Nets
  ├── 2014 1st (#17) → James Young
  ├── 2016 1st (#3) → Jaylen Brown ⭐
  ├── 2017 1st (#1) → Traded to PHI → Received #3 → Jayson Tatum ⭐
  └── 2018 1st (#8) → Part of Kyrie Irving trade
  
Result: KG/Pierce → 2024 NBA Championship core
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Visualization**: React Flow (@xyflow/react)
- **Styling**: Tailwind CSS
- **Database**: SQLite + Drizzle ORM
- **Data Source**: Basketball-Reference (scraped), nba_api

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.10+ (for data scripts)

### Setup

1. Clone the repo:
```bash
git clone https://github.com/ByAkshayRam/nba-trade-tree.git
cd nba-trade-tree
```

2. Seed the database:
```bash
python3 scripts/scrape_trades.py
```

3. Install dependencies and run:
```bash
cd app
npm install
npm run dev
```

4. Open http://localhost:3000

## Project Structure

```
nba-trade-tree/
├── app/                    # Next.js web application
│   ├── src/
│   │   ├── app/           # App router pages & API routes
│   │   ├── components/    # React components
│   │   └── db/            # Drizzle schema & database
├── data/                   # SQLite database
├── scripts/                # Python scraping scripts
├── research/               # Competitor analysis & notes
└── PRD.md                  # Product requirements document
```

## Milestones

- [x] **M0**: Data Foundation - Scraping, schema, trade chain validation
- [x] **M1**: Core Web App - Search, tree visualization, dark theme
- [ ] **M2**: Team View - Browse by team, roster acquisition sources
- [ ] **M3**: Championship Lineage - Trace championship rosters
- [ ] **M4**: Trade Deadline Live - Real-time trade impact
- [ ] **M5**: "What If" Mode - Alternate timelines

## Contributing

This is a personal project, but PRs are welcome! See PRD.md for the roadmap.

## License

MIT

---

Built with 💚 by [Akshay](https://github.com/ByAkshayRam)

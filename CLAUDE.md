# CLAUDE.md — RosterDNA Project

## Security
- Do NOT read `.env` files, token files, or credentials anywhere on the system
- Do NOT push to git — commit only, human reviews and pushes
- Do NOT run `openclaw` commands

## Stack
- **Framework:** Next.js 16 (App Router) with TypeScript
- **Styling:** Tailwind CSS (zinc-800/900 dark theme, fuchsia accents)
- **Database:** SQLite via better-sqlite3 + Drizzle ORM
- **Image Gen:** Satori (@vercel/og ImageResponse) for card/chart APIs
- **Port:** 3456 (pm2 process: `nba-acquisition-tree`)

## Structure
- `app/src/app/` — Next.js routes and pages
- `app/src/components/` — React components (TeamAcquisitionTree is the main viz)
- `app/src/app/api/` — API routes (card/, chart/, players, subscribe, tree)
- `app/data/acquisition-trees/` — 512 JSON files (one per player per team)
- `app/public/cards/` — Pre-generated card PNGs

## Key Files
- `TeamAcquisitionTree.tsx` — Main trade chain visualization (React Flow)
- `TeamPageClient.tsx` — Team page wrapper
- `PlayerSearch.tsx` — Search with typewriter effect
- `app/src/app/api/card/shared.ts` — Shared card styles and team colors

## Build & Test
```bash
cd app && npm run build    # Build
pm2 restart nba-acquisition-tree  # Restart
```

## Data Rules
- `isOrigin: true` = chain terminator (FA signing)
- Dedup key = `name::date` — must match exactly across files
- `becamePlayer` only for conveyed draft picks
- NBA.com CDN primary for headshots, ESPN fallback

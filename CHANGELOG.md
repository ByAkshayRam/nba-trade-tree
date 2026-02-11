# Changelog

All notable changes to the NBA Acquisition Tree project.

## [Unreleased]

### Added
- **TeamPageClient.tsx** - Client wrapper component with dynamic narrative generation
- **Export mockups** - Reference designs for export formats in `export-mockups/`
- **Multi-format export dialog** - Select and download multiple export formats at once
- **Dark/light mode toggle** - All exports support both color modes
- **Single player focus** - Stat Card now shows only the main player headshot

### Changed
- **Full Tree Export (2160×2700)**
  - Legend moved up to avoid overlapping with bottom stats
  - Headline font increased from 52px to 64px
  - Stats values increased from 48px to 56px
  - Stats colors now match web UI (green for roster, blue for assets, gold for origins)
  - Tree position adjusted for larger headline

- **Stat Card Export (2400×1350)**
  - Headline vertically centered on left side
  - Headline font increased from 76px to 88px
  - Chain box vertically centered on right side
  - Chain items font increased from 26px to 32px
  - Removed multiple headshots, now shows single player with gold border
  - More spacious layout for social media impact

- **Twitter Card Export (2700×2160)**
  - Split layout with team info on left, player cards on right
  - Player cards with proper ESPN headshot aspect ratio
  - Trophy section for championship context

### Fixed
- `[object Object]` bug in player names - now using `.name` property
- Roster sorting now uses `rosterOrder` field (Tatum/Brown appear first)
- Stretched headshots - preserved ESPN's 350×254 aspect ratio
- TypeScript errors in AcquisitionTreeClient - added proper type transformations
- All UI overlays now properly hidden during Full Tree export

### Technical
- AcquisitionTreeClient now transforms flat node structure to nested `{id, type, data}` format
- Added `loadImage()` helper with CORS support for ESPN CDN
- Export functions use Canvas API for pixel-perfect graphics
- Proper spacing calculations for centered layouts

## [1.1.0] - 2026-02-10

### Added
- Team acquisition tree pages for BOS, NYK, OKC, WAS
- Interactive click-to-trace functionality
- Dynamic narrative generation based on selected player
- 7-column stats row (Roster, Homegrown, Assets, Transactions, Origins, Trades, Earliest)
- ESPN player headshot integration
- Homegrown indicator (🏠) for drafted players

### Changed
- Switched from dagre to ELK.js for graph layout
- Roster nodes positioned in vertical column on left
- Origin nodes styled with amber/gold colors

## [1.0.0] - 2026-02-05

### Added
- Initial PRD and project setup
- Basic acquisition tree visualization
- Player search functionality
- API routes for tree data

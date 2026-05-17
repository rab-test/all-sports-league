# All Sports League — Product Spec

## Tech Stack
- Next.js with Tailwind CSS
- JSON files in /data folder as the data layer (no database for now)
- Admin panel at /admin (password protected via environment variable)
- Deployed on Vercel
- Mobile-first design, dark sporty aesthetic

## How We Work
- Build iteratively, one section at a time
- Confirm before writing large amounts of files
- Keep code simple and readable
- No over-engineering beyond what the spec requires

## Overview
Multi-sport community competition based in Somerset West, South Africa.
Public web app — anyone can view fixtures, standings, results and playoffs.
Only Rayno (admin) can edit data via a password-protected /admin page.

## Non-Negotiable Architecture
All data must be scoped by: Organisation -> Brand -> Season -> Division.

EventDay and EventInstance separation:
- EventDay: date, venue(s)
- EventInstance: EventDay + Division + Sport + FormatPreset + PointsScheme

Scoring rules stored as data (PointsScheme), not hardcoded.

Fixture format implemented as presets:
- Preset A: 2 pools of 4 -> pool round robin -> semis -> final -> 3rd/4th playoff
- Preset B: Golf leaderboard day (no matchups)

Rosters: 12-player locked rosters per Squad per Season.

## MVP Scope (2026 Season)

### Structure
- 16 squads total
- Two divisions: Premier (8 squads), Challenger (8 squads)
- 12 locked players per squad (name only)
- Captains select matchday players from locked roster per event instance

### 2026 Calendar

6 June — Groot Drakenstein GC
- Premier: Padel (Preset A)
- Challenger: Touch Rugby (Preset A)

11 July — Groot Drakenstein GC
- Premier: Touch Rugby (Preset A)
- Challenger: Padel (Preset A)

1 August — Hellenic
- Premier: Fives Soccer (Preset A)
- Challenger: Fives Soccer (Preset A)

13 September — Boschenmeer & Kuilsriver
- Premier: Golf (Preset B)
- Challenger: Golf (Preset B)

17 October — Groot Drakenstein GC
- Challenger: 6-a-side Cricket (Preset A)

24 October — Groot Drakenstein GC
- Premier: 6-a-side Cricket (Preset A)

14 November — Groot Drakenstein GC
- Finals Weekend (qualify squads based on season standings; bracket configurable)

### Scoring — PointsScheme (Preset A)
- 1st overall: 8 points
- 2nd overall: 6 points
- 3rd overall: 4 points
- 4th overall: 3 points
- Pool 3rd place: 1 point
- Pool 4th place: 0 points
- No bonus points

### Tiebreakers (in order)
1. Total points
2. Head-to-head
3. Points/goal difference (sport-specific)

### Sport Notes
- Padel: 3 pairs per squad (6 players). Track squad-level result per fixture. Optional set/game details.
- Touch Rugby: score for/against
- Fives Soccer: goals for/against
- 6-a-side Cricket: runs for/against; wickets optional
- Golf: admin enters total team score; rank squads by score

## Required Functionality

### Admin
- Create season
- Import squads and players
- Create divisions
- Manage schedule
- Generate fixtures
- Lock fixtures
- Enter results
- Export standings and fixtures

### Captains
- View schedule and fixtures
- Confirm matchday players
- View results and standings

### Auto-generate (Preset A)
- Pool allocations
- Pool round robin fixtures
- Knockout bracket
- Auto-progression through rounds

### Auto-calculate
- Pool standings
- Event placements
- Event points
- Season standings

## UI Pages
- Home dashboard
- Schedule (EventDays and EventInstances)
- Division standings
- EventInstance page (pools, fixtures, bracket, results)
- Squad pages (roster, event history)
- Admin pages (imports, event setup, fixture generation, results entry)

## Design
- Dark, sporty aesthetic
- Mobile-first (most players view on phones)
- Each sport has its own colour accent
- Clean league tables and fixture cards
- Squad and player names prominent

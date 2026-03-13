# MatchPulse - Football Match Analyzer + Prediction Game

## Original Problem Statement
Build a full-stack JavaScript application called "Football Match Analyzer + Prediction Game" with:
- Match analysis with advanced statistics
- Interactive football pitch visualization
- Social features (comments, discussions)
- Virtual betting/prediction system
- Gamification (XP, levels, badges)
- Real-time notifications

## Tech Stack
- **Frontend:** React (CRA), TailwindCSS, Shadcn/UI, Recharts, React Router
- **Backend:** FastAPI (Python), MongoDB (motor async driver)
- **Auth:** JWT-based authentication
- **External API:** API-Football (v3.football.api-sports.io)

## User Language
French (all user-facing communication must be in French)

## Core Architecture
```
/app/
├── backend/
│   ├── server.py          # Monolithic FastAPI (all routes, models, logic)
│   └── .env               # MONGO_URL, DB_NAME, JWT_SECRET, FOOTBALL_API_KEY
├── frontend/
│   ├── src/
│   │   ├── App.js         # Router + AuthProvider
│   │   ├── components/    # Navbar, MatchCard, BetSlip, FootballPitch, etc.
│   │   ├── context/AuthContext.js
│   │   ├── lib/api.js     # Axios instance + all API wrappers
│   │   └── pages/         # All page components
│   └── .env               # REACT_APP_BACKEND_URL
└── memory/PRD.md
```

## Implemented Features

### Phase 1 - MVP (Complete)
- [x] JWT Authentication (register, login, profile, me)
- [x] Dark theme with neon green (#39FF14) accents
- [x] Home page with hero, upcoming matches, leaderboard preview
- [x] Matches page with filters (status, league)
- [x] Match detail with score, event timeline, stats charts, interactive pitch
- [x] Virtual betting system with odds & payouts
- [x] Comment system with replies and likes
- [x] XP, levels, badges system
- [x] All-time leaderboard
- [x] User dashboard with stats, charts, badges
- [x] Seed data with 8 mock matches

### Phase 2 - Gamification (Complete)
- [x] Daily login bonus (20 credits base) with streak multiplier
- [x] Player pack "gacha" system (Bronze/Silver/Gold packs)
- [x] Player collection page
- [x] Team boost system (collected players boost betting odds)
- [x] Avatar frames (purchasable with credits)
- [x] Player sell system (sell duplicates)

### Phase 3 - Live Data & Advanced Features (Complete - Feb 2026)
- [x] API-Football integration (sync real matches from 5 leagues)
- [x] 91+ real matches synced with team logos, scores, league info
- [x] Player Trading marketplace (create/buy/cancel trades)
- [x] Weekly leaderboard with tabs (All Time / This Week)
- [x] Daily Challenge "Pack Luck" (predict match, win free player)
- [x] Polished pack opening animations (shake, glow, particle effects)
- [x] "Sync Live" button on Matches page
- [x] Updated navbar with Trading & Challenge links
- [x] Bundesliga + Live filter added to Matches page

## Key API Endpoints
- Auth: `/api/auth/{register,login,me,profile}`
- Matches: `/api/matches`, `/api/matches/{id}`
- Bets: `/api/bets`, `/api/bets/my`, `/api/bets/resolve/{match_id}`
- Comments: `/api/matches/{id}/comments`, `/api/comments/{id}/like`
- Leaderboard: `/api/leaderboard`, `/api/leaderboard/weekly`
- Packs: `/api/packs`, `/api/packs/open/{type}`
- Collection: `/api/collection`, `/api/collection/sell/{player_id}`
- Trading: `/api/trades`, `/api/trades/{id}/buy`, `/api/trades/{id}/cancel`
- Challenge: `/api/daily-challenge`, `/api/daily-challenge/predict`, `/api/daily-challenge/check`
- Football: `/api/football/sync`, `/api/football/leagues`
- Daily: `/api/daily-claim`, `/api/daily-status`
- Dashboard: `/api/dashboard`

## DB Collections
- `users`, `matches`, `match_events`, `comments`, `bets`, `teams`, `players`, `user_players`, `trades`, `daily_challenges`

## Known Limitations
- API-Football free plan: seasons 2022-2024 only, no per-fixture stats/events
- Synced matches have scores but no detailed statistics (free tier)
- Seeded matches provide the detailed stats/events demo experience

## Backlog (Prioritized)
### P1
- [ ] Real-time notifications (Socket.io)
- [ ] Password recovery flow
### P2
- [ ] Advanced pitch visualization (heatmaps, player zones)
- [ ] Cloudinary integration for user avatars
### Refactoring
- [ ] Break server.py into modular routes/services/models
- [ ] Add TanStack Query for frontend data fetching

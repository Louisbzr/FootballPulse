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
- **External API:** API-Football Pro Plan ($19/month) - v3.football.api-sports.io

## User Language
French (all user-facing communication must be in French)

## Implemented Features

### Phase 1 - MVP (Complete)
- [x] JWT Authentication (register, login, profile, me)
- [x] Dark theme with neon green (#39FF14) accents
- [x] Home, Matches, Match Detail, Login, Register, Dashboard pages
- [x] Match detail: score, event timeline, stats charts, interactive pitch
- [x] Virtual betting with odds & payouts
- [x] Comment system with replies and likes
- [x] XP, levels, badges system
- [x] All-time leaderboard, User dashboard

### Phase 2 - Gamification (Complete)
- [x] Daily login bonus with streak multiplier
- [x] Player pack "gacha" system (Bronze/Silver/Gold)
- [x] Player collection, Team boost, Avatar frames

### Phase 3 - Live Data & Advanced Features (Complete - Mar 2026)
- [x] **API-Football Pro integration** (6 leagues: Ligue 1, PL, La Liga, Serie A, Bundesliga, UCL)
- [x] 209 real matches synced (106 finished, 97 upcoming, 4+ live)
- [x] 508 real events (goals, cards, subs) from live API
- [x] 30+ matches with detailed stats (possession, shots, passes, etc.)
- [x] Smart sort: Live > Upcoming > Finished
- [x] Player Trading marketplace
- [x] Weekly leaderboard with All Time / This Week tabs
- [x] Daily Challenge "Pack Luck"
- [x] Polished pack opening animations
- [x] Clean mock data endpoint

## 6 Leagues Supported
| League | API ID |
|--------|--------|
| Ligue 1 | 61 |
| Premier League | 39 |
| La Liga | 140 |
| Champions League | 2 |
| Serie A | 135 |
| Bundesliga | 78 |

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
- Football: `/api/football/sync`, `/api/football/leagues`, `/api/football/clean-mock`
- Daily: `/api/daily-claim`, `/api/daily-status`

## API Key
- Plan: Pro ($19/month)
- Key stored in: `/app/backend/.env` as `FOOTBALL_API_KEY`
- Season: 2025 (current)
- Quota: 7500 requests/day

## Backlog
### P1
- [ ] Real-time notifications (Socket.io)
- [ ] Password recovery flow
### P2
- [ ] Advanced pitch visualization (heatmaps)
- [ ] Cloudinary integration for avatars
### Refactoring
- [ ] Break server.py into modular routes/services/models

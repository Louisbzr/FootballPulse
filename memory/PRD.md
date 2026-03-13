# MatchPulse - Football Match Analyzer + Prediction Game

## Original Problem Statement
Build a full-stack application "Football Match Analyzer + Prediction Game" with match analysis, interactive pitch, social features, virtual betting, and gamification.

## Tech Stack
- **Frontend:** React (CRA), TailwindCSS, Shadcn/UI, Recharts, React Router
- **Backend:** FastAPI (Python), MongoDB (motor async), modular architecture
- **Auth:** JWT-based
- **External API:** API-Football Pro Plan ($19/month) - Key in backend/.env

## User Language: French

## Architecture (Refactored - Mar 2026)
```
backend/
├── server.py          # Slim app setup, middleware, router includes
├── config.py          # DB, auth helpers, constants, gamification helpers
├── models.py          # Pydantic models
├── data/
│   └── players.py     # 80 players (10 legendary, 20 epic, 25 rare, 25 common)
└── routes/
    ├── auth.py        # Register, login, profile, badges, teams
    ├── matches.py     # Matches CRUD, API-Football sync, events
    ├── bets.py        # 6 bet types, boost calc, resolve
    ├── social.py      # Comments, leaderboard (all-time + weekly), dashboard
    └── gacha.py       # Packs, collection, equip, trading, daily challenge, frames
```

## Implemented Features (All Complete)

### Phase 1 - MVP
- [x] JWT Auth, dark theme UI, all pages
- [x] Match detail with stats, interactive pitch
- [x] Virtual betting, comments, XP/levels/badges
- [x] Leaderboard, dashboard

### Phase 2 - Gamification
- [x] Daily login bonus with streak
- [x] Gacha packs (Bronze/Silver/Gold)
- [x] Player collection, team boosts, avatar frames

### Phase 3 - Live Data (Mar 2026)
- [x] API-Football Pro (6 leagues: Ligue 1, PL, La Liga, UCL, Serie A, Bundesliga)
- [x] 209+ real matches, 500+ events, lineups, stats
- [x] Trading marketplace, weekly leaderboard
- [x] Daily challenge "Pack Luck"
- [x] Polished pack animations

### Phase 4 - Advanced Features (Mar 2026)
- [x] **Backend refactored** into modular routes/config/models/data
- [x] **Match details**: Goalscorers with minute + assist, lineups (formation, coach, XI, subs), cards (yellow/red)
- [x] **Live minutes**: Elapsed time on cards and match detail
- [x] **6 bet types**: Vainqueur (x1.8), Score exact (x5), 1er buteur (x4.5), Total buts (x2.5), Les 2 marquent (x1.9), Over/Under (x1.85)
- [x] **Equip system**: ONE player equipped = boost on team matches. Cannot unequip if bet today
- [x] **80 players** in packs (real players from 6 leagues)
- [x] **Daily challenge**: Picks best match of the day (UCL > PL > La Liga priority)
- [x] Auto-refresh for live matches (30s interval)

## 6 Leagues
| League | API ID | Season |
|--------|--------|--------|
| Ligue 1 | 61 | 2025 |
| Premier League | 39 | 2025 |
| La Liga | 140 | 2025 |
| Champions League | 2 | 2025 |
| Serie A | 135 | 2025 |
| Bundesliga | 78 | 2025 |

## Key Endpoints
- Auth: `/api/auth/{register,login,me,profile}`
- Matches: `/api/matches`, `/api/matches/{id}`, `/api/matches/{id}/events`
- Bets: `/api/bets`, `/api/bets/my`, `/api/bets/resolve/{id}`, `/api/boosts/{id}`
- Equip: `/api/equip/{id}`, `/api/unequip`, `/api/equipped`
- Comments: `/api/matches/{id}/comments`, `/api/comments/{id}/like`
- Leaderboard: `/api/leaderboard`, `/api/leaderboard/weekly`
- Packs: `/api/packs`, `/api/packs/open/{type}`
- Collection: `/api/collection`, `/api/collection/sell/{id}`
- Trading: `/api/trades`, `/api/trades/{id}/buy`, `/api/trades/{id}/cancel`
- Challenge: `/api/daily-challenge`, `/api/daily-challenge/predict`, `/api/daily-challenge/check`
- Football: `/api/football/sync`, `/api/football/leagues`, `/api/football/clean-mock`

### Phase 5 - Optimisations (Mar 2026)
- [x] **Cache API-Football** : Skip matchs déjà enrichis (stats+lineups), cache horaire pour éviter les re-fetch, endpoint /api/football/stats
- [x] **Cotes dynamiques** : Les cotes s'ajustent en temps réel pendant les matchs live basées sur le score et le temps écoulé (ex: 3-0 à 75' → Vainqueur x1.8→x1.36, Over/Under x1.85→x1.05)
- [x] **Endpoint /api/odds/{match_id}** : Retourne les cotes actuelles pour tous les types de paris
- [x] Auto-refresh des cotes toutes les 30s pour les matchs live côté frontend
- [x] Affichage visuel des baisses de cotes (barré + flèche rouge) dans le BetSlip

## Backlog
### P1
- [ ] Real-time notifications (Socket.io)
- [ ] Password recovery flow
### P2
- [ ] Advanced pitch (heatmaps, player zones)
- [ ] Cloudinary avatars

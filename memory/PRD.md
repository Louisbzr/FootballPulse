# MatchPulse - Football Match Analyzer + Prediction Game

## Product Overview
Full-stack web application for football match analysis with virtual predictions, gamification, and social features.

**Stack:** React (frontend) + FastAPI/Python (backend) + MongoDB + Socket.IO

## Core Features (All Implemented)

### Authentication & User Management
- [x] JWT-based registration/login
- [x] User profiles with avatar, favorite team
- [x] Password recovery (forgot password with token-based reset)
- [x] Change password from profile page
- [x] XP system, levels, badges

### Match System
- [x] API-Football Pro integration (6 major European leagues)
- [x] Live match sync with scores, events, stats, lineups
- [x] API caching layer (MongoDB TTL-based)
- [x] Detailed match pages: timeline, stats radar/bar charts, lineups, pitch visualization

### Prediction System
- [x] 6 bet types: winner, exact score, first scorer, total goals, both teams score, over/under
- [x] Dynamic odds that adjust based on live match score
- [x] Player equip system for team-specific boosts
- [x] Automatic bet resolution on match completion

### Gamification
- [x] Daily login bonus (20 credits base + streak multiplier)
- [x] Player pack opening (Bronze/Silver/Gold) with 5 rarity tiers
- [x] 5 rarities: Common, Rare, Epic, Legendary, ICON (football legends)
- [x] Player variants (e.g., Mbappé PSG/Real Madrid/Monaco)
- [x] Player collection with equip/sell system
- [x] Trading marketplace with price history tracking
- [x] Daily prediction challenge (Pack Luck)
- [x] Weekly/All-time leaderboards
- [x] Badge system (4 badges)

### Real-time Features (NEW)
- [x] Socket.IO integration for live notifications
- [x] Notification bell in navbar with unread count
- [x] Notification types: bet won/lost, trade sold, badge earned
- [x] Mark individual/all notifications as read

### UI/UX
- [x] Dark/Light theme toggle (CSS variables system)
- [x] Responsive design (mobile-friendly)
- [x] Theme-aware all pages (15+ pages updated)
- [x] Animated transitions, glass-morphism effects
- [x] Enhanced football pitch with heatmap visualization
- [x] Market price trends with charts (Recharts)

## Architecture

```
/app/backend/
├── server.py           # FastAPI + Socket.IO ASGI app
├── config.py           # DB, auth, game configuration
├── models.py           # Pydantic models
├── socket_manager.py   # Socket.IO event handlers + notification sender
├── data/players.py     # Player database (40+ players with variants)
└── routes/
    ├── auth.py          # Auth + password recovery + change password
    ├── matches.py       # Match sync, API-Football integration
    ├── bets.py          # Predictions with dynamic odds
    ├── gacha.py         # Packs, collection, trading, daily challenge
    ├── social.py        # Comments, replies
    └── notifications.py # Notification CRUD

/app/frontend/src/
├── App.js              # Router + Providers (Auth, Theme, Notifications)
├── context/
│   ├── AuthContext.js
│   ├── ThemeContext.js
│   └── NotificationContext.js
├── components/
│   ├── Navbar.js, MatchCard.js, BetSlip.js
│   ├── NotificationBell.js, DailyLogin.js
│   ├── FootballPitch.js (heatmap), StatsCharts.js
│   └── CommentSection.js
└── pages/
    ├── Home, Login, Register, ForgotPassword
    ├── Dashboard, Profile, Matches, MatchDetail
    ├── Predictions, Collection, PackOpening
    ├── Trading, Leaderboard, DailyChallenge
```

## API Endpoints

### Auth: /api/auth/*
- POST /register, /login, /forgot-password, /reset-password
- GET /me, /teams
- PUT /profile, /change-password

### Matches: /api/matches, /api/matches/{id}, /api/football/sync
### Bets: /api/bets, /api/bets/my, /api/bets/{id}/resolve, /api/odds/{id}
### Gacha: /api/packs, /api/packs/open/{type}, /api/collection, /api/equip/*
### Trading: /api/trades, /api/trades/{id}/buy, /api/trades/market-overview, /api/trades/price-history/{id}
### Social: /api/matches/{id}/comments
### Notifications: /api/notifications, /api/notifications/read, /api/notifications/unread-count

## Key DB Collections
users, matches, bets, comments, user_players, trades, notifications, password_resets, daily_challenge_progress, api_cache, price_history

## 3rd Party Integrations
- **API-Football** (Pro plan, $19/month) - Live match data for 6 leagues

## Remaining Backlog
- [ ] P2: Cloudinary avatar uploads
- [ ] P2: TanStack Query migration for frontend data fetching
- [ ] P3: Advanced pitch heatmaps with per-player zones
- [ ] P3: Seasonal rewards system
- [ ] P3: Social login (Google OAuth)

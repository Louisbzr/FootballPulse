# MatchPulse - Football Match Analyzer + Prediction Game

## Original Problem Statement
Build a full-stack football analytics platform with: match analysis, advanced statistics visualization, interactive pitch, social features, virtual prediction/betting system, gamification (XP, levels, badges), leaderboards, and user dashboard.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI + Recharts
- **Backend**: FastAPI (Python) + MongoDB (Motor)
- **Auth**: JWT tokens with bcrypt password hashing
- **Data**: Mock/seeded football data (8 matches, 8 teams, 26 events)

## User Personas
1. **Football Analyst**: Reviews match stats, radar charts, pitch visualization
2. **Predictor/Gambler**: Places virtual bets, tracks credits, competes on leaderboard
3. **Social User**: Comments on matches, likes posts, earns XP through engagement
4. **Portfolio Viewer**: Evaluates the app as a fullstack JavaScript showcase

## Core Requirements (Static)
- JWT authentication (register/login/profile)
- Match browsing with filtering by status/league
- Match detail: score, timeline, stats charts, SVG pitch, comments, betting
- Virtual betting with 1000 starting credits, odds multipliers
- Gamification: XP, levels (Rookie→Analyst→Expert→Legend), badges
- Leaderboard with rankings
- User dashboard with stats, progress, badge display

## What's Been Implemented (March 2026)
- [x] Full JWT auth system (register, login, me, profile update)
- [x] 8 seeded matches (La Liga, Premier League, Champions League, Serie A)
- [x] Match detail with 5 tabs: Timeline, Statistics, Pitch, Predictions, Comments
- [x] SVG football pitch with event markers and heatmap zones
- [x] Recharts integration (RadarChart, BarChart, AreaChart, PossessionBar)
- [x] Virtual betting system with winner/exact score/total goals bet types
- [x] Gamification: XP system, 4 levels, 4 badges
- [x] Leaderboard with top-3 podium design
- [x] Dashboard with XP progress, stats cards, bet history chart
- [x] Comments with likes, replies, XP rewards
- [x] Dark theme (neon green #39FF14, Barlow Condensed headings)
- [x] Responsive design with mobile support
- [x] All data-testid attributes for testing

## Prioritized Backlog
### P0 (Critical)
- None (MVP complete)

### P1 (High Priority)
- Real-time notifications with WebSocket/Socket.io
- External football API integration (API-Football/football-data.org)
- Google OAuth login

### P2 (Medium Priority)
- Interactive pitch: click to add events, heatmap filters
- Weekly leaderboard with reset
- League-specific leaderboards
- Password recovery flow
- User-to-user mentions in comments

### P3 (Nice to Have)
- Live match score updates
- Player-specific heatmaps
- Expected Goals (xG) stat
- Image upload for avatars (Cloudinary)
- Match prediction sharing on social media

## Next Tasks
1. Add WebSocket for real-time notifications
2. Integrate external football API when user provides API key
3. Add Google OAuth when user provides OAuth credentials
4. Weekly leaderboard reset logic
5. Enhanced pitch interactivity (click-to-place events)

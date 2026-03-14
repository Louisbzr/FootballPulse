# MatchPulse - Football Match Analyzer + Prediction Game

## Problème original
Application full-stack d'analyse de matchs de football avec un système de jeu de prédiction. Les utilisateurs peuvent analyser les matchs, placer des paris virtuels, collectionner des joueurs et concourir au classement.

## Architecture
- **Frontend:** React + TailwindCSS + Shadcn/UI + Recharts + Socket.IO client
- **Backend:** FastAPI (Python) + MongoDB (Motor) + Socket.IO
- **Auth:** JWT
- **API externe:** API-Football (Pro plan)
- **Langue:** Interface entièrement en français

## Fonctionnalités implémentées

### Phase 1 - Core (TERMINÉE)
- [x] Authentification complète (inscription, connexion, JWT)
- [x] Récupération de mot de passe (jeton de réinitialisation)
- [x] Changement de mot de passe
- [x] Page de profil avec avatar et équipe favorite
- [x] Dashboard personnel avec statistiques

### Phase 2 - Matchs & API (TERMINÉE)
- [x] Intégration API-Football pour 6 ligues
- [x] Affichage des matchs avec filtres (statut, ligue)
- [x] Détails du match (chronologie, statistiques, compositions, terrain)
- [x] Heatmap des événements sur terrain 2D
- [x] Système de cache API pour optimisation

### Phase 3 - Gamification (TERMINÉE)
- [x] Système de paris virtuels avec cotes dynamiques
- [x] Système XP, niveaux et badges
- [x] Bonus de connexion quotidien avec multiplicateur de série
- [x] Système Gacha (packs Bronze/Argent/Or)
- [x] Collection de joueurs avec raretés (Commun, Rare, Épique, Légendaire, Icône)
- [x] Équipement de joueur pour boost d'équipe
- [x] Défi quotidien

### Phase 4 - Social & Échanges (TERMINÉE)
- [x] Commentaires sur les matchs avec réponses
- [x] Marché d'échange (vente/achat de joueurs)
- [x] Classement (tous les temps + hebdomadaire)
- [x] Notifications en temps réel via Socket.IO

### Phase 5 - Thème & UI (TERMINÉE)
- [x] Système de thème clair/sombre avec CSS variables
- [x] Rareté "Icône" pour joueurs légendaires

### Phase 6 - Localisation (TERMINÉE - 14 mars 2026)
- [x] Traduction française complète de l'interface (14 pages, 6 composants)
- [x] Labels de raretés traduits (Commun, Rare, Épique, Légendaire, Icône)
- [x] Toasts et messages d'erreur en français

### Phase 7 - Missions (TERMINÉE - 14 mars 2026)
- [x] Système de missions hebdomadaires (5 missions/semaine)
- [x] 8 types de missions (paris, packs, commentaires, échanges, connexions, crédits, raretés)
- [x] Progression calculée à partir des vraies données DB
- [x] Réclamation de récompenses (crédits + XP)
- [x] Réinitialisation automatique chaque semaine
- [x] Suivi des ouvertures de packs (collection pack_opens)

## Backlog

### P1 (Haute priorité)
- [ ] Graphiques d'historique de prix avancés (améliorer l'UX existante)

### P2 (Moyenne priorité)
- [ ] Migration vers TanStack Query pour le data fetching
- [ ] Upload d'avatar via Cloudinary
- [ ] Récompenses saisonnières

### P3 (Basse priorité)
- [ ] Connexion sociale (Google OAuth)
- [ ] Heatmaps avancées par joueur

## Collections MongoDB
- `users`, `matches`, `bets`, `comments`, `user_players`, `trades`, `api_cache`
- `notifications`, `price_history`, `pack_opens`, `weekly_missions`

## Endpoints API clés
- Auth: `/api/auth/*`
- Matchs: `/api/matches/*`
- Paris: `/api/bets/*`
- Packs: `/api/packs/*`, `/api/collection/*`
- Échanges: `/api/trades/*`
- Missions: `/api/missions`, `/api/missions/{id}/claim`
- Notifications: `/api/notifications`
- Classement: `/api/leaderboard`

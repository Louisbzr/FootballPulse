import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, new_password) => api.post('/auth/reset-password', { token, new_password }),
  changePassword: (current_password, new_password) => api.put('/auth/change-password', { current_password, new_password }),
};

// Matches
export const matchesAPI = {
  list: (params) => api.get('/matches', { params }),
  get: (id) => api.get(`/matches/${id}`),
  events: (id) => api.get(`/matches/${id}/events`),
};

// Comments
export const commentsAPI = {
  list: (matchId) => api.get(`/matches/${matchId}/comments`),
  create: (matchId, data) => api.post(`/matches/${matchId}/comments`, data),
  like: (commentId) => api.post(`/comments/${commentId}/like`),
};

// Bets
export const betsAPI = {
  place: (data) => api.post('/bets', data),
  my: () => api.get('/bets/my'),
  resolve: (matchId) => api.post(`/bets/resolve/${matchId}`),
};

// Leaderboard
export const leaderboardAPI = {
  get: (params) => api.get('/leaderboard', { params }),
};

// Dashboard
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

// Seed
export const seedAPI = {
  seed: () => api.post('/seed'),
};

// Teams
export const teamsAPI = {
  list: () => api.get('/teams'),
};

// Badges
export const badgesAPI = {
  list: () => api.get('/badges'),
};

// Packs
export const packsAPI = {
  list: () => api.get('/packs'),
  open: (type) => api.post(`/packs/open/${type}`),
};

// Collection
export const collectionAPI = {
  list: () => api.get('/collection'),
  sell: (playerId) => api.post(`/collection/sell/${playerId}`),
};

// Trades
export const tradesAPI = {
  list: () => api.get('/trades'),
  create: (data) => api.post('/trades', data),
  buy: (tradeId) => api.post(`/trades/${tradeId}/buy`),
  cancel: (tradeId) => api.post(`/trades/${tradeId}/cancel`),
  priceHistory: (playerId) => api.get(`/trades/price-history/${playerId}`),
  marketOverview: () => api.get('/trades/market-overview'),
};

// Daily Challenge
export const challengeAPI = {
  get: () => api.get('/daily-challenge'),
  predict: (prediction) => api.post('/daily-challenge/predict', { prediction }),
  check: () => api.post('/daily-challenge/check'),
};

// Football Sync
export const footballAPI = {
  sync: () => api.post('/football/sync'),
  leagues: () => api.get('/football/leagues'),
  cleanMock: () => api.post('/football/clean-mock'),
};

// Weekly Leaderboard
export const weeklyLeaderboardAPI = {
  get: () => api.get('/leaderboard/weekly'),
};

// Equip Player
export const equipAPI = {
  equip: (playerId) => api.post(`/equip/${playerId}`),
  unequip: () => api.post('/unequip'),
  get: () => api.get('/equipped'),
};

// Dynamic Odds
export const oddsAPI = {
  get: (matchId) => api.get(`/odds/${matchId}`),
};

// Missions
export const missionsAPI = {
  get: () => api.get('/missions'),
  claim: (missionId) => api.post(`/missions/${missionId}/claim`),
};

export default api;

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

export default api;

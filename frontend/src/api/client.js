import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  profile: () => api.get('/auth/profile/'),
};

// ── Interviews ────────────────────────────────────────
export const interviewAPI = {
  start:         (data) => api.post('/interviews/start/', data),
  respond:       (data) => api.post('/interviews/respond/', data),
  codeUpdate:    (data) => api.post('/interviews/code-update/', data),
  evaluateCode:  (data) => api.post('/interviews/execute-code/', {
    source_code: data.source_code || data.code,
    language_id: data.language_id || 63,
    language:    data.language || 'javascript',
    stdin:       data.stdin || '',
    is_submission: data.is_submission || false,
  }),
  end:           (data) => api.post('/interviews/end/', data),
  results:       (sessionId) => api.get(`/interviews/results/${sessionId}/`),
  sessions:      () => api.get('/interviews/sessions/'),
  tts:           (text) => api.post('/interviews/tts/', { text }),
  dashboardStats:  () => api.get('/interviews/dashboard/stats/'),
  dashboardStreak: () => api.get('/interviews/dashboard/streak/'),
};


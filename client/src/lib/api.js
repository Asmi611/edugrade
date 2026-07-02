/**
 * Shared Axios instance.
 * ----------------------
 * Every API call from the client should go through this instance so that
 * the JWT (stored in localStorage under "edugrade_token") is attached
 * automatically and 401 responses can be handled centrally.
 */

import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL?.trim() ||
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  '/api';

export const TOKEN_KEY = 'edugrade_token';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Surface a clean message field for forms to display.
    if (error.response?.data?.error) {
      error.message = error.response.data.error;
    }
    return Promise.reject(error);
  }
);

export default api;

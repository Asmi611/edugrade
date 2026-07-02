/**
 * AuthContext
 * -----------
 * Holds the authenticated user across the app. On mount it:
 *   1. Reads the JWT from localStorage,
 *   2. Decodes the payload (id, name, email, role),
 *   3. Hits GET /api/auth/me to confirm the token is still valid,
 *   4. Exposes { user, loading, login, logout } via context.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import api, { TOKEN_KEY } from '../lib/api.js';
import { decodeJwt, isTokenExpired } from '../lib/jwt.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ---- bootstrap from localStorage on mount --------------------------
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      const payload = decodeJwt(token);
      if (!payload || isTokenExpired(payload)) {
        localStorage.removeItem(TOKEN_KEY);
        if (!cancelled) setLoading(false);
        return;
      }

      // Optimistic set from token payload so guarded routes render fast.
      if (!cancelled) {
        setUser({
          id: payload.id,
          name: payload.name,
          email: payload.email,
          role: payload.role,
        });
      }

      // Confirm with server (also catches revoked / deleted accounts).
      try {
        const { data } = await api.get('/auth/me');
        if (!cancelled && data?.user) {
          setUser(data.user);
        }
      } catch (_) {
        localStorage.removeItem(TOKEN_KEY);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Performs a login request and persists the token + user.
   * Throws (with a readable message) on failure so callers can render
   * inline form errors.
   */
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (!data?.token || !data?.user) {
      throw new Error('Unexpected server response.');
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }
  return ctx;
}

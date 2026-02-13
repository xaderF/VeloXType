// useAuth.ts — manages auth token, user info, and login/register API calls

import { useState, useCallback, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'veloxtype_auth_token';
const USER_KEY = 'veloxtype_auth_user';
const STORAGE_MODE_KEY = 'veloxtype_auth_storage_mode';

export interface AuthUser {
  id: string;
  username: string;
  role: 'USER' | 'ADMIN';
  email: string | null;
  rating: number | null;           // hidden MMR (null = unranked)
  competitiveElo: number | null;   // null until Apex; starts at 0 on promotion
  placementGamesPlayed: number;    // 0–5, how many placement games completed
  createdAt: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

export interface DeleteAccountResult {
  ok: boolean;
  error?: string;
}

function loadPersistedAuth(): AuthState {
  try {
    const persistedMode = localStorage.getItem(STORAGE_MODE_KEY);
    const storage = persistedMode === 'local' ? localStorage : sessionStorage;
    const fallbackStorage = persistedMode === 'local' ? sessionStorage : localStorage;

    let token = storage.getItem(TOKEN_KEY);
    let userJson = storage.getItem(USER_KEY);
    if (!token || !userJson) {
      token = fallbackStorage.getItem(TOKEN_KEY);
      userJson = fallbackStorage.getItem(USER_KEY);
    }

    if (token && userJson) {
      const parsed = JSON.parse(userJson) as Partial<AuthUser>;
      if (typeof parsed.id === 'string' && typeof parsed.username === 'string') {
        return {
          token,
          user: {
            ...parsed,
            role: parsed.role === 'ADMIN' ? 'ADMIN' : 'USER',
          } as AuthUser,
        };
      }
    }
  } catch { /* ignore */ }
  return { token: null, user: null };
}

function persistAuth(token: string, user: AuthUser, rememberMe: boolean) {
  const primaryStorage = rememberMe ? localStorage : sessionStorage;
  const secondaryStorage = rememberMe ? sessionStorage : localStorage;

  primaryStorage.setItem(TOKEN_KEY, token);
  primaryStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(STORAGE_MODE_KEY, rememberMe ? 'local' : 'session');

  secondaryStorage.removeItem(TOKEN_KEY);
  secondaryStorage.removeItem(USER_KEY);
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(STORAGE_MODE_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

function isRememberedSession(token: string) {
  return localStorage.getItem(STORAGE_MODE_KEY) === 'local' && localStorage.getItem(TOKEN_KEY) === token;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(loadPersistedAuth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!auth.token) return null;
    try {
      const res = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) {
        clearAuth();
        setAuth({ token: null, user: null });
        return null;
      }

      const data = await res.json();
      const user: AuthUser = {
        id: data.id,
        username: data.username,
        role: data.role === 'ADMIN' ? 'ADMIN' : 'USER',
        email: data.email,
        rating: data.rating,
        competitiveElo: data.competitiveElo ?? null,
        placementGamesPlayed: data.placementGamesPlayed ?? 0,
        createdAt: data.createdAt,
      };
      setAuth((prev) => ({ ...prev, user }));
      persistAuth(auth.token, user, isRememberedSession(auth.token));
      return user;
    } catch {
      return null;
    }
  }, [auth.token]);

  // Fetch fresh profile using stored token on mount.
  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const register = useCallback(async (username: string, password: string, email?: string, rememberMe = false) => {
    setLoading(true);
    setError(null);
    try {
      const normalizedEmail = email?.trim();
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email: normalizedEmail || undefined, acceptedTerms: true, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Registration failed');
        return false;
      }
      const user: AuthUser = {
        id: data.user.id,
        username: data.user.username,
        role: data.user.role === 'ADMIN' ? 'ADMIN' : 'USER',
        email: data.user.email,
        rating: data.user.rating,
        competitiveElo: data.user.competitiveElo ?? null,
        placementGamesPlayed: data.user.placementGamesPlayed ?? 0,
        createdAt: data.user.createdAt,
      };
      persistAuth(data.token, user, rememberMe);
      setAuth({ token: data.token, user });
      return true;
    } catch (err) {
      setError('Network error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (usernameOrEmail: string, password: string, rememberMe = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return false;
      }
      const user: AuthUser = {
        id: data.user.id,
        username: data.user.username,
        role: data.user.role === 'ADMIN' ? 'ADMIN' : 'USER',
        email: data.user.email,
        rating: data.user.rating,
        competitiveElo: data.user.competitiveElo ?? null,
        placementGamesPlayed: data.user.placementGamesPlayed ?? 0,
        createdAt: data.user.createdAt,
      };
      persistAuth(data.token, user, rememberMe);
      setAuth({ token: data.token, user });
      return true;
    } catch (err) {
      setError('Network error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuth({ token: null, user: null });
  }, []);

  const deleteAccount = useCallback(async (password?: string): Promise<DeleteAccountResult> => {
    if (!auth.token) return { ok: false, error: 'Unauthorized' };

    const payload = password ? { password } : {};

    const sendDelete = async () => fetch(`${API_BASE}/profile/delete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const sendLegacyDelete = async () => fetch(`${API_BASE}/profile`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    try {
      let res = await sendDelete();
      if (res.status === 404 || res.status === 405) {
        res = await sendLegacyDelete();
      }

      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        if (res.status === 401) {
          clearAuth();
          setAuth({ token: null, user: null });
          return { ok: false, error: 'Session expired. Please log in again.' };
        }

        const serverError =
          typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          typeof (data as { error: unknown }).error === 'string'
            ? (data as { error: string }).error
            : null;

        return { ok: false, error: serverError ?? 'Failed to delete account.' };
      }

      clearAuth();
      setAuth({ token: null, user: null });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error' };
    }
  }, [auth.token]);

  const exportData = useCallback(async () => {
    if (!auth.token) return;
    try {
      const res = await fetch(`${API_BASE}/profile/export`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `veloxtype-data-export.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  }, [auth.token]);

  return {
    token: auth.token,
    user: auth.user,
    isAuthenticated: !!auth.token && !!auth.user,
    loading,
    error,
    register,
    login,
    logout,
    deleteAccount,
    exportData,
    refreshProfile,
    clearError: () => setError(null),
  };
}

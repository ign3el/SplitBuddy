// Simple API client for SplitBuddy backend
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const withTimeout = async <T>(p: Promise<T>, ms = 15000): Promise<T> => {
  let id: number | undefined;
  const t = new Promise<never>((_, rej) => { id = window.setTimeout(() => rej(new Error('Request timed out')), ms); });
  try {
    const r = await Promise.race([p, t]);
    return r as T;
  } finally {
    if (id) window.clearTimeout(id);
  }
};

const getToken = () => localStorage.getItem('splitbuddy_token') || '';
const setToken = (tok: string) => localStorage.setItem('splitbuddy_token', tok);
const clearToken = () => localStorage.removeItem('splitbuddy_token');

type ApiResponse<T> = { error?: string } & T;

export const api = {
  async ping(): Promise<{ ok: boolean; message: string }> {
    const res = await withTimeout(fetch(`${BASE_URL}/ping`));
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Server unavailable');
    }
    const j = await res.json().catch(() => ({ ok: false, message: 'Invalid response' }));
    return j;
  },
  async signUp(email: string, name: string, password: string) {
    const res = await withTimeout(fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password })
    }));
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Signup failed');
    }
    const j = await res.json().catch(() => ({}));
    if (j.token) setToken(j.token);
    return j as ApiResponse<{ token?: string; user?: any; profile?: any; requiresVerification?: boolean; message?: string }>;
  },
  async login(email: string, password: string) {
    const res = await withTimeout(fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }));
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Login failed');
    }
    const j = await res.json().catch(() => ({}));
    if (j.token) setToken(j.token);
    return j as ApiResponse<{ token: string; user: any; profile: any }>;
  },
  async me() {
    const res = await withTimeout(fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }));
    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to get user');
    }
    const j = await res.json().catch(() => ({}));
    return j as ApiResponse<{ user: any; profile: any }>;
  },
  async updateProfile(profile: { name?: string }) {
    const res = await withTimeout(fetch(`${BASE_URL}/profiles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(profile)
    }));
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Update failed');
    }
    const j = await res.json().catch(() => ({}));
    return j as ApiResponse<{ user: any; profile: any }>;
  },
  async incrementScan() {
    const res = await withTimeout(fetch(`${BASE_URL}/profiles/scans/increment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` }
    }));
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Scan update failed');
    }
    const j = await res.json().catch(() => ({ allowed: false, scans_used_this_month: 0, max_scans_per_month: 5 }));
    return j as ApiResponse<{ allowed: boolean; scans_used_this_month: number; max_scans_per_month: number }>;
  },
  async requestPasswordReset(email: string) {
    const res = await withTimeout(fetch(`${BASE_URL}/auth/request-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    }));
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || 'Reset request failed');
    return { ok: true };
  },
  async resetPassword(token: string, password: string) {
    const res = await withTimeout(fetch(`${BASE_URL}/auth/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, password })
    }));
    if (!res.ok) throw new Error('Password reset failed');
    return true;
  },
  async saveSplitHistory(records: any[], detailedSplit: any) {
    const res = await withTimeout(fetch(`${BASE_URL}/history/splits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ records, detailedSplit })
    }));
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save history');
    }
    const j = await res.json().catch(() => ({ ok: true }));
    return j as ApiResponse<{ ok: boolean }>;
  },
  async getSplitHistory() {
    const res = await withTimeout(fetch(`${BASE_URL}/history/splits`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }));
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch history');
    }
    const j = await res.json().catch(() => ({ records: [], detailedSplits: [] }));
    return j as ApiResponse<{ records: any[]; detailedSplits: any[] }>;
  },
  async clearSplitHistory() {
    const res = await withTimeout(fetch(`${BASE_URL}/history/splits`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` }
    }));
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to clear history');
    }
    const j = await res.json().catch(() => ({ ok: true }));
    return j as ApiResponse<{ ok: boolean }>;
  },
  async changePassword(currentPassword: string, newPassword: string) {
    const res = await withTimeout(fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ currentPassword, newPassword })
    }));
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Password change failed');
    }
    const j = await res.json().catch(() => ({ ok: true, message: 'Password changed' }));
    return j as ApiResponse<{ ok: boolean; message: string }>;
  },
  logout() { clearToken(); }
};

export default api;

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
}

// 从 localStorage 恢复会话
export function getStoredAuth(): AuthState {
  try {
    const stored = localStorage.getItem('vividaily_auth');
    if (!stored) return { user: null, accessToken: null };

    const parsed = JSON.parse(stored) as AuthState;
    return parsed;
  } catch {
    return { user: null, accessToken: null };
  }
}

// 保存会话到 localStorage
export function storeAuth(auth: AuthState): void {
  if (auth.user && auth.accessToken) {
    localStorage.setItem('vividaily_auth', JSON.stringify(auth));
  } else {
    localStorage.removeItem('vividaily_auth');
  }
}

// 清除会话
export function clearAuth(): void {
  localStorage.removeItem('vividaily_auth');
}

// API 调用辅助函数
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3102';

export async function apiRegister(email: string, password: string): Promise<{ ok: boolean; user?: User; session?: { access_token: string }; error?: string }> {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}

export async function apiLogin(email: string, password: string): Promise<{ ok: boolean; user?: User; session?: { access_token: string }; error?: string }> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}

export async function apiGetUser(token: string): Promise<{ ok: boolean; user?: User; error?: string }> {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

export async function apiLogout(token: string): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const isSupabaseAdminConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

if (!isSupabaseConfigured) {
  console.warn('[supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
);

export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceRoleKey || supabaseAnonKey || 'placeholder-anon-key',
);

export function isSupabaseReady(): boolean {
  return isSupabaseConfigured;
}

export function isSupabaseAdminReady(): boolean {
  return isSupabaseAdminConfigured;
}

function mapSupabaseAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('email rate limit exceeded')) return '注册过于频繁，请稍后再试';
  if (m.includes('invalid login credentials')) return '邮箱或密码错误';
  if (m.includes('email not confirmed')) return '邮箱尚未验证，请先完成邮件验证';
  if (m.includes('user already registered')) return '该邮箱已注册，请直接登录';
  if (m.includes('password should be at least')) return '密码长度不足，请至少 6 位';
  return message;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthResult {
  ok: boolean;
  user?: User;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  error?: string;
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: '登录服务未配置（缺少 SUPABASE_URL / SUPABASE_ANON_KEY）' };
  }
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { ok: false, error: mapSupabaseAuthError(error.message) };
    if (!data.user) return { ok: false, error: '注册失败，请稍后重试' };

    if (!data.session) {
      return {
        ok: true,
        user: {
          id: data.user.id,
          email: data.user.email || '',
          created_at: data.user.created_at,
        },
        error: '注册成功，请查收验证邮件后登录',
      };
    }

    return {
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        created_at: data.user.created_at,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || 0,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : '注册失败';
    return { ok: false, error: msg };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: '登录服务未配置（缺少 SUPABASE_URL / SUPABASE_ANON_KEY）' };
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { ok: false, error: mapSupabaseAuthError(error.message) };
    }

    if (!data.user || !data.session) {
      return { ok: false, error: '登录失败，请稍后重试' };
    }

    return {
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        created_at: data.user.created_at,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || 0,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : '登录失败';
    return { ok: false, error: msg };
  }
}

export async function getUser(accessToken: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: '登录服务未配置（缺少 SUPABASE_URL / SUPABASE_ANON_KEY）' };
  }
  try {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error) return { ok: false, error: mapSupabaseAuthError(error.message) };
    if (!data.user) return { ok: false, error: '用户不存在' };

    return {
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        created_at: data.user.created_at,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : '获取用户失败';
    return { ok: false, error: msg };
  }
}

export async function signOut(accessToken: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: '登录服务未配置（缺少 SUPABASE_URL / SUPABASE_ANON_KEY）' };
  }
  try {
    const { error } = await supabase.auth.getUser(accessToken);
    if (error) return { ok: false, error: mapSupabaseAuthError(error.message) };
    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : '退出失败';
    return { ok: false, error: msg };
  }
}

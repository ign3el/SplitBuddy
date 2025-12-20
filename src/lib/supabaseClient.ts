import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const normalizeUrl = (u?: string): string | undefined => {
  if (!u) return undefined;
  const trimmed = u.trim().replace(/\/$/, '');
  return trimmed;
};

const supabaseUrl = normalizeUrl(rawUrl);

const looksLikeSupabase = (u?: string) => !!u && /^https?:\/\//i.test(u) && u.includes('.supabase.co');

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;

let supabase: SupabaseClient | null = null;

try {
  if (isSupabaseConfigured && looksLikeSupabase(supabaseUrl)) {
    supabase = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } else if (!isSupabaseConfigured) {
    console.warn('Supabase env vars missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  } else {
    console.warn('Supabase URL does not look valid. Expected https://<project>.supabase.co');
  }
} catch (error) {
  console.error('Supabase client initialization failed:', error);
}

export { supabase };

export default supabase;

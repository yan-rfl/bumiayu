import { createBrowserClient } from '@supabase/ssr';

export function normalizeSupabaseUrl(url?: string): string {
  if (!url) return 'https://placeholder.supabase.co';
  let clean = url.trim().replace(/\/+$/, '');
  if (clean.endsWith('/rest/v1')) {
    clean = clean.replace(/\/rest\/v1$/, '');
  }
  return clean;
}

export function createClient() {
  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

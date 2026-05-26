import { createClient, SupabaseClient } from '@supabase/supabase-js';

let instance: SupabaseClient | null = null;

// Storage no-op para ambientes sem window (SSR/SSG). Evita o erro
// "localStorage.getItem is not a function" durante o prerender.
const noopStorage = {
  getItem:    (_key: string) => null,
  setItem:    (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
};

export function getSupabaseClient(): SupabaseClient {
  if (!instance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas');
    }

    const isBrowser = typeof window !== 'undefined';
    instance = createClient(url, key, {
      auth: {
        storage:        isBrowser ? window.localStorage : noopStorage,
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
        detectSessionInUrl: isBrowser,
      },
    });
  }
  return instance;
}

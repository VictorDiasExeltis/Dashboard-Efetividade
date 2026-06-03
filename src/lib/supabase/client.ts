import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

let instance: SupabaseClient | null = null;

// Cliente Supabase para o browser. Usa createBrowserClient do @supabase/ssr,
// que guarda a sessão em COOKIES (e não em localStorage). Assim o servidor —
// middleware e Server Actions — consegue enxergar e validar a sessão.
export function getSupabaseClient(): SupabaseClient {
  if (!instance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas');
    }
    instance = createBrowserClient(url, key);
  }
  return instance;
}

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cliente Supabase para uso no servidor (Server Actions, Route Handlers,
// Server Components). Lê/escreve a sessão via cookies — diferente do cliente
// browser, que usava localStorage e era invisível pro servidor.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas');
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Chamado a partir de um Server Component (cookies read-only).
          // O refresh dos cookies é feito pelo middleware — pode ignorar.
        }
      },
    },
  });
}

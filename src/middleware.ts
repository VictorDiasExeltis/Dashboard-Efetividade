import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// ── Timeout por inatividade ────────────────────────────────────────────────
// Por padrão o Supabase renova a sessão indefinidamente (o refresh token não
// expira e este middleware revalida em toda requisição). Para forçar logout
// após um período sem uso, marcamos o "último acesso" em cookie e deslogamos
// quando ele fica velho demais. Cada requisição dentro da janela renova o
// contador — é inatividade, não tempo fixo de sessão.
//
// Ajuste aqui a janela desejada:
const INACTIVITY_MINUTES = 60;
const INACTIVITY_MS = INACTIVITY_MINUTES * 60 * 1000;
const LAST_ACTIVITY_COOKIE = 'sfe-last-activity';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Revalida e renova a sessão (refresh do token quando necessário).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Só aplica a regra de inatividade para quem está logado.
  if (user) {
    const now = Date.now();
    const last = Number(request.cookies.get(LAST_ACTIVITY_COOKIE)?.value);
    const expirado = Number.isFinite(last) && last > 0 && now - last > INACTIVITY_MS;

    if (expirado) {
      // Limpa os cookies de sessão do Supabase (sb-<ref>-auth-token[.N]) e o
      // carimbo de atividade, e manda pro login. Logout local, sem round-trip
      // ao Supabase — evita travar o middleware se o auth estiver lento.
      const redirect = NextResponse.redirect(new URL('/login', request.url));
      for (const c of request.cookies.getAll()) {
        if (/^sb-.*-auth-token/.test(c.name)) redirect.cookies.delete(c.name);
      }
      redirect.cookies.delete(LAST_ACTIVITY_COOKIE);
      return redirect;
    }

    // Renova o carimbo de "último acesso". maxAge longo para o timestamp
    // sobreviver a fechar/abrir o navegador — quem governa é a comparação acima.
    response.cookies.set(LAST_ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });
  }

  return response;
}

export const config = {
  // Roda em tudo, menos assets estáticos e a própria rota de login.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

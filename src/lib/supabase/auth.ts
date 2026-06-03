import { createSupabaseServerClient } from './server';

/**
 * Garante que a requisição vem de um usuário autenticado. Use no início de
 * toda Server Action que acessa dados — o guard de auth do layout é só no
 * browser e NÃO protege as actions (que são endpoints HTTP POST públicos).
 *
 * Usa getUser() (valida o token no servidor de auth do Supabase), não
 * getSession() (que só lê o cookie sem verificar).
 *
 * @throws Error('Não autenticado') se não houver usuário válido.
 */
export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Não autenticado');
  }

  return user;
}

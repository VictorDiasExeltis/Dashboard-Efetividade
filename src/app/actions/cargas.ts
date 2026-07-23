'use server';

import { db } from '@/src/lib/db';
import { sql } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';
import { requireUser } from '@/src/lib/supabase/auth';
import { CARGAS, podeCarregar } from '@/src/lib/cargas/config';

// Garante que o usuário está logado E autorizado a usar a Central de Cargas.
// Retorna o e-mail (para gravar no log). Lança se não autorizado.
async function requireCargaAccess(): Promise<string> {
  const user = await requireUser();
  const email = user.email ?? '';
  if (!podeCarregar(email)) {
    throw new Error('Acesso negado: usuário não autorizado a carregar dados.');
  }
  return email;
}

// Checagem leve para a UI (não lança). Esconde o hub de quem não pode.
export async function temAcessoCarga(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return podeCarregar(user?.email ?? null);
  } catch {
    return false;
  }
}

export interface CargaStatus {
  id: string;
  totalLinhas: number;
  ultimaCarga: {
    criado_em: string;
    usuario_email: string | null;
    linhas_afetadas: number;
    status: string;
    arquivo_nome: string | null;
  } | null;
}

// Estado de cada carga: nº de linhas hoje na tabela + última carga registrada.
// Sem cache — queremos sempre o estado fresco ao abrir o hub.
export async function getCargasStatus(): Promise<CargaStatus[]> {
  await requireCargaAccess();
  if (!db) return [];

  const out: CargaStatus[] = [];
  for (const carga of CARGAS) {
    let totalLinhas = 0;
    try {
      // carga.tabela vem de constante nossa (CARGAS), não de input — seguro.
      const cnt = await db.execute(sql`SELECT count(*)::int AS n FROM ${sql.raw(carga.tabela)}`);
      totalLinhas = Number((cnt[0] as any)?.n) || 0;
    } catch { /* tabela pode não existir ainda em fases futuras */ }

    const log = await db.execute(sql`
      SELECT criado_em, usuario_email, linhas_afetadas, status, arquivo_nome
      FROM log_cargas
      WHERE tabela_destino = ${carga.id}
      ORDER BY criado_em DESC
      LIMIT 1
    `);
    const r = log[0] as any;
    out.push({
      id: carga.id,
      totalLinhas,
      ultimaCarga: r
        ? {
            criado_em: String(r.criado_em),
            usuario_email: r.usuario_email ?? null,
            linhas_afetadas: Number(r.linhas_afetadas) || 0,
            status: String(r.status),
            arquivo_nome: r.arquivo_nome ?? null,
          }
        : null,
    });
  }
  return out;
}

export interface LogCarga {
  id: string;
  tabela_destino: string;
  usuario_email: string | null;
  arquivo_nome: string | null;
  linhas_processadas: number;
  linhas_afetadas: number;
  status: string;
  mensagem: string | null;
  criado_em: string;
}

export async function getLogCargas(limit = 25): Promise<LogCarga[]> {
  await requireCargaAccess();
  if (!db) return [];
  const lim = Math.min(Math.max(limit, 1), 100);
  const result = await db.execute(sql`
    SELECT id, tabela_destino, usuario_email, arquivo_nome,
           linhas_processadas, linhas_afetadas, status, mensagem, criado_em
    FROM log_cargas
    ORDER BY criado_em DESC
    LIMIT ${lim}
  `);
  return result.map((r: any) => ({
    id: String(r.id),
    tabela_destino: String(r.tabela_destino),
    usuario_email: r.usuario_email ?? null,
    arquivo_nome: r.arquivo_nome ?? null,
    linhas_processadas: Number(r.linhas_processadas) || 0,
    linhas_afetadas: Number(r.linhas_afetadas) || 0,
    status: String(r.status),
    mensagem: r.mensagem ?? null,
    criado_em: String(r.criado_em),
  }));
}

// Commits das cargas removidos junto com a fato_diario. Fase 2/3 reintroduzem
// os ramos de gravação (+ log em log_cargas) por carga implementada.

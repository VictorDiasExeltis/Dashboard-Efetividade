'use server';

import { db } from '@/src/lib/db';
import { sql } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';
import { requireUser } from '@/src/lib/supabase/auth';
import { CARGAS, podeCarregar, type LinhaCanonica } from '@/src/lib/cargas/config';

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

export interface CommitResult {
  ok: boolean;
  linhas: number;
  mensagem: string;
}

const TAMANHO_LOTE = 500;

// Grava a carga diária (fato_diario). Sobrescreve por setor (upsert na PK
// cod_setor), em lotes — assim arquivos grandes não travam o banco e um erro
// no meio para limpo. Registra tudo em log_cargas.
export async function commitFatoDiario(
  rows: LinhaCanonica[],
  arquivoNome?: string,
): Promise<CommitResult> {
  const email = await requireCargaAccess();
  if (!db) return { ok: false, linhas: 0, mensagem: 'Banco indisponível.' };

  // Revalida no servidor (não confia no cliente): tipos e chave.
  const limpos = new Map<number, { cod_setor: number; dt: number; da: number; vr: number; painel: number | null }>();
  for (const r of rows) {
    const cod = Number(r.cod_setor);
    if (!Number.isInteger(cod) || cod <= 0) continue;
    const dt = Number(r.dias_trabalhados);
    const da = Number(r.dias_abonados);
    const vr = Number(r.visitas_realizadas);
    const painel = r.painel == null ? null : Number(r.painel);
    if (![dt, da, vr].every(Number.isFinite)) continue;
    if (painel != null && !Number.isFinite(painel)) continue;
    // Última ocorrência de cada setor prevalece.
    limpos.set(cod, { cod_setor: cod, dt, da, vr, painel });
  }

  const validas = Array.from(limpos.values());

  if (validas.length === 0) {
    await registrarLog('fato_diario', email, arquivoNome, rows.length, 0, 'erro', 'Nenhuma linha válida no arquivo.');
    return { ok: false, linhas: 0, mensagem: 'Nenhuma linha válida encontrada no arquivo.' };
  }

  try {
    // Carimba a data do snapshot (data do upload, São Paulo) e o ciclo do
    // calendário. Mesma data/ciclo para todas as linhas desta carga.
    const meta = await db.execute(sql`
      SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS data_ref,
        (SELECT ciclo FROM dim_calendario
          WHERE data <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
          ORDER BY data DESC LIMIT 1) AS ciclo
    `);
    const dataRef = String((meta[0] as any)?.data_ref);
    const ciclo = (meta[0] as any)?.ciclo ?? null;

    for (let i = 0; i < validas.length; i += TAMANHO_LOTE) {
      const lote = validas.slice(i, i + TAMANHO_LOTE);
      const valores = sql.join(
        lote.map((r) => sql`(${r.cod_setor}, ${dataRef}, ${ciclo}, ${r.dt}, ${r.da}, ${r.vr}, ${r.painel})`),
        sql`, `,
      );
      // Upsert por (setor + data): recarregar o mesmo dia corrige o snapshot
      // daquele dia; dias diferentes empilham (histórico).
      await db.execute(sql`
        INSERT INTO fato_diario (cod_setor, data, ciclo, dias_trabalhados, dias_abonados, visitas_realizadas, painel)
        VALUES ${valores}
        ON CONFLICT (cod_setor, data) DO UPDATE SET
          ciclo              = EXCLUDED.ciclo,
          dias_trabalhados   = EXCLUDED.dias_trabalhados,
          dias_abonados      = EXCLUDED.dias_abonados,
          visitas_realizadas = EXCLUDED.visitas_realizadas,
          painel             = EXCLUDED.painel
      `);
    }

    await registrarLog('fato_diario', email, arquivoNome, rows.length, validas.length, 'sucesso', null);

    // Invalida os caches da Análise Diária para refletir a carga na hora.
    revalidateTag('analise-diaria');
    revalidateTag('ciclo-progresso');

    return { ok: true, linhas: validas.length, mensagem: `Snapshot de ${dataRef} gravado: ${validas.length} setor(es).` };
  } catch (e: any) {
    const msg = e?.message ? String(e.message).slice(0, 500) : 'Erro desconhecido na gravação.';
    await registrarLog('fato_diario', email, arquivoNome, rows.length, 0, 'erro', msg);
    return { ok: false, linhas: 0, mensagem: `Falha na carga: ${msg}` };
  }
}

async function registrarLog(
  tabela: string,
  email: string,
  arquivo: string | undefined,
  processadas: number,
  afetadas: number,
  status: 'sucesso' | 'erro',
  mensagem: string | null,
): Promise<void> {
  if (!db) return;
  try {
    await db.execute(sql`
      INSERT INTO log_cargas
        (tabela_destino, usuario_email, arquivo_nome, linhas_processadas, linhas_afetadas, status, mensagem)
      VALUES
        (${tabela}, ${email}, ${arquivo ?? null}, ${processadas}, ${afetadas}, ${status}, ${mensagem})
    `);
  } catch (e) {
    console.error('registrarLog error:', e);
  }
}

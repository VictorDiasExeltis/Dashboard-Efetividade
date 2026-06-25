'use server';

import { db } from '@/src/lib/db';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/src/lib/supabase/auth';
import { cacheLoader } from './_cache';

export interface SetorHierarquia {
  cod_setor: number;
  nome_setor: string;
  nome_distrito: string | null;
  nome_rep: string | null;
}

// Lista TODOS os setores de dim_hierarquia (fonte única de território/rep).
// Usado hoje só para popular a tela de Análise Diária com a lista real de
// setores; as métricas de visitação ainda são mock até a base diária subir.
export async function getSetoresHierarquia(): Promise<SetorHierarquia[]> {
  await requireUser();
  return _getSetoresHierarquiaCached();
}

const _getSetoresHierarquiaCached = cacheLoader(
  ['setores-hierarquia'],
  async (): Promise<SetorHierarquia[]> => {
  try {
    if (!db) return [];
    const result = await db.execute(sql`
      SELECT cod_setor, nome_setor, nome_distrito, nome_rep
      FROM dim_hierarquia
      WHERE nome_setor IS NOT NULL
      ORDER BY nome_distrito, nome_setor
    `);
    return result.map((r: any) => ({
      cod_setor: Number(r.cod_setor),
      nome_setor: r.nome_setor as string,
      nome_distrito: (r.nome_distrito as string) ?? null,
      nome_rep: (r.nome_rep as string) ?? null,
    }));
  } catch (e) {
    console.error('getSetoresHierarquia error:', e);
    return [];
  }
  },
  1800,
);

// ---------------------------------------------------------------------------
// Análise diária por setor — cruza fato_diario com o ciclo atual (dim_calendario),
// o painel (metas_ciclo) e a hierarquia (dim_hierarquia). Todo o cálculo de
// projeção é feito aqui no servidor. Divisões por zero → null (a tela mostra "—").
//
// Modelo:
//   DU             = dias úteis do ciclo atual
//   meta_pct       = 90% × (DU / 15)
//   visitas_meta   = round(meta_pct × tamanho_painel)
//   dias_decorridos= dias_trabalhados + dias_abonados
//   dias_restantes = DU − dias_decorridos
//   mdv_atual      = visitas_realizadas / dias_trabalhados        (null se dt=0)
//   mdv_necessaria = max(visitas_meta − visitas_realizadas, 0)
//                      / dias_restantes                           (null se restantes<=0)
// ---------------------------------------------------------------------------

export type StatusProjecao = 'manter' | 'atencao' | 'acao' | 'na';

export interface AnaliseDiariaRow {
  cod_setor: number;
  nome_setor: string;
  nome_distrito: string | null;
  nome_rep: string | null;
  ciclo: string | null;
  dias_uteis: number;          // DU do ciclo
  dias_trabalhados: number;
  dias_abonados: number;
  visitas_realizadas: number;
  tamanho_painel: number | null;
  // Derivados
  meta_pct: number | null;        // alvo de cobertura no ciclo, ex.: 0.78
  cobertura_atual: number | null; // visitas_realizadas / painel (ex.: 0.62)
  visitas_meta: number | null;
  visitas_faltantes: number | null;
  dias_decorridos: number;
  dias_restantes: number;
  mdv_atual: number | null;
  mdv_necessaria: number | null;
  projecao_fim: number | null;    // visitas projetadas até o fim do ciclo no ritmo atual
  status: StatusProjecao;
}

const META_BASE = 0.90;   // meta de cobertura para ciclo de 15 dias úteis
const CICLO_REF = 15;     // dias úteis de referência

function classificar(
  visitasFaltantes: number | null,
  mdvAtual: number | null,
  mdvNecessaria: number | null,
): StatusProjecao {
  if (visitasFaltantes == null) return 'na';            // sem meta (painel ausente)
  if (visitasFaltantes <= 0) return 'manter';           // meta já batida
  if (mdvAtual == null || mdvNecessaria == null) return 'na';
  if (mdvNecessaria <= mdvAtual) return 'manter';       // ritmo atual basta
  if (mdvNecessaria <= mdvAtual * 1.1) return 'atencao'; // até 10% acima
  return 'acao';
}

// Progresso do ciclo atual (nível calendário, não por setor): em que dia útil
// do ciclo estamos e quantos faltam. Usa o ciclo do dia útil mais recente
// até hoje, então funciona mesmo se aberto em fim de semana/feriado.
export interface CicloProgresso {
  ciclo: string | null;
  dias_uteis: number;     // total de dias úteis do ciclo
  dia_atual: number;      // dias úteis decorridos até hoje (inclusive)
  dias_restantes: number; // dias_uteis - dia_atual
}

export async function getCicloProgresso(): Promise<CicloProgresso> {
  await requireUser();
  return _getCicloProgressoCached();
}

const _getCicloProgressoCached = cacheLoader(
  ['ciclo-progresso'],
  async (): Promise<CicloProgresso> => {
  const vazio: CicloProgresso = { ciclo: null, dias_uteis: 0, dia_atual: 0, dias_restantes: 0 };
  try {
    if (!db) return vazio;
    const result = await db.execute(sql`
      WITH hoje AS (
        SELECT ciclo, MAX(data) AS ref
        FROM dim_calendario
        WHERE data <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
        GROUP BY ciclo
        ORDER BY ref DESC
        LIMIT 1
      )
      SELECT
        h.ciclo,
        (SELECT COUNT(*) FROM dim_calendario WHERE ciclo = h.ciclo)::int AS dias_uteis,
        (SELECT COUNT(*) FROM dim_calendario
          WHERE ciclo = h.ciclo
            AND data <= (now() AT TIME ZONE 'America/Sao_Paulo')::date)::int AS dia_atual
      FROM hoje h
    `);
    const r = result[0] as any;
    if (!r) return vazio;
    const dias_uteis = Number(r.dias_uteis) || 0;
    const dia_atual  = Number(r.dia_atual) || 0;
    return {
      ciclo: (r.ciclo as string) ?? null,
      dias_uteis,
      dia_atual,
      dias_restantes: Math.max(dias_uteis - dia_atual, 0),
    };
  } catch (e) {
    console.error('getCicloProgresso error:', e);
    return vazio;
  }
  },
  1800,
);

export async function getAnaliseDiaria(): Promise<AnaliseDiariaRow[]> {
  await requireUser();
  return _getAnaliseDiariaCached();
}

const _getAnaliseDiariaCached = cacheLoader(
  ['analise-diaria'],
  async (): Promise<AnaliseDiariaRow[]> => {
  try {
    if (!db) return [];
    const result = await db.execute(sql`
      WITH ciclo_atual AS (
        -- Ciclo do último dia útil <= hoje (funciona em fim de semana/feriado).
        SELECT ciclo
        FROM dim_calendario
        WHERE data <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
        ORDER BY data DESC
        LIMIT 1
      ),
      du AS (
        SELECT COUNT(*)::int AS dias_uteis
        FROM dim_calendario
        WHERE ciclo = (SELECT ciclo FROM ciclo_atual)
      ),
      diario AS (
        -- Snapshot mais recente de cada setor DENTRO do ciclo atual.
        SELECT DISTINCT ON (cod_setor)
          cod_setor, dias_trabalhados, dias_abonados, visitas_realizadas, painel
        FROM fato_diario
        WHERE ciclo = (SELECT ciclo FROM ciclo_atual)
        ORDER BY cod_setor, data DESC
      )
      SELECT
        fd.cod_setor,
        dh.nome_setor,
        dh.nome_distrito,
        dh.nome_rep,
        fd.dias_trabalhados,
        fd.dias_abonados,
        fd.visitas_realizadas,
        fd.painel                       AS tamanho_painel,
        (SELECT ciclo FROM ciclo_atual) AS ciclo,
        (SELECT dias_uteis FROM du)     AS dias_uteis
      FROM diario fd
      JOIN dim_hierarquia dh ON dh.cod_setor = fd.cod_setor
      ORDER BY dh.nome_distrito, dh.nome_setor
    `);

    return result.map((r: any) => {
      const dias_uteis         = Number(r.dias_uteis) || 0;
      const dias_trabalhados   = Number(r.dias_trabalhados) || 0;
      const dias_abonados      = Number(r.dias_abonados) || 0;
      const visitas_realizadas = Number(r.visitas_realizadas) || 0;
      const painel_raw         = r.tamanho_painel == null ? null : Number(r.tamanho_painel);
      // Ajuste interno: painel acima de 190 é travado em 180 para o cálculo.
      const tamanho_painel     = painel_raw != null && painel_raw > 190 ? 180 : painel_raw;

      const meta_pct = dias_uteis > 0 ? META_BASE * (dias_uteis / CICLO_REF) : null;
      const visitas_meta = (meta_pct != null && tamanho_painel != null)
        ? Math.round(meta_pct * tamanho_painel)
        : null;
      const cobertura_atual = (tamanho_painel != null && tamanho_painel > 0)
        ? visitas_realizadas / tamanho_painel
        : null;

      const dias_decorridos = dias_trabalhados + dias_abonados;
      const dias_restantes  = dias_uteis - dias_decorridos;

      const visitas_faltantes = visitas_meta != null ? visitas_meta - visitas_realizadas : null;
      const mdv_atual = dias_trabalhados > 0 ? visitas_realizadas / dias_trabalhados : null;
      const mdv_necessaria = (visitas_faltantes != null && dias_restantes > 0)
        ? Math.max(visitas_faltantes, 0) / dias_restantes
        : null;
      // Projeção: mantendo o ritmo atual até o fim do ciclo.
      const projecao_fim = mdv_atual != null
        ? Math.round(mdv_atual * Math.max(dias_restantes, 0) + visitas_realizadas)
        : null;

      return {
        cod_setor: Number(r.cod_setor),
        nome_setor: r.nome_setor as string,
        nome_distrito: (r.nome_distrito as string) ?? null,
        nome_rep: (r.nome_rep as string) ?? null,
        ciclo: (r.ciclo as string) ?? null,
        dias_uteis,
        dias_trabalhados,
        dias_abonados,
        visitas_realizadas,
        tamanho_painel,
        meta_pct,
        cobertura_atual,
        visitas_meta,
        visitas_faltantes,
        dias_decorridos,
        dias_restantes,
        mdv_atual,
        mdv_necessaria,
        projecao_fim,
        status: classificar(visitas_faltantes, mdv_atual, mdv_necessaria),
      };
    });
  } catch (e) {
    console.error('getAnaliseDiaria error:', e);
    return [];
  }
  },
  // fato_diario muda na carga diária — TTL curto (5min) pra manter fresco.
  300,
);

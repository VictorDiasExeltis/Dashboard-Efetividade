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
// Usado hoje só para popular a tela de Análise de Ciclo com a lista real de
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
// Análise de Ciclo por setor — reconstruída a partir do livro-razão de visitas
// (fato_visitas), do painel/metas (metas_ciclo), do calendário (dim_calendario)
// e da hierarquia (dim_hierarquia). Todo o cálculo é feito aqui no servidor.
// Divisões por zero → null (a tela mostra "—").
//
// Ciclo exibido    = último ciclo com visitas em fato_visitas.
// Modelo:
//   DU             = dias úteis do ciclo (dim_calendario)
//   dias_decorridos= dias úteis do ciclo <= hoje (ciclo já fechado ⇒ = DU)
//   dias_restantes = max(DU − dias_decorridos, 0)
//   visitas_real   = nº de visitas do setor no ciclo (COUNT fato_visitas)
//   dias_trabalhados = nº de dias distintos com visita (COUNT DISTINCT data_visita)
//   dias_abonados  = 0 (não disponível no livro de visitas)
//   tamanho_painel = metas_ciclo.tamanho_painel
//   meta_pct       = 90% × (DU / 15)
//   visitas_meta   = round(meta_pct × tamanho_painel)
//   mdv_atual      = visitas_real / dias_trabalhados              (null se dt=0)
//   mdv_necessaria = max(visitas_meta − visitas_real, 0) / dias_restantes (null se <=0)
//   projecao_fim   = mdv_atual × dias_restantes + visitas_real
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
      WITH alvo AS (
        -- Ciclo exibido = último ciclo com visitas em fato_visitas (alinha com a tabela).
        SELECT MAX(ciclo) AS ciclo FROM fato_visitas
      )
      SELECT
        a.ciclo,
        (SELECT COUNT(*) FROM dim_calendario WHERE ciclo = a.ciclo)::int AS dias_uteis,
        (SELECT COUNT(*) FROM dim_calendario
          WHERE ciclo = a.ciclo
            AND data <= (now() AT TIME ZONE 'America/Sao_Paulo')::date)::int AS dia_atual
      FROM alvo a
      WHERE a.ciclo IS NOT NULL
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
      WITH ciclo_alvo AS (
        -- Ciclo exibido = último ciclo com visitas carregadas em fato_visitas.
        SELECT MAX(ciclo) AS ciclo FROM fato_visitas
      ),
      cal AS (
        -- Dias úteis do ciclo e quantos já decorreram até hoje (calendário).
        SELECT
          COUNT(*)::int AS dias_uteis,
          COUNT(*) FILTER (
            WHERE data <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
          )::int AS dias_decorridos
        FROM dim_calendario
        WHERE ciclo = (SELECT ciclo FROM ciclo_alvo)
      ),
      visitas AS (
        -- Livro-razão do ciclo: contagem de visitas e dias distintos com visita.
        SELECT
          cod_setor,
          COUNT(*)::int                    AS visitas_realizadas,
          COUNT(DISTINCT data_visita)::int AS dias_trabalhados
        FROM fato_visitas
        WHERE ciclo = (SELECT ciclo FROM ciclo_alvo)
        GROUP BY cod_setor
      )
      SELECT
        v.cod_setor,
        dh.nome_setor,
        dh.nome_distrito,
        dh.nome_rep,
        v.visitas_realizadas,
        v.dias_trabalhados,
        mc.tamanho_painel               AS tamanho_painel,
        (SELECT ciclo FROM ciclo_alvo)  AS ciclo,
        cal.dias_uteis,
        cal.dias_decorridos
      FROM visitas v
      JOIN dim_hierarquia dh ON dh.cod_setor = v.cod_setor
      LEFT JOIN metas_ciclo mc
        ON mc.cod_setor = v.cod_setor
       AND mc.ciclo = (SELECT ciclo FROM ciclo_alvo)
      CROSS JOIN cal
      ORDER BY dh.nome_distrito, dh.nome_setor
    `);

    return result.map((r: any) => {
      const dias_uteis         = Number(r.dias_uteis) || 0;
      const dias_trabalhados   = Number(r.dias_trabalhados) || 0;
      const dias_abonados      = 0; // livro de visitas não tem abono
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

      // Decorridos/restantes vêm do calendário (não das visitas): ciclo fechado
      // ⇒ decorridos = DU ⇒ restantes = 0 ⇒ projeção = realizado.
      const dias_decorridos = Number(r.dias_decorridos) || 0;
      const dias_restantes  = Math.max(dias_uteis - dias_decorridos, 0);

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
  // fato_visitas muda na carga do ciclo — TTL curto (5min) pra manter fresco.
  300,
);

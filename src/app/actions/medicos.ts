'use server';

import { unstable_cache } from 'next/cache';
import { db } from '@/src/lib/db';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/src/lib/supabase/auth';
import { cacheLoader } from './_cache';
import type { MedicoNaoVisitado } from './medicos.types';

// A query é pesada (~1-3s: anti-join checa "sem visita em 3 ciclos" por médico)
// e os dados só mudam na carga de ciclo. Cacheia por território; revalida em
// 30min. requireUser fica FORA do cache (auth precisa rodar sempre).
// soFechado=true → usa só ciclos fechados (tela de Insights). Default false →
// inclui o ciclo aberto/parcial (tela Target List, visão operacional ao vivo).
export async function getMedicosNaoVisitados(
  distrito: string = 'Todos',
  setor:    string = 'Todos',
  soFechado: boolean = false,
): Promise<MedicoNaoVisitado[]> {
  await requireUser();
  return fetchMedicosNaoVisitadosCached(distrito, setor, soFechado);
}

const fetchMedicosNaoVisitadosCached = unstable_cache(
  async (distrito: string, setor: string, soFechado: boolean): Promise<MedicoNaoVisitado[]> => {
  try {
    if (!db) return [];

    // Fonte de visitas e janela dos "3 ciclos recentes" conforme o modo.
    const fv = soFechado ? sql`fato_visitas_fechado` : sql`fato_visitas`;
    const ciclos3 = soFechado
      ? sql`SELECT ciclo FROM ciclos_fechados ORDER BY ciclo DESC LIMIT 3`
      : sql`SELECT DISTINCT ciclo FROM metas_ciclo ORDER BY ciclo DESC LIMIT 3`;

    const territorioExists = (distrito !== 'Todos' || setor !== 'Todos')
      ? sql`AND EXISTS (
          SELECT 1
          FROM ${fv} v2
          INNER JOIN dim_hierarquia h ON h.cod_setor = v2.cod_setor
          WHERE v2.crmuf = m.crmuf
            ${distrito !== 'Todos' ? sql`AND h.nome_distrito = ${distrito}` : sql``}
            ${setor    !== 'Todos' ? sql`AND h.nome_setor    = ${setor}`    : sql``}
        )`
      : sql``;

    const result = await db.execute(sql`
      SELECT
        m.crmuf,
        m.nome_medico,
        m.classificacao,
        m.score,
        m.potencial,
        m.especialidade,
        h_med.nome_setor    AS nome_setor,
        h_med.nome_distrito AS nome_distrito,
        MAX(CASE WHEN s.id_marca = 10005 THEN s.segmentacao END) AS slinda,
        MAX(CASE WHEN s.id_marca = 10004 THEN s.segmentacao END) AS regenesis,
        MAX(CASE WHEN s.id_marca = 10002 THEN s.segmentacao END) AS gynpro,
        MAX(CASE WHEN s.id_marca = 10001 THEN s.segmentacao END) AS gynotran,
        MAX(CASE WHEN s.id_marca = 10003 THEN s.segmentacao END) AS hemolip,
        MAX(CASE WHEN s.id_marca = 10007 THEN s.segmentacao END) AS vizuria
      FROM dim_medicos m
      LEFT JOIN dim_hierarquia h_med ON h_med.cod_setor = m.cod_setor
      LEFT JOIN fato_segmentacao s ON s.crmuf = m.crmuf
      WHERE m.status = TRUE
        -- Sem visita nos 3 ciclos mais recentes (janela de "abandono")
        AND NOT EXISTS (
          SELECT 1 FROM ${fv} v
          WHERE v.crmuf = m.crmuf
            AND v.ciclo IN (${ciclos3})
        )
        -- Não incluídos nos últimos 3 ciclos
        AND (m.data_inclusao IS NULL OR m.data_inclusao < (
          SELECT MIN(c.data)
          FROM public.dim_calendario c
          WHERE c.ciclo IN (${ciclos3})
        ))
        ${territorioExists}
      GROUP BY m.crmuf, m.nome_medico, m.classificacao, m.especialidade, m.score, m.potencial, h_med.nome_setor, h_med.nome_distrito
      ORDER BY m.score DESC NULLS LAST, m.nome_medico
    `);

    return result.map((r: any) => ({
      crmuf:         r.crmuf         ?? '',
      nome_medico:   r.nome_medico   ?? '',
      classificacao: r.classificacao ?? null,
      score:         r.score != null ? Number(r.score) : null,
      potencial:     r.potencial != null ? Number(r.potencial) : null,
      slinda:        r.slinda        ?? null,
      regenesis:     r.regenesis     ?? null,
      gynpro:        r.gynpro        ?? null,
      gynotran:      r.gynotran      ?? null,
      hemolip:       r.hemolip       ?? null,
      vizuria:       r.vizuria       ?? null,
      especialidade: r.especialidade ?? null,
      nome_setor:    r.nome_setor    ?? null,
      nome_distrito: r.nome_distrito ?? null,
    }));
  } catch (e) {
    console.error('getMedicosNaoVisitados error:', e);
    return [];
  }
  },
  ['medicos-nao-visitados'],
  { revalidate: 1800 },
);

// Total de médicos ativos vinculados ao território (via histórico de visitas).
// Denominador para a "Taxa de Abandono". Usa a mesma definição de vínculo
// território→médico que a lista de não-visitados, garantindo coerência do %.
export async function getTotalMedicosAtivosTerritorio(
  distrito: string = 'Todos',
  setor:    string = 'Todos'
): Promise<number> {
  await requireUser();
  return _getTotalMedicosAtivosCached(distrito, setor);
}

const _getTotalMedicosAtivosCached = cacheLoader(
  ['total-medicos-ativos'],
  async (distrito: string, setor: string): Promise<number> => {
  try {
    if (!db) return 0;

    const territorioExists = (distrito !== 'Todos' || setor !== 'Todos')
      ? sql`AND EXISTS (
          SELECT 1
          FROM fato_visitas v2
          INNER JOIN dim_hierarquia h ON h.cod_setor = v2.cod_setor
          WHERE v2.crmuf = m.crmuf
            ${distrito !== 'Todos' ? sql`AND h.nome_distrito = ${distrito}` : sql``}
            ${setor    !== 'Todos' ? sql`AND h.nome_setor    = ${setor}`    : sql``}
        )`
      : sql``;

    const result = await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM dim_medicos m
      WHERE m.status = TRUE
        -- Não incluídos nos últimos 3 ciclos
        AND (m.data_inclusao IS NULL OR m.data_inclusao < (
          SELECT MIN(c.data)
          FROM public.dim_calendario c
          WHERE c.ciclo IN (
            SELECT DISTINCT mc.ciclo FROM metas_ciclo mc
            ORDER BY mc.ciclo DESC LIMIT 3
          )
        ))
        ${territorioExists}
    `);

    return Number((result[0] as any)?.total ?? 0);
  } catch (e) {
    console.error('getTotalMedicosAtivosTerritorio error:', e);
    return 0;
  }
  },
  1800,
);

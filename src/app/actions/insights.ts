'use server';

import { db } from '@/src/lib/db';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/src/lib/supabase/auth';

// Métricas extras por setor (ciclo atual) que vêm de fato_visitas / fato_amostras
// / fato_segmentacao / dim_medicos — complementam o que já sai de getAnaliseDiaria
// (atingimento, cobertura, abonos). Chave de junção: cod_setor.
export interface InsightExtra {
  cod_setor: number;
  alta_cat_nao_visitada: number;  // médicos potencial 1-2 ativos do setor sem visita no ciclo de detalhe
  amostras: number;               // total de amostras entregues no ciclo de detalhe
  visitados_sem_seg: number;      // médicos distintos visitados no ciclo de detalhe sem nenhuma segmentação
}

export interface InsightExtrasResult {
  cicloDetalhe: string | null;    // último ciclo com visita detalhada (fonte dos 3 acima)
  rows: InsightExtra[];
}

// Métricas de nível-visita por setor. Usam o ÚLTIMO ciclo com dados detalhados
// em fato_visitas (auto-detectado) — pode diferir do ciclo agregado do fato_diario.
// Quando o detalhe do ciclo atual subir, passa a usá-lo sozinho.
export async function getInsightsExtras(): Promise<InsightExtrasResult> {
  try {
    await requireUser();
    if (!db) return { cicloDetalhe: null, rows: [] };
    const result = await db.execute(sql`
      WITH cd AS (
        SELECT MAX(ciclo) AS ciclo FROM fato_visitas
      ),
      alta AS (
        -- Médicos de alta categoria (potencial 1-2) ativos, sem visita no ciclo de detalhe.
        SELECT m.cod_setor, COUNT(*)::int AS n
        FROM dim_medicos m
        WHERE m.status = TRUE
          AND m.potencial IN (1, 2)
          AND NOT EXISTS (
            SELECT 1 FROM fato_visitas v
            WHERE v.crmuf = m.crmuf AND v.ciclo = (SELECT ciclo FROM cd)
          )
        GROUP BY m.cod_setor
      ),
      amostras AS (
        SELECT v.cod_setor, COALESCE(SUM(a.quantidade), 0)::int AS total
        FROM fato_amostras a
        JOIN fato_visitas v ON v.id_visita = a.id_visita
        WHERE v.ciclo = (SELECT ciclo FROM cd)
        GROUP BY v.cod_setor
      ),
      sem_seg AS (
        SELECT v.cod_setor, COUNT(DISTINCT v.crmuf)::int AS n
        FROM fato_visitas v
        WHERE v.ciclo = (SELECT ciclo FROM cd)
          AND NOT EXISTS (SELECT 1 FROM fato_segmentacao s WHERE s.crmuf = v.crmuf)
        GROUP BY v.cod_setor
      )
      SELECT
        h.cod_setor,
        (SELECT ciclo FROM cd)       AS ciclo_detalhe,
        COALESCE(alta.n, 0)          AS alta_cat_nao_visitada,
        COALESCE(amostras.total, 0)  AS amostras,
        COALESCE(sem_seg.n, 0)       AS visitados_sem_seg
      FROM dim_hierarquia h
      LEFT JOIN alta     ON alta.cod_setor     = h.cod_setor
      LEFT JOIN amostras ON amostras.cod_setor = h.cod_setor
      LEFT JOIN sem_seg  ON sem_seg.cod_setor  = h.cod_setor
    `);

    const rows = result.map((r: any) => ({
      cod_setor: Number(r.cod_setor),
      alta_cat_nao_visitada: Number(r.alta_cat_nao_visitada) || 0,
      amostras: Number(r.amostras) || 0,
      visitados_sem_seg: Number(r.visitados_sem_seg) || 0,
    }));
    const cicloDetalhe = (result[0] as any)?.ciclo_detalhe ?? null;
    return { cicloDetalhe, rows };
  } catch (e) {
    console.error('getInsightsExtras error:', e);
    return { cicloDetalhe: null, rows: [] };
  }
}

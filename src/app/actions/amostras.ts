'use server';

import { db } from '@/src/lib/db';
import { sql } from 'drizzle-orm';

export async function getAmostrasData(
  distrito: string = 'Todos',
  setor: string = 'Todos',
  ciclo: string = 'Todos',
  produto: string = 'Todos'
): Promise<{
  bySegmentacao: Array<{ segmentacao: string; medicos: number; mediaAmostras: number }>;
  byClassificacao: Array<{ classificacao: string; medicos: number; mediaAmostras: number }>;
  totalAmostras: number;
  totalMedicosPainel: number;
}> {
  try {
    if (!db) return { bySegmentacao: [], byClassificacao: [], totalAmostras: 0, totalMedicosPainel: 0 };

    const territorioJoin = (distrito !== 'Todos' || setor !== 'Todos')
      ? sql`AND v.cod_setor IN (
          SELECT h.cod_setor FROM dim_hierarquia h
          WHERE TRUE
            ${distrito !== 'Todos' ? sql`AND h.nome_distrito = ${distrito}` : sql``}
            ${setor   !== 'Todos' ? sql`AND h.nome_setor    = ${setor}`    : sql``}
        )`
      : sql``;

    const cicloJoin = ciclo !== 'Todos' ? sql`AND v.ciclo = ${ciclo}` : sql``;

    // Filtro de produto restringe quais linhas de fato_amostras entram na soma.
    // Aplicado no ON do LEFT JOIN para preservar médicos sem amostras do produto
    // (eles continuam no denominador com média 0).
    const produtoJoin = produto !== 'Todos'
      ? sql`AND a.id_produto IN (
          SELECT id_produto FROM dim_produtos WHERE nome_produto = ${produto}
        )`
      : sql``;

    // Painel = médicos ativos. Respeita só território (ciclo/produto filtram
    // as amostras, não a base de médicos).
    const territorioMedicoJoin = (distrito !== 'Todos' || setor !== 'Todos')
      ? sql`INNER JOIN dim_hierarquia h ON h.cod_setor = m.cod_setor
            AND TRUE
            ${distrito !== 'Todos' ? sql`AND h.nome_distrito = ${distrito}` : sql``}
            ${setor   !== 'Todos' ? sql`AND h.nome_setor    = ${setor}`    : sql``}`
      : sql``;

    const [segResult, classResult, totalResult, painelResult] = await Promise.all([
      db.execute(sql`
        SELECT
          COALESCE(s.segmentacao, 'SEM SEGMENTAÇÃO') AS segmentacao,
          COUNT(DISTINCT s.crmuf)::integer            AS total_medicos,
          COALESCE(
            SUM(a.quantidade)::numeric / NULLIF(COUNT(DISTINCT v.crmuf), 0),
            0
          )::numeric AS media_amostras
        FROM fato_segmentacao s
        INNER JOIN dim_medicos m ON m.crmuf = s.crmuf AND m.status = TRUE
        LEFT JOIN fato_visitas  v ON v.crmuf     = s.crmuf ${territorioJoin} ${cicloJoin}
        LEFT JOIN fato_amostras a ON a.id_visita = v.id_visita ${produtoJoin}
        GROUP BY s.segmentacao
        ORDER BY CASE COALESCE(s.segmentacao, 'SEM SEGMENTAÇÃO')
          WHEN 'PROTEGER'   THEN 1
          WHEN 'CONQUISTAR' THEN 2
          WHEN 'MANTER'     THEN 3
          WHEN 'OBSERVAR'   THEN 4
          ELSE 5
        END
      `),
      db.execute(sql`
        SELECT
          TRIM(m.classificacao)                       AS classificacao,
          COUNT(DISTINCT m.crmuf)::integer            AS total_medicos,
          COALESCE(
            SUM(a.quantidade)::numeric / NULLIF(COUNT(DISTINCT v.crmuf), 0),
            0
          )::numeric AS media_amostras
        FROM dim_medicos m
        LEFT JOIN fato_visitas  v ON v.crmuf     = m.crmuf ${territorioJoin} ${cicloJoin}
        LEFT JOIN fato_amostras a ON a.id_visita = v.id_visita ${produtoJoin}
        WHERE m.status = TRUE
          AND m.classificacao IS NOT NULL AND TRIM(m.classificacao) <> ''
        GROUP BY TRIM(m.classificacao)
        ORDER BY TRIM(m.classificacao)
      `),
      // Total real de amostras entregues — soma direta em fato_amostras.
      // Não filtra por status do médico: amostras já entregues a médicos hoje
      // inativos continuam contando como amostras entregues.
      db.execute(sql`
        SELECT COALESCE(SUM(a.quantidade), 0)::bigint AS total_amostras
        FROM fato_amostras a
        INNER JOIN fato_visitas v ON v.id_visita = a.id_visita
        WHERE TRUE
          ${territorioJoin}
          ${cicloJoin}
          ${produto !== 'Todos' ? sql`AND a.id_produto IN (
            SELECT id_produto FROM dim_produtos WHERE nome_produto = ${produto}
          )` : sql``}
      `),
      // Tamanho do painel — denominador da média geral.
      db.execute(sql`
        SELECT COUNT(DISTINCT m.crmuf)::integer AS total_medicos
        FROM dim_medicos m
        ${territorioMedicoJoin}
        WHERE m.status = TRUE
      `),
    ]);

    return {
      bySegmentacao: segResult.map((r: any) => ({
        segmentacao: r.segmentacao?.startsWith('SEM SEGMENTA')
          ? 'SEM SEGMENTAÇÃO'
          : (r.segmentacao || 'SEM SEGMENTAÇÃO'),
        medicos:       Number(r.total_medicos  || 0),
        mediaAmostras: Number(r.media_amostras || 0),
      })),
      byClassificacao: classResult.map((r: any) => ({
        classificacao: r.classificacao || '',
        medicos:       Number(r.total_medicos  || 0),
        mediaAmostras: Number(r.media_amostras || 0),
      })),
      totalAmostras:      Number((totalResult[0]  as any)?.total_amostras || 0),
      totalMedicosPainel: Number((painelResult[0] as any)?.total_medicos  || 0),
    };
  } catch (e) {
    console.error('getAmostrasData error:', e);
    return { bySegmentacao: [], byClassificacao: [], totalAmostras: 0, totalMedicosPainel: 0 };
  }
}

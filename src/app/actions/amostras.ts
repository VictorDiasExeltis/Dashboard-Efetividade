'use server';

import { db } from '@/src/lib/db';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/src/lib/supabase/auth';
import { cacheLoader } from './_cache';

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
  totalMedicosComAmostra: number;
}> {
  await requireUser();
  return _getAmostrasDataCached(distrito, setor, ciclo, produto);
}

const _getAmostrasDataCached = cacheLoader(
  ['amostras-data'],
  async (distrito: string, setor: string, ciclo: string, produto: string) => {
  try {
    if (!db) return { bySegmentacao: [], byClassificacao: [], totalAmostras: 0, totalMedicosPainel: 0, totalMedicosComAmostra: 0 };

    // Valores parametrizados (sql`${v}` vira bind param) — nunca interpolar
    // input do cliente como SQL cru (sql.raw) sob risco de injection.
    const cicloList   = ciclo.split(',').map((c) => c.trim()).filter(Boolean);
    const produtoList = produto.split(',').map((p) => p.trim()).filter(Boolean);
    const cicloInList   = sql.join(cicloList.map((c) => sql`${c}`), sql`, `);
    const produtoInList = sql.join(produtoList.map((p) => sql`${p}`), sql`, `);
    const hasCiclo   = ciclo   !== 'Todos' && cicloList.length   > 0;
    const hasProduto = produto !== 'Todos' && produtoList.length > 0;

    const territorioJoin = (distrito !== 'Todos' || setor !== 'Todos')
      ? sql`AND v.cod_setor IN (
          SELECT h.cod_setor FROM dim_hierarquia h
          WHERE TRUE
            ${distrito !== 'Todos' ? sql`AND h.nome_distrito = ${distrito}` : sql``}
            ${setor   !== 'Todos' ? sql`AND h.nome_setor    = ${setor}`    : sql``}
        )`
      : sql``;

    const cicloJoin = hasCiclo
      ? sql`AND v.ciclo IN (${cicloInList})`
      : sql``;

    // Filtro de produto restringe quais linhas de fato_amostras entram na soma.
    // Aplicado no ON do LEFT JOIN para preservar médicos sem amostras do produto
    // (eles continuam no denominador com média 0).
    const produtoJoin = hasProduto
      ? sql`AND a.id_produto IN (
          SELECT id_produto FROM dim_produtos WHERE nome_produto IN (${produtoInList})
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

    // Filtros para a query partindo de fato_amostras (centrada na entrega).
    const territorioFiltro = (distrito !== 'Todos' || setor !== 'Todos')
      ? sql`AND v.cod_setor IN (
          SELECT h.cod_setor FROM dim_hierarquia h
          WHERE TRUE
            ${distrito !== 'Todos' ? sql`AND h.nome_distrito = ${distrito}` : sql``}
            ${setor   !== 'Todos' ? sql`AND h.nome_setor    = ${setor}`    : sql``}
        )`
      : sql``;
    const cicloFiltro = hasCiclo
      ? sql`AND v.ciclo IN (${cicloInList})`
      : sql``;
    const produtoFiltro = hasProduto
      ? sql`AND p.nome_produto IN (${produtoInList})`
      : sql``;

    const [segResult, classResult, totalResult, painelResult, medicosComAmostraResult] = await Promise.all([
      // Segmentação determinada pela MARCA do produto efetivamente entregue.
      // Um médico que recebe amostras de marcas diferentes aparece em cada
      // segmentação correspondente; se não tem segmentação cadastrada para a
      // marca da entrega, cai em "SEM SEGMENTAÇÃO".
      db.execute(sql`
        SELECT
          COALESCE(s.segmentacao, 'SEM SEGMENTAÇÃO') AS segmentacao,
          COUNT(DISTINCT v.crmuf)::integer AS total_medicos,
          COALESCE(
            SUM(a.quantidade)::numeric / NULLIF(COUNT(DISTINCT v.crmuf), 0),
            0
          )::numeric AS media_amostras
        FROM fato_amostras a
        INNER JOIN fato_visitas  v ON v.id_visita = a.id_visita
        INNER JOIN dim_produtos  p ON p.id_produto = a.id_produto
        LEFT  JOIN fato_segmentacao s
          ON s.crmuf = v.crmuf AND s.id_marca = p.id_marca
        WHERE TRUE
          ${territorioFiltro}
          ${cicloFiltro}
          ${produtoFiltro}
        GROUP BY COALESCE(s.segmentacao, 'SEM SEGMENTAÇÃO')
        ORDER BY CASE COALESCE(s.segmentacao, 'SEM SEGMENTAÇÃO')
          WHEN 'CONQUISTAR' THEN 1
          WHEN 'PROTEGER'   THEN 2
          WHEN 'MANTER'     THEN 3
          WHEN 'OBSERVAR'   THEN 4
          ELSE 5
        END
      `),
      db.execute(sql`
        SELECT
          TRIM(m.classificacao)                       AS classificacao,
          COUNT(DISTINCT CASE WHEN a.id_visita IS NOT NULL THEN m.crmuf END)::integer AS total_medicos,
          COALESCE(
            SUM(a.quantidade)::numeric / NULLIF(COUNT(DISTINCT CASE WHEN a.id_visita IS NOT NULL THEN v.crmuf END), 0),
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
          ${hasProduto ? sql`AND a.id_produto IN (
            SELECT id_produto FROM dim_produtos WHERE nome_produto IN (${produtoInList})
          )` : sql``}
      `),
      // Tamanho do painel — denominador da média geral.
      db.execute(sql`
        SELECT COUNT(DISTINCT m.crmuf)::integer AS total_medicos
        FROM dim_medicos m
        ${territorioMedicoJoin}
        WHERE m.status = TRUE
      `),
      // Médicos DISTINTOS que receberam ao menos uma amostra (sem duplicar por
      // marca). Mesmos filtros de território/ciclo/produto do total de amostras.
      db.execute(sql`
        SELECT COUNT(DISTINCT v.crmuf)::integer AS total_medicos
        FROM fato_amostras a
        INNER JOIN fato_visitas v ON v.id_visita = a.id_visita
        WHERE TRUE
          ${territorioJoin}
          ${cicloJoin}
          ${hasProduto ? sql`AND a.id_produto IN (
            SELECT id_produto FROM dim_produtos WHERE nome_produto IN (${produtoInList})
          )` : sql``}
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
      totalAmostras:          Number((totalResult[0]  as any)?.total_amostras || 0),
      totalMedicosPainel:     Number((painelResult[0] as any)?.total_medicos  || 0),
      totalMedicosComAmostra: Number((medicosComAmostraResult[0] as any)?.total_medicos || 0),
    };
  } catch (e) {
    console.error('getAmostrasData error:', e);
    return { bySegmentacao: [], byClassificacao: [], totalAmostras: 0, totalMedicosPainel: 0, totalMedicosComAmostra: 0 };
  }
  },
  1800,
);

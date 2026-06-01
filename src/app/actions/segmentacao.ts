'use server';

import { db } from '@/src/lib/db';
import { sql } from 'drizzle-orm';

export async function getClassificacoes(): Promise<string[]> {
  try {
    if (!db) return [];
    const result = await db.execute(sql`
      SELECT DISTINCT TRIM(classificacao) as classificacao
      FROM dim_medicos
      WHERE status = TRUE
        AND classificacao IS NOT NULL AND TRIM(classificacao) != ''
      ORDER BY classificacao
    `);
    return result.map((r: any) => r.classificacao as string);
  } catch (e) {
    console.error('getClassificacoes error:', e);
    return [];
  }
}

export async function getKpisClassificacao(
  classificacao: string = 'Todas',
  distrito: string = 'Todos',
  setor: string = 'Todos'
): Promise<Record<string, number>> {
  try {
    if (!db) return {};

    // Join com a hierarquia para permitir filtros de território (distrito/setor)
    const territorioJoin = (distrito !== 'Todos' || setor !== 'Todos')
      ? sql`INNER JOIN dim_hierarquia h ON h.cod_setor = m.cod_setor`
      : sql``;

    const territorioWhere = (distrito !== 'Todos' || setor !== 'Todos')
      ? sql`${distrito !== 'Todos' ? sql`AND h.nome_distrito = ${distrito}` : sql``}
            ${setor   !== 'Todos' ? sql`AND h.nome_setor    = ${setor}`    : sql``}`
      : sql``;

    const classificacaoWhere = classificacao !== 'Todas'
      ? sql`AND TRIM(m.classificacao) IN (${sql.raw(classificacao.split(',').map((c) => `'${c.trim()}'`).join(','))})`
      : sql``;

    const result = await db.execute(sql`
      SELECT
        TRIM(m.classificacao)       AS classificacao,
        COUNT(DISTINCT m.crmuf)::integer AS total
      FROM dim_medicos m
      ${territorioJoin}
      WHERE m.status = TRUE
        AND m.classificacao IS NOT NULL AND TRIM(m.classificacao) <> ''
        ${classificacaoWhere}
        ${territorioWhere}
      GROUP BY TRIM(m.classificacao)
    `);

    return Object.fromEntries(
      result.map((r: any) => [r.classificacao as string, Number(r.total)])
    );
  } catch (e) {
    console.error('getKpisClassificacao error:', e);
    return {};
  }
}

// Aceita ciclo no formato bruto do banco ("202604") ou no formato legado da
// UI ("CICLO 04"). Retorna sempre o formato do banco. Funciona com qualquer
// ano (2026, 2027, ...) e qualquer número de ciclo (01..99).
function normalizeCiclo(input: string, fallbackYear = '2026'): string {
  if (/^\d{6}$/.test(input)) return input;
  const match = input.match(/CICLO\s*(\d+)/i);
  if (match) return `${fallbackYear}${match[1].padStart(2, '0')}`;
  return input;
}

export type CoberturaSegmentacao = {
  segmentacao: string;
  total: number;       // médicos com a segmentação em qualquer marca
  visitados: number;   // desses, quantos foram visitados no ciclo
  cobertura: number;   // visitados / total (0..100)
};

// Cobertura agregada por segmentação (PROTEGER, CONQUISTAR, MANTER, OBSERVAR),
// considerando todas as marcas. Um médico que tem segmentação X em qualquer
// marca conta em X. Filtros: ciclo, distrito, setor, classificação.
export type PotencialVisitacao = { total: number; visitados: number };

// Cobertura de visitação por nível de potencial (1..5). Para cada nível retorna:
//   total     -> médicos ativos daquele potencial no recorte (território + classificação)
//   visitados -> desses, quantos receberam ao menos uma visita no ciclo/território
// A cobertura do nível = visitados / total. Respeita ciclo, distrito, setor e
// classificação (diferente da versão anterior, que só contava o painel).
export async function getVisitadosPorPotencial(
  distrito: string = 'Todos',
  setor: string = 'Todos',
  classificacao: string = 'Todas',
  ciclo: string = 'Todos',
): Promise<Record<number, PotencialVisitacao>> {
  const vazio: Record<number, PotencialVisitacao> = {
    1: { total: 0, visitados: 0 },
    2: { total: 0, visitados: 0 },
    3: { total: 0, visitados: 0 },
    4: { total: 0, visitados: 0 },
    5: { total: 0, visitados: 0 },
  };
  try {
    if (!db) return vazio;

    const dbCiclo = ciclo !== 'Todos'
      ? ciclo.split(',').map((c) => normalizeCiclo(c.trim())).join(',')
      : ciclo;
    const hasTerritorio = distrito !== 'Todos' || setor !== 'Todos';

    // Restringe a base de médicos ao território (via cod_setor do médico).
    const territorioMedicoJoin = hasTerritorio
      ? sql`INNER JOIN dim_hierarquia h ON h.cod_setor = m.cod_setor
            AND TRUE
            ${distrito !== 'Todos' ? sql`AND h.nome_distrito = ${distrito}` : sql``}
            ${setor   !== 'Todos' ? sql`AND h.nome_setor    = ${setor}`    : sql``}`
      : sql``;

    // Restringe as visitas consideradas ao território (via cod_setor da visita).
    const territorioVisitaWhere = hasTerritorio
      ? sql`AND v.cod_setor IN (
          SELECT h.cod_setor FROM dim_hierarquia h
          WHERE TRUE
            ${distrito !== 'Todos' ? sql`AND h.nome_distrito = ${distrito}` : sql``}
            ${setor   !== 'Todos' ? sql`AND h.nome_setor    = ${setor}`    : sql``}
        )`
      : sql``;

    const classificacaoWhere = classificacao !== 'Todas'
      ? sql`AND TRIM(m.classificacao) IN (${sql.raw(classificacao.split(',').map((c) => `'${c.trim()}'`).join(','))})`
      : sql``;

    const cicloWhere = ciclo !== 'Todos'
      ? sql`AND v.ciclo IN (${sql.raw(dbCiclo.split(',').map((c) => `'${c.trim()}'`).join(','))})`
      : sql``;

    const result = await db.execute(sql`
      SELECT
        m.potencial,
        COUNT(DISTINCT m.crmuf)::integer AS total,
        COUNT(DISTINCT v.crmuf)::integer AS visitados
      FROM dim_medicos m
      ${territorioMedicoJoin}
      LEFT JOIN fato_visitas v
        ON v.crmuf = m.crmuf ${territorioVisitaWhere} ${cicloWhere}
      WHERE m.status = TRUE
        AND m.potencial BETWEEN 1 AND 5
        ${classificacaoWhere}
      GROUP BY m.potencial
    `);

    const acc: Record<number, PotencialVisitacao> = { ...vazio };
    for (const r of result as any[]) {
      acc[Number(r.potencial)] = {
        total: Number(r.total || 0),
        visitados: Number(r.visitados || 0),
      };
    }
    return acc;
  } catch (e) {
    console.error('getVisitadosPorPotencial error:', e);
    return vazio;
  }
}

export async function getCoberturaPorSegmentacao(
  ciclo: string = 'Todos',
  distrito: string = 'Todos',
  setor: string = 'Todos',
  classificacao: string = 'Todas',
): Promise<CoberturaSegmentacao[]> {
  try {
    if (!db) return [];

    const dbCiclo = ciclo !== 'Todos'
      ? ciclo.split(',').map((c) => normalizeCiclo(c.trim())).join(',')
      : ciclo;
    const hasTerritorio = distrito !== 'Todos' || setor !== 'Todos';

    // Quando há filtro de território, restringimos o "painel" do médico via
    // dim_hierarquia (cod_setor do médico). Isso garante que o denominador
    // também respeite o filtro — não só o numerador (visitas).
    const territorioMedicoJoin = hasTerritorio
      ? sql`INNER JOIN dim_hierarquia h ON h.cod_setor = m.cod_setor
            AND TRUE
            ${distrito !== 'Todos' ? sql`AND h.nome_distrito = ${distrito}` : sql``}
            ${setor   !== 'Todos' ? sql`AND h.nome_setor    = ${setor}`    : sql``}`
      : sql``;

    const territorioVisitaWhere = hasTerritorio
      ? sql`AND v.cod_setor IN (
          SELECT h.cod_setor FROM dim_hierarquia h
          WHERE TRUE
            ${distrito !== 'Todos' ? sql`AND h.nome_distrito = ${distrito}` : sql``}
            ${setor   !== 'Todos' ? sql`AND h.nome_setor    = ${setor}`    : sql``}
        )`
      : sql``;

    const classificacaoWhere = classificacao !== 'Todas'
      ? sql`AND TRIM(m.classificacao) IN (${sql.raw(classificacao.split(',').map((c) => `'${c.trim()}'`).join(','))})`
      : sql``;

    const cicloWhere = ciclo !== 'Todos'
      ? sql`AND v.ciclo IN (${sql.raw(dbCiclo.split(',').map((c) => `'${c.trim()}'`).join(','))})`
      : sql``;

    const result = await db.execute(sql`
      WITH segs AS (
        SELECT DISTINCT s.segmentacao, s.crmuf
        FROM fato_segmentacao s
        INNER JOIN dim_medicos m ON m.crmuf = s.crmuf
        ${territorioMedicoJoin}
        WHERE s.segmentacao IN ('PROTEGER', 'CONQUISTAR', 'MANTER', 'OBSERVAR')
          AND m.status = TRUE
          ${classificacaoWhere}
      )
      SELECT
        segs.segmentacao,
        COUNT(DISTINCT segs.crmuf)::integer AS total,
        COUNT(DISTINCT v.crmuf)::integer    AS visitados
      FROM segs
      LEFT JOIN fato_visitas v ON v.crmuf = segs.crmuf ${territorioVisitaWhere} ${cicloWhere}
      GROUP BY segs.segmentacao
    `);

    const order = ['PROTEGER', 'CONQUISTAR', 'MANTER', 'OBSERVAR'];
    return result
      .map((r: any) => {
        const total = Number(r.total || 0);
        const visitados = Number(r.visitados || 0);
        return {
          segmentacao: r.segmentacao as string,
          total,
          visitados,
          cobertura: total > 0 ? (visitados / total) * 100 : 0,
        };
      })
      .sort((a, b) => order.indexOf(a.segmentacao) - order.indexOf(b.segmentacao));
  } catch (e) {
    console.error('getCoberturaPorSegmentacao error:', e);
    return [];
  }
}

export async function getSegmentacaoData(
  marcaId: number,
  classificacao: string = 'Todas',
  distrito: string = 'Todos',
  setor: string = 'Todos',
  ciclo: string = 'Todos'
) {
  try {
    if (!db) return [];

    const dbCiclo = ciclo !== 'Todos'
      ? ciclo.split(',').map((c) => normalizeCiclo(c.trim())).join(',')
      : ciclo;

    const hasTerritorio = distrito !== 'Todos' || setor !== 'Todos';

    const territorioMedicoJoin = hasTerritorio
      ? sql`INNER JOIN dim_hierarquia h ON h.cod_setor = m.cod_setor
            AND TRUE
            ${distrito !== 'Todos' ? sql`AND h.nome_distrito = ${distrito}` : sql``}
            ${setor   !== 'Todos' ? sql`AND h.nome_setor    = ${setor}`    : sql``}`
      : sql``;

    const territorioJoin = hasTerritorio
      ? sql`AND v.cod_setor IN (
          SELECT h.cod_setor FROM dim_hierarquia h
          WHERE TRUE
            ${distrito !== 'Todos' ? sql`AND h.nome_distrito = ${distrito}` : sql``}
            ${setor   !== 'Todos' ? sql`AND h.nome_setor    = ${setor}`    : sql``}
        )`
      : sql``;

    const classificacaoWhere = classificacao !== 'Todas'
      ? sql`AND TRIM(m.classificacao) IN (${sql.raw(classificacao.split(',').map((c) => `'${c.trim()}'`).join(','))})`
      : sql``;

    const cicloWhere = ciclo !== 'Todos'
      ? sql`AND v.ciclo IN (${sql.raw(dbCiclo.split(',').map((c) => `'${c.trim()}'`).join(','))})`
      : sql``;

    const resultRaw = await db.execute(sql`
      SELECT
        COALESCE(s.segmentacao, 'SEM SEGMENTAÇÃO') as label,
        COUNT(DISTINCT m.crmuf)::integer    as total_medicos,
        COUNT(DISTINCT v.crmuf)::integer    as medicos_visitados
      FROM dim_medicos m
      ${territorioMedicoJoin}
      LEFT JOIN fato_segmentacao s ON s.crmuf = m.crmuf AND s.id_marca = ${marcaId}
      LEFT JOIN fato_visitas v ON v.crmuf = m.crmuf ${territorioJoin} ${cicloWhere}
      WHERE m.status = TRUE
        ${classificacaoWhere}
      GROUP BY COALESCE(s.segmentacao, 'SEM SEGMENTAÇÃO')
    `);

    // Process the result
    return resultRaw.map((row: any) => {
       const simNum = Number(row.medicos_visitados || 0);
       const total = Number(row.total_medicos || 0);
       const naoNum = total - simNum;
       const simPct = total > 0 ? Math.round((simNum / total) * 100) + '%' : '0%';
       const naoPct = total > 0 ? Math.round((naoNum / total) * 100) + '%' : '0%';

       // Handle "SEM SEGMENTAÇÃO" encoding issue
       const label = (row.label && String(row.label).startsWith('SEM SEGMENTA')) ? 'SEM SEGMENTAÇÃO' : (row.label || 'SEM SEGMENTAÇÃO');

       return {
         label: label,
         sim: simPct,
         simNum,
         nao: naoPct,
         naoNum,
         total
       };
    });
  } catch (e) {
    console.error('getSegmentacaoData error:', e);
    return [];
  }
}

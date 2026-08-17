'use server';

import { db } from '@/src/lib/db';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/src/lib/supabase/auth';
import { cacheLoader } from './_cache';

export async function getClassificacoes(): Promise<string[]> {
  await requireUser();
  return _getClassificacoesCached();
}

const _getClassificacoesCached = cacheLoader(
  ['classificacoes'],
  async (): Promise<string[]> => {
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
  },
  1800,
);

// Aceita ciclo no formato bruto do banco ("202604") ou no formato legado da
// UI ("CICLO 04"). Retorna sempre o formato do banco. Funciona com qualquer
// ano (2026, 2027, ...) e qualquer número de ciclo (01..99).
function normalizeCiclo(input: string, fallbackYear = '2026'): string {
  if (/^\d{6}$/.test(input)) return input;
  const match = input.match(/CICLO\s*(\d+)/i);
  if (match) return `${fallbackYear}${match[1].padStart(2, '0')}`;
  return input;
}

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
  await requireUser();
  return _getVisitadosPorPotencialCached(distrito, setor, classificacao, ciclo);
}

const _getVisitadosPorPotencialCached = cacheLoader(
  ['visitados-por-potencial'],
  async (
    distrito: string,
    setor: string,
    classificacao: string,
    ciclo: string,
  ): Promise<Record<number, PotencialVisitacao>> => {
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

    const classificacaoList = classificacao.split(',').map((c) => c.trim()).filter(Boolean);
    const classificacaoWhere = classificacao !== 'Todas' && classificacaoList.length > 0
      ? sql`AND TRIM(m.classificacao) IN (${sql.join(classificacaoList.map((c) => sql`${c}`), sql`, `)})`
      : sql``;

    const cicloList = dbCiclo.split(',').map((c) => c.trim()).filter(Boolean);
    const cicloWhere = ciclo !== 'Todos' && cicloList.length > 0
      ? sql`AND v.ciclo IN (${sql.join(cicloList.map((c) => sql`${c}`), sql`, `)})`
      : sql``;

    // Alias próprio para o EXISTS que amplia a base (ver getSegmentacaoData).
    const visitadoNoCiclo = sql`EXISTS (
      SELECT 1 FROM fato_visitas_fechado fv
      WHERE fv.crmuf = m.crmuf
        ${hasTerritorio ? sql`AND fv.cod_setor IN (
          SELECT h.cod_setor FROM dim_hierarquia h
          WHERE TRUE
            ${distrito !== 'Todos' ? sql`AND h.nome_distrito = ${distrito}` : sql``}
            ${setor   !== 'Todos' ? sql`AND h.nome_setor    = ${setor}`    : sql``}
        )` : sql``}
        ${ciclo !== 'Todos' && cicloList.length > 0
          ? sql`AND fv.ciclo IN (${sql.join(cicloList.map((c) => sql`${c}`), sql`, `)})`
          : sql``}
    )`;

    const result = await db.execute(sql`
      SELECT
        m.potencial,
        COUNT(DISTINCT m.crmuf)::integer AS total,
        COUNT(DISTINCT v.crmuf)::integer AS visitados
      FROM dim_medicos m
      ${territorioMedicoJoin}
      LEFT JOIN fato_visitas_fechado v
        ON v.crmuf = m.crmuf ${territorioVisitaWhere} ${cicloWhere}
      -- Mesma base da tabela de segmentação: ativo hoje OU visitado no ciclo.
      -- Potencial 0 (não classificado) segue fora por decisão do negócio — o
      -- foco da tela é segmentação, e os cards cobrem só as faixas 1..5.
      WHERE (m.status = TRUE OR ${visitadoNoCiclo})
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
  },
  1800,
);

// Distribuição do painel por segmentação da marca, com quantos médicos de cada
// bucket receberam ao menos uma visita no ciclo. Lê `fato_visitas_fechado` — só
// ciclo encerrado, igual às demais telas consolidadas.
//
// Base = médico ativo hoje OU médico visitado no ciclo selecionado, mesmo que
// já tenha saído do painel (regra: visita realizada sempre conta). Logo o total
// varia por ciclo — 15.655 no 202609, contra 15.627 de painel ativo.
//
// ATENÇÃO — não bate com a Cobertura da Visão Executiva, e é esperado:
// aqui a unidade é MÉDICO; lá é VISITA sobre `metas_ciclo.tamanho_painel`
// (painel vigente no ciclo). No ciclo 202609: 12.591/15.655 (80,4%) aqui
// contra 12.641/14.952 (84,5%) lá. A diferença de numerador são as 50
// revisitas (visita ≠ médico); a de denominador é painel atual vs do ciclo.
// Como `metas_ciclo` não tem dimensão de segmentação, o painel do ciclo não
// pode ser rateado por bucket — por isso esta tela usa a base de médicos.
export async function getSegmentacaoData(
  marcaId: number,
  classificacao: string = 'Todas',
  distrito: string = 'Todos',
  setor: string = 'Todos',
  ciclo: string = 'Todos',
  potencial: string = 'Todos'
) {
  await requireUser();
  return _getSegmentacaoDataCached(marcaId, classificacao, distrito, setor, ciclo, potencial);
}

const _getSegmentacaoDataCached = cacheLoader(
  ['segmentacao-data'],
  async (
    marcaId: number,
    classificacao: string,
    distrito: string,
    setor: string,
    ciclo: string,
    potencial: string,
  ) => {
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

    const classificacaoList = classificacao.split(',').map((c) => c.trim()).filter(Boolean);
    const classificacaoWhere = classificacao !== 'Todas' && classificacaoList.length > 0
      ? sql`AND TRIM(m.classificacao) IN (${sql.join(classificacaoList.map((c) => sql`${c}`), sql`, `)})`
      : sql``;

    const cicloList = dbCiclo.split(',').map((c) => c.trim()).filter(Boolean);
    const cicloWhere = ciclo !== 'Todos' && cicloList.length > 0
      ? sql`AND v.ciclo IN (${sql.join(cicloList.map((c) => sql`${c}`), sql`, `)})`
      : sql``;

    // Filtro de potencial (1..5). Aceita CSV ("1,2") via Ctrl+clique.
    const potencialList = potencial.split(',').map((p) => p.trim()).filter(Boolean);
    const potencialWhere = potencial !== 'Todos' && potencialList.length > 0
      ? sql`AND m.potencial IN (${sql.join(potencialList.map((p) => sql`${Number(p)}`), sql`, `)})`
      : sql``;

    // Mesmos filtros de visita do LEFT JOIN, mas com alias próprio para o
    // EXISTS que amplia a base (não dá para reusar os de alias `v`).
    const visitadoNoCiclo = sql`EXISTS (
      SELECT 1 FROM fato_visitas_fechado fv
      WHERE fv.crmuf = m.crmuf
        ${hasTerritorio ? sql`AND fv.cod_setor IN (
          SELECT h.cod_setor FROM dim_hierarquia h
          WHERE TRUE
            ${distrito !== 'Todos' ? sql`AND h.nome_distrito = ${distrito}` : sql``}
            ${setor   !== 'Todos' ? sql`AND h.nome_setor    = ${setor}`    : sql``}
        )` : sql``}
        ${ciclo !== 'Todos' && cicloList.length > 0
          ? sql`AND fv.ciclo IN (${sql.join(cicloList.map((c) => sql`${c}`), sql`, `)})`
          : sql``}
    )`;

    const resultRaw = await db.execute(sql`
      SELECT
        COALESCE(s.segmentacao, 'SEM SEGMENTAÇÃO') as label,
        COUNT(DISTINCT m.crmuf)::integer    as total_medicos,
        COUNT(DISTINCT v.crmuf)::integer    as medicos_visitados
      FROM dim_medicos m
      ${territorioMedicoJoin}
      LEFT JOIN fato_segmentacao s ON s.crmuf = m.crmuf AND s.id_marca = ${marcaId}
      LEFT JOIN fato_visitas_fechado v ON v.crmuf = m.crmuf ${territorioJoin} ${cicloWhere}
      -- Base = ativo hoje OU visitado no ciclo (mesmo já fora do painel).
      -- Visita realizada conta sempre; inativar o médico depois não apaga o
      -- trabalho feito. Como o inativo só entra se foi visitado, ele nunca cai
      -- em "não visitados" — essa coluna segue sendo só painel ativo.
      WHERE (m.status = TRUE OR ${visitadoNoCiclo})
        ${classificacaoWhere}
        ${potencialWhere}
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
  },
  1800,
);

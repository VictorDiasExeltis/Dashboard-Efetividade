'use server';

import { db } from '@/src/lib/db';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/src/lib/supabase/auth';
import { cacheLoader } from './_cache';

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
// em fato_visitas (auto-detectado) — mesma regra usada em getAnaliseDiaria.
// Quando o detalhe do ciclo atual subir, passa a usá-lo sozinho.
export async function getInsightsExtras(): Promise<InsightExtrasResult> {
  await requireUser();
  return _getInsightsExtrasCached();
}

// ── Marcas (para o filtro do card Visitação e Entrega de Amostras) ──────────
// Ordenadas por volume de amostras (a mais relevante vem primeiro → bom default).
export interface Marca { id_marca: number; nome_marca: string }

export async function getMarcas(): Promise<Marca[]> {
  await requireUser();
  return _getMarcasCached();
}

const _getMarcasCached = cacheLoader(
  ['marcas'],
  async (): Promise<Marca[]> => {
  try {
    if (!db) return [];
    const r = await db.execute(sql`
      SELECT mk.id_marca, mk.nome_marca
      FROM dim_marcas mk
      LEFT JOIN (
        SELECT p.id_marca, SUM(a.quantidade) AS tot
        FROM fato_amostras a JOIN dim_produtos p ON p.id_produto = a.id_produto
        GROUP BY p.id_marca
      ) v ON v.id_marca = mk.id_marca
      ORDER BY COALESCE(v.tot, 0) DESC, mk.nome_marca
    `);
    return r.map((x: any) => ({ id_marca: Number(x.id_marca), nome_marca: String(x.nome_marca) }));
  } catch (e) {
    console.error('getMarcas error:', e);
    return [];
  }
  },
  3600,
);

// ── Visitação e Entrega de Amostras — ranking por segmentação e classificação ──
// Período: ano corrente sem ciclo 1 (igual ao Desempenho de Visitação).
// A marca escolhida define a segmentação de cada médico (fato_segmentacao por
// crmuf+id_marca) E limita as amostras aos produtos daquela marca. Visitas não
// têm marca: são todas as do período/distrito, agrupadas pela segmentação que o
// médico tem NA marca escolhida. Classificação é atributo do médico (indep. de marca).
export interface RankItem { label: string; valor: number }
export interface VisitacaoEntregaResult {
  segVisitas: RankItem[];
  segAmostras: RankItem[];
  classVisitas: RankItem[];
  classAmostras: RankItem[];
}

export async function getVisitacaoEntregaAmostras(
  marcaId: number,
  distrito: string = 'Todos',
): Promise<VisitacaoEntregaResult> {
  await requireUser();
  return _getVisitacaoEntregaCached(marcaId, distrito);
}

const _getVisitacaoEntregaCached = cacheLoader(
  ['visitacao-entrega-amostras'],
  async (marcaId: number, distrito: string): Promise<VisitacaoEntregaResult> => {
  const vazio: VisitacaoEntregaResult = { segVisitas: [], segAmostras: [], classVisitas: [], classAmostras: [] };
  try {
    if (!db) return vazio;

    const distritoWhere = distrito !== 'Todos'
      ? sql`AND v.cod_setor IN (SELECT cod_setor FROM dim_hierarquia WHERE nome_distrito = ${distrito})`
      : sql``;
    // Ano corrente (do maior ciclo carregado) menos o ciclo 1.
    const periodo = sql`
      AND LEFT(v.ciclo, 4) = (SELECT LEFT(MAX(ciclo), 4) FROM fato_visitas_fechado)
      AND v.ciclo <> (SELECT LEFT(MAX(ciclo), 4) FROM fato_visitas_fechado) || '01'
    `;
    const seg   = sql`COALESCE(s.segmentacao, 'SEM SEGMENTAÇÃO')`;
    const clazz = sql`COALESCE(NULLIF(TRIM(m.classificacao), ''), 'NÃO CLASSIFICADO')`;

    const [segV, segA, classV, classA] = await Promise.all([
      db.execute(sql`
        SELECT ${seg} AS label, COUNT(*)::int AS valor
        FROM fato_visitas_fechado v
        LEFT JOIN fato_segmentacao s ON s.crmuf = v.crmuf AND s.id_marca = ${marcaId}
        WHERE TRUE ${periodo} ${distritoWhere}
        GROUP BY ${seg} ORDER BY valor DESC
      `),
      db.execute(sql`
        SELECT ${seg} AS label, COALESCE(SUM(a.quantidade), 0)::int AS valor
        FROM fato_amostras a
        JOIN fato_visitas_fechado v ON v.id_visita = a.id_visita
        JOIN dim_produtos p ON p.id_produto = a.id_produto AND p.id_marca = ${marcaId}
        LEFT JOIN fato_segmentacao s ON s.crmuf = v.crmuf AND s.id_marca = ${marcaId}
        WHERE TRUE ${periodo} ${distritoWhere}
        GROUP BY ${seg} ORDER BY valor DESC
      `),
      db.execute(sql`
        SELECT ${clazz} AS label, COUNT(*)::int AS valor
        FROM fato_visitas_fechado v
        JOIN dim_medicos m ON m.crmuf = v.crmuf
        WHERE TRUE ${periodo} ${distritoWhere}
        GROUP BY ${clazz} ORDER BY valor DESC
      `),
      db.execute(sql`
        SELECT ${clazz} AS label, COALESCE(SUM(a.quantidade), 0)::int AS valor
        FROM fato_amostras a
        JOIN fato_visitas_fechado v ON v.id_visita = a.id_visita
        JOIN dim_produtos p ON p.id_produto = a.id_produto AND p.id_marca = ${marcaId}
        JOIN dim_medicos m ON m.crmuf = v.crmuf
        WHERE TRUE ${periodo} ${distritoWhere}
        GROUP BY ${clazz} ORDER BY valor DESC
      `),
    ]);

    const map = (r: any[]): RankItem[] =>
      r.map((x) => ({ label: String(x.label), valor: Number(x.valor) || 0 })).filter((x) => x.valor > 0);
    return { segVisitas: map(segV), segAmostras: map(segA), classVisitas: map(classV), classAmostras: map(classA) };
  } catch (e) {
    console.error('getVisitacaoEntregaAmostras error:', e);
    return vazio;
  }
  },
  1800,
);

// ── Desempenho de Visitação — cobertura e MDV por setor no acumulado do ano ──
// Período: todos os ciclos do ano corrente EXCETO o ciclo 1 (atípico/lançamento).
//   cobertura = visitas / painel      (painel = SUM tamanho_painel, considerar=true)
//   mdv       = visitas / dias        (dias   = SUM dias_trabalhados, considerar=true)
// Só conta visita em (ciclo, setor) onde a meta é considerar=true — igual às
// funções get_cobertura_dinamica / get_mdv_dinamico usadas nos gráficos.
export interface SetorDesempenho {
  cod_setor: number;
  nome_setor: string;
  nome_distrito: string;
  nome_rep: string | null;
  cobertura: number | null;   // razão 0..1+ (null se sem painel)
  mdv: number | null;         // visitas/dia (null se sem dias)
  visitas: number;            // cru — para agregar por distrito
  painel: number;
  dias: number;
}

export interface DesempenhoVisitacaoResult {
  ano: string | null;
  cicloInicial: string | null;  // menor ciclo incluído (p/ rótulo)
  cicloFinal: string | null;    // maior ciclo incluído
  rows: SetorDesempenho[];
}

export async function getDesempenhoVisitacao(): Promise<DesempenhoVisitacaoResult> {
  await requireUser();
  return _getDesempenhoVisitacaoCached();
}

const _getDesempenhoVisitacaoCached = cacheLoader(
  ['desempenho-visitacao'],
  async (): Promise<DesempenhoVisitacaoResult> => {
  try {
    if (!db) return { ano: null, cicloInicial: null, cicloFinal: null, rows: [] };
    const result = await db.execute(sql`
      WITH ano AS (SELECT LEFT(MAX(ciclo), 4) AS y FROM fato_visitas_fechado),
      elig AS (
        SELECT m.cod_setor, m.ciclo,
               SUM(m.tamanho_painel)               AS painel,
               SUM(COALESCE(m.dias_trabalhados, 20)) AS dias
        FROM metas_ciclo m, ano
        WHERE m.considerar = TRUE
          AND LEFT(m.ciclo, 4) = ano.y
          AND m.ciclo <> ano.y || '01'
          AND m.ciclo IN (SELECT ciclo FROM ciclos_fechados)
        GROUP BY m.cod_setor, m.ciclo
      ),
      vis AS (
        SELECT fv.cod_setor, fv.ciclo, COUNT(*) AS visitas
        FROM fato_visitas_fechado fv, ano
        WHERE LEFT(fv.ciclo, 4) = ano.y
          AND fv.ciclo <> ano.y || '01'
        GROUP BY fv.cod_setor, fv.ciclo
      ),
      por_setor AS (
        SELECT e.cod_setor,
               SUM(COALESCE(v.visitas, 0)) AS visitas,
               SUM(e.painel)               AS painel,
               SUM(e.dias)                 AS dias
        FROM elig e
        LEFT JOIN vis v ON v.ciclo = e.ciclo AND v.cod_setor = e.cod_setor
        GROUP BY e.cod_setor
      )
      SELECT ps.cod_setor, h.nome_setor, h.nome_distrito, h.nome_rep,
             ps.visitas, ps.painel, ps.dias,
             CASE WHEN ps.painel > 0 THEN ps.visitas::numeric / ps.painel END AS cobertura,
             CASE WHEN ps.dias   > 0 THEN ps.visitas::numeric / ps.dias   END AS mdv,
             (SELECT MIN(ciclo) FROM elig) AS ciclo_ini,
             (SELECT MAX(ciclo) FROM elig) AS ciclo_fim,
             (SELECT y FROM ano)           AS ano
      FROM por_setor ps
      JOIN dim_hierarquia h ON h.cod_setor = ps.cod_setor
      ORDER BY h.nome_distrito, h.nome_setor
    `);

    const rows: SetorDesempenho[] = result.map((r: any) => ({
      cod_setor: Number(r.cod_setor),
      nome_setor: r.nome_setor ?? '—',
      nome_distrito: r.nome_distrito ?? '—',
      nome_rep: r.nome_rep ?? null,
      cobertura: r.cobertura != null ? Number(r.cobertura) : null,
      mdv: r.mdv != null ? Number(r.mdv) : null,
      visitas: Number(r.visitas) || 0,
      painel: Number(r.painel) || 0,
      dias: Number(r.dias) || 0,
    }));
    const first = result[0] as any;
    return {
      ano: first?.ano ?? null,
      cicloInicial: first?.ciclo_ini ?? null,
      cicloFinal: first?.ciclo_fim ?? null,
      rows,
    };
  } catch (e) {
    console.error('getDesempenhoVisitacao error:', e);
    return { ano: null, cicloInicial: null, cicloFinal: null, rows: [] };
  }
  },
  1800,
);

const _getInsightsExtrasCached = cacheLoader(
  ['insights-extras'],
  async (): Promise<InsightExtrasResult> => {
  try {
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
  },
  1800,
);

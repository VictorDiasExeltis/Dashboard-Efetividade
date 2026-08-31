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
  metaCobertura: number | null; // meta de cobertura em %, = 90% × (DU médio / 15)
  rows: SetorDesempenho[];
}

// ciclo: 'Todos' = acumulado do ano (todos os fechados exceto o 01); ou um
// ciclo fechado específico (ex.: '202607') para recortar a um único ciclo.
export async function getDesempenhoVisitacao(ciclo: string = 'Todos'): Promise<DesempenhoVisitacaoResult> {
  await requireUser();
  return _getDesempenhoVisitacaoCached(ciclo);
}

const _getDesempenhoVisitacaoCached = cacheLoader(
  ['desempenho-visitacao'],
  async (ciclo: string = 'Todos'): Promise<DesempenhoVisitacaoResult> => {
  try {
    if (!db) return { ano: null, cicloInicial: null, cicloFinal: null, metaCobertura: null, rows: [] };
    // O filtro do topo permite Ctrl+clique e entrega os ciclos como CSV
    // ("202608,202609"). Precisa virar lista: comparar com `=` contra o CSV
    // inteiro não casa com nada e o gráfico saía vazio a partir do 2º ciclo.
    const ciclosList = (ciclo ?? '')
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c && c !== 'Todos');
    const temCiclo = ciclosList.length > 0;
    const cicloInList = sql.join(ciclosList.map((c) => sql`${c}`), sql`, `);

    // Recorte de ciclo: os ciclos escolhidos OU o acumulado do ano sem o 01.
    const metaFiltro = temCiclo
      ? sql`AND m.ciclo IN (${cicloInList})`
      : sql`AND LEFT(m.ciclo, 4) = ano.y AND m.ciclo <> ano.y || '01'`;
    const visFiltro = temCiclo
      ? sql`AND fv.ciclo IN (${cicloInList})`
      : sql`AND LEFT(fv.ciclo, 4) = ano.y AND fv.ciclo <> ano.y || '01'`;
    const result = await db.execute(sql`
      WITH ano AS (SELECT LEFT(MAX(ciclo), 4) AS y FROM fato_visitas_fechado),
      elig AS (
        SELECT m.cod_setor, m.ciclo,
               SUM(m.tamanho_painel)               AS painel,
               SUM(COALESCE(m.dias_trabalhados, 20)) AS dias
        FROM metas_ciclo m, ano
        WHERE m.considerar = TRUE
          ${metaFiltro}
          AND m.ciclo IN (SELECT ciclo FROM ciclos_fechados)
        GROUP BY m.cod_setor, m.ciclo
      ),
      vis AS (
        SELECT fv.cod_setor, fv.ciclo, COUNT(*) AS visitas
        FROM fato_visitas_fechado fv, ano
        WHERE TRUE ${visFiltro}
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
             (SELECT y FROM ano)           AS ano,
             -- Meta de cobertura (%): 90% × (DU médio dos ciclos incluídos / 15),
             -- mesmo modelo da Análise de Ciclo (meta_pct = 0.90 × DU/15).
             (SELECT 0.90 * AVG(cnt) / 15.0 * 100
                FROM (SELECT COUNT(*)::numeric AS cnt
                      FROM dim_calendario c
                      WHERE c.ciclo IN (SELECT DISTINCT ciclo FROM elig)
                      GROUP BY c.ciclo) z)   AS meta_cob
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
      metaCobertura: first?.meta_cob != null ? Number(first.meta_cob) : null,
      rows,
    };
  } catch (e) {
    console.error('getDesempenhoVisitacao error:', e);
    return { ano: null, cicloInicial: null, cicloFinal: null, metaCobertura: null, rows: [] };
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

// ── Resumo automático (regras/templates, sem IA) ────────────────────────────
// Frases de destaque a partir da série cobertura/MDV por setor×ciclo (só ciclos
// fechados do ano, sem o 01). Determinístico e auditável — nenhuma chamada a
// modelo de IA em runtime.
export type ResumoDirecao = 'down' | 'up' | 'neutro';
export interface ResumoInsight {
  tipo:
    | 'queda_cobertura' | 'mdv_abaixo' | 'maior_queda' | 'maior_alta' | 'recuperacao'
    | 'painel_mudou' | 'reincidencia_abono' | 'abono_desempenho';
  direcao: ResumoDirecao;
  severidade: number;       // ordenação (maior primeiro, dentro do tipo)
  titulo: string;           // a frase pronta
  contexto: string | null;  // linha secundária (distrito · rep)
  distrito: string;         // p/ filtro client-side
}

export async function getInsightsResumo(): Promise<ResumoInsight[]> {
  await requireUser();
  return _getInsightsResumoCached();
}

const _getInsightsResumoCached = cacheLoader(
  ['insights-resumo'],
  async (): Promise<ResumoInsight[]> => {
  const META_COB = 90;    // % — meta de cobertura (mesma régua do gráfico de linha)
  const META_MDV = 10.8;  // meta de MDV
  try {
    if (!db) return [];
    const result = await db.execute(sql`
      WITH ano AS (SELECT LEFT(MAX(ciclo), 4) AS y FROM fato_visitas_fechado),
      elig AS (
        SELECT m.cod_setor, m.ciclo,
               SUM(m.tamanho_painel)                 AS painel,
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
        WHERE LEFT(fv.ciclo, 4) = ano.y AND fv.ciclo <> ano.y || '01'
        GROUP BY fv.cod_setor, fv.ciclo
      ),
      -- Abonos NÃO-estruturais (fora reunião/convenção/treinamento/feriado) por
      -- setor×ciclo — os que de fato tiram o rep do campo de forma individual.
      abo AS (
        SELECT a.cod_setor, c.ciclo, SUM(COALESCE(a.horas_abonadas, 0)) AS horas
        FROM fato_abonos a
        JOIN dim_calendario c ON c.data = a.data_abono
        WHERE a.motivo !~* 'REUNI|TREINAMENTO|CONVEN|FERIADO'
        GROUP BY a.cod_setor, c.ciclo
      )
      SELECT e.cod_setor, h.nome_setor, h.nome_distrito, h.nome_rep, e.ciclo,
             e.painel,
             CASE WHEN e.painel > 0 THEN COALESCE(v.visitas,0)::numeric / e.painel * 100 END AS cobertura,
             CASE WHEN e.dias   > 0 THEN COALESCE(v.visitas,0)::numeric / e.dias        END AS mdv,
             COALESCE(ab.horas, 0) AS horas_abono
      FROM elig e
      JOIN dim_hierarquia h ON h.cod_setor = e.cod_setor
      LEFT JOIN vis v  ON v.cod_setor  = e.cod_setor AND v.ciclo  = e.ciclo
      LEFT JOIN abo ab ON ab.cod_setor = e.cod_setor AND ab.ciclo = e.ciclo
      ORDER BY e.cod_setor, e.ciclo
    `);

    type Pt = { ciclo: string; cob: number | null; mdv: number | null; painel: number | null; horas: number };
    interface Setor { nome: string; distrito: string; rep: string | null; serie: Pt[] }
    const setores = new Map<number, Setor>();
    for (const r of result as any[]) {
      const cod = Number(r.cod_setor);
      let s = setores.get(cod);
      if (!s) { s = { nome: r.nome_setor ?? '—', distrito: r.nome_distrito ?? '—', rep: r.nome_rep ?? null, serie: [] }; setores.set(cod, s); }
      s.serie.push({
        ciclo: String(r.ciclo),
        cob: r.cobertura != null ? Number(r.cobertura) : null,
        mdv: r.mdv != null ? Number(r.mdv) : null,
        painel: r.painel != null ? Number(r.painel) : null,
        horas: Number(r.horas_abono) || 0,
      });
    }
    for (const s of setores.values()) s.serie.sort((a, b) => a.ciclo.localeCompare(b.ciclo));
    const maxCiclo = [...setores.values()].flatMap((s) => s.serie.map((p) => p.ciclo)).reduce((m, c) => (c > m ? c : m), '');

    const fmtCiclo = (c: string) => `Ciclo ${c.slice(-2)}`;
    const pp = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}pp`;
    const insights: ResumoInsight[] = [];

    for (const s of setores.values()) {
      const ctx = s.rep ? `${s.distrito} · ${s.rep}` : s.distrito;
      const cs = s.serie.filter((p) => p.cob != null).map((p) => ({ ciclo: p.ciclo, v: p.cob as number }));
      const ms = s.serie.filter((p) => p.mdv != null).map((p) => ({ ciclo: p.ciclo, v: p.mdv as number }));

      // Queda de cobertura: quedas consecutivas terminando no ciclo mais recente.
      if (cs.length >= 3) {
        let k = cs.length - 1, quedas = 0;
        while (k > 0 && cs[k].v < cs[k - 1].v) { quedas++; k--; }
        if (quedas >= 2) {
          const ini = cs[cs.length - 1 - quedas], last = cs[cs.length - 1];
          const delta = last.v - ini.v;
          insights.push({
            tipo: 'queda_cobertura', direcao: 'down', severidade: Math.abs(delta) + quedas * 2,
            titulo: `${s.nome}: cobertura em queda desde o ${fmtCiclo(ini.ciclo)} (${Math.round(ini.v)}% → ${Math.round(last.v)}%, ${pp(delta)}).`,
            contexto: ctx, distrito: s.distrito,
          });
        }
      }

      // MDV: só sinaliza quando PIOROU recente (cruzou abaixo da meta ou vem
      // caindo) — evita o ruído do setor cronicamente baixo e estável.
      if (ms.length >= 3) {
        const last = ms[ms.length - 1];
        const ref = ms[ms.length - 3];   // 2 ciclos antes
        const f = (v: number) => v.toFixed(1).replace('.', ',');
        if (last.v < META_MDV && (last.v < ref.v - 0.2 || ref.v >= META_MDV)) {
          const cruzou = ref.v >= META_MDV;   // estava na meta e caiu
          insights.push({
            tipo: 'mdv_abaixo', direcao: 'down', severidade: (META_MDV - last.v) + Math.abs(last.v - ref.v) * 2,
            titulo: cruzou
              ? `${s.nome}: MDV caiu abaixo da meta (10,8) — ${f(ref.v)} → ${f(last.v)} no ${fmtCiclo(last.ciclo)}.`
              : `${s.nome}: MDV em queda, ${f(ref.v)} → ${f(last.v)} (abaixo da meta 10,8).`,
            contexto: ctx, distrito: s.distrito,
          });
        }
      }

      // Recuperação: voltou acima da meta no último ciclo após ≥2 abaixo.
      if (cs.length >= 3 && cs[cs.length - 1].v >= META_COB) {
        let k = cs.length - 2, abaixo = 0;
        while (k >= 0 && cs[k].v < META_COB) { abaixo++; k--; }
        if (abaixo >= 2) {
          insights.push({
            tipo: 'recuperacao', direcao: 'up', severidade: abaixo,
            titulo: `${s.nome}: recuperou — cobertura voltou acima da meta no ${fmtCiclo(cs[cs.length - 1].ciclo)} após ${abaixo} ciclos abaixo.`,
            contexto: ctx, distrito: s.distrito,
          });
        }
      }

      // A5 — Painel mudou: variação relevante do tamanho do painel (muda a base
      // de comparação; contextualiza quedas/altas de cobertura).
      const psrie = s.serie.filter((p) => p.painel != null).map((p) => p.painel as number);
      if (psrie.length >= 3) {
        const lastP = psrie[psrie.length - 1], refP = psrie[psrie.length - 3];
        const dv = lastP - refP, rel = refP > 0 ? dv / refP : 0;
        if (Math.abs(dv) >= 20 && Math.abs(rel) >= 0.15) {
          insights.push({
            tipo: 'painel_mudou', direcao: 'neutro', severidade: Math.abs(rel) * 10,
            titulo: `${s.nome}: painel ${dv > 0 ? 'cresceu' : 'encolheu'} de ${refP} → ${lastP} médicos (${dv > 0 ? '+' : ''}${Math.round(dv)}, ${Math.round(rel * 100)}%) — muda a base de comparação.`,
            contexto: ctx, distrito: s.distrito,
          });
        }
      }

      // B8 — Reincidência de abono: ciclos SEGUIDOS com abono não-estrutural.
      let ka = s.serie.length - 1, streak = 0, horasStreak = 0;
      while (ka >= 0 && s.serie[ka].horas > 0) { streak++; horasStreak += s.serie[ka].horas; ka--; }
      if (streak >= 3) {
        insights.push({
          tipo: 'reincidencia_abono', direcao: 'neutro', severidade: streak + horasStreak / 50,
          titulo: `${s.nome}: abonos recorrentes — ${streak} ciclos seguidos com abono não-estrutural (${Math.round(horasStreak)}h no total).`,
          contexto: ctx, distrito: s.distrito,
        });
      }

      // B10 — Abono explica queda: cobertura caindo E abono nos ciclos recentes.
      if (cs.length >= 3) {
        const cobDelta = cs[cs.length - 1].v - cs[cs.length - 3].v;
        const ult3 = s.serie.slice(-3);
        const nAbono = ult3.filter((p) => p.horas > 0).length;
        const horas3 = ult3.reduce((a, p) => a + p.horas, 0);
        if (cobDelta <= -5 && nAbono >= 2) {
          insights.push({
            tipo: 'abono_desempenho', direcao: 'down', severidade: Math.abs(cobDelta) + nAbono * 3 + horas3 / 50,
            titulo: `${s.nome}: cobertura em queda (${pp(cobDelta)}) e ${nAbono} dos últimos 3 ciclos com abono (${Math.round(horas3)}h) — abono pode explicar.`,
            contexto: ctx, distrito: s.distrito,
          });
        }
      }
    }

    // Agregações no ciclo mais recente: maior queda + setores abaixo por distrito.
    let pior: { nome: string; distrito: string; delta: number } | null = null;
    let melhor: { nome: string; distrito: string; delta: number } | null = null;
    for (const s of setores.values()) {
      const cs = s.serie.filter((p) => p.cob != null).map((p) => ({ ciclo: p.ciclo, v: p.cob as number }));
      if (cs.length < 2) continue;
      const last = cs[cs.length - 1];
      if (last.ciclo !== maxCiclo) continue;
      const delta = last.v - cs[cs.length - 2].v;
      if (delta < 0 && (!pior || delta < pior.delta)) pior = { nome: s.nome, distrito: s.distrito, delta };
      if (delta > 0 && (!melhor || delta > melhor.delta)) melhor = { nome: s.nome, distrito: s.distrito, delta };
    }
    if (pior) insights.push({
      tipo: 'maior_queda', direcao: 'down', severidade: Math.abs(pior.delta) + 5,
      titulo: `Maior queda do ${fmtCiclo(maxCiclo)}: ${pior.nome} (${pp(pior.delta)} de cobertura vs ciclo anterior).`,
      contexto: pior.distrito, distrito: pior.distrito,
    });
    if (melhor) insights.push({
      tipo: 'maior_alta', direcao: 'up', severidade: melhor.delta + 5,
      titulo: `Maior alta do ${fmtCiclo(maxCiclo)}: ${melhor.nome} (${pp(melhor.delta)} de cobertura vs ciclo anterior).`,
      contexto: melhor.distrito, distrito: melhor.distrito,
    });

    // Seleção balanceada: garante que cada tipo apareça (recuperação e visão por
    // distrito não ficam soterradas por quedas/MDV). Exibe por prioridade + severidade.
    const prio: Record<ResumoInsight['tipo'], number> = {
      abono_desempenho: 9, queda_cobertura: 8, maior_queda: 7, mdv_abaixo: 6,
      reincidencia_abono: 5, maior_alta: 4, painel_mudou: 3, recuperacao: 1,
    };
    const topN = (t: ResumoInsight['tipo'], n: number) =>
      insights.filter((i) => i.tipo === t).sort((a, b) => b.severidade - a.severidade).slice(0, n);
    const sel = [
      ...topN('abono_desempenho', 3),
      ...topN('queda_cobertura', 4),
      ...topN('maior_queda', 1),
      ...topN('maior_alta', 1),
      ...topN('mdv_abaixo', 3),
      ...topN('reincidencia_abono', 3),
      ...topN('painel_mudou', 2),
      ...topN('recuperacao', 2),
    ];
    sel.sort((a, b) => (prio[b.tipo] - prio[a.tipo]) || (b.severidade - a.severidade));
    return sel;
  } catch (e) {
    console.error('getInsightsResumo error:', e);
    return [];
  }
  },
  1800,
);

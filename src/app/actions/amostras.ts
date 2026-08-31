'use server';

import { db } from '@/src/lib/db';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/src/lib/supabase/auth';
import { cacheLoader } from './_cache';

// Fragmentos de filtro da tela de Entrega de Amostras, compartilhados entre os
// gráficos (getAmostrasData) e os recortes detalhados. Mesma razão da tela de
// Segmentação: se o detalhe reescrever os filtros, ele diverge do gráfico e os
// dois números perdem credibilidade juntos.
function predicadosAmostras(
  distrito: string,
  setor: string,
  ciclo: string,
  produto: string,
) {
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

  return {
    cicloInList, produtoInList, hasCiclo, hasProduto,
    territorioJoin, cicloJoin, produtoJoin, territorioMedicoJoin,
    territorioFiltro, cicloFiltro, produtoFiltro,
  };
}

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

    const {
      cicloInList, produtoInList, hasCiclo, hasProduto,
      territorioJoin, cicloJoin, produtoJoin, territorioMedicoJoin,
      territorioFiltro, cicloFiltro, produtoFiltro,
    } = predicadosAmostras(distrito, setor, ciclo, produto);

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
        -- "NÃO CLASSIFICADO" sempre por último (à direita no gráfico); as demais
        -- seguem alfabéticas. Mesmo critério do gráfico de segmentação ao lado,
        -- que já joga "SEM SEGMENTAÇÃO" para o fim. O ILIKE com "_" no lugar do
        -- "Ã" tolera a variante sem acento, caso a origem mude.
        ORDER BY CASE WHEN TRIM(m.classificacao) ILIKE 'N_O CLASSIFICADO' THEN 1 ELSE 0 END,
                 TRIM(m.classificacao)
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

// ---------------------------------------------------------------------------
// Recortes detalhados — as listas por trás dos dois gráficos
// ---------------------------------------------------------------------------

export interface MedicoAmostra {
  crmuf: string;
  nome_medico: string;
  nome_setor: string;
  nome_distrito: string;
  classificacao: string | null;
  segmentacao: string;
  amostras: number;
  visitas: number;
  // Endereço — vai só para o Excel exportado (ver somenteExport no RecorteModal).
  estado: string | null;
  municipio: string | null;
  bairro: string | null;
  cep: string | null;
}

export interface RecorteAmostras {
  linhas: MedicoAmostra[];
  total: number;
  totalGeral: number;
}

export interface FiltrosRecorteAmostras {
  segmentacao?: string;
  classificacao?: string;
  busca?: string;
  limit?: number;   // 0 = sem limite (exportação)
  offset?: number;
}

// Recorte do gráfico "Média de Amostras vs. Médicos por SEGMENTAÇÃO".
//
// A unidade aqui é MÉDICO × SEGMENTAÇÃO, não médico: a segmentação vem da marca
// do produto efetivamente entregue, então quem recebeu de duas marcas aparece
// em duas linhas — exatamente como o gráfico conta. Somar a coluna de médicos
// do gráfico dá mais que o total de médicos distintos, e isso é esperado.
//
// Base = entregas (fato_amostras). Médico sem amostra não aparece.
export async function getAmostrasRecortePorSegmentacao(
  distrito: string = 'Todos',
  setor: string = 'Todos',
  ciclo: string = 'Todos',
  produto: string = 'Todos',
  filtros: FiltrosRecorteAmostras = {},
): Promise<RecorteAmostras> {
  await requireUser();
  if (!db) return { linhas: [], total: 0, totalGeral: 0 };

  try {
    const p = predicadosAmostras(distrito, setor, ciclo, produto);

    const porLinha = sql`
      SELECT
        v.crmuf,
        MAX(m.nome_medico)                          AS nome_medico,
        MAX(h.nome_setor)                           AS nome_setor,
        MAX(h.nome_distrito)                        AS nome_distrito,
        MAX(TRIM(m.classificacao))                  AS classificacao,
        COALESCE(s.segmentacao, 'SEM SEGMENTAÇÃO')  AS segmentacao,
        SUM(a.quantidade)::integer                  AS amostras,
        COUNT(DISTINCT v.id_visita)::integer        AS visitas,
        MAX(m.estado)                               AS estado,
        MAX(m.municipio)                            AS municipio,
        MAX(m.bairro)                               AS bairro,
        MAX(m.cep)                                  AS cep
      FROM fato_amostras a
      INNER JOIN fato_visitas  v ON v.id_visita = a.id_visita
      INNER JOIN dim_produtos  p ON p.id_produto = a.id_produto
      LEFT  JOIN fato_segmentacao s
        ON s.crmuf = v.crmuf AND s.id_marca = p.id_marca
      LEFT  JOIN dim_medicos    m ON m.crmuf = v.crmuf
      LEFT  JOIN dim_hierarquia h ON h.cod_setor = v.cod_setor
      WHERE TRUE
        ${p.territorioFiltro}
        ${p.cicloFiltro}
        ${p.produtoFiltro}
      GROUP BY v.crmuf, COALESCE(s.segmentacao, 'SEM SEGMENTAÇÃO')
    `;

    return await paginarRecorte(porLinha, filtros, 'segmentacao');
  } catch (e) {
    console.error('getAmostrasRecortePorSegmentacao error:', e);
    return { linhas: [], total: 0, totalGeral: 0 };
  }
}

// Recorte do gráfico "Média de Amostras vs. Médicos por CLASSIFICAÇÃO MÉDICA".
//
// Base = painel ativo, igual ao gráfico. O gráfico conta em cada classificação
// só os médicos que receberam amostra, então a lista também traz só esses — é
// o que faz o total do recorte fechar com a barra. Quem não recebeu fica de
// fora por construção, não por esquecimento.
export async function getAmostrasRecortePorClassificacao(
  distrito: string = 'Todos',
  setor: string = 'Todos',
  ciclo: string = 'Todos',
  produto: string = 'Todos',
  filtros: FiltrosRecorteAmostras = {},
): Promise<RecorteAmostras> {
  await requireUser();
  if (!db) return { linhas: [], total: 0, totalGeral: 0 };

  try {
    const p = predicadosAmostras(distrito, setor, ciclo, produto);

    const porLinha = sql`
      SELECT
        m.crmuf,
        MAX(m.nome_medico)                   AS nome_medico,
        MAX(hm.nome_setor)                   AS nome_setor,
        MAX(hm.nome_distrito)                AS nome_distrito,
        TRIM(m.classificacao)                AS classificacao,
        '—'                                  AS segmentacao,
        COALESCE(SUM(a.quantidade), 0)::integer AS amostras,
        COUNT(DISTINCT v.id_visita)::integer    AS visitas,
        MAX(m.estado)                           AS estado,
        MAX(m.municipio)                        AS municipio,
        MAX(m.bairro)                           AS bairro,
        MAX(m.cep)                              AS cep
      FROM dim_medicos m
      LEFT JOIN dim_hierarquia hm ON hm.cod_setor = m.cod_setor
      LEFT JOIN fato_visitas  v ON v.crmuf     = m.crmuf ${p.territorioJoin} ${p.cicloJoin}
      LEFT JOIN fato_amostras a ON a.id_visita = v.id_visita ${p.produtoJoin}
      WHERE m.status = TRUE
        AND m.classificacao IS NOT NULL AND TRIM(m.classificacao) <> ''
      GROUP BY m.crmuf, TRIM(m.classificacao)
      -- Mesmo recorte da barra: só quem efetivamente recebeu amostra.
      HAVING COUNT(a.id_visita) > 0
    `;

    return await paginarRecorte(porLinha, filtros, 'classificacao');
  } catch (e) {
    console.error('getAmostrasRecortePorClassificacao error:', e);
    return { linhas: [], total: 0, totalGeral: 0 };
  }
}

// Aplica filtros do modal, busca e paginação sobre a consulta já agregada por
// linha. Comum aos dois recortes: só muda a dimensão que o modal filtra.
async function paginarRecorte(
  porLinha: ReturnType<typeof sql>,
  filtros: FiltrosRecorteAmostras,
  dimensao: 'segmentacao' | 'classificacao',
): Promise<RecorteAmostras> {
  const alvo = dimensao === 'segmentacao' ? filtros.segmentacao : filtros.classificacao;
  const temDimensao = Boolean(alvo && alvo !== 'Todas' && alvo !== 'Todos');
  const dimWhere = temDimensao
    ? (dimensao === 'segmentacao'
        ? sql`AND r.segmentacao = ${alvo}`
        : sql`AND r.classificacao = ${alvo}`)
    : sql``;

  const termo = (filtros.busca ?? '').trim();
  const buscaWhere = termo
    ? sql`AND (r.nome_medico ILIKE ${'%' + termo + '%'} OR r.crmuf ILIKE ${'%' + termo + '%'})`
    : sql``;

  const limite = filtros.limit ?? 100;
  const offset = Math.max(filtros.offset ?? 0, 0);
  const paginacao = limite > 0
    ? sql`LIMIT ${Math.min(limite, 20000)} OFFSET ${offset}`
    : sql``;

  const temFiltro = temDimensao || termo !== '';

  // COUNT(*) OVER () traz o total do recorte na mesma passada das linhas — a
  // janela é calculada antes do LIMIT. Evita repetir a consulta só para contar,
  // o que importa aqui: sem filtro de território a agregação varre ~270 mil
  // amostras e leva ~4s. Rodá-la três vezes (linhas + total + total geral)
  // multiplicava isso por três.
  const [linhasRaw, geralRaw] = await Promise.all([
    db!.execute(sql`
      WITH por_linha AS (${porLinha})
      SELECT r.*, COUNT(*) OVER ()::integer AS _total
      FROM por_linha r
      WHERE TRUE ${dimWhere} ${buscaWhere}
      -- crmuf desempata: sem ele, homônimos têm ordem indefinida entre
      -- páginas, e uma linha pode repetir ou sumir.
      ORDER BY r.nome_medico, r.crmuf ${paginacao}
    `),
    // Sem filtro do modal, o total geral é o próprio total — não vale outra
    // varredura só para repetir o mesmo número.
    temFiltro
      ? db!.execute(sql`WITH por_linha AS (${porLinha}) SELECT COUNT(*)::integer AS n FROM por_linha`)
      : Promise.resolve(null),
  ]);

  const linhas = linhasRaw as any[];
  const total = linhas.length ? Number(linhas[0]._total) || 0 : 0;
  const totalGeral = geralRaw ? Number((geralRaw[0] as any)?.n) || 0 : total;

  return {
    linhas: linhas.map((r) => ({
      crmuf: String(r.crmuf),
      nome_medico: String(r.nome_medico ?? ''),
      nome_setor: String(r.nome_setor ?? ''),
      nome_distrito: String(r.nome_distrito ?? ''),
      classificacao: r.classificacao ?? null,
      segmentacao: String(r.segmentacao ?? '—'),
      amostras: Number(r.amostras) || 0,
      visitas: Number(r.visitas) || 0,
      estado: r.estado ?? null,
      municipio: r.municipio ?? null,
      bairro: r.bairro ?? null,
      cep: r.cep ?? null,
    })),
    total,
    totalGeral,
  };
}

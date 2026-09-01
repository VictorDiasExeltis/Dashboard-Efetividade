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
// ciclo: 'Todos' = usa a janela de `periodo`; um ciclo específico (ex.: '202607')
// colapsa a janela àquele único ciclo (filtro de Insights).
//
// periodo: tamanho da janela de "abandono" quando ciclo = 'Todos'.
//   '3' | '6' = os N ciclos mais recentes
//   'ano'     = todos os ciclos do ano do ciclo mais recente
// A janela funciona ao contrário do que parece: quanto MAIOR, MENOR a lista —
// passar 6 ciclos sem nenhuma visita é mais raro que passar 3. Medido em 31/08:
// 3 ciclos = 280 médicos, 6 = 97, ano = 60.
//
// Janela de 1 ciclo NÃO é aceita, de propósito: ela devolvia 2.426 médicos, que
// é apenas o complemento da cobertura do ciclo (15.630 ativos − 12.591
// visitados no 202609). Ficar de fora de um ciclo é operação normal, não
// abandono. Um link antigo com `?periodo=1` cai no padrão de 3.
export async function getMedicosNaoVisitados(
  distrito: string = 'Todos',
  setor:    string = 'Todos',
  soFechado: boolean = false,
  ciclo:     string = 'Todos',
  periodo:   string = '3',
): Promise<MedicoNaoVisitado[]> {
  await requireUser();
  return fetchMedicosNaoVisitadosCached(distrito, setor, soFechado, ciclo, periodo);
}

const fetchMedicosNaoVisitadosCached = unstable_cache(
  async (distrito: string, setor: string, soFechado: boolean, ciclo: string, periodo: string): Promise<MedicoNaoVisitado[]> => {
  try {
    if (!db) return [];

    // Fonte de visitas e janela de ciclos conforme o modo.
    const fv = soFechado ? sql`fato_visitas_fechado` : sql`fato_visitas`;

    // Origem dos ciclos: a lista de fechados ou os ciclos com meta carregada.
    const origemCiclos = soFechado
      ? sql`SELECT ciclo FROM ciclos_fechados`
      : sql`SELECT DISTINCT ciclo FROM metas_ciclo`;

    // Só 3 e 6 são aceitos; qualquer outro valor cai em 3 (o padrão histórico
    // da tela). Evita que um parâmetro de URL vire LIMIT arbitrário.
    const n = periodo === '6' ? 6 : 3;

    const janela = periodo === 'ano'
      // Ano do ciclo mais recente — os 4 primeiros dígitos de "AAAANN". Hoje
      // toda a base é 2026, então isto equivale a "todos"; passa a diferir de
      // "últimos 6" quando o primeiro ciclo de 2027 entrar.
      ? sql`SELECT ciclo FROM (${origemCiclos}) c
            WHERE LEFT(ciclo, 4) = (SELECT LEFT(MAX(ciclo), 4) FROM (${origemCiclos}) c2)`
      : sql`SELECT ciclo FROM (${origemCiclos}) c ORDER BY ciclo DESC LIMIT ${n}`;

    // Um ciclo específico vence a janela (usado pela tela de Insights).
    const ciclos3 = (!!ciclo && ciclo !== 'Todos')
      ? sql`SELECT ${ciclo}::varchar AS ciclo`
      : janela;


    // Setor fora do consolidado na MAIORIA dos ciclos da janela nao entra na
    // lista: se ele nao conta para cobertura, seus medicos nao sao alvo de
    // retomada. Criterio de maioria porque `considerar` varia entre ciclos —
    // dos 5 setores fora hoje, nenhum esta fora nos tres.
    // NOT EXISTS (e nao NOT IN) para ser seguro se cod_setor for nulo.
    const setorConsideradoWhere = sql`
      AND NOT EXISTS (
        SELECT 1 FROM metas_ciclo mc_c
        WHERE mc_c.cod_setor = m.cod_setor
          AND mc_c.ciclo IN (${ciclos3})
        GROUP BY mc_c.cod_setor
        HAVING COUNT(*) FILTER (WHERE mc_c.considerar IS FALSE)
             > COUNT(*) FILTER (WHERE mc_c.considerar IS TRUE)
      )`;
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
        -- Endereço: só aparece no Excel exportado, não na tabela da tela.
        m.estado,
        m.municipio,
        m.bairro,
        m.cep,
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
        -- Sem visita em nenhum ciclo da janela (a "janela de abandono")
        AND NOT EXISTS (
          SELECT 1 FROM ${fv} v
          WHERE v.crmuf = m.crmuf
            AND v.ciclo IN (${ciclos3})
        )
        -- Incluído no painel ANTES da janela. Acompanha o período escolhido:
        -- sem isso, ampliar para 6 ciclos faria médico novo aparecer como
        -- abandonado, já que ele não teve como ser visitado nos ciclos antigos.
        AND (m.data_inclusao IS NULL OR m.data_inclusao < (
          SELECT MIN(c.data)
          FROM public.dim_calendario c
          WHERE c.ciclo IN (${ciclos3})
        ))
        ${territorioExists}
        ${setorConsideradoWhere}
      GROUP BY m.crmuf, m.nome_medico, m.classificacao, m.especialidade, m.score, m.potencial, h_med.nome_setor, h_med.nome_distrito,
               m.estado, m.municipio, m.bairro, m.cep
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
      estado:        r.estado        ?? null,
      municipio:     r.municipio     ?? null,
      bairro:        r.bairro        ?? null,
      cep:           r.cep           ?? null,
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
// `periodo` precisa ser o MESMO da lista: as duas regras que dependem da janela
// (médico incluído antes dela, setor considerado na maioria dela) entram aqui
// também. Com janelas diferentes, a Taxa de Abandono compararia uma lista de 6
// ciclos contra um denominador de 3.
export async function getTotalMedicosAtivosTerritorio(
  distrito: string = 'Todos',
  setor:    string = 'Todos',
  periodo:  string = '3',
): Promise<number> {
  await requireUser();
  return _getTotalMedicosAtivosCached(distrito, setor, periodo);
}

const _getTotalMedicosAtivosCached = cacheLoader(
  ['total-medicos-ativos'],
  async (distrito: string, setor: string, periodo: string): Promise<number> => {
  try {
    if (!db) return 0;

    const n = periodo === '6' ? 6 : 3;
    const janela = periodo === 'ano'
      ? sql`SELECT ciclo FROM (SELECT DISTINCT ciclo FROM metas_ciclo) c
            WHERE LEFT(ciclo, 4) = (SELECT LEFT(MAX(ciclo), 4) FROM metas_ciclo)`
      : sql`SELECT DISTINCT ciclo FROM metas_ciclo ORDER BY ciclo DESC LIMIT ${n}`;

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
        -- Incluído antes da janela — mesma regra da lista.
        AND (m.data_inclusao IS NULL OR m.data_inclusao < (
          SELECT MIN(c.data)
          FROM public.dim_calendario c
          WHERE c.ciclo IN (${janela})
        ))
        ${territorioExists}
        -- Mesmo criterio da lista: setor fora do consolidado na maioria dos
        -- ciclos da janela nao entra, para o total e a lista falarem da
        -- mesma base.
        AND NOT EXISTS (
          SELECT 1 FROM metas_ciclo mc_c
          WHERE mc_c.cod_setor = m.cod_setor
            AND mc_c.ciclo IN (${janela})
          GROUP BY mc_c.cod_setor
          HAVING COUNT(*) FILTER (WHERE mc_c.considerar IS FALSE)
               > COUNT(*) FILTER (WHERE mc_c.considerar IS TRUE)
        )
    `);

    return Number((result[0] as any)?.total ?? 0);
  } catch (e) {
    console.error('getTotalMedicosAtivosTerritorio error:', e);
    return 0;
  }
  },
  1800,
);

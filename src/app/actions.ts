'use server';

import { db } from '@/src/lib/db';
import { produtividade_ciclo } from '@/src/lib/db/schema';
import { sql, eq, and, inArray } from 'drizzle-orm';

export async function getExecutiveMetrics(
  ciclo: string = 'Todos',
  distrito: string = 'Todos',
  estrutura: string = 'Distrito',
  setor: string = 'Todos'
) {
  const ciclosDisponiveis = ['CICLO 01', 'CICLO 02', 'CICLO 03'];
  
  // Trata ciclos selecionados (pode vir como "CICLO 01,CICLO 03" ou "Todos")
  const selectedCycles = ciclo === 'Todos' 
    ? ciclosDisponiveis 
    : ciclo.split(',').filter(Boolean);

  try {
    if (!db) {
      throw new Error("Database not connected");
    }

    const metricsWhere = (cycles: string[]) => and(
      inArray(produtividade_ciclo.ciclo, cycles),
      distrito !== 'Todos' ? eq(produtividade_ciclo.distrito, distrito) : undefined,
      estrutura === 'Setor' && setor !== 'Todos'
        ? eq(produtividade_ciclo.setor_cliente, setor)
        : undefined,
    );

    const getMetrics = (cycles: string[]) => db.select({
      cobertura: sql<number>`SUM(${produtividade_ciclo.vis_total})::float / NULLIF(SUM(${produtividade_ciclo.cad_final_ciclo}), 0) * 100`,
      mdv:       sql<number>`SUM(${produtividade_ciclo.vis_total})::float / NULLIF(SUM(${produtividade_ciclo.dias_trab}), 0)`,
      visitasTotais: sql<number>`SUM(${produtividade_ciclo.vis_total})`,
      contatos:      sql<number>`SUM(${produtividade_ciclo.vis_total})`, // Usando vis_total pois não há campo de médicos únicos neste nível de agregação
    }).from(produtividade_ciclo).where(metricsWhere(cycles));

    const brasilWhere = (cycles: string[]) => inArray(produtividade_ciclo.ciclo, cycles);

    const getBrasilMetrics = (cycles: string[]) => db.select({
      cobertura: sql<number>`SUM(${produtividade_ciclo.vis_total})::float / NULLIF(SUM(${produtividade_ciclo.cad_final_ciclo}), 0) * 100`,
      mdv:       sql<number>`SUM(${produtividade_ciclo.vis_total})::float / NULLIF(SUM(${produtividade_ciclo.dias_trab}), 0)`,
    }).from(produtividade_ciclo).where(brasilWhere(cycles));

    const [m01Result, m02Result, m03Result, mSelectedResult, mBrasilSelectedResult] = await Promise.all([
      getMetrics(['CICLO 01']).catch(() => []),
      getMetrics(['CICLO 02']).catch(() => []),
      getMetrics(['CICLO 03']).catch(() => []),
      getMetrics(selectedCycles).catch(() => []),
      getBrasilMetrics(selectedCycles).catch(() => []),
    ]);

    const m01 = m01Result[0];
    const m02 = m02Result[0];
    const m03 = m03Result[0];
    const mSelected = mSelectedResult[0];
    const mBrasilSelected = mBrasilSelectedResult[0];

    // Gráfico: agrupa por Setor ou por Distrito conforme estrutura
    let chartDataPromise;

    const selectFields = {
      name: estrutura === 'Setor' ? produtividade_ciclo.setor_cliente : produtividade_ciclo.distrito,
      ciclo01: sql<number>`SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 01' THEN ${produtividade_ciclo.vis_total} ELSE 0 END)::float / NULLIF(SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 01' THEN ${produtividade_ciclo.cad_final_ciclo} ELSE 0 END), 0) * 100`,
      ciclo02: sql<number>`SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 02' THEN ${produtividade_ciclo.vis_total} ELSE 0 END)::float / NULLIF(SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 02' THEN ${produtividade_ciclo.cad_final_ciclo} ELSE 0 END), 0) * 100`,
      ciclo03: sql<number>`SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 03' THEN ${produtividade_ciclo.vis_total} ELSE 0 END)::float / NULLIF(SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 03' THEN ${produtividade_ciclo.cad_final_ciclo} ELSE 0 END), 0) * 100`,
      mdv01:   sql<number>`SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 01' THEN ${produtividade_ciclo.vis_total} ELSE 0 END)::float / NULLIF(SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 01' THEN ${produtividade_ciclo.dias_trab} ELSE 0 END), 0)`,
      mdv02:   sql<number>`SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 02' THEN ${produtividade_ciclo.vis_total} ELSE 0 END)::float / NULLIF(SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 02' THEN ${produtividade_ciclo.dias_trab} ELSE 0 END), 0)`,
      mdv03:   sql<number>`SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 03' THEN ${produtividade_ciclo.vis_total} ELSE 0 END)::float / NULLIF(SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 03' THEN ${produtividade_ciclo.dias_trab} ELSE 0 END), 0)`,
    };

    if (estrutura === 'Setor') {
      const distritoEfetivo = distrito !== 'Todos' ? distrito : 'MG/CO';
      chartDataPromise = db.select(selectFields)
      .from(produtividade_ciclo)
      .where(and(
        eq(produtividade_ciclo.distrito, distritoEfetivo),
        setor !== 'Todos' ? eq(produtividade_ciclo.setor_cliente, setor) : undefined,
      ))
      .groupBy(produtividade_ciclo.setor_cliente)
      .orderBy(produtividade_ciclo.setor_cliente);
    } else {
      chartDataPromise = db.select(selectFields)
      .from(produtividade_ciclo)
      .where(and(
        distrito !== 'Todos' ? eq(produtividade_ciclo.distrito, distrito) : undefined
      ))
      .groupBy(produtividade_ciclo.distrito)
      .orderBy(produtividade_ciclo.distrito);
    }

    const setoresPromise =
      estrutura === 'Setor' && distrito !== 'Todos'
        ? db.selectDistinct({ setor: produtividade_ciclo.setor_cliente })
            .from(produtividade_ciclo)
            .where(and(
              eq(produtividade_ciclo.distrito, distrito),
              // Para buscar setores, usamos o último ciclo da seleção
              eq(produtividade_ciclo.ciclo, selectedCycles[selectedCycles.length - 1]),
            ))
            .orderBy(produtividade_ciclo.setor_cliente) as unknown as Promise<{ setor: string }[]>
        : Promise.resolve([] as { setor: string }[]);

    const [chart, setoresResult] = await Promise.all([
      chartDataPromise.catch(() => []),
      setoresPromise.catch(() => []),
    ]);

    // O KPI "selecionado" será o mais recente da lista de selecionados
    const lastSelected = selectedCycles[selectedCycles.length - 1] || 'CICLO 01';
    
    // O KPI "anterior" será o ciclo imediatamente anterior ao selecionado (mesmo que não esteja na lista)
    const idx = ciclosDisponiveis.indexOf(lastSelected);
    const prevCycle = idx > 0 ? ciclosDisponiveis[idx - 1] : null;
    const mPrev = prevCycle === 'CICLO 01' ? m01 : (prevCycle === 'CICLO 02' ? m02 : null);

    return {
      kpis: {
        ciclo01: { cobertura: Number(m01?.cobertura || 0), mdv: Number(m01?.mdv || 0) },
        ciclo02: { cobertura: Number(m02?.cobertura || 0), mdv: Number(m02?.mdv || 0) },
        ciclo03: { cobertura: Number(m03?.cobertura || 0), mdv: Number(m03?.mdv || 0) },
        selected: {
          cobertura: Number(mSelected?.cobertura || 0),
          mdv:       Number(mSelected?.mdv || 0),
          visitasTotais: Number(mSelected?.visitasTotais || 0),
          contatos:      Number(mSelected?.contatos || 0),
        },
        brasilSelected: {
          cobertura: Number(mBrasilSelected?.cobertura || 0),
          mdv:       Number(mBrasilSelected?.mdv || 0),
        },
        previous: mPrev ? {
          cobertura: Number(mPrev[0]?.cobertura || 0),
          mdv:       Number(mPrev[0]?.mdv || 0),
        } : null,
        diasRestantes: 8
      },
      chartData: chart.map((d: any) => ({
        name:    d.name,
        ciclo01: Number(d.ciclo01 || 0),
        ciclo02: Number(d.ciclo02 || 0),
        ciclo03: Number(d.ciclo03 || 0),
        mdv01:   Number(d.mdv01 || 0),
        mdv02:   Number(d.mdv02 || 0),
        mdv03:   Number(d.mdv03 || 0),
      })),
      availableSetores: setoresResult.map((s) => s.setor),
    };
  } catch (e) {
    console.error('getExecutiveMetrics error:', e);
    throw e;
  }
}

export async function getAvailableSetores(distrito: string = 'Todos') {
  try {
    if (!db) return [];
    
    const query = db.selectDistinct({ setor: produtividade_ciclo.setor_cliente })
      .from(produtividade_ciclo);
      
    if (distrito !== 'Todos') {
      query.where(eq(produtividade_ciclo.distrito, distrito));
    }
    
    const result = await query.orderBy(produtividade_ciclo.setor_cliente);
    return result.map(s => s.setor).filter(Boolean) as string[];
  } catch (e) {
    console.error('getAvailableSetores error:', e);
    return [];
  }
}

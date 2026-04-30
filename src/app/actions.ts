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
  try {
    if (!db) {
      throw new Error("Database not connected");
    }

    // 1. Buscar KPIs via RPC usando Drizzle execute
    const kpiDataRaw = await db.execute(sql`SELECT get_executive_kpis(${estrutura}, ${distrito}, ${setor}) as data`);
    const kpiData = (kpiDataRaw[0] as any).data;

    // 2. Buscar dados para o gráfico (Mantendo a lógica simplificada por enquanto)
    const selectFields = {
      name: estrutura === 'Setor' ? produtividade_ciclo.setor_cliente : produtividade_ciclo.distrito,
      ciclo01: sql<number>`SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 01' THEN ${produtividade_ciclo.vis_total} ELSE 0 END)::float / NULLIF(SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 01' THEN ${produtividade_ciclo.cad_final_ciclo} ELSE 0 END), 0) * 100`,
      ciclo02: sql<number>`SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 02' THEN ${produtividade_ciclo.vis_total} ELSE 0 END)::float / NULLIF(SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 02' THEN ${produtividade_ciclo.cad_final_ciclo} ELSE 0 END), 0) * 100`,
      ciclo03: sql<number>`SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 03' THEN ${produtividade_ciclo.vis_total} ELSE 0 END)::float / NULLIF(SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 03' THEN ${produtividade_ciclo.cad_final_ciclo} ELSE 0 END), 0) * 100`,
      mdv01:   sql<number>`SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 01' THEN ${produtividade_ciclo.vis_total} ELSE 0 END)::float / NULLIF(SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 01' THEN ${produtividade_ciclo.dias_trab} ELSE 0 END), 0)`,
      mdv02:   sql<number>`SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 02' THEN ${produtividade_ciclo.vis_total} ELSE 0 END)::float / NULLIF(SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 02' THEN ${produtividade_ciclo.dias_trab} ELSE 0 END), 0)`,
      mdv03:   sql<number>`SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 03' THEN ${produtividade_ciclo.vis_total} ELSE 0 END)::float / NULLIF(SUM(CASE WHEN ${produtividade_ciclo.ciclo} = 'CICLO 03' THEN ${produtividade_ciclo.dias_trab} ELSE 0 END), 0)`,
    };

    let chartDataPromise;
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

    const setoresPromise = (estrutura === 'Setor' && distrito !== 'Todos')
      ? db.selectDistinct({ setor: produtividade_ciclo.setor_cliente })
          .from(produtividade_ciclo)
          .where(and(
            eq(produtividade_ciclo.distrito, distrito),
            eq(produtividade_ciclo.ciclo, 'CICLO 03') // Fallback para o último ciclo conhecido
          ))
          .orderBy(produtividade_ciclo.setor_cliente)
      : Promise.resolve([]);

    const [chart, setoresResult] = await Promise.all([
      chartDataPromise.catch(() => []),
      setoresPromise.catch(() => []),
    ]);

    return {
      kpis: {
        selected: {
          cobertura: Number(kpiData.cobertura || 0),
          mdv:       Number(kpiData.mdv || 0),
          visitasTotais: Number(kpiData.visitas_totais || 0),
          contatos:      Number(kpiData.contatos_unicos || 0),
        },
        brasilSelected: {
          cobertura: Number(kpiData.brasil_cobertura || 0),
          mdv:       Number(kpiData.brasil_mdv || 0),
        },
        trend: {
          cobertura: Number(kpiData.trend_cobertura || 0),
          mdv:       Number(kpiData.trend_mdv || 0),
        },
        last_ciclo: kpiData.last_ciclo,
        prev_ciclo: kpiData.prev_ciclo,
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
      availableSetores: setoresResult.map((s: any) => s.setor),
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

'use server';

import { db } from '@/src/lib/db';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/src/lib/supabase/auth';

export async function getExecutiveMetrics(
  distrito: string = 'Todos',
  estrutura: string = 'Distrito',
  setor: string = 'Todos',
  ciclos: string[] = []
) {
  try {
    await requireUser();
    if (!db) {
      throw new Error("Database not connected");
    }

    // RPC aceita p_ciclos como CSV ("202604,202605"). Vazio = NULL pro driver,
    // a função trata como "último ciclo". O CSV evita o achatamento do array
    // unitário que o postgres-js faz quando passamos string[] direto.
    const ciclosParam = ciclos.length > 0 ? ciclos.join(',') : null;
    const kpiDataRaw = await db.execute(sql`
      SELECT get_executive_kpis(${estrutura}, ${distrito}, ${setor}, ${ciclosParam}) as data
    `);
    const kpiData = (kpiDataRaw[0] as any).data ?? {};

    // Setores disponíveis para popular o filtro quando estrutura=Setor
    const setoresResult = (estrutura === 'Setor' && distrito !== 'Todos')
      ? await db.execute(sql`
          SELECT DISTINCT nome_setor
          FROM dim_hierarquia
          WHERE nome_distrito = ${distrito}
            AND nome_setor IS NOT NULL
          ORDER BY nome_setor
        `).catch(() => [])
      : [];

    return {
      kpis: {
        selected: {
          cobertura:     Number(kpiData.cobertura || 0),
          mdv:           Number(kpiData.mdv || 0),
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
          visitasTotais: Number(kpiData.trend_visitas || 0),
          contatos:      Number(kpiData.trend_contatos || 0),
        },
        last_ciclo: kpiData.last_ciclo,
        prev_ciclo: kpiData.prev_ciclo,
        diasRestantes: 8,
      },
      chartData: [] as any[],
      availableSetores: setoresResult.map((s: any) => s.nome_setor).filter(Boolean) as string[],
    };
  } catch (e) {
    console.error('getExecutiveMetrics error:', e);
    throw e;
  }
}

export async function getAvailableSetores(distrito: string = 'Todos') {
  try {
    await requireUser();
    if (!db) return [];

    const result = distrito !== 'Todos'
      ? await db.execute(sql`
          SELECT DISTINCT nome_setor
          FROM dim_hierarquia
          WHERE nome_distrito = ${distrito} AND nome_setor IS NOT NULL
          ORDER BY nome_setor
        `)
      : await db.execute(sql`
          SELECT DISTINCT nome_setor
          FROM dim_hierarquia
          WHERE nome_setor IS NOT NULL
          ORDER BY nome_setor
        `);

    return result.map((r: any) => r.nome_setor as string).filter(Boolean);
  } catch (e) {
    console.error('getAvailableSetores error:', e);
    return [];
  }
}

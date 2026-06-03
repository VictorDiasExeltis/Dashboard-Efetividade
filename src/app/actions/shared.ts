'use server';

import { db } from '@/src/lib/db';
import { sql } from 'drizzle-orm';
import { requireUser } from '@/src/lib/supabase/auth';

export async function getSetoresPorDistrito(distrito: string): Promise<string[]> {
  try {
    await requireUser();
    if (!db) return [];
    const result = await db.execute(sql`
      SELECT DISTINCT nome_setor
      FROM dim_hierarquia
      WHERE nome_distrito = ${distrito}
        AND nome_setor IS NOT NULL
      ORDER BY nome_setor
    `);
    return result.map((r: any) => r.nome_setor as string);
  } catch (e) {
    console.error('getSetoresPorDistrito error:', e);
    return [];
  }
}

// Distritos vêm de dim_hierarquia — fonte única; novos distritos aparecem
// automaticamente no filtro sem necessidade de mudar código.
export async function getDistritos(): Promise<string[]> {
  try {
    await requireUser();
    if (!db) return [];
    const result = await db.execute(sql`
      SELECT DISTINCT nome_distrito
      FROM dim_hierarquia
      WHERE nome_distrito IS NOT NULL
      ORDER BY nome_distrito
    `);
    return result.map((r: any) => r.nome_distrito as string);
  } catch (e) {
    console.error('getDistritos error:', e);
    return [];
  }
}

// Produtos disponíveis vêm de dim_produtos. Lista os nomes para uso em filtros.
export async function getProdutos(): Promise<string[]> {
  try {
    await requireUser();
    if (!db) return [];
    const result = await db.execute(sql`
      SELECT DISTINCT nome_produto
      FROM dim_produtos
      WHERE nome_produto IS NOT NULL AND TRIM(nome_produto) <> ''
      ORDER BY nome_produto
    `);
    return result.map((r: any) => r.nome_produto as string);
  } catch (e) {
    console.error('getProdutos error:', e);
    return [];
  }
}

// Ciclos disponíveis vêm de metas_ciclo (fonte canônica). Retorna em ordem
// ascendente — o consumidor escolhe se quer mostrar do mais antigo pro mais
// novo ou inverso.
export async function getCiclos(): Promise<string[]> {
  try {
    await requireUser();
    if (!db) return [];
    const result = await db.execute(sql`
      SELECT DISTINCT ciclo
      FROM metas_ciclo
      WHERE ciclo IS NOT NULL
      ORDER BY ciclo
    `);
    return result.map((r: any) => r.ciclo as string);
  } catch (e) {
    console.error('getCiclos error:', e);
    return [];
  }
}

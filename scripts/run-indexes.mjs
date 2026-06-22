// Aplica os índices de sql/add_indexes.sql via session pooler (porta 5432),
// que — diferente do transaction pooler (6543) — aceita CREATE INDEX
// CONCURRENTLY e VACUUM. Usa simple query protocol (sql.unsafe) p/ não
// envolver os comandos em transação.
import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error('DATABASE_URL ausente no ambiente (.env.local).');
  process.exit(1);
}

// Transaction pooler (6543) → session pooler (5432).
const url = raw.replace(':6543/', ':5432/');

const statements = [
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fato_visitas_setor_ciclo ON public.fato_visitas (cod_setor, ciclo)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fato_visitas_ciclo ON public.fato_visitas (ciclo)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fato_visitas_crmuf ON public.fato_visitas (crmuf)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metas_ciclo_setor_ciclo ON public.metas_ciclo (cod_setor, ciclo)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fato_segmentacao_crmuf ON public.fato_segmentacao (crmuf)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dim_medicos_setor ON public.dim_medicos (cod_setor)`,
  `VACUUM ANALYZE public.fato_visitas`,
  `VACUUM ANALYZE public.metas_ciclo`,
  `VACUUM ANALYZE public.fato_segmentacao`,
  `VACUUM ANALYZE public.dim_medicos`,
];

const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 5 });

let ok = 0;
for (const stmt of statements) {
  const label = stmt.slice(0, 70);
  try {
    const t = Date.now();
    await sql.unsafe(stmt);
    console.log(`OK   (${Date.now() - t}ms)  ${label}`);
    ok++;
  } catch (err) {
    console.error(`FAIL  ${label}\n      ${err.message}`);
  }
}

await sql.end();
console.log(`\n${ok}/${statements.length} comandos OK.`);

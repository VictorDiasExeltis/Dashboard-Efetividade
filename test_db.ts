import { db } from './src/lib/db/index.ts';
import { sql } from 'drizzle-orm';

async function test() {
  const v = await db.execute(sql`SELECT * FROM fato_visitas LIMIT 1`);
  console.log(v);
  const m = await db.execute(sql`SELECT * FROM dim_medicos LIMIT 1`);
  console.log(m);
  const s = await db.execute(sql`SELECT * FROM fato_segmentacao LIMIT 1`);
  console.log(s);
  process.exit(0);
}
test();

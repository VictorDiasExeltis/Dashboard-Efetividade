import { db } from './src/lib/db/index.ts';
import { sql } from 'drizzle-orm';

async function test() {
  const query = sql`
    SELECT pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    WHERE p.proname = 'get_executive_kpis';
  `;
  const result = await db.execute(query);
  console.log(result[0]?.def);
  process.exit(0);
}
test();

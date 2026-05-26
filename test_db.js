const { db } = require('./src/lib/db');
const { sql } = require('drizzle-orm');

async function test() {
  const v = await db.execute(sql`SELECT * FROM fato_visitas LIMIT 1`);
  console.log(v);
  process.exit(0);
}
test();

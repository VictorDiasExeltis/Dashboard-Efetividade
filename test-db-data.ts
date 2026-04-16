
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;

async function test() {
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);
  try {
    const res = await db.execute(sql`SELECT * FROM produtividade_ciclo LIMIT 5`);
    console.log('Sample Data Result:', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Query failed:', e);
  }
  process.exit();
}

test();

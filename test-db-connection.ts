
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgTable, text, integer, numeric, bigserial } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set' );
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

const produtividade_ciclo = pgTable('produtividade_ciclo', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  ciclo: text('ciclo').notNull(),
  distrito: text('distrito').notNull(),
  setor: integer('setor').notNull(),
});

async function test() {
  try {
    const res = await db.select({
      count: sql`count(*)`,
      ciclos: sql`array_agg(distinct ${produtividade_ciclo.ciclo})`,
      distritos: sql`array_agg(distinct ${produtividade_ciclo.distrito})`
    }).from(produtividade_ciclo);
    console.log('Database Result:', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Query failed:', e);
  }
  process.exit();
}

test();

import { db } from './src/lib/db/index.js';
import { sql } from 'drizzle-orm';

async function testConnection() {
  console.log('Testando conexão com o Supabase...');
  try {
    const result = await db.execute(sql`SELECT 1`);
    console.log('Conexão bem-sucedida!', result);
  } catch (err) {
    console.error('Falha na conexão:', err);
  } finally {
    process.exit(0);
  }
}

testConnection();

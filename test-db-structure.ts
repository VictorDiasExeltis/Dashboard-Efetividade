
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
import postgres from 'postgres';

async function test() {
  const url = process.env.DATABASE_URL;
  const sql = postgres(url);
  try {
    const res = await sql`
      SELECT estrutura, distrito, setor, nome, vis_total 
      FROM produtividade_ciclo 
      WHERE ciclo = 'CICLO 01' 
      LIMIT 10
    `;
    console.log('Sample data structure:', JSON.stringify(res, null, 2));
    
    const summary = await sql`
      SELECT estrutura, COUNT(*), SUM(vis_total) 
      FROM produtividade_ciclo 
      GROUP BY estrutura
    `;
    console.log('Summary by estrutura:', JSON.stringify(summary, null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit();
}

test();

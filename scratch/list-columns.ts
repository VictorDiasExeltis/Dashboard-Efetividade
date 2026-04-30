
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
import postgres from 'postgres';

async function listColumns() {
  const url = process.env.DATABASE_URL;
  const sql = postgres(url, { ssl: 'require' });
  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'produtividade_ciclo'
    `;
    console.log('Columns in produtividade_ciclo:', JSON.stringify(columns, null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit();
}

listColumns();

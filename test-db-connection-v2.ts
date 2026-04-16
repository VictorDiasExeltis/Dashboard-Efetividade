
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
import postgres from 'postgres';

async function test() {
  const url = process.env.DATABASE_URL;
  console.log('Connecting to:', url.replace(/:[^@]+@/, ':****@')); // Hide password
  const sql = postgres(url, { 
    connect_timeout: 10,
    ssl: 'require' // Supabase requires SSL usually
  });
  try {
    const res = await sql`SELECT 1 as result`;
    console.log('Connection successful:', res);
  } catch (e) {
    console.error('Connection failed details:', e);
  }
  process.exit();
}

test();

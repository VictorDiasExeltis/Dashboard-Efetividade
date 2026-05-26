import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL!;
  const sql = postgres(url, { ssl: 'require' });
  try {
    const r = await sql`
      SELECT
        COALESCE(SUM(a.quantidade), 0)::bigint        AS total_amostras,
        COUNT(DISTINCT v.crmuf)::int                  AS medicos_unicos_visitados,
        COUNT(DISTINCT m.crmuf)::int                  AS medicos_painel_ativos
      FROM dim_medicos m
      LEFT JOIN fato_visitas v ON v.crmuf = m.crmuf
      LEFT JOIN fato_amostras a ON a.id_visita = v.id_visita
      WHERE m.status = TRUE
    `;
    console.log(r[0]);

    const total = Number(r[0].total_amostras);
    const visit = Number(r[0].medicos_unicos_visitados);
    const painel = Number(r[0].medicos_painel_ativos);
    console.log('\nMédia por médico visitado :', (total / visit).toFixed(2));
    console.log('Média por médico do painel:', (total / painel).toFixed(2));
    console.log('\nValor mostrado hoje no card (~ inflado): ~73');
  } catch (e) { console.error(e); }
  process.exit();
}
main();

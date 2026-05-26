import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL!;
  const sql = postgres(url, { ssl: 'require' });
  try {
    const total = await sql`
      SELECT COALESCE(SUM(a.quantidade), 0)::bigint AS total
      FROM fato_amostras a
      INNER JOIN fato_visitas v ON v.id_visita = a.id_visita
    `;
    console.log('Total amostras (sem filtros):', total[0].total);

    const porSeg = await sql`
      SELECT
        COALESCE(s.segmentacao, 'SEM SEG') AS seg,
        COUNT(DISTINCT s.crmuf)::int AS medicos,
        COUNT(DISTINCT v.crmuf)::int AS medicos_visitados,
        COALESCE(SUM(a.quantidade), 0)::int AS amostras
      FROM fato_segmentacao s
      INNER JOIN dim_medicos m ON m.crmuf = s.crmuf AND m.status = TRUE
      LEFT JOIN fato_visitas v ON v.crmuf = s.crmuf
      LEFT JOIN fato_amostras a ON a.id_visita = v.id_visita
      GROUP BY s.segmentacao
    `;
    console.log('\nPor segmentação:');
    console.table(porSeg);
    const somaSeg = porSeg.reduce((s: number, r: any) => s + Number(r.amostras), 0);
    console.log('Soma das amostras por seg:', somaSeg);
  } catch (e) { console.error(e); }
  process.exit();
}
main();

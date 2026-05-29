import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import postgres from 'postgres';
import * as XLSX from 'xlsx';

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Erro: DATABASE_URL não encontrada no arquivo .env.local');
    process.exit(1);
  }

  console.log('Conectando ao banco de dados...');
  const sql = postgres(connectionString, { prepare: false });

  try {
    console.log('Buscando dados dos médicos e segmentação Slinda (ID 10005)...');
    const rows = await sql`
      SELECT 
        m.crmuf AS "CRM",
        m.nome_medico AS "Nome",
        h.nome_setor AS "Setor",
        h.nome_distrito AS "Distrito",
        h.nome_rep AS "Nome do Rep",
        COALESCE(s.segmentacao, 'SEM SEGMENTAÇÃO') AS "Segmentação Slinda"
      FROM dim_medicos m
      LEFT JOIN dim_hierarquia h ON m.cod_setor = h.cod_setor
      LEFT JOIN fato_segmentacao s ON m.crmuf = s.crmuf AND s.id_marca = 10005
      WHERE m.status = TRUE
      ORDER BY h.nome_distrito, h.nome_setor, m.nome_medico;
    `;

    console.log(`Dados recuperados: ${rows.length} médicos encontrados.`);

    // Criar a planilha Excel
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Segmentação Slinda');

    // Ajustar largura das colunas
    const maxLens = {};
    rows.forEach(row => {
      Object.keys(row).forEach(key => {
        const valStr = String(row[key] || '');
        maxLens[key] = Math.max(maxLens[key] || 10, valStr.length, key.length);
      });
    });
    worksheet['!cols'] = Object.keys(maxLens).map(key => ({
      wch: maxLens[key] + 3
    }));

    const filename = 'relacao_medicos_segmentacao_slinda.xlsx';
    XLSX.writeFile(workbook, filename);
    console.log(`Arquivo Excel criado com sucesso: ${filename}`);

  } catch (error) {
    console.error('Erro durante a execução do script:', error);
  } finally {
    await sql.end();
  }
}

run();

import { db } from './src/lib/db/index.js';
import { produtividade_ciclo } from './src/lib/db/schema.js';

async function main() {
  const distritos = await db.selectDistinct({ distrito: produtividade_ciclo.distrito }).from(produtividade_ciclo);
  console.log(distritos);
  process.exit(0);
}
main();

// Gera e baixa um modelo .xlsx para uma carga da Central de Cargas.
// Roda só no cliente (importado pelo CargaUploadCard). Usa o SheetJS (xlsx),
// que já é dependência do projeto; XLSX.writeFile dispara o download no browser.

import * as XLSX from 'xlsx';
import type { CargaSpec, ColunaTipo } from './config';

// Valor ilustrativo quando a coluna não define um `exemplo` próprio.
const EXEMPLO_PADRAO: Record<ColunaTipo, string | number> = {
  inteiro: 100,
  decimal: 8.25,
  texto: 'exemplo',
};

const exemploDe = (c: CargaSpec['colunas'][number]): string | number =>
  c.exemplo ?? EXEMPLO_PADRAO[c.tipo];

// Ajusta a largura das colunas de uma aba ao maior conteúdo (com folga).
function autoLargura(linhas: (string | number)[][]): { wch: number }[] {
  const nCols = Math.max(...linhas.map((l) => l.length));
  return Array.from({ length: nCols }, (_, i) => {
    const maior = Math.max(...linhas.map((l) => String(l[i] ?? '').length));
    return { wch: Math.min(Math.max(maior + 2, 10), 60) };
  });
}

// Monta o workbook do modelo (sem I/O) — separado do download para ser testável.
export function construirWorkbookModelo(spec: CargaSpec): XLSX.WorkBook {
  const cabecalho = spec.colunas.map((c) => c.campo);
  const exemplo = spec.colunas.map((c) => exemploDe(c));

  // Aba "Modelo": cabeçalho pronto para preencher + 1 linha de exemplo.
  const modeloLinhas: (string | number)[][] = [cabecalho, exemplo];
  const modelo = XLSX.utils.aoa_to_sheet(modeloLinhas);
  modelo['!cols'] = autoLargura(modeloLinhas);

  // Aba "Instruções": dicionário de colunas.
  const instrLinhas: (string | number)[][] = [
    ['Coluna', 'Descrição', 'Tipo', 'Obrigatória', 'Exemplo', 'Outros nomes aceitos'],
    ...spec.colunas.map((c) => [
      c.campo,
      c.label,
      c.tipo,
      c.obrigatoria ? 'Sim' : 'Não',
      String(exemploDe(c)),
      c.aliases.join(', '),
    ]),
  ];
  const instrucoes = XLSX.utils.aoa_to_sheet(instrLinhas);
  instrucoes['!cols'] = autoLargura(instrLinhas);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, modelo, 'Modelo');
  XLSX.utils.book_append_sheet(wb, instrucoes, 'Instruções');
  return wb;
}

export function baixarModeloCarga(spec: CargaSpec): void {
  // No browser, writeFile dispara o download do arquivo.
  XLSX.writeFile(construirWorkbookModelo(spec), `modelo_${spec.id}.xlsx`);
}

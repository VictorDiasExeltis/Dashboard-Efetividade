// Utilidades compartilhadas pelas telas que abrem recorte detalhado
// (Visitação × Segmentação e Entrega de Amostras). Existiam duplicadas nas
// duas páginas; ficam aqui para não divergirem — em especial o `slug`, que
// decide o nome do arquivo exportado.

// Os cinco rótulos da tabela de segmentação, na ordem em que a tela mostra.
// "SEM SEGMENTAÇÃO" não é um valor gravado no banco: é o COALESCE de quem não
// tem linha em fato_segmentacao para a marca.
export const SEGMENTACOES = [
  'CONQUISTAR',
  'PROTEGER',
  'MANTER',
  'OBSERVAR',
  'SEM SEGMENTAÇÃO',
] as const;

// Pedaço de nome de arquivo seguro: sem acento, espaço ou barra.
// A faixa ̀-ͯ são os diacríticos combinantes que o NFD separa da letra.
export function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

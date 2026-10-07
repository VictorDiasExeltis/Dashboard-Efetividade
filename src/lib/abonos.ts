// Classificação dos motivos de abono.
//
// O motivo vem como texto livre do sistema de origem, escolhido numa lista que
// mudou com o tempo — por isso a mesma ausência aparece com nomes diferentes.
// Hoje existem 35 valores distintos em `fato_abonos`, vários sinônimos entre si.
//
// Centralizado aqui para que donut, tabela e qualquer análise futura contem a
// mesma coisa. O banco guarda o texto original intacto: a fusão é só de leitura.

/** Rótulo único da família médica. */
export const MOTIVO_ATESTADO = 'ATESTADO MÉDICO';

/**
 * Família médica — atestado, afastamento e licença por doença são a mesma
 * ausência para quem lê o relatório, e vinham separadas só por causa da lista
 * de origem. Decisão do Victor em 07/10/2026.
 *
 * Captura hoje (dias no histórico até o ciclo 11):
 *   ATESTADO MÉDICO 134,3 · AFASTAMENTO MÉDICO 68,0
 *   LICENÇA MEDICA COM ATESTADO 18,8 · LICENÇA MÉDICA 3,3 · ENFERMIDADE 0,5
 *
 * É regex e não lista fechada de propósito: cada ciclo pode trazer variação
 * nova ("ATESTADO MEDICO 4 HORAS") e ela entra sozinha no lugar certo.
 * `LICENÇA PATERNIDADE` NÃO entra — licença sem "médica" fica de fora.
 */
const FAMILIA_MEDICA = /ATESTADO|AFASTAMENTO|LICEN[ÇC]A\s*M[EÉ]DICA|ENFERMIDADE/i;

/** Balde dos motivos que não cabem no donut. Não confundir com o motivo
 *  literal "OUTROS", que vem assim da origem e é um motivo de verdade. */
export const MOTIVO_DEMAIS = 'DEMAIS MOTIVOS';

/** Quantos motivos reais o donut desenha antes de usar MOTIVO_DEMAIS.
 *  Seis porque a paleta do donut tem seis cores distinguíveis entre si; a
 *  sétima fatia é o balde neutro. */
export const TOP_MOTIVOS = 6;

export function normalizarMotivo(bruto: string | null | undefined): string {
  const m = (bruto ?? '').trim();
  if (!m) return 'SEM MOTIVO';
  if (FAMILIA_MEDICA.test(m)) return MOTIVO_ATESTADO;
  return m.toUpperCase();
}

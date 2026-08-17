// Cor por ESTRUTURA (distrito ou setor), compartilhada pelos gráficos da Visão
// Executiva: Cobertura, MDV e Cobertura × MDV.
//
// Regra: a cor identifica a estrutura, NÃO a posição dela na lista. Antes cada
// gráfico fazia `paleta[index % n]`, e como as séries voltavam em ordens (e
// paletas) diferentes, o mesmo distrito aparecia laranja num gráfico e azul no
// outro. Aqui o mapeamento é determinístico e independente de ordem, de filtro
// e de quais estruturas têm dado no recorte.
//
// Vermelhos ficam FORA da paleta de propósito: nesses gráficos vermelho é a cor
// das linhas de meta (`#ef4444`), e reaproveitá-lo confundiria série com meta.

export const PALETA_ESTRUTURA = [
  '#3b82f6', // azul
  '#f97316', // laranja
  '#10b981', // verde
  '#8b5cf6', // violeta
  '#06b6d4', // ciano
  '#ec4899', // rosa
  '#f59e0b', // âmbar
  '#6366f1', // índigo
  '#14b8a6', // teal
  '#0ea5e9', // azul claro
  '#a855f7', // púrpura
  '#84cc16', // lima
  '#d946ef', // fúcsia
  '#22c55e', // esmeralda
  '#eab308', // amarelo
  '#0891b2', // ciano escuro
  '#7c3aed', // violeta escuro
  '#059669', // verde escuro
];

// Os 9 distritos são poucos e estáveis, então recebem cor fixa — garante que
// nenhum par colida e que a cor não mude se um distrito ficar sem dado.
// NORDESTE segue laranja, como já era no gráfico de Cobertura.
const COR_FIXA: Record<string, string> = {
  'BRASIL':     '#1d4ed8',
  'MG/CO':      '#3b82f6',
  'NORDESTE':   '#f97316',
  'NORTE':      '#10b981',
  'PR':         '#8b5cf6',
  'RJ/ES':      '#06b6d4',
  'RS/SC':      '#ec4899',
  'SP':         '#f59e0b',
  'SP/MT/MS':   '#6366f1',
  'SPI':        '#14b8a6',
};

// Setores: cor atribuída DENTRO de cada distrito (máx. 12 setores por distrito,
// paleta de 18 cores) — assim a view de setor, que é sempre escopada a um
// distrito, nunca mostra duas séries da mesma cor. Um hash puro sobre os 86
// nomes colidia demais: RJ/ES caía de 11 setores para 7 cores.
//
// Derivado de `dim_hierarquia`: por distrito, setores em ordem alfabética
// recebem PALETA_ESTRUTURA[0..n-1]. Se a hierarquia mudar, regerar este mapa;
// setor novo que não esteja aqui cai no hash e segue consistente entre gráficos.
const COR_SETOR: Record<string, string> = {
  // MG/CO
  'DF_1': '#3b82f6',
  'DF_2': '#f97316',
  'DF_3': '#10b981',
  'GO_GOIANIA_1': '#8b5cf6',
  'GO_GOIANIA_2': '#06b6d4',
  'MG_BH_BETIM': '#ec4899',
  'MG_BH_LAFAIETE': '#f59e0b',
  'MG_BH_MOC': '#6366f1',
  'MG_BH_SUL': '#14b8a6',
  'MG_PATOSDEMINAS': '#0ea5e9',
  'MG_VALEDOACO': '#a855f7',
  // NORDESTE
  'AL_MACEIO': '#3b82f6',
  'BA_BARREIRAS': '#f97316',
  'BA_FEIRADESANTA': '#10b981',
  'BA_SALVADOR_1': '#8b5cf6',
  'BA_SALVADOR_2': '#06b6d4',
  'PB_JOAOPESSOA': '#ec4899',
  'PE_RECIFE_1': '#f59e0b',
  'PE_RECIFE_2': '#6366f1',
  'RN_NATAL': '#14b8a6',
  'SE_ARACAJU': '#0ea5e9',
  // NORTE
  'AM_MANAUS': '#3b82f6',
  'CE_FORTALEZA_1': '#f97316',
  'CE_FORTALEZA_2': '#10b981',
  'MA_SAOLUIS': '#8b5cf6',
  'PA_ANANINDEUA': '#06b6d4',
  'PA_BELEM': '#ec4899',
  'PA_MARABA': '#f59e0b',
  'PI_TERESINA': '#6366f1',
  'RO_PORTOVELHO': '#14b8a6',
  // PR
  'PR_CASCAVEL': '#3b82f6',
  'PR_CTBA_1': '#f97316',
  'PR_CTBA_2': '#10b981',
  'PR_LONDRINA': '#8b5cf6',
  'PR_SAO_JOSE': '#06b6d4',
  // RJ/ES
  'ES_GDEVITORIA': '#3b82f6',
  'RJC_BARRA': '#f97316',
  'RJC_TIJUCA': '#10b981',
  'RJC_ZONAOESTE': '#8b5cf6',
  'RJC_ZONASUL_CTO': '#06b6d4',
  'RJ_BAIXADA_FLU': '#ec4899',
  'RJ_CAMPOS': '#f59e0b',
  'RJ_JF_SERRA': '#6366f1',
  'RJ_NITEROI_TERE': '#14b8a6',
  'RJ_SG_LAGOS': '#0ea5e9',
  'RJ_SUL_FLU': '#a855f7',
  // RS/SC
  'RS_CAXIAS': '#3b82f6',
  'RS_PASSOFUNDO': '#f97316',
  'RS_PELOTAS': '#10b981',
  'RS_POA_1': '#8b5cf6',
  'RS_POA_2': '#06b6d4',
  'RS_SANTAMARIA': '#ec4899',
  'SC_BLUMENAU': '#f59e0b',
  'SC_CHAPECO': '#6366f1',
  'SC_CRICIUMA': '#14b8a6',
  'SC_FLORIPA_BC': '#0ea5e9',
  'SC_FLORIPA_ITAJ': '#a855f7',
  // SP
  'SPC_BELAVISTA': '#3b82f6',
  'SPC_ZONALESTE': '#f97316',
  'SPC_ZONANORTE': '#10b981',
  'SPI_JUNDIAI': '#8b5cf6',
  'SP_GRU': '#06b6d4',
  // SP/MT/MS
  'MS_CAMPOGRANDE': '#3b82f6',
  'MS_DOURADOS': '#f97316',
  'MT_CUIABA_RONDO': '#10b981',
  'MT_CUIABA_SINOP': '#8b5cf6',
  'SPC_ITAIM': '#06b6d4',
  'SPC_MOEMA': '#ec4899',
  'SPC_MORUMBI': '#f59e0b',
  'SPC_ZONAOESTE': '#6366f1',
  'SPI_SOROCABA': '#14b8a6',
  'SP_OSASCO': '#0ea5e9',
  'SP_SB_BAIXADA': '#a855f7',
  'SP_STOANDRE': '#84cc16',
  // SPI
  'MG_SULDEMINAS': '#3b82f6',
  'MG_UBERLANDIA': '#f97316',
  'SPI_BAURU': '#10b981',
  'SPI_CAMPINAS_1': '#8b5cf6',
  'SPI_CAMPINAS_2': '#06b6d4',
  'SPI_MOGI': '#ec4899',
  'SPI_PIRACICABA': '#f59e0b',
  'SPI_RIBEIRAO_1': '#6366f1',
  'SPI_RIBEIRAO_2': '#14b8a6',
  'SPI_RIOPRETO': '#0ea5e9',
  'SPI_SJ_TAUBATE': '#a855f7',
  'SPI_VALE': '#84cc16',
};

// Hash estável (mesma string → mesmo índice, sempre e em qualquer ordem).
function hashEstavel(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h * 31 + texto.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Cor da estrutura. Distritos (e "Brasil") têm cor fixa; setores e qualquer
 * outro rótulo caem no hash sobre a paleta.
 *
 * Ordem de resolução: cor fixa (distritos + "Brasil") → mapa de setores → hash.
 * As duas primeiras garantem zero colisão entre séries visíveis ao mesmo tempo;
 * o hash é só rede de segurança para rótulo novo, e ainda assim mantém a mesma
 * cor nos 3 gráficos, que é o requisito principal.
 */
export function corDaEstrutura(label: string | null | undefined): string {
  if (!label) return PALETA_ESTRUTURA[0];
  const chave = label.trim().toUpperCase();
  const fixa = COR_FIXA[chave] ?? COR_SETOR[chave];
  if (fixa) return fixa;
  return PALETA_ESTRUTURA[hashEstavel(chave) % PALETA_ESTRUTURA.length];
}

// Barrel de re-exports para os Server Actions, separados por domínio em ./actions/*.
// Mantém os imports antigos (`@/src/app/actions`) funcionando sem mudança.
//
// Por que separar:
//   IDs de Server Action são hashes do conteúdo do módulo. Quando um arquivo
//   muda, TODOS os IDs do arquivo rotacionam — em dev, isso invalida o bundle
//   do browser pra todas as actions juntas e causa o erro
//   "Server Action ... was not found". Dividindo por domínio, editar uma action
//   só rotaciona os IDs do arquivo dela, deixando as outras páginas intactas.

export { getExecutiveMetrics, getAvailableSetores }           from './actions/executive';
export { getClassificacoes, getKpisClassificacao, getSegmentacaoData, getCoberturaPorSegmentacao, getVisitadosPorPotencial } from './actions/segmentacao';
export type { CoberturaSegmentacao, PotencialVisitacao } from './actions/segmentacao';
export { getAmostrasData }                                    from './actions/amostras';
export { getMedicosNaoVisitados, getTotalMedicosAtivosTerritorio } from './actions/medicos';
export { getSetoresPorDistrito, getDistritos, getCiclos, getProdutos } from './actions/shared';

export type { MedicoNaoVisitado } from './actions/medicos.types';

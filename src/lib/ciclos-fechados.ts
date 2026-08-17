import { getSupabaseClient } from '@/src/lib/supabase/client';

// Lista de ciclos ENCERRADOS, lida da view `ciclos_fechados` (MAX(data) do ciclo
// em dim_calendario < hoje, fuso America/Sao_Paulo). A view já exclui o
// pseudo-ciclo anual 202600 e o ciclo em andamento.
//
// Existe para os componentes que consultam o banco pelo client do navegador
// (GraficoAbonos, TabelaRepresentantes) poderem respeitar a mesma regra das
// demais telas consolidadas: parcial nunca aparece. As telas que rodam no
// servidor usam a view direto no SQL.
export async function buscarCiclosFechados(): Promise<string[]> {
  const { data, error } = await getSupabaseClient()
    .from('ciclos_fechados')
    .select('ciclo');

  if (error) {
    // Falha aqui não pode virar "mostra tudo": devolve vazio, e quem chama
    // trata como "nenhum ciclo fechado" em vez de liberar o ciclo aberto.
    console.error('[ciclos-fechados] falha ao buscar:', error.message);
    return [];
  }
  return (data ?? [])
    .map((r: { ciclo: string | null }) => r.ciclo)
    .filter((c): c is string => c != null);
}

// Mesma lista normalizada para comparação (trim + lowercase).
export function normalizarCiclos(ciclos: string[]): Set<string> {
  return new Set(ciclos.map((c) => c.trim().toLowerCase()));
}

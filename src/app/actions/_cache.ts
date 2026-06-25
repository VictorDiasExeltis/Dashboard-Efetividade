import 'server-only';
import { unstable_cache } from 'next/cache';

// Envolve um loader de dados em unstable_cache. Os dados do dashboard só mudam
// na carga de ciclo (e fato_diario na carga diária), então cachear corta as
// re-execuções de queries pesadas e reduz Disk IO.
//
// IMPORTANTE: o loader NÃO pode depender de estado da requisição (cookies/
// headers). A checagem de auth (requireUser) fica sempre na server action que
// chama isto, FORA do cache.
//
// `keyParts` precisa ser único por action. Os argumentos do loader entram
// automaticamente na chave (precisam ser serializáveis: string/number/array).
export function cacheLoader<A extends unknown[], R>(
  keyParts: string[],
  loader: (...args: A) => Promise<R>,
  revalidate = 1800,
): (...args: A) => Promise<R> {
  return unstable_cache(loader as (...a: unknown[]) => Promise<R>, keyParts, {
    revalidate,
    // keyParts também viram tags, então um revalidateTag(keyParts[0]) força
    // o refresh após uma carga (ex.: a Central de Cargas invalida 'analise-diaria').
    tags: keyParts,
  }) as (...args: A) => Promise<R>;
}

'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Users, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/src/components/ui/card';
import { getSupabaseClient } from '@/src/lib/supabase/client';

// ─── Constantes ───────────────────────────────────────────────

const ROWS_PER_PAGE = 12;

// ─── Interfaces TypeScript ────────────────────────────────────

interface MetaCicloRaw {
  ciclo: string | null;
  dias_trabalhados: number | null;
  considerar: boolean | null;
}

interface DimCalendarioRaw {
  ciclo: string | null;
}

interface FatoAbonoRaw {
  horas_abonadas: number | null;
  dim_calendario: DimCalendarioRaw | DimCalendarioRaw[] | null;
}

interface DimHierarquiaRaw {
  cod_setor: string;
  nome_rep: string | null;
  nome_setor: string | null;
  nome_distrito: string | null;
  metas_ciclo: MetaCicloRaw[] | null;
  fato_abonos: FatoAbonoRaw[] | null;
}

interface RepresentanteProcessado {
  codSetor: string;
  nomeRep: string;
  nomeSetor: string;
  nomeDistrito: string;
  diasTrabalhados: number;
  diasAbonados: number;
  desconsiderado: boolean;
}

interface TabelaRepresentantesProps {
  filtroDistrito?: string;
  filtroSetor?: string;
  filtroCiclo?: string;
  onCicloChange?: (ciclo: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatarCiclo(ciclo: string): string {
  // "202601" → "Ciclo 01"
  const numCiclo = ciclo.slice(-2);
  return `Ciclo ${numCiclo.padStart(2, '0')}`;
}

function formatarDiasAbonados(value: number): string {
  if (value === 0) return '0';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function abreviarNome(nome: string): string {
  if (!nome || nome === '—') return nome;
  const partes = nome.trim().split(/\s+/);
  if (partes.length <= 2) return nome;
  
  const primeiro = partes[0];
  const ultimo = partes[partes.length - 1];
  
  // Se tiver mais que 2 partes, abrevia as do meio
  const meio = partes.slice(1, -1).map(p => p[0].toUpperCase() + '.').join(' ');
  return `${primeiro} ${meio} ${ultimo}`;
}

// Extrai o ciclo raw de dim_calendario, independente de vir como objeto ou array (Caso 2)
// Retorna o valor original sem normalização — a normalização ocorre só na comparação
function extrairCicloAbono(abono: FatoAbonoRaw): string | null {
  const raw = Array.isArray(abono.dim_calendario)
    ? abono.dim_calendario[0]?.ciclo
    : abono.dim_calendario?.ciclo;
  return raw ?? null;
}

function processarDados(
  rows: DimHierarquiaRaw[],
  filtroCiclo: string
): RepresentanteProcessado[] {
  const cicloNormalizado = filtroCiclo === 'Todos' ? 'todos' : filtroCiclo.trim().toLowerCase();

  return rows.map((row) => {
    const metas = (cicloNormalizado === 'todos'
      ? (row.metas_ciclo ?? [])
      : (row.metas_ciclo ?? []).filter(
          (m) => (m.ciclo ?? '').trim().toLowerCase() === cicloNormalizado
        )
    ).filter((m) => m.considerar === true);

    const todosAbonos = row.fato_abonos ?? [];

    // Auditoria Caso 1: abonos sem ciclo identificável no calendário
    const abonosSemCiclo = todosAbonos.filter((a) => extrairCicloAbono(a) === null);
    if (abonosSemCiclo.length > 0) {
      console.warn(
        `[TabelaRepresentantes] ${abonosSemCiclo.length} abono(s) sem ciclo para o rep "${row.nome_rep ?? row.cod_setor}". ` +
        `Datas sem correspondência em dim_calendario:`,
        abonosSemCiclo
      );
    }

    // Normalização aplicada na comparação (Caso 3): trim + lowercase em ambos os lados
    const abonos = cicloNormalizado === 'todos'
      ? todosAbonos
      : todosAbonos.filter((a) => {
          const cicloAbono = extrairCicloAbono(a);
          return cicloAbono !== null && cicloAbono.trim().toLowerCase() === cicloNormalizado;
        });

    const diasTrabalhados = metas.reduce((acc, m) => acc + (m.dias_trabalhados ?? 0), 0);
    const totalHoras = abonos.reduce((acc, a) => acc + (a.horas_abonadas ?? 0), 0);
    const diasAbonados = Math.round((totalHoras / 8) * 10) / 10;

    let desconsiderado = false;
    if (cicloNormalizado !== 'todos') {
      const metaCicloEspecifico = (row.metas_ciclo ?? []).find(
        (m) => (m.ciclo ?? '').trim().toLowerCase() === cicloNormalizado
      );
      if (!metaCicloEspecifico || metaCicloEspecifico.considerar === false) {
        desconsiderado = true;
      }
    } else {
      const temMetasAtivas = (row.metas_ciclo ?? []).some((m) => m.considerar === true);
      if (!temMetasAtivas) {
        desconsiderado = true;
      }
    }

    return {
      codSetor: row.cod_setor,
      nomeRep: row.nome_rep ?? '—',
      nomeSetor: row.nome_setor ?? '—',
      nomeDistrito: row.nome_distrito ?? '—',
      diasTrabalhados,
      diasAbonados,
      desconsiderado,
    };
  });
}

// ─── Skeleton ─────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-1.5">
          <div
            className="h-4 bg-slate-200 rounded animate-pulse"
            style={{ width: i === 0 ? '70%' : i === 4 ? '40%' : '55%' }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Componente Principal ─────────────────────────────────────

export function TabelaRepresentantes({
  filtroDistrito,
  filtroSetor,
  filtroCiclo: filtroCicloProp,
  onCicloChange,
}: TabelaRepresentantesProps) {
  const [rawDados, setRawDados] = useState<DimHierarquiaRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modo controlado: se o parent passa filtroCiclo + onCicloChange, usa essa fonte.
  // Caso contrário cai pra state interno (mantém retrocompat).
  const isControlled = filtroCicloProp !== undefined && onCicloChange !== undefined;
  const [filtroCicloInterno, setFiltroCicloInterno] = useState('Todos');
  const filtroCiclo = isControlled ? filtroCicloProp! : filtroCicloInterno;
  const setFiltroCiclo = isControlled ? onCicloChange! : setFiltroCicloInterno;

  const [pagina, setPagina] = useState(1);

  // ─── Fetch ────────────────────────────────────────────────

  const fetchDados = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = getSupabaseClient()
        .from('dim_hierarquia')
        .select(
          'cod_setor, nome_rep, nome_setor, nome_distrito, metas_ciclo(ciclo, dias_trabalhados, considerar), fato_abonos(horas_abonadas, dim_calendario(ciclo))'
        )
        .order('nome_rep', { ascending: true });

      if (filtroDistrito && filtroDistrito !== 'Todos') {
        query = query.eq('nome_distrito', filtroDistrito);
      }
      if (filtroSetor && filtroSetor !== 'Todos') {
        query = query.eq('nome_setor', filtroSetor);
      }

      const { data, error: err } = await query;

      if (err) {
        throw new Error(`Erro ao buscar representantes: ${err.message}`);
      }

      setRawDados((data ?? []) as DimHierarquiaRaw[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao buscar dados.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filtroDistrito, filtroSetor]);

  useEffect(() => {
    fetchDados();
  }, [fetchDados]);

  // Reset da paginação quando o filtro de ciclo muda
  useEffect(() => {
    setPagina(1);
  }, [filtroCiclo]);

  // ─── Derivações (memoizadas) ──────────────────────────────

  const ciclosUnicos = useMemo(() => {
    const deMetas = rawDados.flatMap((r) =>
      (r.metas_ciclo ?? []).map((m) => m.ciclo).filter((c): c is string => c !== null)
    );
    const deAbonos = rawDados.flatMap((r) =>
      (r.fato_abonos ?? [])
        .map((a) => extrairCicloAbono(a))
        .filter((c): c is string => c !== null)
    );
    // Remove o ciclo "00" (representa dias não úteis e não deve aparecer no filtro)
    const todosCiclos = Array.from(new Set([...deMetas, ...deAbonos]))
      .filter((c) => !c.endsWith('00'))
      .sort();
    return ['Todos', ...todosCiclos];
  }, [rawDados]);

  const dadosFiltrados = useMemo(
    () => processarDados(rawDados, filtroCiclo),
    [rawDados, filtroCiclo]
  );

  const totalPaginas = Math.max(1, Math.ceil(dadosFiltrados.length / ROWS_PER_PAGE));
  const dadosPaginados = dadosFiltrados.slice(
    (pagina - 1) * ROWS_PER_PAGE,
    pagina * ROWS_PER_PAGE
  );
  const inicioPagina = dadosFiltrados.length === 0 ? 0 : (pagina - 1) * ROWS_PER_PAGE + 1;
  const fimPagina = Math.min(pagina * ROWS_PER_PAGE, dadosFiltrados.length);

  // ─── Header compartilhado ────────────────────────────────

  const cabecalho = (
    <CardHeader className="border-b border-slate-200 bg-slate-50/50 py-4 px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            Detalhamento por Representante
          </CardTitle>
          <CardDescription className="text-slate-500 mt-0.5 text-xs">
            Dias trabalhados e abonados no período
            {filtroDistrito && filtroDistrito !== 'Todos' ? ` — ${filtroDistrito}` : ''}
          </CardDescription>
        </div>

        {!loading && !error && (
          <select
            value={filtroCiclo}
            onChange={(e) => setFiltroCiclo(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shrink-0"
            aria-label="Filtrar por ciclo"
          >
            {ciclosUnicos.map((c) => (
              <option key={c} value={c}>
                {c === 'Todos' ? 'Todos os Ciclos' : formatarCiclo(c)}
              </option>
            ))}
          </select>
        )}
      </div>
    </CardHeader>
  );

  // ─── Estado: Carregando ──────────────────────────────────

  if (loading) {
    return (
      <Card className="border-0 shadow-none rounded-none bg-transparent lg:col-span-2 flex flex-col overflow-hidden">
        {cabecalho}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Setor</th>
                <th className="px-4 py-2 font-medium">Distrito</th>
                <th className="px-4 py-2 font-medium text-center">Dias Trabalhados</th>
                <th className="px-4 py-2 font-medium text-center">Dias Abonados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="h-12 border-t border-slate-100 bg-slate-50/50 px-4 flex items-center">
          <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
        </div>
      </Card>
    );
  }

  // ─── Estado: Erro ────────────────────────────────────────

  if (error) {
    return (
      <Card className="border-red-200 bg-white shadow-sm lg:col-span-2 flex flex-col overflow-hidden">
        <CardHeader className="border-b border-red-100 bg-red-50/50 py-4 px-5">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Detalhamento por Representante
          </CardTitle>
          <CardDescription className="text-red-500 text-xs mt-0.5">
            Não foi possível carregar os dados
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center flex-1 py-12">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 max-w-xs mb-5">{error}</p>
            <button
              onClick={fetchDados}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Renderização Principal ──────────────────────────────

  return (
    <Card className="border-0 shadow-none rounded-none bg-transparent lg:col-span-2 flex flex-col overflow-hidden">
      {cabecalho}

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-[13px] text-left">
          <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Setor</th>
              <th className="px-4 py-2 font-medium">Distrito</th>
              <th className="px-4 py-2 font-medium text-center">Dias Trabalhados</th>
              <th className="px-4 py-2 font-medium text-center">Dias Abonados</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dadosPaginados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  Nenhum representante encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              dadosPaginados.map((rep) => (
                <tr key={rep.codSetor} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-1.5 font-medium whitespace-nowrap text-slate-900">
                    {abreviarNome(rep.nomeRep)}
                  </td>
                  <td className="px-4 py-1.5 whitespace-nowrap text-slate-600">
                    {rep.nomeSetor}
                  </td>
                  <td className="px-4 py-1.5 whitespace-nowrap text-slate-600">
                    {rep.nomeDistrito}
                  </td>
                  <td className="px-4 py-1.5 text-center font-medium text-slate-700">
                    {rep.diasTrabalhados}
                  </td>
                  <td className="px-4 py-1.5 text-center">
                    <span
                      className={
                        rep.diasAbonados > 0
                          ? 'inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200'
                          : 'text-slate-400 text-xs'
                      }
                    >
                      {formatarDiasAbonados(rep.diasAbonados)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Paginação ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
        <p className="text-xs text-slate-500">
          {dadosFiltrados.length === 0
            ? 'Sem resultados'
            : `${inicioPagina}–${fimPagina} de ${dadosFiltrados.length} representantes`}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-600 px-2 tabular-nums">
            {pagina} / {totalPaginas}
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

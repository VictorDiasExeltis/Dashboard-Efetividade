'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Users,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
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
  // CSV de ciclos vindos do header global ("202604" ou "202604,202605").
  // "Todos" ou string vazia = sem filtro de ciclo.
  filtroCiclo?: string;
  // Destaque vindo do clique no donut de abonos: cod_setores a realçar +
  // o motivo selecionado (mostrado num chip) + callback pra limpar.
  highlightSetores?: number[];
  motivoHighlight?: string | null;
  onLimparHighlight?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────

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
  // filtroCiclo aceita "Todos", um único ciclo ("202604") ou CSV
  // ("202604,202605") quando o usuário fez Ctrl+clique no header global.
  const isTodos = !filtroCiclo || filtroCiclo === 'Todos';
  const ciclosFiltro = isTodos
    ? new Set<string>()
    : new Set(filtroCiclo.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean));
  const matchCiclo = (ciclo: string | null | undefined) =>
    isTodos || (ciclo != null && ciclosFiltro.has(ciclo.trim().toLowerCase()));

  return rows.map((row) => {
    const metas = (isTodos
      ? (row.metas_ciclo ?? [])
      : (row.metas_ciclo ?? []).filter((m) => matchCiclo(m.ciclo))
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

    const abonos = isTodos
      ? todosAbonos
      : todosAbonos.filter((a) => matchCiclo(extrairCicloAbono(a)));

    const diasTrabalhados = metas.reduce((acc, m) => acc + (m.dias_trabalhados ?? 0), 0);
    const totalHoras = abonos.reduce((acc, a) => acc + (a.horas_abonadas ?? 0), 0);
    const diasAbonados = Math.round((totalHoras / 8) * 10) / 10;

    let desconsiderado = false;
    if (!isTodos) {
      // Desconsidera quando NENHUM dos ciclos selecionados tem meta ativa.
      const algumaMetaAtiva = (row.metas_ciclo ?? []).some(
        (m) => matchCiclo(m.ciclo) && m.considerar === true,
      );
      if (!algumaMetaAtiva) desconsiderado = true;
    } else {
      const temMetasAtivas = (row.metas_ciclo ?? []).some((m) => m.considerar === true);
      if (!temMetasAtivas) desconsiderado = true;
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
  filtroCiclo = 'Todos',
  highlightSetores,
  motivoHighlight = null,
  onLimparHighlight,
}: TabelaRepresentantesProps) {
  const [rawDados, setRawDados] = useState<DimHierarquiaRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  // Ordenação da coluna "Dias Abonados": null = ordem original (por nome)
  const [ordemAbonados, setOrdemAbonados] = useState<'desc' | 'asc' | null>(null);

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

  const dadosFiltrados = useMemo(
    () => processarDados(rawDados, filtroCiclo),
    [rawDados, filtroCiclo]
  );

  // Aplica ordenação por "Dias Abonados" sem mutar o array original.
  const dadosOrdenados = useMemo(() => {
    if (!ordemAbonados) return dadosFiltrados;
    const fator = ordemAbonados === 'desc' ? -1 : 1;
    return [...dadosFiltrados].sort(
      (a, b) => (a.diasAbonados - b.diasAbonados) * fator
    );
  }, [dadosFiltrados, ordemAbonados]);

  // Cicla a ordenação: padrão → desc → asc → padrão.
  const alternarOrdemAbonados = useCallback(() => {
    setOrdemAbonados((atual) =>
      atual === null ? 'desc' : atual === 'desc' ? 'asc' : null
    );
  }, []);

  // Volta pra primeira página ao trocar a ordenação.
  useEffect(() => {
    setPagina(1);
  }, [ordemAbonados]);

  // Set de cod_setores destacados (clique no donut de abonos). codSetor é string.
  const highlightSet = useMemo(
    () => new Set((highlightSetores ?? []).map(String)),
    [highlightSetores],
  );

  // Quando há destaque, traz os reps destacados pro topo (sort estável preserva
  // a ordem anterior dentro de cada grupo). Senão, mantém dadosOrdenados.
  const dadosExibidos = useMemo(() => {
    if (highlightSet.size === 0) return dadosOrdenados;
    return [...dadosOrdenados].sort(
      (a, b) => (highlightSet.has(String(b.codSetor)) ? 1 : 0) - (highlightSet.has(String(a.codSetor)) ? 1 : 0),
    );
  }, [dadosOrdenados, highlightSet]);

  // Volta pra primeira página ao mudar o motivo destacado.
  useEffect(() => {
    setPagina(1);
  }, [motivoHighlight]);

  const totalPaginas = Math.max(1, Math.ceil(dadosExibidos.length / ROWS_PER_PAGE));
  const dadosPaginados = dadosExibidos.slice(
    (pagina - 1) * ROWS_PER_PAGE,
    pagina * ROWS_PER_PAGE
  );
  const inicioPagina = dadosExibidos.length === 0 ? 0 : (pagina - 1) * ROWS_PER_PAGE + 1;
  const fimPagina = Math.min(pagina * ROWS_PER_PAGE, dadosExibidos.length);

  // ─── Header compartilhado ────────────────────────────────

  const cabecalho = (
    <CardHeader className="border-b border-slate-200 bg-slate-50/50 py-4 px-5">
      <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
        <Users className="h-4 w-4 text-blue-600" />
        Detalhamento por Representante
      </CardTitle>
      <CardDescription className="text-slate-500 mt-0.5 text-xs">
        Dias trabalhados e abonados no período
        {filtroDistrito && filtroDistrito !== 'Todos' ? ` — ${filtroDistrito}` : ''}
      </CardDescription>
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

      {/* Chip do motivo destacado (clique no donut de abonos) */}
      {motivoHighlight && (
        <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 border-b border-amber-100">
          <span className="text-[11px] font-medium text-amber-800">
            Destacando reps com abono de
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-900 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
            {motivoHighlight}
            <span className="text-amber-500">· {highlightSet.size}</span>
          </span>
          <button
            type="button"
            onClick={() => onLimparHighlight?.()}
            className="ml-auto text-[11px] font-medium text-amber-700 hover:text-amber-900 underline"
          >
            Limpar
          </button>
        </div>
      )}

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-[11px] text-left">
          <thead className="text-[10px] text-slate-500 bg-slate-50 border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th className="px-2 py-2 font-medium">Nome</th>
              <th className="px-2 py-2 font-medium">Setor</th>
              <th className="px-2 py-2 font-medium">Distrito</th>
              <th className="px-2 py-2 font-medium text-center">Dias Trabalhados</th>
              <th className="px-2 py-2 font-medium text-center">
                <button
                  type="button"
                  onClick={alternarOrdemAbonados}
                  className="inline-flex items-center gap-1 mx-auto uppercase tracking-wider hover:text-slate-700 transition-colors"
                  title="Ordenar por dias abonados"
                  aria-label={
                    ordemAbonados === 'desc'
                      ? 'Ordenado do maior para o menor — clique para inverter'
                      : ordemAbonados === 'asc'
                        ? 'Ordenado do menor para o maior — clique para limpar'
                        : 'Sem ordenação — clique para ordenar do maior para o menor'
                  }
                >
                  Dias Abonados
                  {ordemAbonados === 'desc' ? (
                    <ArrowDown className="h-3 w-3 text-blue-600" />
                  ) : ordemAbonados === 'asc' ? (
                    <ArrowUp className="h-3 w-3 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  )}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dadosPaginados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-10 text-center text-sm text-slate-400">
                  Nenhum representante encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              dadosPaginados.map((rep) => {
                const destacado = highlightSet.has(String(rep.codSetor));
                return (
                <tr
                  key={rep.codSetor}
                  className={
                    destacado
                      ? 'bg-amber-50 hover:bg-amber-100/70 transition-colors'
                      : 'hover:bg-slate-50/80 transition-colors ' + (motivoHighlight ? 'opacity-50' : '')
                  }
                >
                   <td className={`px-2 py-1.5 font-medium whitespace-nowrap text-slate-900 ${destacado ? 'border-l-2 border-amber-400' : ''}`}>
                    {abreviarNome(rep.nomeRep)}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-slate-600">
                    {rep.nomeSetor}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-slate-600">
                    {rep.nomeDistrito}
                  </td>
                  <td className="px-2 py-1.5 text-center font-medium text-slate-700">
                    {rep.diasTrabalhados}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span
                      className={
                        rep.diasAbonados > 0
                          ? 'inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200'
                          : 'text-slate-400 text-[10px]'
                      }
                    >
                      {formatarDiasAbonados(rep.diasAbonados)}
                    </span>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Paginação ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
        <p className="text-xs text-slate-500">
          {dadosOrdenados.length === 0
            ? 'Sem resultados'
            : `${inicioPagina}–${fimPagina} de ${dadosOrdenados.length} representantes`}
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

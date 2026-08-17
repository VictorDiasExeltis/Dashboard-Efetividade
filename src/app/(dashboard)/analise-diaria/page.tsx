'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import {
  TrendingUp,
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Input } from '@/src/components/ui/input';
import { Card, CardContent } from '@/src/components/ui/card';
import { useLayout } from '@/src/context/LayoutContext';
import { AnaliseDiariaFilters } from '@/src/components/dashboard/AnaliseDiariaFilters';
import {
  getAnaliseDiaria,
  getCicloProgresso,
  type AnaliseDiariaRow,
  type CicloProgresso,
  type StatusProjecao,
} from '@/src/app/actions/analise-diaria';

// ---------------------------------------------------------------------------
// Linha exibida — agnóstica de estrutura (setor ou distrito agregado).
// ---------------------------------------------------------------------------
interface DisplayRow {
  id: string;
  label: string;            // nome do setor OU do distrito
  sublabel: string;         // rep (setor) OU "N setores" (distrito)
  visitasRealizadas: number;
  visitasMeta: number | null;
  coberturaAtual: number | null;   // % realizada (vr/painel)
  metaPct: number | null;          // % meta do ciclo (ex.: 0.78)
  mdvAtual: number | null;
  mdvNecessaria: number | null;
  projecao: number | null;
  diasTrabalhados: number;
  diasAbonados: number;
  diasRestantes: number;
  status: StatusProjecao;
}

const STATUS_META: Record<StatusProjecao, { label: string; texto: string; cor: string; bg: string; icon: React.ElementType }> = {
  manter:  { label: 'Manter ritmo', texto: 'No caminho para bater a meta.',           cor: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle2 },
  atencao: { label: 'Atenção',      texto: 'Ligeiramente abaixo — acelerar visitas.',  cor: 'text-amber-700',   bg: 'bg-amber-50',   icon: AlertTriangle },
  acao:    { label: 'Ação urgente', texto: 'Ritmo insuficiente para a meta.',          cor: 'text-rose-700',    bg: 'bg-rose-50',    icon: AlertTriangle },
  na:      { label: 'Sem dados',    texto: 'Falta meta/painel do ciclo ou dias.',       cor: 'text-slate-500',   bg: 'bg-slate-100',  icon: MinusCircle },
};

// Colunas ordenáveis da tabela.
type SortCol = 'setor' | 'diasTrab' | 'visitas' | 'meta' | 'mdv' | 'projecao' | 'diasRest' | 'status';
type SortDir = 'asc' | 'desc';

// Ordem de urgência do indicativo (asc = mais urgente primeiro).
const STATUS_RANK: Record<StatusProjecao, number> = { acao: 0, atencao: 1, manter: 2, na: 3 };

// Header clicável com seta de ordenação (mesmo padrão da tela de Médicos não Visitados).
function SortHeader({ label, myKey, sortKey, sortDir, onClick, align = 'left' }: {
  label: string; myKey: SortCol; sortKey: SortCol | null; sortDir: SortDir;
  onClick: (k: SortCol) => void; align?: 'left' | 'right';
}) {
  const active = sortKey === myKey;
  const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onClick(myKey)}
      className={cn(
        'inline-flex items-center gap-1 hover:text-slate-900 transition-colors',
        active && 'text-slate-900',
        align === 'right' && 'flex-row-reverse',
      )}
    >
      {label}
      <Icon className={cn('w-3 h-3', active ? 'opacity-90' : 'opacity-50')} />
    </button>
  );
}

// Abrevia nomes do meio: mantém primeiro e último por extenso, demais viram
// iniciais. Conectores (de/da/do/...) são removidos. Title-case no resultado.
// Ex.: "CARLOS ALBERTO FERREIRA DA SILVA" → "Carlos A. F. Silva".
const CONECTORES = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
function abreviarNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  if (partes.length <= 1) return partes[0] ? cap(partes[0]) : '—';
  const meio = partes.slice(1, -1)
    .filter((w) => !CONECTORES.has(w.toLowerCase()))
    .map((w) => w.charAt(0).toUpperCase() + '.');
  return [cap(partes[0]), ...meio, cap(partes[partes.length - 1])].join(' ');
}

const fmt1 = (v: number | null) => (v == null ? '—' : v.toFixed(1));
const fmtInt = (v: number | null) => (v == null ? '—' : Math.round(v).toLocaleString('pt-BR'));
const fmtPct = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(0)}%`);
// Dias: mostra fração só quando há (6.25 → "6,25"; 8 → "8").
const fmtDias = (v: number | null) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// ---------------------------------------------------------------------------
// Tooltip dark padrão do dashboard.
// ---------------------------------------------------------------------------
// Tooltip para barra empilhada Realizado + (gap até Meta). Mostra realizado e
// meta cheia (lidos do próprio datum, não dos segmentos).
function ChartTooltip({ active, payload, label, suffix = '', nameRealizado, nameMeta }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload ?? {};
  return (
    <div className="bg-slate-900 text-white text-xs rounded-md shadow-xl border border-slate-800 px-3 py-2">
      <p className="font-semibold mb-1">{label}</p>
      <p className="flex items-center gap-2">
        <span className="text-slate-300">{nameRealizado}:</span>
        <span className="font-semibold">{d.Realizado}{suffix}</span>
      </p>
      <p className="flex items-center gap-2">
        <span className="text-slate-300">{nameMeta}:</span>
        <span className="font-semibold">{d.Meta}{suffix}</span>
      </p>
    </div>
  );
}

// Legenda em pílulas (mesmo estilo da tela Cobertura/MDV).
// `order` fixa a sequência (ex.: Realizado antes de Meta) independente da
// ordem interna do Recharts.
function CustomChartLegend({ payload, order }: any) {
  if (!payload) return null;
  const items = order
    ? [...payload].sort((a: any, b: any) => order.indexOf(a.value) - order.indexOf(b.value))
    : payload;
  return (
    <div className="flex flex-wrap justify-center gap-2 pb-8 select-none">
      {items.map((entry: any, i: number) => (
        <div
          key={`leg-${i}`}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600 text-[11px] font-bold shadow-sm"
        >
          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: entry.color }} />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// Rótulo de dados das linhas: badge colorido com texto branco (estilo Cobertura/MDV).
// Sempre visível (sem toggle).
function CustomLineLabel(props: any) {
  const { x, y, value, color } = props;
  if (value === undefined || value === null || x === undefined || y === undefined) return null;
  const width = 34;
  const height = 18;
  return (
    <g>
      <rect x={x - width / 2} y={y - height - 6} width={width} height={height} rx={3} ry={3} fill={color || '#3b82f6'} />
      <text x={x} y={y - height / 2 - 6} fill="#ffffff" textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight="bold">
        {Number(value).toLocaleString('pt-BR')}
      </text>
    </g>
  );
}

interface BarCompareProps {
  title: string;
  description: string;
  icon: React.ElementType;
  data: any[];               // { label, Realizado, Restante, Meta }
  colorRealizado: string;
  nameRealizado: string;
  nameMeta: string;
  suffix?: string;
  loading: boolean;
  chartType?: 'line' | 'bar';   // 'bar' quando um único setor está selecionado
}

const labelFmt = (v: any) => { const n = Number(v); return n ? n.toLocaleString('pt-BR') : ''; };
const META_COLOR = '#f59e0b';   // âmbar para a série de meta (mais vivo que o cinza)

function BarCompareCard({ title, description, icon: Icon, data, colorRealizado, nameRealizado, nameMeta, suffix = '', loading, chartType = 'line' }: BarCompareProps) {
  return (
    <Card className="border border-slate-200 shadow-sm bg-white">
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-50 shrink-0">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>

        {loading ? (
          <div className="h-[320px] w-full bg-slate-100 rounded-lg animate-pulse" />
        ) : data.length === 0 ? (
          <div className="h-[320px] w-full flex items-center justify-center text-sm text-slate-400">
            Sem dados para os filtros selecionados.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            {chartType === 'bar' ? (
              <BarChart data={data} margin={{ top: 36, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} angle={-35} textAnchor="end" interval={0} height={60} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} isAnimationActive={false} content={<ChartTooltip suffix={suffix} nameRealizado={nameRealizado} nameMeta={nameMeta} />} />
                <Legend verticalAlign="top" content={<CustomChartLegend order={[nameRealizado, nameMeta]} />} />
                {/* Barras lado a lado. */}
                <Bar dataKey="Realizado" name={nameRealizado} fill={colorRealizado} radius={[4, 4, 0, 0]} maxBarSize={64}>
                  <LabelList dataKey="Realizado" position="top" fill={colorRealizado} fontSize={11} fontWeight={600} formatter={labelFmt} />
                </Bar>
                <Bar dataKey="Meta" name={nameMeta} fill={META_COLOR} radius={[4, 4, 0, 0]} maxBarSize={64}>
                  <LabelList dataKey="Meta" position="top" fill={META_COLOR} fontSize={11} fontWeight={600} formatter={labelFmt} />
                </Bar>
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 36, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} angle={-35} textAnchor="end" interval={0} height={60} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip isAnimationActive={false} content={<ChartTooltip suffix={suffix} nameRealizado={nameRealizado} nameMeta={nameMeta} />} />
                <Legend verticalAlign="top" content={<CustomChartLegend order={[nameRealizado, nameMeta]} />} />
                {/* Realizado: linha cheia na cor (esquerda na legenda). */}
                <Line type="linear" dataKey="Realizado" name={nameRealizado} stroke={colorRealizado} strokeWidth={2.5} dot={{ r: 3, fill: colorRealizado }}>
                  <LabelList dataKey="Realizado" content={(p: any) => <CustomLineLabel {...p} color={colorRealizado} />} />
                </Line>
                {/* Meta: linha tracejada. */}
                <Line type="linear" dataKey="Meta" name={nameMeta} stroke={META_COLOR} strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: META_COLOR }}>
                  <LabelList dataKey="Meta" content={(p: any) => <CustomLineLabel {...p} color={META_COLOR} />} />
                </Line>
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnaliseDiaria() {
  const { setHeaderState } = useLayout();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AnaliseDiariaRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [progresso, setProgresso] = useState<CicloProgresso | null>(null);

  const setor = searchParams.get('setor') || 'Todos';
  // Setor único selecionado → barras lado a lado; senão, linhas.
  const chartType: 'line' | 'bar' = setor !== 'Todos' ? 'bar' : 'line';

  // Distrito é obrigatório. Default = primeiro distrito disponível (ordenado),
  // alinhado ao que o filtro força na URL.
  const distritosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.nome_distrito) set.add(r.nome_distrito); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);
  const distrito = searchParams.get('distrito') || distritosDisponiveis[0] || '';

  // Header (título + subtítulo + filtros).
  useEffect(() => {
    setHeaderState({
      title: 'Análise de Ciclo',
      subtitle: 'Desempenho de visitação por setor no meio do ciclo e projeção de meta',
      filters: (
        <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-md" />}>
          <AnaliseDiariaFilters />
        </Suspense>
      ),
    });
    return () => setHeaderState({});
  }, [setHeaderState]);

  // Carga real: tudo calculado no servidor (getAnaliseDiaria).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAnaliseDiaria()
      .then((data) => { if (!cancelled) setRows(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    getCicloProgresso()
      .then((p) => { if (!cancelled) setProgresso(p); });
    return () => { cancelled = true; };
  }, []);


  // Linhas por setor, filtradas por distrito/setor.
  const displayRows = useMemo<DisplayRow[]>(() => {
    return rows
      .filter((r) => {
        if (r.nome_distrito !== distrito) return false;
        if (setor !== 'Todos' && r.nome_setor !== setor) return false;
        return true;
      })
      .map((r) => ({
        id: String(r.cod_setor),
        label: r.nome_setor,
        sublabel: r.nome_rep ? abreviarNome(r.nome_rep) : '—',
        visitasRealizadas: r.visitas_realizadas,
        visitasMeta: r.visitas_meta,
        coberturaAtual: r.cobertura_atual,
        metaPct: r.meta_pct,
        mdvAtual: r.mdv_atual,
        mdvNecessaria: r.mdv_necessaria,
        projecao: r.projecao_fim,
        diasTrabalhados: r.dias_trabalhados,
        diasAbonados: r.dias_abonados,
        diasRestantes: r.dias_restantes,
        status: r.status,
      }));
  }, [rows, distrito, setor]);

  // Empilhado: Realizado (base) + Restante (gap até a meta). Meta = valor cheio
  // para o tooltip. Stack total = max(realizado, meta).
  const chartVisitas = useMemo(
    () => displayRows.map((r) => {
      const realizado = r.visitasRealizadas;
      const meta = r.visitasMeta ?? 0;
      // Linha "Meta" mostra quantas visitas FALTAM para bater a meta.
      return { label: r.label, Realizado: realizado, Meta: Math.max(meta - realizado, 0) };
    }),
    [displayRows],
  );
  const chartMdv = useMemo(
    () => displayRows.map((r) => {
      const atual = r.mdvAtual != null ? Math.round(r.mdvAtual * 10) / 10 : 0;
      const nec = r.mdvNecessaria != null ? Math.round(r.mdvNecessaria * 10) / 10 : 0;
      return { label: r.label, Realizado: atual, Restante: Math.max(Math.round((nec - atual) * 10) / 10, 0), Meta: nec };
    }),
    [displayRows],
  );

  // Tabela: aplica busca (rep / cod_setor / nome_setor) + ordenação por coluna.
  const tableRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let arr = displayRows;
    if (q) {
      arr = arr.filter((r) =>
        r.label.toLowerCase().includes(q) ||
        r.sublabel.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q),
      );
    }
    if (sortKey) {
      const sign = sortDir === 'asc' ? 1 : -1;
      const val = (r: DisplayRow): number => {
        switch (sortKey) {
          case 'diasTrab':  return r.diasTrabalhados;
          case 'visitas':   return r.visitasRealizadas;
          case 'meta':      return r.coberturaAtual ?? -Infinity;
          case 'mdv':       return r.mdvAtual ?? -Infinity;
          case 'projecao':  return r.projecao ?? -Infinity;
          case 'diasRest':  return r.diasRestantes;
          case 'status':    return STATUS_RANK[r.status];
          default:          return 0;
        }
      };
      arr = [...arr].sort((a, b) =>
        sortKey === 'setor'
          ? a.label.localeCompare(b.label, 'pt-BR') * sign
          : (val(a) - val(b)) * sign,
      );
    }
    return arr;
  }, [displayRows, searchTerm, sortKey, sortDir]);

  function handleSort(key: SortCol) {
    if (sortKey === key) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return; }
    setSortKey(key);
    setSortDir(key === 'setor' ? 'asc' : 'desc');
  }

  const cardTitulo    = 'Análise por Representante';
  const cardSubtitulo = 'Análise de desempenho do ciclo atual';
  const descVisitas   = 'Visitas realizadas vs. visitas faltantes para a meta';
  const descMdv       = 'Média de visitas/dia atual vs. necessária para a meta';

  return (
    <div className="p-6 space-y-6">
      {/* Progresso do ciclo: em que dia útil estamos e quantos faltam */}
      {progresso?.ciclo && (
        <div className="flex items-center px-1">
          <div className="flex items-center gap-2 text-slate-500">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Ciclo {progresso.ciclo.slice(-2)} · Dia {progresso.dia_atual} de {progresso.dias_uteis} dias úteis · faltam {progresso.dias_restantes} {progresso.dias_restantes === 1 ? 'dia útil' : 'dias úteis'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <BarCompareCard
          title="Visitas Realizadas x Faltantes"
          description={descVisitas}
          icon={TrendingUp}
          data={chartVisitas}
          colorRealizado="#3b82f6"
          nameRealizado="Visitas Realizadas"
          nameMeta="Visitas necessárias para a meta"
          loading={loading}
          chartType={chartType}
        />
        <BarCompareCard
          title="Média de Visitas Diárias"
          description={descMdv}
          icon={CalendarCheck}
          data={chartMdv}
          colorRealizado="#10b981"
          nameRealizado="MDV Atual"
          nameMeta="MDV necessária para a meta"
          loading={loading}
          chartType={chartType}
        />
      </div>

      {/* Tabela de análise com projeção */}
      <Card className="overflow-hidden border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div>
            <h3 className="font-semibold text-slate-800">{cardTitulo}</h3>
            <p className="text-sm text-slate-500">{cardSubtitulo}</p>
          </div>
        </div>

        {/* Toolbar: busca + contador */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-white">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por representante, cód. ou nome do setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white border-slate-200 focus-visible:ring-blue-500"
            />
          </div>
          <span className="text-sm text-slate-500 shrink-0">
            <span className="font-medium text-slate-900">{tableRows.length.toLocaleString('pt-BR')}</span> setores
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs">
              <tr>
                <th className="px-4 py-3 font-medium text-left">
                  <SortHeader label="Setor" myKey="setor" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                </th>
                <th className="px-4 py-3 font-medium text-center">
                  <SortHeader label="Dias (trab / abon)" myKey="diasTrab" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                </th>
                <th className="px-4 py-3 font-medium text-center">
                  <SortHeader label="Visitas (real / meta)" myKey="visitas" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                </th>
                <th className="px-4 py-3 font-medium text-center">
                  <SortHeader label="% Meta (real / ciclo)" myKey="meta" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                </th>
                <th className="px-4 py-3 font-medium text-center">
                  <SortHeader label="MDV (atual / nec.)" myKey="mdv" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                </th>
                <th className="px-4 py-3 font-medium text-center">
                  <SortHeader label="Projeção" myKey="projecao" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                </th>
                <th className="px-4 py-3 font-medium text-center">
                  <SortHeader label="Indicativo" myKey="status" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="bg-white border-b border-slate-100 last:border-0">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-full max-w-[120px] bg-slate-200 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : tableRows.length === 0 ? (
                <tr className="bg-white">
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                    Nenhum dado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                tableRows.map((r) => {
                  const meta = STATUS_META[r.status];
                  const StatusIcon = meta.icon;
                  // Cor pela cobertura realizada vs meta — compara os % JÁ
                  // arredondados, pra cor casar com o valor exibido na célula.
                  const bateuMeta = r.coberturaAtual != null && r.metaPct != null
                    ? Math.round(r.coberturaAtual * 100) >= Math.round(r.metaPct * 100)
                    : null;
                  const pctClass = bateuMeta == null ? 'text-slate-400 bg-slate-100'
                    : bateuMeta ? 'text-blue-600 bg-blue-50'    // >= meta
                    : 'text-rose-600 bg-rose-50';               // abaixo da meta
                  return (
                    <tr key={r.id} className="bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-left">
                        <div className="font-semibold text-slate-900">{r.label}</div>
                        <div className="text-[11px] text-slate-500">{r.sublabel}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">
                        <span className="font-semibold text-slate-900">{fmtDias(r.diasTrabalhados)}</span>
                        <span className="text-slate-400"> / {fmtDias(r.diasAbonados)}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">
                        <span className="font-semibold text-slate-900">{fmtInt(r.visitasRealizadas)}</span>
                        <span className="text-slate-400"> / {fmtInt(r.visitasMeta)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${pctClass}`}>{fmtPct(r.coberturaAtual)}</span>
                        <span className="text-slate-400 text-xs"> / {fmtPct(r.metaPct)}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">
                        <span className="font-semibold text-slate-900">{fmt1(r.mdvAtual)}</span>
                        <span className="text-slate-400"> / {fmt1(r.mdvNecessaria)}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-900">{fmtInt(r.projecao)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${meta.bg} ${meta.cor}`} title={meta.texto}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

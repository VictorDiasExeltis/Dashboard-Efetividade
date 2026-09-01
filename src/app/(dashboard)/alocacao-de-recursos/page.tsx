'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { Package, Users, Percent, Shield, HelpCircle, UserCheck } from 'lucide-react';
import { DashboardFilters } from '@/src/components/dashboard/DashboardFilters';
import {
  getAvailableSetores,
  getAmostrasData,
  getAmostrasRecortePorSegmentacao,
  getAmostrasRecortePorClassificacao,
  type MedicoAmostra,
} from '@/src/app/actions';
import { RecorteModal, type ColunaRecorte } from '@/src/components/recorte/RecorteModal';
import { SEGMENTACOES, slug } from '@/src/lib/recorte/formato';
import { ListFilter } from 'lucide-react';

// Colunas dos recortes. O gráfico de segmentação mostra a coluna Segmentação;
// o de classificação não, porque lá a linha é o médico e a segmentação
// dependeria da marca entregue — informação que aquele gráfico não usa.
const COLUNAS_BASE: ColunaRecorte<MedicoAmostra>[] = [
  { chave: 'crmuf',    label: 'CRM/UF',        valor: (l) => l.crmuf },
  { chave: 'nome',     label: 'Nome',          valor: (l) => l.nome_medico },
  { chave: 'setor',    label: 'Setor',         valor: (l) => l.nome_setor },
  { chave: 'distrito', label: 'Distrito',      valor: (l) => l.nome_distrito },
  { chave: 'class',    label: 'Classificação', valor: (l) => l.classificacao ?? '—' },
];

const COLUNAS_METRICAS: ColunaRecorte<MedicoAmostra>[] = [
  { chave: 'amostras', label: 'Amostras', className: 'text-right', valor: (l) => l.amostras },
  { chave: 'visitas',  label: 'Visitas',  className: 'text-right', valor: (l) => l.visitas },
];

// Endereço: só no Excel, para o trabalho de campo. Fora da tabela da tela,
// que já disputa largura. Entra por último nas duas exportações.
const COLUNAS_ENDERECO: ColunaRecorte<MedicoAmostra>[] = [
  { chave: 'estado',    label: 'Estado',    somenteExport: true, valor: (l) => l.estado    ?? '' },
  { chave: 'municipio', label: 'Município', somenteExport: true, valor: (l) => l.municipio ?? '' },
  { chave: 'bairro',    label: 'Bairro',    somenteExport: true, valor: (l) => l.bairro    ?? '' },
  { chave: 'cep',       label: 'CEP',       somenteExport: true, valor: (l) => l.cep       ?? '' },
];

const COLUNAS_SEG: ColunaRecorte<MedicoAmostra>[] = [
  ...COLUNAS_BASE,
  { chave: 'segmentacao', label: 'Segmentação', valor: (l) => l.segmentacao },
  ...COLUNAS_METRICAS,
  ...COLUNAS_ENDERECO,
];

const COLUNAS_CLASS: ColunaRecorte<MedicoAmostra>[] = [
  ...COLUNAS_BASE,
  ...COLUNAS_METRICAS,
  ...COLUNAS_ENDERECO,
];

// Filtros vigentes por extenso, para o cabeçalho do modal e do arquivo.
function descreverRecorteAmostras(
  ciclo: string, distrito: string, setor: string, produto: string, dimensao: string,
): string {
  const partes: string[] = [];
  partes.push(ciclo === 'Todos' ? 'Todos os ciclos' : `Ciclo ${ciclo}`);
  if (distrito !== 'Todos') partes.push(`Distrito ${distrito}`);
  if (setor !== 'Todos') partes.push(`Setor ${setor}`);
  if (produto !== 'Todos') partes.push(`Produto ${produto}`);
  if (dimensao !== 'Todas') partes.push(dimensao);
  return partes.join(' · ');
}

import { useLayout } from '@/src/context/LayoutContext';

const CustomLegend = ({ payload, highlighted, onToggle }: any) => {
  if (!payload) return null;
  const hasSel: boolean = highlighted instanceof Set && highlighted.size > 0;
  return (
    <div className="flex flex-wrap justify-center gap-2 pb-4 select-none">
      {payload.map((entry: any, index: number) => {
        const isMedicos = entry.value === 'Nº de Médicos';
        const dotStyle = isMedicos
          ? { background: 'conic-gradient(#0284c7 0 90deg, #059669 90deg 180deg, #d97706 180deg 270deg, #7c3aed 270deg)' }
          : { backgroundColor: '#0ea5e9' };
        const active = !hasSel || highlighted.has(entry.value);
        return (
          <button
            type="button"
            key={`item-${index}`}
            onClick={() => onToggle?.(entry.value)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold transition-all shadow-sm cursor-pointer ${
              active
                ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'border-slate-100 bg-white text-slate-300 opacity-50 hover:opacity-80'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0 transition-opacity"
              style={{ ...dotStyle, opacity: active ? 1 : 0.35 }}
            />
            <span>{entry.value}</span>
          </button>
        );
      })}
    </div>
  );
};

const CustomLineLabel = (props: any) => {
  const { x, y, value } = props;
  if (value === undefined || value === null) return null;

  const formattedValue = Number(value).toFixed(1);
  const width = 34;
  const height = 18;

  return (
    <g>
      <rect
        x={x - width / 2}
        y={y - height - 6}
        width={width}
        height={height}
        rx={3}
        ry={3}
        fill="#0ea5e9"
      />
      <text
        x={x}
        y={y - height / 2 - 6}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
        fontWeight="bold"
      >
        {formattedValue}
      </text>
    </g>
  );
};

// Rótulo de valor dentro da barra: texto branco com contorno da cor da barra.
// paintOrder="stroke" desenha o contorno atrás do preenchimento (texto legível).
function BarValueLabel({ x, y, width, height, value, color }: any) {
  if (value == null || x == null) return null;
  const cx = Number(x) + Number(width) / 2;
  const cy = Number(y) + Number(height) - 12;
  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      fontSize={12}
      fontWeight="bold"
      fill="#ffffff"
      stroke={color}
      strokeWidth={2.5}
      paintOrder="stroke"
      style={{ strokeLinejoin: 'round' }}
    >
      {Number(value).toLocaleString('pt-BR')}
    </text>
  );
}

const CHART = {
  grid: '#f1f5f9',
  tick: '#64748b',
  tooltip: { bg: '#ffffff', border: '#e2e8f0', color: '#0f172a' },
  line: '#0ea5e9', // sky-500 — média amostras
};

// Gradientes vão de uma cor a outra cor com hue shift sutil (cores vizinhas).
const SEG_GRADIENTS: Record<string, { id: string; from: string; to: string; solid: string }> = {
  'PROTEGER':        { id: 'gradProteger',   from: '#3b82f6', to: '#4f46e5', solid: '#3b82f6' }, // blue → indigo
  'CONQUISTAR':      { id: 'gradConquistar', from: '#10b981', to: '#0d9488', solid: '#059669' }, // emerald → teal
  'MANTER':          { id: 'gradManter',     from: '#f59e0b', to: '#f97316', solid: '#ea580c' }, // amber → orange
  'OBSERVAR':        { id: 'gradObservar',   from: '#8b5cf6', to: '#9333ea', solid: '#7c3aed' }, // violet → purple
  'SEM SEGMENTAÇÃO': { id: 'gradSem',        from: '#64748b', to: '#475569', solid: '#52525b' }, // slate → slate-darker
};

// Paleta para classificação — mesmas duplas com hue shift sutil.
const CLASS_GRADIENTS: Array<{ id: string; from: string; to: string; solid: string }> = [
  { id: 'gradC0', from: '#ec4899', to: '#f43f5e', solid: '#db2777' }, // pink → rose
  { id: 'gradC1', from: '#3b82f6', to: '#4f46e5', solid: '#3b82f6' }, // blue → indigo
  { id: 'gradC2', from: '#10b981', to: '#0d9488', solid: '#059669' }, // emerald → teal
  { id: 'gradC3', from: '#f59e0b', to: '#f97316', solid: '#ea580c' }, // amber → orange
  { id: 'gradC4', from: '#8b5cf6', to: '#9333ea', solid: '#7c3aed' }, // violet → purple
  { id: 'gradC5', from: '#06b6d4', to: '#2563eb', solid: '#0ea5e9' }, // cyan → blue
  { id: 'gradC6', from: '#64748b', to: '#475569', solid: '#52525b' }, // slate → slate-darker
];

function getSegGradient(name: string) {
  return SEG_GRADIENTS[name] ?? SEG_GRADIENTS['SEM SEGMENTAÇÃO'];
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
      <span className="flex items-center gap-1.5 text-[11px] text-blue-500 font-medium">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0ms]" />
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:300ms]" />
      </span>
    </div>
  );
}

function AlocacaoDeRecursosContent() {
  const [mounted, setMounted] = useState(false);
  const [availableSetores, setAvailableSetores] = useState<string[]>([]);
  const [segData, setSegData]       = useState<Array<{ segmentacao: string; medicos: number; mediaAmostras: number }>>([]);
  const [classData, setClassData]   = useState<Array<{ classificacao: string; medicos: number; mediaAmostras: number }>>([]);
  const [totalAmostras, setTotalAmostras]           = useState(0);
  const [totalMedicosPainel, setTotalMedicosPainel] = useState(0);
  const [totalMedicosComAmostra, setTotalMedicosComAmostra] = useState(0);
  const [loading, setLoading]       = useState(false);

  // Legendas interativas (multi-seleção por clique). Um destaque independente
  // por gráfico. Vazio = todas as séries em destaque (gráfico normal).
  const [segHighlight, setSegHighlight]     = useState<Set<string>>(new Set());
  const [classHighlight, setClassHighlight] = useState<Set<string>>(new Set());

  // Recortes detalhados dos dois gráficos. Estados separados: são bases
  // diferentes (entregas × painel), então nunca abrem juntos.
  const [recSegAberto, setRecSegAberto]     = useState(false);
  const [recSegFiltro, setRecSegFiltro]     = useState('Todas');
  const [recClassAberto, setRecClassAberto] = useState(false);
  const [recClassFiltro, setRecClassFiltro] = useState('Todas');


  const makeToggle =
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (label: string) =>
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(label)) next.delete(label);
        else next.add(label);
        return next;
      });
  const toggleSeg   = makeToggle(setSegHighlight);
  const toggleClass = makeToggle(setClassHighlight);
  const segActive   = (n: string) => segHighlight.size === 0   || segHighlight.has(n);
  const classActive = (n: string) => classHighlight.size === 0 || classHighlight.has(n);

  const searchParams = useSearchParams();
  const estrutura   = searchParams.get('estrutura') || 'Distrito';
  const distritoRaw = searchParams.get('distrito')  || 'Todos';
  const distrito    = estrutura === 'Setor' && distritoRaw === 'Todos' ? 'MG/CO' : distritoRaw;
  const setor       = searchParams.get('setor')     || 'Todos';
  const ciclo       = searchParams.get('ciclo')     || 'Todos';
  const produto     = searchParams.get('produto')   || 'Todos';

  // --- Recorte do gráfico de segmentação -----------------------------------
  const carregarRecSeg = useCallback(
    (p: { busca: string; limit: number; offset: number }) =>
      getAmostrasRecortePorSegmentacao(distrito, setor, ciclo, produto, {
        segmentacao: recSegFiltro, busca: p.busca, limit: p.limit, offset: p.offset,
      }),
    [distrito, setor, ciclo, produto, recSegFiltro],
  );
  const exportarRecSeg = useCallback(
    async (p: { busca: string }) => {
      // limit 0 = sem paginação: o arquivo leva o recorte inteiro.
      const r = await getAmostrasRecortePorSegmentacao(distrito, setor, ciclo, produto, {
        segmentacao: recSegFiltro, busca: p.busca, limit: 0,
      });
      return r.linhas;
    },
    [distrito, setor, ciclo, produto, recSegFiltro],
  );

  // --- Recorte do gráfico de classificação ---------------------------------
  const carregarRecClass = useCallback(
    (p: { busca: string; limit: number; offset: number }) =>
      getAmostrasRecortePorClassificacao(distrito, setor, ciclo, produto, {
        classificacao: recClassFiltro, busca: p.busca, limit: p.limit, offset: p.offset,
      }),
    [distrito, setor, ciclo, produto, recClassFiltro],
  );
  const exportarRecClass = useCallback(
    async (p: { busca: string }) => {
      const r = await getAmostrasRecortePorClassificacao(distrito, setor, ciclo, produto, {
        classificacao: recClassFiltro, busca: p.busca, limit: 0,
      });
      return r.linhas;
    },
    [distrito, setor, ciclo, produto, recClassFiltro],
  );

  const descSeg = descreverRecorteAmostras(ciclo, distrito, setor, produto, recSegFiltro);
  const descClass = descreverRecorteAmostras(ciclo, distrito, setor, produto, recClassFiltro);

  const { setHeaderState } = useLayout();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    getAvailableSetores(distrito).then(setAvailableSetores);
  }, [distrito]);

  useEffect(() => {
    setLoading(true);
    getAmostrasData(distrito, setor, ciclo, produto)
      .then(({ bySegmentacao, byClassificacao, totalAmostras, totalMedicosPainel, totalMedicosComAmostra }) => {
        setSegData(bySegmentacao);
        setClassData(byClassificacao);
        setTotalAmostras(totalAmostras);
        setTotalMedicosPainel(totalMedicosPainel);
        setTotalMedicosComAmostra(totalMedicosComAmostra);
      })
      .finally(() => setLoading(false));
  }, [distrito, setor, ciclo, produto]);

  useEffect(() => {
    setHeaderState({
      title: "Entrega de Amostras",
      subtitle: "Análise de distribuição de amostras",
      filters: (
        <Suspense fallback={<div className="h-10 w-40 bg-slate-100 animate-pulse rounded-md" />}>
          <DashboardFilters availableSetores={availableSetores} showCiclo showProduto />
        </Suspense>
      )
    });
    return () => setHeaderState({});
  }, [setHeaderState, availableSetores]);

  // Média de amostras entregues = total de amostras ÷ médicos DISTINTOS que
  // receberam amostra (sem duplicar médico multi-marca). Respeita o filtro atual.
  const mediaGeral = totalMedicosComAmostra > 0
    ? (totalAmostras / totalMedicosComAmostra).toFixed(1)
    : '–';
  const totalAmostrasFmt = totalAmostras.toLocaleString('pt-BR');
  const totalMedicosFmt  = totalMedicosPainel.toLocaleString('pt-BR');
  const medicosComAmostraFmt = totalMedicosComAmostra.toLocaleString('pt-BR');

  const kpiCards = [
    {
      title: "Total de Médicos",
      value: totalMedicosFmt,
      description: "Médicos ativos no painel",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      tooltip: "Total de médicos únicos ativos cadastrados no painel."
    },
    {
      title: "Médicos com Amostra",
      value: medicosComAmostraFmt,
      description: "Receberam ao menos uma amostra",
      icon: UserCheck,
      color: "text-teal-600",
      bg: "bg-teal-50",
      tooltip: "Número de médicos distintos que receberam ao menos uma amostra no período/filtro (sem duplicar médicos que receberam de mais de uma marca)."
    },
    {
      title: "Média Geral de Amostras",
      value: mediaGeral,
      description: "Média por médico",
      icon: Package,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      tooltip: "Quantidade média de amostras entregues por médico (Total de Amostras / nº de médicos distintos que receberam amostra, conforme o filtro)."
    },
    {
      title: "Total de Amostras Entregues",
      value: totalAmostrasFmt,
      description: "Soma de todas as amostras",
      icon: Shield,
      color: "text-purple-600",
      bg: "bg-purple-50",
      tooltip: "Soma de todas as unidades de amostras grátis entregues no período."
    },
  ];

  return (
    <div className="p-6 space-y-6">

      {/* Observação: orienta selecionar um produto quando nenhum está filtrado */}
      <div className="flex items-center px-1">
        <div className="flex items-center gap-2 text-slate-500">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Obs: Recomendado sempre selecionar um produto para filtrar os dados.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="border border-slate-200 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 group relative">
                  <p className="text-sm font-medium text-slate-500">{kpi.title}</p>
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help shrink-0" />
                  
                  {/* Tooltip Popup */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-2 bg-slate-900 text-white text-[10px] font-normal rounded-md shadow-xl border border-slate-800 z-50 leading-relaxed pointer-events-none">
                    {kpi.tooltip}
                  </div>
                </div>
                {loading
                  ? <div className="h-8 w-20 bg-slate-200 rounded-md animate-pulse mt-1" />
                  : <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>
                }
                <p className="text-xs text-slate-400">{kpi.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">

        {/* Chart 1: Por Segmentação */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Média de Amostras vs. Médicos por Segmentação
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Barras: nº de médicos por segmentação · Linha: média de amostras entregues
                </CardDescription>
              </div>
              <button
                onClick={() => setRecSegAberto(true)}
                disabled={loading}
                title="Ver a lista de médicos deste recorte"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ListFilter className="h-3.5 w-3.5" />
                Detalhar
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4 relative">
              {loading && <LoadingOverlay />}
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={segData} margin={{ top: 20, right: 60, left: 10, bottom: 20 }}>
                    <defs>
                      {Object.values(SEG_GRADIENTS).map((g) => (
                        <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={g.from} stopOpacity={1} />
                          <stop offset="100%" stopColor={g.to} stopOpacity={1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                    <XAxis
                      dataKey="segmentacao"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: CHART.tick, fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: CHART.tick, fontSize: 11 }}
                      tickFormatter={(v) => v.toLocaleString('pt-BR')}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: CHART.tick, fontSize: 11 }}
                      tickFormatter={(v) => v.toFixed(1)}
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      isAnimationActive={false}
                      contentStyle={{
                        borderRadius: '10px',
                        backgroundColor: CHART.tooltip.bg,
                        border: `1px solid ${CHART.tooltip.border}`,
                        color: CHART.tooltip.color,
                        fontSize: '13px',
                      }}
                      formatter={(value, name) => {
                        const num = Number(value);
                        if (name === 'Nº de Médicos') return [num.toLocaleString('pt-BR'), name];
                        return [num.toFixed(1), name];
                      }}
                    />
                    <Legend content={<CustomLegend highlighted={segHighlight} onToggle={toggleSeg} />} verticalAlign="top" />
                    <Bar
                      yAxisId="left"
                      dataKey="medicos"
                      name="Nº de Médicos"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={72}
                      minPointSize={3}
                      fillOpacity={segActive('Nº de Médicos') ? 1 : 0.2}
                    >
                      {segData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={`url(#${getSegGradient(entry.segmentacao).id})`} />
                      ))}
                      <LabelList dataKey="medicos" content={(props: any) => (
                        <BarValueLabel {...props} color={getSegGradient(segData[props.index]?.segmentacao ?? '').solid} />
                      )} />
                    </Bar>
                    <Line
                      yAxisId="right"
                      type="linear"
                      dataKey="mediaAmostras"
                      name="Média de Amostras"
                      stroke={CHART.line}
                      strokeWidth={3}
                      strokeOpacity={segActive('Média de Amostras') ? 1 : 0.15}
                      dot={{ fill: CHART.line, r: 5, strokeWidth: 2, stroke: '#ffffff', opacity: segActive('Média de Amostras') ? 1 : 0.15 }}
                      activeDot={{ r: 7 }}
                    >
                      <LabelList dataKey="mediaAmostras" content={<CustomLineLabel />} />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Por Classificação Médica */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Média de Amostras vs. Médicos por Classificação Médica
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Barras: nº de médicos por classificação · Linha: média de amostras entregues
                </CardDescription>
              </div>
              <button
                onClick={() => setRecClassAberto(true)}
                disabled={loading}
                title="Ver a lista de médicos deste recorte"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ListFilter className="h-3.5 w-3.5" />
                Detalhar
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4 relative">
              {loading && <LoadingOverlay />}
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={classData} margin={{ top: 20, right: 60, left: 10, bottom: 20 }}>
                    <defs>
                      {CLASS_GRADIENTS.map((g) => (
                        <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={g.from} stopOpacity={1} />
                          <stop offset="100%" stopColor={g.to} stopOpacity={1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                    <XAxis
                      dataKey="classificacao"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: CHART.tick, fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: CHART.tick, fontSize: 11 }}
                      tickFormatter={(v) => v.toLocaleString('pt-BR')}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: CHART.tick, fontSize: 11 }}
                      tickFormatter={(v) => v.toFixed(1)}
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      isAnimationActive={false}
                      contentStyle={{
                        borderRadius: '10px',
                        backgroundColor: CHART.tooltip.bg,
                        border: `1px solid ${CHART.tooltip.border}`,
                        color: CHART.tooltip.color,
                        fontSize: '13px',
                      }}
                      formatter={(value, name) => {
                        const num = Number(value);
                        if (name === 'Nº de Médicos') return [num.toLocaleString('pt-BR'), name];
                        return [num.toFixed(1), name];
                      }}
                    />
                    <Legend content={<CustomLegend highlighted={classHighlight} onToggle={toggleClass} />} verticalAlign="top" />
                    <Bar
                      yAxisId="left"
                      dataKey="medicos"
                      name="Nº de Médicos"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={72}
                      minPointSize={3}
                      fillOpacity={classActive('Nº de Médicos') ? 1 : 0.2}
                    >
                      {classData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={`url(#${CLASS_GRADIENTS[i % CLASS_GRADIENTS.length].id})`} />
                      ))}
                      <LabelList dataKey="medicos" content={(props: any) => (
                        <BarValueLabel {...props} color={CLASS_GRADIENTS[props.index % CLASS_GRADIENTS.length].solid} />
                      )} />
                    </Bar>
                    <Line
                      yAxisId="right"
                      type="linear"
                      dataKey="mediaAmostras"
                      name="Média de Amostras"
                      stroke={CHART.line}
                      strokeWidth={3}
                      strokeOpacity={classActive('Média de Amostras') ? 1 : 0.15}
                      dot={{ fill: CHART.line, r: 5, strokeWidth: 2, stroke: '#ffffff', opacity: classActive('Média de Amostras') ? 1 : 0.15 }}
                      activeDot={{ r: 7 }}
                    >
                      <LabelList dataKey="mediaAmostras" content={<CustomLineLabel />} />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      <RecorteModal<MedicoAmostra>
        aberto={recSegAberto}
        onFechar={() => setRecSegAberto(false)}
        tela="Entrega de Amostras · por Segmentação"
        titulo="Médicos que receberam amostra"
        recorte={descSeg}
        colunas={COLUNAS_SEG}
        versao={`${recSegFiltro}|${distrito}|${setor}|${ciclo}|${produto}`}
        carregar={carregarRecSeg}
        exportar={exportarRecSeg}
        nomeArquivo={`amostras-segmentacao_${slug(descSeg)}`}
        filtros={
          <select
            value={recSegFiltro}
            onChange={(e) => setRecSegFiltro(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="Todas">Todas as segmentações</option>
            {SEGMENTACOES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        }
      />

      <RecorteModal<MedicoAmostra>
        aberto={recClassAberto}
        onFechar={() => setRecClassAberto(false)}
        tela="Entrega de Amostras · por Classificação"
        titulo="Médicos que receberam amostra"
        recorte={descClass}
        colunas={COLUNAS_CLASS}
        versao={`${recClassFiltro}|${distrito}|${setor}|${ciclo}|${produto}`}
        carregar={carregarRecClass}
        exportar={exportarRecClass}
        nomeArquivo={`amostras-classificacao_${slug(descClass)}`}
        filtros={
          <select
            value={recClassFiltro}
            onChange={(e) => setRecClassFiltro(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="Todas">Todas as classificações</option>
            {/* Opções vêm do próprio gráfico: garante que a lista do filtro é
                exatamente a das barras, sem duplicar a regra de ordenação. */}
            {classData.map((c) => (
              <option key={c.classificacao} value={c.classificacao}>{c.classificacao}</option>
            ))}
          </select>
        }
      />
    </div>
  );
}

export default function AlocacaoDeRecursos() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <AlocacaoDeRecursosContent />
    </Suspense>
  );
}

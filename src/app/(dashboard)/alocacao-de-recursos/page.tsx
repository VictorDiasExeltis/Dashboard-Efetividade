'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
import { Package, Users, Percent, Shield, HelpCircle } from 'lucide-react';
import { DashboardFilters } from '@/src/components/dashboard/DashboardFilters';
import { getAvailableSetores, getAmostrasData } from '@/src/app/actions';
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
  const [loading, setLoading]       = useState(false);

  // Legendas interativas (multi-seleção por clique). Um destaque independente
  // por gráfico. Vazio = todas as séries em destaque (gráfico normal).
  const [segHighlight, setSegHighlight]     = useState<Set<string>>(new Set());
  const [classHighlight, setClassHighlight] = useState<Set<string>>(new Set());

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

  const { setHeaderState } = useLayout();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    getAvailableSetores(distrito).then(setAvailableSetores);
  }, [distrito]);

  useEffect(() => {
    setLoading(true);
    getAmostrasData(distrito, setor, ciclo, produto)
      .then(({ bySegmentacao, byClassificacao, totalAmostras, totalMedicosPainel }) => {
        setSegData(bySegmentacao);
        setClassData(byClassificacao);
        setTotalAmostras(totalAmostras);
        setTotalMedicosPainel(totalMedicosPainel);
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

  // Painel = médicos únicos ativos. Usar isso evita a duplicação que ocorre
  // quando o mesmo médico aparece em várias segmentações (uma por marca).
  const mediaGeral       = totalMedicosPainel > 0
    ? (totalAmostras / totalMedicosPainel).toFixed(1)
    : '–';
  const totalAmostrasFmt = totalAmostras.toLocaleString('pt-BR');
  const totalMedicosFmt  = totalMedicosPainel.toLocaleString('pt-BR');

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
      title: "Média Geral de Amostras",
      value: mediaGeral,
      description: "Média ponderada por médico",
      icon: Package,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      tooltip: "Quantidade média de amostras entregues por médico do painel (Total de Amostras / Total de Médicos do Painel)."
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="border border-slate-200 shadow-sm bg-white overflow-hidden">
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
            <CardTitle className="text-lg font-semibold text-slate-900">
              Média de Amostras vs. Médicos por Segmentação
            </CardTitle>
            <CardDescription className="text-slate-500">
              Barras: nº de médicos por segmentação · Linha: média de amostras entregues
            </CardDescription>
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
                      fillOpacity={segActive('Nº de Médicos') ? 1 : 0.2}
                    >
                      {segData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={`url(#${getSegGradient(entry.segmentacao).id})`} />
                      ))}
                      <LabelList dataKey="medicos" position="insideBottom" fill="#ffffff" fontSize={12} fontWeight="bold" offset={10} formatter={(v: any) => v.toLocaleString('pt-BR')} />
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
            <CardTitle className="text-lg font-semibold text-slate-900">
              Média de Amostras vs. Médicos por Classificação Médica
            </CardTitle>
            <CardDescription className="text-slate-500">
              Barras: nº de médicos por classificação · Linha: média de amostras entregues
            </CardDescription>
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
                      fillOpacity={classActive('Nº de Médicos') ? 1 : 0.2}
                    >
                      {classData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={`url(#${CLASS_GRADIENTS[i % CLASS_GRADIENTS.length].id})`} />
                      ))}
                      <LabelList dataKey="medicos" position="insideBottom" fill="#ffffff" fontSize={12} fontWeight="bold" offset={10} formatter={(v: any) => v.toLocaleString('pt-BR')} />
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

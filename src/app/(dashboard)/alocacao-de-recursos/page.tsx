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
import { Package, Users, Percent, Shield } from 'lucide-react';
import { DashboardFilters } from '@/src/components/dashboard/DashboardFilters';
import { getAvailableSetores, getAmostrasData } from '@/src/app/actions';
import { useLayout } from '@/src/context/LayoutContext';

const CustomLegend = (props: any) => {
  const { payload } = props;
  if (!payload) return null;
  return (
    <div className="flex justify-end items-center gap-5 text-xs text-slate-500 pb-4">
      {payload.map((entry: any, index: number) => {
        const isMedicos = entry.value === 'Nº de Médicos';
        return (
          <div key={`item-${index}`} className="flex items-center gap-1.5">
            {isMedicos ? (
              <span 
                className="w-2.5 h-2.5 rounded-full inline-block" 
                style={{ 
                  background: 'conic-gradient(#3b82f6 0 90deg, #10b981 90deg 180deg, #f97316 180deg 270deg, #8b5cf6 270deg)' 
                }} 
              />
            ) : (
              <span 
                className="w-2.5 h-2.5 rounded-full inline-block" 
                style={{ backgroundColor: '#3b82f6' }} 
              />
            )}
            <span className="text-slate-600 font-medium">{entry.value}</span>
          </div>
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
        fill="#3b82f6"
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
  bar:  '#f97316',  // orange — médicos
  line: '#3b82f6',  // blue  — média amostras
};

const SEG_COLORS: Record<string, string> = {
  'PROTEGER':        '#3b82f6',
  'CONQUISTAR':      '#10b981',
  'MANTER':          '#f97316',
  'OBSERVAR':        '#8b5cf6',
  'SEM SEGMENTAÇÃO': '#94a3b8',
};

const PALETTE = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#94a3b8', '#06b6d4', '#ec4899'];

function getSegColor(name: string) {
  return SEG_COLORS[name] ?? '#94a3b8';
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
      subtitle: "Análise de distribuição de amostras por segmentação e classificação",
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
    },
    {
      title: "Média Geral de Amostras",
      value: mediaGeral,
      description: "Média ponderada por médico",
      icon: Package,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Total de Amostras Entregues",
      value: totalAmostrasFmt,
      description: "Soma de todas as amostras",
      icon: Shield,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Segmentações Ativas",
      value: segData.filter(r => r.medicos > 0).length.toString(),
      description: "Com médicos cadastrados",
      icon: Percent,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="p-6 space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">{kpi.title}</p>
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
                    <Legend content={<CustomLegend />} />
                    <Bar
                      yAxisId="left"
                      dataKey="medicos"
                      name="Nº de Médicos"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={72}
                    >
                      {segData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={getSegColor(entry.segmentacao)} />
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
                      dot={{ fill: CHART.line, r: 5, strokeWidth: 2, stroke: '#ffffff' }}
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
                    <Legend content={<CustomLegend />} />
                    <Bar
                      yAxisId="left"
                      dataKey="medicos"
                      name="Nº de Médicos"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={72}
                    >
                      {classData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={PALETTE[i % PALETTE.length]} />
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
                      dot={{ fill: CHART.line, r: 5, strokeWidth: 2, stroke: '#ffffff' }}
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

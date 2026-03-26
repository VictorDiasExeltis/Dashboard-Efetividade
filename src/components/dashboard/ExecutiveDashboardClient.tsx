'use client';

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  LabelList
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Package, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/src/components/ui/card';

import { DashboardFilters } from './DashboardFilters';

interface ExecutiveDashboardProps {
  data: {
    kpis: {
      coberturaAtual: number;
      mdvAtual: number;
      coberturaAnterior: number;
      mdvAnterior: number;
    };
    chartData: any[];
  };
  searchParams?: any;
}

// Cores fixas para light mode — sem dependência de tema
const CHART = {
  grid: '#f1f5f9',
  tick: '#64748b',
  tooltip: { bg: '#ffffff', border: '#e2e8f0', color: '#0f172a', cursor: '#f8fafc' },
  barAlt: '#94a3b8',
  barBlue: '#2563eb',
  barGreen: '#059669',
};

export function ExecutiveDashboardClient({ data, searchParams }: ExecutiveDashboardProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { kpis, chartData } = data;

  const trendCobertura = kpis.coberturaAtual - kpis.coberturaAnterior;
  const trendMDV = kpis.mdvAtual - kpis.mdvAnterior;

  const kpiCards = [
    {
      title: "% Cobertura Atual",
      value: `${kpis.coberturaAtual.toFixed(1)}%`,
      description: "Meta: 90%",
      trend: `${trendCobertura >= 0 ? '+' : ''}${trendCobertura.toFixed(1)}%`,
      trendType: trendCobertura >= 0 ? 'up' : 'down',
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "MDV (Média Visita Diária)",
      value: kpis.mdvAtual.toFixed(1),
      description: "Meta: 12.0",
      trend: `${trendMDV >= 0 ? '+' : ''}${trendMDV.toFixed(1)}`,
      trendType: trendMDV >= 0 ? 'up' : 'down',
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      title: "Índice de Amostras",
      value: "3.2",
      description: "Por visita realizada",
      trend: "-0.4",
      trendType: "down",
      icon: Package,
      color: "text-amber-600",
      bg: "bg-amber-50"
    },
    {
      title: "Dias Úteis Restantes",
      value: "8",
      description: "Ciclo Março/2026",
      trend: null,
      trendType: null,
      icon: Calendar,
      color: "text-slate-600",
      bg: "bg-slate-100"
    }
  ];

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Visão Executiva</h1>
          <p className="text-sm text-slate-500 mt-1">
            Resumo de performance operacional e cobertura de mercado (Dados em Tempo Real).
          </p>
        </div>
        <React.Suspense fallback={<div className="h-10 w-40 bg-slate-100 animate-pulse rounded-md" />}>
          <DashboardFilters />
        </React.Suspense>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                {kpi.trend && (
                  <div className={`flex items-center text-xs font-medium ${kpi.trendType === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {kpi.trendType === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                    {kpi.trend}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">{kpi.title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>
                <p className="text-xs text-slate-400">{kpi.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cobertura Chart */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Cobertura por Distrito (%)</CardTitle>
            <CardDescription className="text-slate-500">Comparativo entre Ciclo Atual e Ciclo Anterior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: CHART.tick, fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: CHART.tick, fontSize: 12 }} domain={[0, 100]} tickFormatter={(v: any) => `${v}%`} />
                    <Tooltip cursor={{ fill: CHART.tooltip.cursor }} contentStyle={{ borderRadius: '8px', backgroundColor: CHART.tooltip.bg, border: `1px solid ${CHART.tooltip.border}`, color: CHART.tooltip.color }} />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                    <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Meta', fill: '#ef4444', fontSize: 10 }} />
                    <Bar name="Ciclo Ant." dataKey="ciclo01" fill={CHART.barAlt} radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar name="Ciclo Atu." dataKey="cicloAtual" fill={CHART.barBlue} radius={[4, 4, 0, 0]} barSize={24}>
                      <LabelList dataKey="cicloAtual" position="top" fill={CHART.barBlue} fontSize={10} formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* MDV Chart */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">MDV por Distrito</CardTitle>
            <CardDescription className="text-slate-500">Média de Visita Diária por Ciclo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: CHART.tick, fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: CHART.tick, fontSize: 12 }} domain={[0, 15]} />
                    <Tooltip cursor={{ fill: CHART.tooltip.cursor }} contentStyle={{ borderRadius: '8px', backgroundColor: CHART.tooltip.bg, border: `1px solid ${CHART.tooltip.border}`, color: CHART.tooltip.color }} />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                    <Bar name="MDV Ant." dataKey="mdv01" fill={CHART.barAlt} radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar name="MDV Atu." dataKey="mdvAtual" fill={CHART.barGreen} radius={[4, 4, 0, 0]} barSize={24}>
                      <LabelList dataKey="mdvAtual" position="top" fill={CHART.barGreen} fontSize={10} formatter={(v: number) => v.toFixed(1)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

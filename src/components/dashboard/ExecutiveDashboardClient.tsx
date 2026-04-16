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
      ciclo01: { cobertura: number; mdv: number };
      ciclo02: { cobertura: number; mdv: number };
      ciclo03: { cobertura: number; mdv: number };
      selected: { cobertura: number; mdv: number };
      previous: { cobertura: number; mdv: number } | null;
      amostras?: string;
      diasRestantes?: number;
    };
    chartData: any[];
    availableSetores: string[];
  };
  searchParams?: any;
}

// Cores fixas para light mode — sem dependência de tema
const CHART = {
  grid: '#f1f5f9',
  tick: '#64748b',
  tooltip: { bg: '#ffffff', border: '#e2e8f0', color: '#0f172a', cursor: '#f8fafc' },
  blue: '#3b82f6',   // Ciclo 01
  orange: '#f97316', // Ciclo 02
  green: '#10b981',  // Ciclo 03
};

export function ExecutiveDashboardClient({ data, searchParams }: ExecutiveDashboardProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { kpis, chartData } = data;

  // Determinar quais ciclos devem ser exibidos nos gráficos
  const selectedParam = searchParams?.ciclo || 'Todos';
  const allCycles = ['CICLO 01', 'CICLO 02', 'CICLO 03'];
  const activeCycles = selectedParam === 'Todos' ? allCycles : selectedParam.split(',');

  const trendCobertura = kpis.previous ? kpis.selected.cobertura - kpis.previous.cobertura : 0;
  const trendMDV = kpis.previous ? kpis.selected.mdv - kpis.previous.mdv : 0;

  // Determinar o nome do ciclo para o título do KPI
  const lastSelectedCycle = activeCycles[activeCycles.length - 1];

  const kpiCards = [
    {
      title: `% Cobertura (${lastSelectedCycle})`,
      value: `${Number(kpis.selected.cobertura).toFixed(1)}%`,
      description: "Meta: 90%",
      trend: kpis.previous ? `${trendCobertura >= 0 ? '+' : ''}${trendCobertura.toFixed(1)}%` : null,
      trendType: trendCobertura >= 0 ? 'up' : 'down',
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "MDV (Média Visita Diária)",
      value: Number(kpis.selected.mdv).toFixed(1),
      description: "Meta: 12.0",
      trend: kpis.previous ? `${trendMDV >= 0 ? '+' : ''}${trendMDV.toFixed(1)}` : null,
      trendType: trendMDV >= 0 ? 'up' : 'down',
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      title: "Índice de Amostras",
      value: (kpis as any).amostras || "3.2",
      description: "Por visita realizada",
      trend: "-0.4",
      trendType: "down",
      icon: Package,
      color: "text-amber-600",
      bg: "bg-amber-50"
    },
    {
      title: "Dias Úteis Restantes",
      value: (kpis as any).diasRestantes?.toString() || "8",
      description: "Ciclo Março/2026",
      trend: null,
      trendType: null,
      icon: Calendar,
      color: "text-slate-600",
      bg: "bg-slate-100"
    }
  ];

  return (
    <div className="space-y-4 p-6 pt-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cobertura e MDV</h1>
          <p className="text-sm text-slate-500 mt-1">
            Resumo de performance operacional<br />e cobertura de mercado (Dados em Tempo Real).
          </p>
        </div>
        <React.Suspense fallback={<div className="h-10 w-40 bg-slate-100 animate-pulse rounded-md" />}>
          <DashboardFilters availableSetores={data.availableSetores} />
        </React.Suspense>
      </div>

      {/* KPI Info Header */}
      <div className="flex items-center gap-2 px-1 text-slate-500">
        <div className="h-1 w-1 rounded-full bg-slate-400" />
        <p className="text-[11px] font-medium uppercase tracking-wider">
          Dados: {lastSelectedCycle} {kpis.previous && `vs Ciclo anterior`}
        </p>
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
      <div className="grid grid-cols-1 gap-8">
        {/* Cobertura Chart */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Cobertura por {searchParams?.estrutura || 'Distrito'} (%)
            </CardTitle>
            <CardDescription className="text-slate-500">Comparativo entre os Ciclos Selecionados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 11 }} 
                      dy={10}
                      type="category"
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 11 }} 
                      domain={[0, 105]} 
                      ticks={[0, 25, 50, 75, 100]}
                      tickFormatter={(v: any) => `${v}%`} 
                    />
                    <Tooltip 
                      formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                      cursor={{ fill: CHART.tooltip.cursor }} 
                      contentStyle={{ borderRadius: '8px', backgroundColor: CHART.tooltip.bg, border: `1px solid ${CHART.tooltip.border}`, color: CHART.tooltip.color }} 
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                    <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Meta', fill: '#ef4444', fontSize: 10 }} />
                    
                    <Bar 
                      name="Ciclo 01" 
                      dataKey="ciclo01" 
                      fill={CHART.blue} 
                      radius={[4, 4, 0, 0]} 
                      barSize={20} 
                      hide={!activeCycles.includes('CICLO 01')}
                    >
                      <LabelList dataKey="ciclo01" position="top" fill={CHART.blue} fontSize={10} fontWeight="bold" stroke="#ffffff" strokeWidth={4} style={{ paintOrder: 'stroke' }} formatter={(v: any) => `${v != null && v > 0 ? Number(v).toFixed(1) : ''}%`} />
                    </Bar>
                    <Bar 
                      name="Ciclo 02" 
                      dataKey="ciclo02" 
                      fill={CHART.orange} 
                      radius={[4, 4, 0, 0]} 
                      barSize={20} 
                      hide={!activeCycles.includes('CICLO 02')}
                    >
                      <LabelList dataKey="ciclo02" position="top" fill={CHART.orange} fontSize={10} fontWeight="bold" stroke="#ffffff" strokeWidth={4} style={{ paintOrder: 'stroke' }} formatter={(v: any) => `${v != null && v > 0 ? Number(v).toFixed(1) : ''}%`} />
                    </Bar>
                    <Bar 
                      name="Ciclo 03" 
                      dataKey="ciclo03" 
                      fill={CHART.green} 
                      radius={[4, 4, 0, 0]} 
                      barSize={20} 
                      hide={!activeCycles.includes('CICLO 03')}
                    >
                      <LabelList dataKey="ciclo03" position="top" fill={CHART.green} fontSize={10} fontWeight="bold" stroke="#ffffff" strokeWidth={4} style={{ paintOrder: 'stroke' }} formatter={(v: any) => `${v != null && v > 0 ? Number(v).toFixed(1) : ''}%`} />
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
            <CardTitle className="text-lg font-semibold text-slate-900">
              MDV por {searchParams?.estrutura || 'Distrito'}
            </CardTitle>
            <CardDescription className="text-slate-500">Média de Visita Diária por Ciclo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 11 }} 
                      dy={10}
                      type="category"
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 11 }} 
                      domain={[0, (dataMax: number) => Math.max(15, Math.ceil(dataMax + 2))]} 
                    />
                    <Tooltip 
                      formatter={(value: any) => Number(value).toFixed(1)}
                      cursor={{ fill: CHART.tooltip.cursor }} 
                      contentStyle={{ borderRadius: '8px', backgroundColor: CHART.tooltip.bg, border: `1px solid ${CHART.tooltip.border}`, color: CHART.tooltip.color }} 
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                    
                    <Bar 
                      name="MDV Ciclo 01" 
                      dataKey="mdv01" 
                      fill={CHART.blue} 
                      radius={[4, 4, 0, 0]} 
                      barSize={20} 
                      hide={!activeCycles.includes('CICLO 01')}
                    >
                      <LabelList dataKey="mdv01" position="top" fill={CHART.blue} fontSize={10} fontWeight="bold" stroke="#ffffff" strokeWidth={4} style={{ paintOrder: 'stroke' }} formatter={(v: any) => (v != null && v > 0 ? Number(v).toFixed(1) : '')} />
                    </Bar>
                    <Bar 
                      name="MDV Ciclo 02" 
                      dataKey="mdv02" 
                      fill={CHART.orange} 
                      radius={[4, 4, 0, 0]} 
                      barSize={20} 
                      hide={!activeCycles.includes('CICLO 02')}
                    >
                      <LabelList dataKey="mdv02" position="top" fill={CHART.orange} fontSize={10} fontWeight="bold" stroke="#ffffff" strokeWidth={4} style={{ paintOrder: 'stroke' }} formatter={(v: any) => (v != null && v > 0 ? Number(v).toFixed(1) : '')} />
                    </Bar>
                    <Bar 
                      name="MDV Ciclo 03" 
                      dataKey="mdv03" 
                      fill={CHART.green} 
                      radius={[4, 4, 0, 0]} 
                      barSize={20} 
                      hide={!activeCycles.includes('CICLO 03')}
                    >
                      <LabelList dataKey="mdv03" position="top" fill={CHART.green} fontSize={10} fontWeight="bold" stroke="#ffffff" strokeWidth={4} style={{ paintOrder: 'stroke' }} formatter={(v: any) => (v != null && v > 0 ? Number(v).toFixed(1) : '')} />
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

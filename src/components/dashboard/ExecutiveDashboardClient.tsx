'use client';

import React from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell
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
      selected: { 
        cobertura: number; 
        mdv: number;
        visitasTotais: number;
        contatos: number;
      };
      brasilSelected: {
        cobertura: number;
        mdv: number;
      };
      previous: { cobertura: number; mdv: number } | null;
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

const COLORS = [
  '#3b82f6', // blue-500
  '#f97316', // orange-500
  '#10b981', // emerald-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
];

const mockAbonosData = [
  { name: 'Motivo Saúde', value: 500, color: '#ef4444' }, // red-500
  { name: 'Férias', value: 300, color: '#3b82f6' },       // blue-500
  { name: 'Licença Mat/Pat', value: 150, color: '#10b981' },// emerald-500
  { name: 'Outros', value: 50, color: '#f59e0b' }         // amber-500
];

const mockRepsData = [
  { id: '1', nome: 'João Silva', setor: 'SP-01', distrito: 'São Paulo', diasTrabalhados: 20, diasAbonados: 2 },
  { id: '2', nome: 'Maria Santos', setor: 'RJ-02', distrito: 'Rio de Janeiro', diasTrabalhados: 18, diasAbonados: 4 },
  { id: '3', nome: 'Pedro Costa', setor: 'MG-01', distrito: 'Minas Gerais', diasTrabalhados: 22, diasAbonados: 0 },
  { id: '4', nome: 'Ana Oliveira', setor: 'PR-03', distrito: 'Sul', diasTrabalhados: 15, diasAbonados: 7 },
  { id: '5', nome: 'Lucas Lima', setor: 'BA-01', distrito: 'Nordeste', diasTrabalhados: 21, diasAbonados: 1 },
  { id: '6', nome: 'Carlos Souza', setor: 'SP-02', distrito: 'São Paulo', diasTrabalhados: 22, diasAbonados: 0 },
];

export function ExecutiveDashboardClient({ data, searchParams }: ExecutiveDashboardProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { kpis, chartData } = data;

  // Determinar quais ciclos devem ser exibidos nos gráficos
  const selectedParam = searchParams?.ciclo || 'Todos';
  const allCycles = ['CICLO 01', 'CICLO 02', 'CICLO 03', 'CICLO 04'];
  const activeCycles = selectedParam === 'Todos' ? allCycles : selectedParam.split(',');

  const districtNames = chartData.map(item => item.name);

  const transformedChartData = activeCycles.map(cycleName => {
    const keySuffix = cycleName.replace('CICLO ', '').trim();
    const cobKey = `ciclo${keySuffix}`;
    const mdvKey = `mdv${keySuffix}`;

    const dataPoint: any = { name: cycleName };

    chartData.forEach(item => {
      dataPoint[`${item.name}_cob`] = item[cobKey];
      dataPoint[`${item.name}_mdv`] = item[mdvKey];
    });

    return dataPoint;
  });

  const percentCobertura = kpis.brasilSelected?.cobertura > 0 
    ? ((kpis.selected.cobertura - kpis.brasilSelected.cobertura) / kpis.brasilSelected.cobertura) * 100 
    : 0;
  
  const percentMDV = kpis.brasilSelected?.mdv > 0 
    ? ((kpis.selected.mdv - kpis.brasilSelected.mdv) / kpis.brasilSelected.mdv) * 100 
    : 0;

  // Determinar o nome do ciclo para o título do KPI
  const lastSelectedCycle = activeCycles[activeCycles.length - 1];

  const kpiCards = [
    {
      title: `Cobertura de Visitação`,
      value: `${Number(kpis.selected.cobertura).toFixed(1)}%`,
      description: `Média Brasil: ${Number(kpis.brasilSelected?.cobertura || 0).toFixed(1)}%`,
      trend: `${percentCobertura >= 0 ? '+' : ''}${percentCobertura.toFixed(1)}% vs BR`,
      trendType: percentCobertura >= 0 ? 'up' : 'down',
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "MDV (Média Visita Diária)",
      value: Number(kpis.selected.mdv).toFixed(1),
      description: `Média Brasil: ${Number(kpis.brasilSelected?.mdv || 0).toFixed(1)}`,
      trend: `${percentMDV >= 0 ? '+' : ''}${percentMDV.toFixed(1)}% vs BR`,
      trendType: percentMDV >= 0 ? 'up' : 'down',
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      title: "Visitas Totais",
      value: Number(kpis.selected.visitasTotais).toLocaleString('pt-BR'),
      description: "Soma de todos os ciclos",
      trend: null,
      trendType: null,
      icon: Package,
      color: "text-amber-600",
      bg: "bg-amber-50"
    },
    {
      title: "Contatos (Médicos)",
      value: Number(kpis.selected.contatos).toLocaleString('pt-BR'),
      description: "Visitas únicas no período",
      trend: null,
      trendType: null,
      icon: Users,
      color: "text-slate-600",
      bg: "bg-slate-100"
    }
  ];

  return (
    <div className="space-y-4 p-6 pt-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cobertura e Medida de Visitação</h1>
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
          Dados: {selectedParam === 'Todos' ? 'Todos os Ciclos' : activeCycles.join(' + ')} {kpis.previous && selectedParam !== 'Todos' && `vs Ciclo anterior`}
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
                  <LineChart data={transformedChartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 10, angle: -45, textAnchor: 'end' }}
                      interval={0}
                      height={80}
                      dy={10}
                      type="category"
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 11 }} 
                      domain={[50, 100]} 
                      ticks={[50, 60, 70, 80, 90, 100]}
                      tickFormatter={(v: any) => `${v}%`} 
                    />
                    <Tooltip 
                      formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                      itemSorter={(item) => -(item.value as number)}
                      cursor={{ fill: CHART.tooltip.cursor }} 
                      contentStyle={{ borderRadius: '8px', backgroundColor: CHART.tooltip.bg, border: `1px solid ${CHART.tooltip.border}`, color: CHART.tooltip.color }} 
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                    <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Meta', fill: '#ef4444', fontSize: 10 }} />
                    
                    {districtNames.map((district, index) => (
                      <Line 
                        key={district}
                        type="monotone"
                        name={district} 
                        dataKey={`${district}_cob`} 
                        stroke={COLORS[index % COLORS.length]} 
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
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
                  <LineChart data={transformedChartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 10, angle: -45, textAnchor: 'end' }}
                      interval={0}
                      height={80}
                      dy={10}
                      type="category"
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: CHART.tick, fontSize: 11 }} 
                      domain={[7, 13]} 
                    />
                    <Tooltip 
                      formatter={(value: any) => Number(value).toFixed(1)}
                      itemSorter={(item) => -(item.value as number)}
                      cursor={{ fill: CHART.tooltip.cursor }} 
                      contentStyle={{ borderRadius: '8px', backgroundColor: CHART.tooltip.bg, border: `1px solid ${CHART.tooltip.border}`, color: CHART.tooltip.color }} 
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                    <ReferenceLine y={10.8} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Meta', fill: '#ef4444', fontSize: 10 }} />
                    
                    {districtNames.map((district, index) => (
                      <Line 
                        key={district}
                        type="monotone"
                        name={district} 
                        dataKey={`${district}_mdv`} 
                        stroke={COLORS[index % COLORS.length]} 
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Abonos Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Abonos Chart */}
          <Card className="border-slate-200 bg-white shadow-sm lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Motivos de Abono
              </CardTitle>
              <CardDescription className="text-slate-500">Motivos de ausência no período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4 flex items-center justify-center">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mockAbonosData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ value }) => value}
                        labelLine={true}
                      >
                        {mockAbonosData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [`${value} abonos`, 'Quantidade']}
                        contentStyle={{ borderRadius: '8px', backgroundColor: CHART.tooltip.bg, border: `1px solid ${CHART.tooltip.border}`, color: CHART.tooltip.color }} 
                      />
                      <Legend verticalAlign="top" align="center" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Abonos Table */}
          <Card className="border-slate-200 bg-white shadow-sm lg:col-span-2 flex flex-col overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-slate-50/50 pb-4">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Detalhamento por Representante
              </CardTitle>
              <CardDescription className="text-slate-500">
                Dias trabalhados e abonados no período
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Setor</th>
                    <th className="px-4 py-3 font-medium">Distrito</th>
                    <th className="px-4 py-3 font-medium text-center">Dias Trabalhados</th>
                    <th className="px-4 py-3 font-medium text-center">Dias Abonados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mockRepsData.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{rep.nome}</td>
                      <td className="px-4 py-3 text-slate-600">{rep.setor}</td>
                      <td className="px-4 py-3 text-slate-600">{rep.distrito}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{rep.diasTrabalhados}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={rep.diasAbonados > 0 ? "text-amber-600 font-medium" : "text-slate-500"}>
                          {rep.diasAbonados}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

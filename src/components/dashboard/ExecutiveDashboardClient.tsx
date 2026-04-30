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
import { GraficoCobertura } from './GraficoCobertura';
import { GraficoMDV } from './GraficoMDV';

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

// Estilos compartilhados para os gráficos internos
const CHART = {
  grid: '#f1f5f9',
  tick: '#64748b',
  tooltip: { bg: '#ffffff', border: '#e2e8f0', color: '#0f172a', cursor: '#f8fafc' },
};

// Dados Mock para componentes que ainda serão desenvolvidos
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

  const { kpis } = data;
 
  const kpiCards = [
    {
      title: `Cobertura de Visitação`,
      value: `${Number(kpis.selected.cobertura).toFixed(1)}%`,
      description: `Média Brasil: ${Number(kpis.brasilSelected?.cobertura || 0).toFixed(1)}%`,
      trend: `${kpis.trend?.cobertura >= 0 ? '+' : ''}${Number(kpis.trend?.cobertura || 0).toFixed(1)} pp vs ciclo anterior`,
      trendType: (kpis.trend?.cobertura || 0) >= 0 ? 'up' : 'down',
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "MDV (Média Visita Diária)",
      value: Number(kpis.selected.mdv).toFixed(1),
      description: `Média Brasil: ${Number(kpis.brasilSelected?.mdv || 0).toFixed(1)}`,
      trend: `${kpis.trend?.mdv >= 0 ? '+' : ''}${Number(kpis.trend?.mdv || 0).toFixed(1)} vs ciclo anterior`,
      trendType: (kpis.trend?.mdv || 0) >= 0 ? 'up' : 'down',
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
          Dados: Todos os Ciclos
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
        <GraficoCobertura />
        <GraficoMDV />

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

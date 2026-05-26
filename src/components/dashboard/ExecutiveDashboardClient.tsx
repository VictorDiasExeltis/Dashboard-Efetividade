'use client';

import React from 'react';
import { cn } from '@/src/lib/utils';
import { useSearchParams } from 'next/navigation';
import {
  TrendingUp,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Link2,
  Clock
} from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';

import { DashboardFilters } from './DashboardFilters';
import { GraficoCobertura } from './GraficoCobertura';
import { GraficoMDV } from './GraficoMDV';
import { GraficoAbonos } from './GraficoAbonos';
import { TabelaRepresentantes } from './TabelaRepresentantes';
import { useLayout } from '@/src/context/LayoutContext';

interface ExecutiveDashboardProps {
  data: {
    kpis: {
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
      trend: {
        cobertura: number;
        mdv: number;
        visitasTotais: number;
        contatos: number;
      };
      last_ciclo?: string;
      prev_ciclo?: string;
      diasRestantes?: number;
    };
    chartData: any[];
    availableSetores: string[];
  };
  searchParams?: any;
}


function formatarCiclo(ciclo: string): string {
  const num = ciclo.slice(-2);
  return `Ciclo ${num.padStart(2, '0')}`;
}

export function ExecutiveDashboardClient({ data, searchParams }: ExecutiveDashboardProps) {
  const { kpis } = data;
  const { setHeaderState } = useLayout();
  const urlParams = useSearchParams();
  const filtroDistrito = urlParams.get('distrito') || 'Todos';
  const filtroSetor = urlParams.get('setor') || 'Todos';

  // Estado compartilhado entre o donut de abonos e a tabela de representantes.
  // O seletor de ciclo vive dentro da tabela (já existia) e propaga pra cá via onCicloChange.
  const [filtroCicloAbonos, setFiltroCicloAbonos] = React.useState('Todos');
  React.useEffect(() => {
    setHeaderState({
      title: "Cobertura e Média de Visitação",
      subtitle: "Resumo de performance operacional e cobertura de mercado",
      filters: (
        <React.Suspense fallback={<div className="h-10 w-40 bg-slate-100 animate-pulse rounded-md" />}>
          <DashboardFilters availableSetores={data.availableSetores} />
        </React.Suspense>
      )
    });

    return () => setHeaderState({});
  }, [data.availableSetores, setHeaderState]);

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
      title: "MVD (Média Visita Diária)",
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
      description: "Total do ciclo atual",
      trend: `${kpis.trend?.visitasTotais >= 0 ? '+' : ''}${Number(kpis.trend?.visitasTotais || 0).toLocaleString('pt-BR')} vs ciclo anterior`,
      trendType: (kpis.trend?.visitasTotais || 0) >= 0 ? 'up' : 'down',
      icon: Package,
      color: "text-amber-600",
      bg: "bg-amber-50"
    },
    {
      title: "Contatos (Médicos)",
      value: Number(kpis.selected.contatos).toLocaleString('pt-BR'),
      description: "Visitas únicas no ciclo atual",
      trend: `${kpis.trend?.contatos >= 0 ? '+' : ''}${Number(kpis.trend?.contatos || 0).toLocaleString('pt-BR')} vs ciclo anterior`,
      trendType: (kpis.trend?.contatos || 0) >= 0 ? 'up' : 'down',
      icon: Users,
      color: "text-slate-600",
      bg: "bg-slate-100"
    }
  ];

  return (
    <div className="space-y-4 p-6 pt-5">
      {/* KPI Info Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2 text-slate-500">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Dados: Todos os Ciclos
          </p>
        </div>
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

        {/* ─── Análise de Abonos por Ciclo ────────────────────────
            Donut e tabela compartilham o mesmo filtro de ciclo.
            Visualmente: um único card-container com header indicando o
            vínculo, divisor entre os dois sub-componentes, e badge
            "Sincronizado" quando há um ciclo específico selecionado.
        */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Corpo: donut + tabela com divisor vertical */}
          <div className="grid grid-cols-1 lg:grid-cols-3 lg:divide-x divide-slate-200">
            <GraficoAbonos
              filtroDistrito={filtroDistrito}
              filtroSetor={filtroSetor}
              filtroCiclo={filtroCicloAbonos}
            />
            <TabelaRepresentantes
              filtroDistrito={filtroDistrito}
              filtroSetor={filtroSetor}
              filtroCiclo={filtroCicloAbonos}
              onCicloChange={setFiltroCicloAbonos}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

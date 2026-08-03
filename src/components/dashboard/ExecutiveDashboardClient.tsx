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
  Clock,
  HelpCircle
} from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';

import { DashboardFilters } from './DashboardFilters';
import { GraficoCobertura } from './GraficoCobertura';
import { GraficoMDV } from './GraficoMDV';
import { CoberturaMdvScatter } from './CoberturaMdvScatter';
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
      diasUteisCiclo?: Record<string, number>;
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
  // Ciclo agora vive na URL (CSV via Ctrl+clique no DashboardFilters), permitindo
  // que o gráfico de rosca, a tabela e os gráficos de Cobertura/MDV compartilhem
  // a mesma fonte. "Todos" = sem param na URL.
  const filtroCiclo = urlParams.get('ciclo') || 'Todos';

  // Seleção de motivo de abono (clique no donut) → destaca reps na tabela.
  const [abonoSel, setAbonoSel] = React.useState<{ motivo: string | null; setores: number[] }>({
    motivo: null,
    setores: [],
  });
  // Limpa a seleção quando muda território/ciclo (os dados de abono mudam).
  React.useEffect(() => {
    setAbonoSel({ motivo: null, setores: [] });
  }, [filtroDistrito, filtroSetor, filtroCiclo]);

  React.useEffect(() => {
    setHeaderState({
      title: "Cobertura e Média de Visitação",
      subtitle: "Resumo de performance de visitação",
      filters: (
        <React.Suspense fallback={<div className="h-10 w-40 bg-slate-100 animate-pulse rounded-md" />}>
          <DashboardFilters availableSetores={data.availableSetores} showCiclo />
        </React.Suspense>
      )
    });

    return () => setHeaderState({});
  }, [data.availableSetores, setHeaderState]);

  // Quando o ciclo anterior não existe (ex.: usuário filtrou só o Ciclo 01),
  // a comparação "vs ciclo anterior" perde sentido — escondemos o trend.
  const temCicloAnterior = Boolean(kpis.prev_ciclo);

  const kpiCards = [
    {
      title: `Cobertura de Visitação`,
      value: `${Number(kpis.selected.cobertura).toFixed(1)}%`,
      description: `Média Brasil: ${Number(kpis.brasilSelected?.cobertura || 0).toFixed(1)}%`,
      trend: temCicloAnterior
        ? `${kpis.trend?.cobertura >= 0 ? '+' : ''}${Number(kpis.trend?.cobertura || 0).toFixed(1)} pp vs ciclo anterior`
        : '',
      trendType: (kpis.trend?.cobertura || 0) >= 0 ? 'up' : 'down',
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
      tooltip: "Porcentagem de médicos visitados em relação ao número de médicos do painel."
    },
    {
      title: "Média Diária de Visitas",
      value: Number(kpis.selected.mdv).toFixed(1),
      description: `Média Brasil: ${Number(kpis.brasilSelected?.mdv || 0).toFixed(1)}`,
      trend: temCicloAnterior
        ? `${kpis.trend?.mdv >= 0 ? '+' : ''}${Number(kpis.trend?.mdv || 0).toFixed(1)} vs ciclo anterior`
        : '',
      trendType: (kpis.trend?.mdv || 0) >= 0 ? 'up' : 'down',
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      tooltip: "Média de visitas por dia útil trabalhado no período selecionado."
    },
    {
      title: "Visitas Totais",
      value: Number(kpis.selected.visitasTotais).toLocaleString('pt-BR'),
      description: "Total do ciclo atual",
      trend: temCicloAnterior
        ? `${kpis.trend?.visitasTotais >= 0 ? '+' : ''}${Number(kpis.trend?.visitasTotais || 0).toLocaleString('pt-BR')} vs ciclo anterior`
        : '',
      trendType: (kpis.trend?.visitasTotais || 0) >= 0 ? 'up' : 'down',
      icon: Package,
      color: "text-amber-600",
      bg: "bg-amber-50",
      tooltip: "Número total de visitas realizadas no período selecionado."
    },
    {
      title: "Visitas Únicas",
      value: Number(kpis.selected.contatos).toLocaleString('pt-BR'),
      description: "Médicos distintos no ciclo atual",
      trend: temCicloAnterior
        ? `${kpis.trend?.contatos >= 0 ? '+' : ''}${Number(kpis.trend?.contatos || 0).toLocaleString('pt-BR')} vs ciclo anterior`
        : '',
      trendType: (kpis.trend?.contatos || 0) >= 0 ? 'up' : 'down',
      icon: Users,
      color: "text-slate-600",
      bg: "bg-slate-100",
      tooltip: "Número de visitas únicas realizadas no período selecionado."
    }
  ];

  return (
    <div className="space-y-4 p-6 pt-5">
      {/* KPI Info Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2 text-slate-500">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {(() => {
              const selected: string[] | undefined = (kpis as any).selected_ciclos;
              const last: string | undefined = kpis.last_ciclo;
              const diasUteisCiclo = kpis.diasUteisCiclo ?? {};
              const fmt = (c: string) => `Ciclo ${c.slice(-2)}`;

              // Ciclos efetivamente exibidos (mesma regra do label).
              const ciclosExibidos = (filtroCiclo === 'Todos' || !filtroCiclo)
                ? (last ? [last] : [])
                : (selected && selected.length > 0
                    ? selected
                    : filtroCiclo.split(',').filter(Boolean));

              const label = ciclosExibidos.length > 0
                ? ciclosExibidos.map(fmt).join(', ')
                : 'último ciclo';

              // Dias úteis somados dos ciclos exibidos. Meta ideal = 6pp por
              // dia útil (90% para 15 dias), capada em 90%.
              const dias = ciclosExibidos.reduce(
                (acc, c) => acc + (diasUteisCiclo[c] ?? 0), 0
              );
              const sufixo = dias > 0
                ? ` · ${dias} dias úteis · meta ideal ${Math.min(90, 6 * dias)}%`
                : '';

              return `Dados: ${label}${sufixo}`;
            })()}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => (
          <Card key={kpi.title} className="border border-slate-200 shadow-sm bg-white">
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
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-slate-500">{kpi.title}</p>
                  <span className="group relative inline-flex">
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help shrink-0" />
                    {/* Tooltip: primeiro card cresce pra direita (pra não
                        bater na sidebar); demais alinham à direita e crescem
                        pra esquerda. */}
                    <div className={`absolute bottom-full ${idx === 0 ? 'left-0' : 'right-0'} mb-2 hidden group-hover:block w-max max-w-[220px] p-2 bg-slate-900 text-white text-[10px] font-normal rounded-md shadow-xl border border-slate-800 z-50 leading-relaxed pointer-events-none whitespace-normal`}>
                      {kpi.tooltip}
                    </div>
                  </span>
                </div>
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
        <CoberturaMdvScatter distrito={filtroDistrito} />

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
              filtroCiclo={filtroCiclo}
              motivoSelecionado={abonoSel.motivo}
              onSelecaoMotivo={(motivo, setores) => setAbonoSel({ motivo, setores })}
            />
            <TabelaRepresentantes
              filtroDistrito={filtroDistrito}
              filtroSetor={filtroSetor}
              filtroCiclo={filtroCiclo}
              highlightSetores={abonoSel.setores}
              motivoHighlight={abonoSel.motivo}
              onLimparHighlight={() => setAbonoSel({ motivo: null, setores: [] })}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

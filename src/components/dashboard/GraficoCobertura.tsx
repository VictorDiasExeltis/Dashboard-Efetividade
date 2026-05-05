'use client';
 
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { getSupabaseClient } from '@/src/lib/supabase/client';
import { TrendingUp, AlertTriangle, Loader2, Info } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/src/components/ui/card';
 
// ─── Interfaces ──────────────────────────────────────────────
 
interface CoberturaDinâmicaRow {
  ciclo: string;
  label: string;
  total_visitas: number;
  total_painel: number;
}
 
interface DadosGrafico {
  ciclo: string;
  cicloLabel: string;
  [serie: string]: number | string;
}
 
// ─── Constantes visuais ──────────────────────────────────────
 
const CHART_COLORS = {
  grid: '#f1f5f9',
  tick: '#64748b',
  reference: '#ef4444',
  tooltip: {
    bg: '#ffffff',
    border: '#e2e8f0',
    color: '#0f172a',
  },
};
 
const LINE_COLORS = [
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
  '#94a3b8', // slate-400
  '#a855f7', // purple-500
  '#f43f5e', // rose-500
  '#0ea5e9', // sky-500
];
 
// ─── Helpers ─────────────────────────────────────────────────
 
function formatarCicloLabel(ciclo: string): string {
  const num = parseInt(ciclo.slice(-2), 10);
  return `Ciclo ${String(num).padStart(2, '0')}`;
}
 
// ─── Componente Principal ────────────────────────────────────
 
export function GraficoCobertura() {
  const searchParams = useSearchParams();
  
  const [dados, setDados] = useState<DadosGrafico[]>([]);
  const [series, setSeries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
 
  // Filtros atuais
  const estrutura = searchParams.get('estrutura') || 'Distrito';
  const distritoFiltro = searchParams.get('distrito') || '';
 
  useEffect(() => {
    setMounted(true);
  }, []);
 
  async function fetchDados() {
    // Caso a estrutura seja Setor, exigimos um distrito selecionado
    if (estrutura === 'Setor' && (!distritoFiltro || distritoFiltro === 'Todos')) {
      setDados([]);
      setSeries([]);
      setLoading(false);
      return;
    }
 
    try {
      setLoading(true);
      setError(null);
 
      // 1. Buscar dados dinâmicos via RPC
      const { data, error: err } = await getSupabaseClient()
        .rpc('get_cobertura_dinamica', {
          p_estrutura: estrutura,
          p_distrito_filtro: distritoFiltro === 'Todos' ? null : distritoFiltro
        });
 
      if (err) {
        throw new Error(`Erro ao buscar cobertura: ${err.message}`);
      }
 
      if (!data || data.length === 0) {
        setDados([]);
        setSeries([]);
        return;
      }
 
      let rows = data as CoberturaDinâmicaRow[];
 
      // 3. Extrair listas únicas de labels (distritos ou setores) e ciclos
      const uniqueLabels = Array.from(new Set(rows.map(r => r.label))).sort();
      const uniqueCiclos = Array.from(new Set(rows.map(r => r.ciclo))).sort();
      
      setSeries(uniqueLabels);
 
      // 4. Pivotar os dados para o formato do Recharts
      const pivotData: DadosGrafico[] = uniqueCiclos.map(ciclo => {
        const item: DadosGrafico = {
          ciclo,
          cicloLabel: formatarCicloLabel(ciclo),
        };
 
        uniqueLabels.forEach(label => {
          const matchingRow = rows.find(r => r.ciclo === ciclo && r.label === label);
          if (matchingRow && matchingRow.total_painel > 0) {
            const cobertura = (matchingRow.total_visitas / matchingRow.total_painel) * 100;
            item[label] = Math.round(cobertura * 10) / 10;
          } else {
            item[label] = 0;
          }
        });
 
        return item;
      });
 
      setDados(pivotData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao buscar dados.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }
 
  useEffect(() => {
    fetchDados();
  }, [searchParams]);
 
  if (loading) {
    return (
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Cobertura por Distrito
          </CardTitle>
          <CardDescription className="text-slate-500">
            Carregando tendências por distrito...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-slate-400 animate-pulse">Calculando trajetórias...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
 
  if (error) {
    return (
      <Card className="border-red-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Cobertura por Distrito
          </CardTitle>
          <CardDescription className="text-red-500">Não foi possível carregar os dados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <p className="text-sm text-slate-600 max-w-xs">{error}</p>
              <button
                onClick={() => fetchDados()}
                className="mt-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
 
  // ─── Estado: Sem distrito selecionado para visão por Setor ─────
 
  if (estrutura === 'Setor' && (!distritoFiltro || distritoFiltro === 'Todos')) {
    return (
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Cobertura por Setor
          </CardTitle>
          <CardDescription className="text-slate-500">
            Selecione um distrito específico para visualizar a performance por setor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-6">
            <div className="bg-blue-50 p-4 rounded-full mb-4">
              <Info className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Distrito não selecionado</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
              Para ver os setores, utilize o filtro de "Distrito" no topo da página.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
 
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              Cobertura por {estrutura} (%)
            </CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              Evolução da cobertura de médicos visitados por {estrutura.toLowerCase()} ao longo dos ciclos
              {distritoFiltro && distritoFiltro !== 'Todos' && ` em ${distritoFiltro}`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full mt-4">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dados} margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis
                  dataKey="cicloLabel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: CHART_COLORS.tick, fontSize: 12, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis
                  domain={[50, 100]}
                  ticks={[50, 60, 70, 80, 90, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: CHART_COLORS.tick, fontSize: 11 }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    backgroundColor: CHART_COLORS.tooltip.bg,
                    border: `1px solid ${CHART_COLORS.tooltip.border}`,
                  }}
                  itemSorter={(item) => -(item.value as number)}
                  formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }}
                />
                <ReferenceLine
                  y={90}
                  stroke={CHART_COLORS.reference}
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{
                    position: 'right',
                    value: 'Meta 90%',
                    fill: CHART_COLORS.reference,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
                {series.map((label, index) => (
                  <Line
                    key={label}
                    type="monotone"
                    dataKey={label}
                    name={label}
                    stroke={LINE_COLORS[index % LINE_COLORS.length]}
                    strokeWidth={3}
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
  );
}

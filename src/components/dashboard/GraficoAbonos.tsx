'use client';

import React, { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getSupabaseClient } from '@/src/lib/supabase/client';
import { Clock, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/src/components/ui/card';

// ─── Interfaces ──────────────────────────────────────────────

interface AbonoMotivo {
  name: string;
  value: number; // dias (horas / 8)
  color: string;
}

// ─── Constantes visuais ──────────────────────────────────────

const DONUT_COLORS = [
  '#3b82f6', // blue-500
  '#f97316', // orange-500
  '#10b981', // emerald-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
];

const TOOLTIP_STYLE = {
  bg: '#ffffff',
  border: '#e2e8f0',
  color: '#0f172a',
};

// ─── Custom Label ────────────────────────────────────────────

const RADIAN = Math.PI / 180;

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
}: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 1.35;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#334155"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {value.toFixed(1)}d
    </text>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  return (
    <div
      style={{
        backgroundColor: TOOLTIP_STYLE.bg,
        border: `1px solid ${TOOLTIP_STYLE.border}`,
        borderRadius: '10px',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <p
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: data.payload.color,
          marginBottom: '4px',
        }}
      >
        {data.name}
      </p>
      <p style={{ fontSize: '12px', color: '#64748b' }}>
        <span style={{ fontWeight: 700, color: TOOLTIP_STYLE.color }}>
          {data.value.toFixed(1)}
        </span>{' '}
        dias
      </p>
      <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
        ({(data.value * 8).toFixed(0)} horas abonadas)
      </p>
    </div>
  );
}

// ─── Custom Legend ───────────────────────────────────────────

function CustomLegend({ payload }: any) {
  if (!payload) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '12px',
        paddingBottom: '12px',
      }}
    >
      {payload.map((entry: any, index: number) => (
        <div
          key={`legend-${index}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#475569',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: entry.color,
            }}
          />
          {entry.value}
        </div>
      ))}
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────

export function GraficoAbonos() {
  const [dados, setDados] = useState<AbonoMotivo[]>([]);
  const [totalDias, setTotalDias] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function fetchAbonos() {
    try {
      setLoading(true);
      setError(null);

      // Buscar todos os registros de fato_abonos
      const { data, error: err } = await getSupabaseClient()
        .from('fato_abonos')
        .select('motivo, horas_abonadas');

      if (err) {
        throw new Error(`Erro ao buscar abonos: ${err.message}`);
      }

      if (!data || data.length === 0) {
        setDados([]);
        setTotalDias(0);
        return;
      }

      // Agrupar por motivo e somar horas
      const agrupado: Record<string, number> = {};
      data.forEach((row: any) => {
        const motivo = row.motivo || 'Sem Motivo';
        const horas = Number(row.horas_abonadas) || 0;
        agrupado[motivo] = (agrupado[motivo] || 0) + horas;
      });

      // Converter para array, ordenar e pegar top 5
      const sorted = Object.entries(agrupado)
        .map(([motivo, totalHoras]) => ({
          name: motivo,
          value: Math.round((totalHoras / 8) * 10) / 10, // converter para dias com 1 decimal
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6)
        .map((item, index) => ({
          ...item,
          color: DONUT_COLORS[index % DONUT_COLORS.length],
        }));

      const total = sorted.reduce((acc, item) => acc + item.value, 0);
      setTotalDias(Math.round(total * 10) / 10);
      setDados(sorted);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro desconhecido ao buscar dados.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAbonos();
  }, []);

  // ─── Estado: Carregando ─────────────────────────────────────

  if (loading) {
    return (
      <Card className="border-slate-200 bg-white shadow-sm lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-violet-600" />
            Motivos de Abono
          </CardTitle>
          <CardDescription className="text-slate-500">
            Carregando motivos de ausência...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <p className="text-sm text-slate-400 animate-pulse">
                Calculando abonos...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Estado: Erro ───────────────────────────────────────────

  if (error) {
    return (
      <Card className="border-red-200 bg-white shadow-sm lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Motivos de Abono
          </CardTitle>
          <CardDescription className="text-red-500">
            Não foi possível carregar os dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <p className="text-sm text-slate-600 max-w-xs">{error}</p>
              <button
                onClick={() => fetchAbonos()}
                className="mt-2 px-4 py-2 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Estado: Sem dados ──────────────────────────────────────

  if (dados.length === 0) {
    return (
      <Card className="border-slate-200 bg-white shadow-sm lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-violet-600" />
            Motivos de Abono
          </CardTitle>
          <CardDescription className="text-slate-500">
            Nenhum abono registrado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <p className="text-sm text-slate-400">
              Sem dados de abono disponíveis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Renderização Principal ─────────────────────────────────

  return (
    <Card className="border-slate-200 bg-white shadow-sm lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-violet-600" />
          Motivos de Abono
        </CardTitle>
        <CardDescription className="text-slate-500">
          Motivos mais frequentes (em dias)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full mt-4 flex items-center justify-center relative">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dados}
                  cx="50%"
                  cy="55%"
                  innerRadius={75}
                  outerRadius={115}
                  paddingAngle={3}
                  dataKey="value"
                  label={renderCustomLabel}
                  labelLine={false}
                  strokeWidth={0}
                >
                  {dados.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      style={{
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="center"
                  content={<CustomLegend />}
                />
                {/* Center Label */}
                <text
                  x="50%"
                  y="62%"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  <tspan
                    x="50%"
                    dy="-8"
                    fontSize="24"
                    fontWeight="700"
                    fill="#0f172a"
                  >
                    {totalDias.toFixed(1)}
                  </tspan>
                  <tspan
                    x="50%"
                    dy="20"
                    fontSize="11"
                    fontWeight="500"
                    fill="#94a3b8"
                  >
                    dias totais
                  </tspan>
                </text>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  LabelList,
} from 'recharts';
import { getSupabaseClient } from '@/src/lib/supabase/client';
import { corDaEstrutura } from '@/src/lib/charts/cores-estrutura';
import { AlertTriangle, Loader2, Info, type LucideIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/src/components/ui/card';

const CHART_COLORS = {
  grid: '#f1f5f9',
  tick: '#64748b',
  reference: '#ef4444',
  tooltip: {
    bg: '#ffffff',
    border: '#e2e8f0',
  },
};

type DadosGrafico = {
  ciclo: string;
  cicloLabel: string;
  [serie: string]: number | string;
};

function formatarCicloLabel(ciclo: string): string {
  const num = parseInt(ciclo.slice(-2), 10);
  return `Ciclo ${String(num).padStart(2, '0')}`;
}

function CustomChartLegend({ payload, highlighted, onToggle }: any) {
  if (!payload) return null;
  const hasSel: boolean = highlighted instanceof Set && highlighted.size > 0;
  return (
    <div className="flex flex-wrap justify-center gap-2 pb-4 select-none">
      {payload.map((entry: any, index: number) => {
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
              style={{ backgroundColor: entry.color, opacity: active ? 1 : 0.35 }}
            />
            <span>{entry.value}</span>
          </button>
        );
      })}
    </div>
  );
}

// Tooltip do gráfico de barras (ciclo único). Depende de `shared={false}` no
// <Tooltip>: com isso o Recharts entrega no payload APENAS a barra sob o cursor
// (em vez de todas as séries do eixo X) e posiciona o card na própria barra,
// já com flip automático perto das bordas. Não mexer no `shared` sem revisar
// isto — sem ele o payload volta a trazer todos os distritos empilhados.
function CustomBarTooltip({ active, payload, label, formatValue }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div
      className="px-3 py-2 text-xs shadow-sm"
      style={{
        borderRadius: '8px',
        backgroundColor: CHART_COLORS.tooltip.bg,
        border: `1px solid ${CHART_COLORS.tooltip.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <div className="font-semibold text-slate-500 mb-1">{label}</div>
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full inline-block shrink-0"
          style={{ backgroundColor: item.color ?? item.fill }}
        />
        <span className="text-slate-600">{item.name}</span>
        <span className="font-bold text-slate-900">{formatValue(Number(item.value))}</span>
      </div>
    </div>
  );
}

type CustomLineLabelProps = {
  x?: number;
  y?: number;
  value?: number;
  stroke?: string;
  width: number;
  formatValue: (v: number) => string;
};

function CustomLineLabel({ x, y, value, stroke, width, formatValue }: CustomLineLabelProps) {
  if (value === undefined || value === null || x === undefined || y === undefined) return null;
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
        fill={stroke || '#3b82f6'}
      />
      <text
        x={x}
        y={y - height / 2 - 6}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        fontWeight="bold"
      >
        {formatValue(Number(value))}
      </text>
    </g>
  );
}

export type LineChartCardConfig = {
  icon: LucideIcon;
  accent: {
    icon: string;
    loader: string;
    emptyBg: string;
    emptyIcon: string;
    retryBg: string;
    retryHoverBg: string;
  };

  titleBase: string;
  loadingTitle: string;
  loadingDescription: string;
  loadingMessage: string;
  descriptionPrefix: string;
  emptyStateMessage: string;

  rpcName: string;
  errorPrefix: string;
  computeValue: (row: any) => number;

  yDomain: [number, number];
  yTicks: number[];
  yTickFormatter: (v: number) => string;
  tooltipFormatter: (v: number) => string;
  labelFormatValue: (v: number) => string;
  labelWidth: number;
  referenceLine: { y: number; label: string };
  // Cores não ficam mais aqui: vêm de `corDaEstrutura`, compartilhada com o
  // gráfico de Cobertura × MDV para a cor bater nos três.
};

export function LineChartCard({ config }: { config: LineChartCardConfig }) {
  const searchParams = useSearchParams();
  const [showLabels, setShowLabels] = useState(true);
  const [dados, setDados] = useState<DadosGrafico[]>([]);
  const [series, setSeries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  // Séries destacadas pela legenda interativa (multi-seleção por clique).
  // Vazio = todas em destaque (gráfico normal).
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  const toggleSeries = (label: string) => {
    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };
  const isActive = (label: string) => highlighted.size === 0 || highlighted.has(label);

  const estrutura = searchParams.get('estrutura') || 'Distrito';
  const distritoFiltro = searchParams.get('distrito') || '';
  // Filtro de ciclo vem do header (CSV via Ctrl+clique). Vazio = todos os ciclos.
  const cicloFiltroRaw = searchParams.get('ciclo') || '';
  const ciclosSelecionados = cicloFiltroRaw
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  const Icon = config.icon;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Se as séries mudam (troca de filtro/estrutura), limpa o destaque para não
  // ficar apontando para uma série que não existe mais.
  useEffect(() => {
    setHighlighted(new Set());
  }, [estrutura, distritoFiltro]);

  async function fetchDados() {
    if (estrutura === 'Setor' && (!distritoFiltro || distritoFiltro === 'Todos')) {
      setDados([]);
      setSeries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await getSupabaseClient().rpc(config.rpcName, {
        p_estrutura: estrutura,
        p_distrito_filtro: distritoFiltro === 'Todos' ? null : distritoFiltro,
      });

      if (err) {
        throw new Error(`${config.errorPrefix}: ${err.message}`);
      }

      if (!data || data.length === 0) {
        setDados([]);
        setSeries([]);
        return;
      }

      const rows = data as Array<{ ciclo: string; label: string;[k: string]: any }>;
      const uniqueLabels = Array.from(new Set(rows.map((r) => r.label))).sort();
      const cicloSet = new Set(ciclosSelecionados);
      const uniqueCiclos = Array.from(new Set(rows.map((r) => r.ciclo)))
        .filter((c) => cicloSet.size === 0 || cicloSet.has(c))
        .sort();

      setSeries(uniqueLabels);

      const pivotData: DadosGrafico[] = uniqueCiclos.map((ciclo) => {
        const item: DadosGrafico = { ciclo, cicloLabel: formatarCicloLabel(ciclo) };
        uniqueLabels.forEach((label) => {
          const row = rows.find((r) => r.ciclo === ciclo && r.label === label);
          item[label] = row ? config.computeValue(row) : 0;
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
            <Icon className={`h-5 w-5 ${config.accent.icon}`} />
            {config.loadingTitle}
          </CardTitle>
          <CardDescription className="text-slate-500">{config.loadingDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className={`h-8 w-8 animate-spin ${config.accent.loader}`} />
              <p className="text-sm text-slate-400 animate-pulse">{config.loadingMessage}</p>
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
            {config.titleBase} por {estrutura}
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
                className={`mt-2 px-4 py-2 text-xs font-medium text-white ${config.accent.retryBg} rounded-lg ${config.accent.retryHoverBg} transition-colors`}
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (estrutura === 'Setor' && (!distritoFiltro || distritoFiltro === 'Todos')) {
    return (
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Info className={`h-5 w-5 ${config.accent.emptyIcon}`} />
            {config.titleBase} por Setor
          </CardTitle>
          <CardDescription className="text-slate-500">{config.emptyStateMessage}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-6">
            <div className={`${config.accent.emptyBg} p-4 rounded-full mb-4`}>
              <Info className={`h-8 w-8 ${config.accent.emptyIcon}`} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Distrito não selecionado</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-[240px]">{config.emptyStateMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Icon className={`h-5 w-5 ${config.accent.icon}`} />
              {config.titleBase} por {estrutura}
            </CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              {config.descriptionPrefix} por {estrutura.toLowerCase()} ao longo dos ciclos
              {distritoFiltro && distritoFiltro !== 'Todos' && ` em ${distritoFiltro}`}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/85 transition-colors px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm shrink-0 select-none">
            <span className="text-xs font-semibold text-slate-600">Rótulos</span>
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showLabels ? 'bg-blue-600' : 'bg-slate-200'
              }`}
              role="switch"
              aria-checked={showLabels}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showLabels ? 'translate-x-3' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full mt-4">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              {dados.length === 1 ? (
                // Um único ciclo: barras (uma por série) — evita o "ponto
                // flutuante" que o LineChart produz quando só há 1 X.
                <BarChart data={dados} margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="cicloLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: CHART_COLORS.tick, fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    domain={config.yDomain}
                    ticks={config.yTicks}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: CHART_COLORS.tick, fontSize: 11 }}
                    tickFormatter={config.yTickFormatter}
                  />
                  <Tooltip
                    // shared={false} = tooltip por item: payload só da barra
                    // apontada e posição na própria barra (o Recharts usa o
                    // `tooltipPosition` do retângulo). Substituiu um cálculo
                    // manual de posição que às vezes caía em {0,0} e prendia o
                    // card no canto superior esquerdo.
                    shared={false}
                    // O wrapper do Tooltip anima a posição por 400ms (default
                    // isAnimationActive: 'auto'). Na primeira aparição ele parte
                    // da origem do gráfico e "viaja" até a barra. Aqui o card
                    // deve simplesmente aparecer onde está o cursor.
                    isAnimationActive={false}
                    content={<CustomBarTooltip formatValue={config.tooltipFormatter} />}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  />
                  <Legend content={<CustomChartLegend highlighted={highlighted} onToggle={toggleSeries} />} verticalAlign="top" />
                  <ReferenceLine
                    y={config.referenceLine.y}
                    stroke={CHART_COLORS.reference}
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    label={{
                      position: 'right',
                      value: config.referenceLine.label,
                      fill: CHART_COLORS.reference,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                  {series.map((label) => {
                    // Cor vem da estrutura, não do índice — mantém o mesmo
                    // distrito/setor com a mesma cor nos 3 gráficos da tela.
                    const color = corDaEstrutura(label);
                    return (
                      <Bar
                        key={label}
                        dataKey={label}
                        name={label}
                        fill={color}
                        fillOpacity={isActive(label) ? 1 : 0.2}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={56}
                      >
                        {showLabels && isActive(label) && (
                          <LabelList
                            dataKey={label}
                            position="top"
                            formatter={(v: any) => config.labelFormatValue(Number(v))}
                            fill={color}
                            fontSize={11}
                            fontWeight={700}
                          />
                        )}
                      </Bar>
                    );
                  })}
                </BarChart>
              ) : (
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
                    domain={config.yDomain}
                    ticks={config.yTicks}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: CHART_COLORS.tick, fontSize: 11 }}
                    tickFormatter={config.yTickFormatter}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      backgroundColor: CHART_COLORS.tooltip.bg,
                      border: `1px solid ${CHART_COLORS.tooltip.border}`,
                    }}
                    itemSorter={(item) => -(item.value as number)}
                    formatter={(value, name) => [config.tooltipFormatter(Number(value)), name]}
                    isAnimationActive={false}
                  />
                  <Legend content={<CustomChartLegend highlighted={highlighted} onToggle={toggleSeries} />} verticalAlign="top" />
                  <ReferenceLine
                    y={config.referenceLine.y}
                    stroke={CHART_COLORS.reference}
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    label={{
                      position: 'right',
                      value: config.referenceLine.label,
                      fill: CHART_COLORS.reference,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                  {series.map((label) => {
                    // Cor vem da estrutura, não do índice — mantém o mesmo
                    // distrito/setor com a mesma cor nos 3 gráficos da tela.
                    const color = corDaEstrutura(label);
                    return (
                      <Line
                        key={label}
                        type="monotone"
                        dataKey={label}
                        name={label}
                        stroke={color}
                        strokeWidth={3}
                        strokeOpacity={isActive(label) ? 1 : 0.15}
                        dot={{ r: 4, strokeWidth: 2, opacity: isActive(label) ? 1 : 0.15 }}
                        activeDot={{ r: 6 }}
                      >
                        {showLabels && isActive(label) && (
                          <LabelList
                            dataKey={label}
                            content={(props: any) => (
                              <CustomLineLabel
                                {...props}
                                stroke={color}
                                width={config.labelWidth}
                                formatValue={config.labelFormatValue}
                              />
                            )}
                          />
                        )}
                      </Line>
                    );
                  })}
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
